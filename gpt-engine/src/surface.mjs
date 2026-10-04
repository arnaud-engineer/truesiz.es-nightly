// SPDX-License-Identifier: MPL-2.0
import { positive } from './core.mjs';

const finite = value => typeof value === 'number' && Number.isFinite(value);
const copy = value => structuredClone(value);
const failure = error => { try { return error?.name === 'NotAllowedError' ? 'denied' : 'error'; } catch { return 'error'; } };
const listen = (target, event, callback, options) => {
  try { target?.addEventListener?.(event, callback, options); }
  catch { return () => {}; }
  return () => { try { target?.removeEventListener?.(event, callback, options); } catch {} };
};

export function qualifyGeometry(elements, getStyle) {
  const seen = new Set();
  for (const root of elements) {
    if (!root) return false;
    for (let element = root; element && !seen.has(element); element = element.parentElement) {
      seen.add(element);
      try {
        const style = getStyle(element);
        if (style.transform !== 'none' || style.perspective !== 'none'
          || !['', 'normal', '1'].includes(style.zoom)) return false;
        for (const property of ['scale', 'rotate', 'translate', 'offset-path']) {
          if (!['', 'none'].includes(style.getPropertyValue(property))) return false;
        }
      } catch { return false; }
    }
  }
  return true;
}

export function readSegments(host) {
  try {
    const raw = host.viewport?.segments;
    if (raw === undefined || raw === null) return { state: 'unsupported', value: null };
    if (!Array.isArray(raw) || !raw.length || raw.length > 64) return { state: 'invalid', value: null };
    const value = raw.map(rect => ({ x: rect.x, y: rect.y, width: rect.width, height: rect.height }));
    if (value.some(rect => !finite(rect.x) || !finite(rect.y) || !positive(rect.width) || !positive(rect.height)
      || !finite(rect.x + rect.width) || !finite(rect.y + rect.height))) return { state: 'invalid', value: null };
    return { state: 'available', value };
  } catch { return { state: 'error', value: null }; }
}

export function readPosture(host) {
  try {
    const value = host.navigator?.devicePosture?.type;
    return value === undefined ? { state: 'unsupported', value: null }
      : ['continuous', 'folded'].includes(value) ? { state: 'available', value }
        : { state: 'invalid', value: null };
  } catch { return { state: 'error', value: null }; }
}

export function segmentContains(segments, rect) {
  if (segments.state === 'unsupported') return { status: 'unresolved', admissible: true, segment: null };
  if (segments.state !== 'available' || !rect || ![rect.x, rect.y].every(finite)
    || !positive(rect.width) || !positive(rect.height)) return { status: 'unqualified', admissible: false, segment: null };
  const index = segments.value.findIndex(segment => rect.x >= segment.x && rect.y >= segment.y
    && rect.x + rect.width <= segment.x + segment.width && rect.y + rect.height <= segment.y + segment.height);
  return { status: index < 0 ? 'unqualified' : 'contained', admissible: index >= 0, segment: index < 0 ? null : index };
}

export class SurfaceMonitor {
  #host; #change; #cleanup = []; #detailCleanup = []; #permissionCleanup = () => {}; #handles = new Map(); #details = null;
  #controller = null; #generation = 0; #bindingEpoch = 0; #disposed = false;
  #status = 'not-requested'; #selected = null;
  constructor({ window: host, onChange }) { this.#host = host; this.#change = onChange; }
  get bindingEpoch() { return this.#bindingEpoch; }
  get snapshot() {
    return { status: this.#status, screens: [...this.#handles].map(([id, handle]) => {
      let width = null, height = null, internal = null;
      try { const w = handle.width, h = handle.height, own = handle.isInternal;
        width = positive(w) ? w : null; height = positive(h) ? h : null;
        internal = typeof own === 'boolean' ? own : null; } catch {}
      return { id, widthCss: width, heightCss: height, internal };
    }), selectedId: this.#selected, binding: this.#selected ? 'proposed' : 'unresolved', physicallyValidated: false };
  }
  #changed(reason) { if (!this.#disposed) { this.#bindingEpoch++; this.#change?.(reason); } }
  start() {
    if (this.#cleanup.length || this.#disposed) return;
    const event = reason => () => this.#changed(reason);
    for (const [getter, name, reason] of [
      [() => this.#host.screen, 'change', 'screen-change'],
      [() => this.#host.screen?.orientation, 'change', 'orientation-change'],
      [() => this.#host.navigator?.devicePosture, 'change', 'posture-change'],
    ]) { try { this.#cleanup.push(listen(getter(), name, event(reason))); } catch {} }
  }
  #clearDetails() {
    for (const cleanup of this.#detailCleanup.splice(0)) cleanup();
    this.#details = null; this.#handles.clear(); this.#selected = null;
  }
  #install(details) {
    const screens = details.screens;
    if (!Array.isArray(screens) || screens.length < 1 || screens.length > 64
      || screens.some(screen => !screen || typeof screen.addEventListener !== 'function')) throw new TypeError('Invalid screen details');
    this.#clearDetails(); this.#details = details;
    screens.forEach((screen, i) => this.#handles.set('screen-' + (i + 1), screen));
    for (const [id, screen] of this.#handles) {
      if (screen === details.currentScreen) this.#selected = id;
      this.#detailCleanup.push(listen(screen, 'change', () => this.#changed('detailed-screen-change')));
    }
    this.#detailCleanup.push(listen(details, 'currentscreenchange', () => {
      try { this.#selected = [...this.#handles].find(([, handle]) => handle === this.#details?.currentScreen)?.[0] ?? null; }
      catch { this.#selected = null; this.#status = 'error'; }
      this.#changed('current-screen-change');
    }), listen(details, 'screenschange', () => {
      try { this.#install(details); this.#status = 'available'; }
      catch { this.#clearDetails(); this.#status = 'invalid'; }
      this.#changed('topology-change');
    }));
  }
  async request({ requested = false, signal, timeoutMs = 15000 } = {}) {
    if (this.#disposed) return { status: 'cancelled' };
    if (!requested) return copy(this.snapshot);
    if (signal?.aborted) return { status: 'cancelled' };
    if (!positive(timeoutMs) || timeoutMs > 30000) throw new TypeError('Invalid surface budget');
    this.#controller?.abort();
    const controller = new AbortController(); this.#controller = controller;
    const generation = ++this.#generation;
    const abortExternal = () => controller.abort();
    signal?.addEventListener('abort', abortExternal, { once: true });
    if (signal?.aborted) controller.abort();
    let method, getterFailed = false;
    try { method = this.#host.getScreenDetails; } catch { getterFailed = true; }
    const result = getterFailed ? { status: 'error' } : typeof method !== 'function' ? { status: 'unsupported' } : await new Promise(resolve => {
      let settled = false;
      const complete = result => { if (settled) return; settled = true; clearTimeout(timer);
        controller.signal.removeEventListener('abort', abort); resolve(result); };
      const abort = () => complete({ status: 'cancelled' });
      const timer = setTimeout(() => complete({ status: 'timeout' }), timeoutMs);
      controller.signal.addEventListener('abort', abort, { once: true });
      if (controller.signal.aborted) { abort(); return; }
      try { Promise.resolve(method.call(this.#host)).then(value => complete({ status: 'available', value }),
        error => complete({ status: failure(error) })); }
      catch (error) { complete({ status: failure(error) }); }
    });
    signal?.removeEventListener('abort', abortExternal);
    if (generation !== this.#generation || this.#disposed) return { status: 'cancelled' };
    this.#controller = null;
    this.#permissionCleanup(); this.#permissionCleanup = () => {};
    this.#clearDetails(); this.#status = result.status;
    if (result.status === 'available') {
      try { this.#install(result.value); } catch { this.#status = 'invalid'; this.#clearDetails(); }
      const generationAtInstall = generation;
      try {
        Promise.resolve(this.#host.navigator?.permissions?.query({ name: 'window-management' })).then(permission => {
          if (!permission || this.#disposed || generationAtInstall !== this.#generation || !this.#details) return;
          const revoked = () => {
            if (permission.state === 'granted') return;
            this.#clearDetails(); this.#status = 'denied'; this.#changed('permission-revoked');
          };
          this.#permissionCleanup = listen(permission, 'change', revoked);
          revoked();
        }).catch(() => {});
      } catch {}
    }
    this.#changed('surface-acquisition');
    return copy(this.snapshot);
  }
  select(id) {
    if (this.#disposed || !this.#handles.has(id)) return false;
    this.#selected = id; this.#changed('user-surface-selection'); return true;
  }
  async fullscreen(element) {
    if (this.#disposed || typeof element?.requestFullscreen !== 'function') return { status: 'unsupported' };
    const screen = this.#selected ? this.#handles.get(this.#selected) : null;
    try { await element.requestFullscreen(screen ? { screen } : undefined); return { status: 'available' }; }
    catch (error) { return { status: failure(error) }; }
  }
  disconnect() {
    if (this.#disposed) return;
    this.#generation++; this.#controller?.abort(); this.#controller = null;
    this.#permissionCleanup(); this.#permissionCleanup = () => {};
    this.#clearDetails(); this.#status = 'not-requested'; this.#changed('surface-disconnected');
  }
  dispose() {
    this.disconnect(); this.#disposed = true;
    for (const cleanup of this.#cleanup.splice(0)) cleanup();
    this.#change = null;
  }
}
