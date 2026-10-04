// SPDX-License-Identifier: MPL-2.0
import { DetectionSession, observation, positive } from './core.mjs';
import { readBrowserContext, acquireModel } from './browser.mjs';
import { readProfile, saveProfile, removeProfile } from './profile.mjs';
import { decideObject } from './object.mjs';
import { DeclarationGraph } from './graph.mjs';
import { SurfaceMonitor, readSegments, readPosture, segmentContains, qualifyGeometry } from './surface.mjs';

export const DETECTOR_VERSION = '0.2.0-experimental';
const clone = value => structuredClone(value);
const unavailable = state => observation({ key: 'model', source: 'ua-ch-javascript', state, at: performance.now() });

export function acquireUaTokens(host, { requested = false } = {}) {
  const make = (state, value) => observation({ key: 'uaTokens', source: 'legacy-ua-exact-token', state,
    at: performance.now(), ...(state === 'available' ? { value } : {}) });
  if (!requested) return make('not-requested');
  try {
    const raw = host.userAgent;
    if (raw === undefined) return make('unsupported');
    if (typeof raw !== 'string' || raw.length > 8192 || /[\x00-\x1f\x7f]/.test(raw)) return make('invalid');
    if (!raw.trim()) return make('empty');
    // Preserve exact semicolon-delimited clauses; no fuzzy matching or raw UA persistence.
    const inside = raw.match(/\(([^()]*)\)/)?.[1];
    const tokens = (inside ?? '').split(';').map(token => token.trim().replace(/\s+Build\/\S+$/, ''))
      .filter(token => token.length > 0 && token.length <= 256).slice(0, 64);
    return make(tokens.length ? 'available' : 'empty', tokens.length ? tokens : undefined);
  } catch { return make('error'); }
}

export class DeviceDetector {
  #host; #zone; #elements; #session = new DetectionSession(); #context = null; #observations = {};
  #graph; #identity; #model = unavailable('not-requested'); #uaTokens = null;
  #selected = null; #listeners = new Set(); #cleanup = []; #poll = null; #resizeObserver = null;
  #controller = null; #dirty = new Set(); #signature = null; #surface;
  constructor({ window: host, zone, elements = [], graph }) {
    if (!host || !zone || typeof zone.getBoundingClientRect !== 'function') throw new TypeError('Missing measurement zone');
    this.#host = host; this.#zone = zone; this.#elements = elements;
    this.#graph = new DeclarationGraph(graph);
    this.#identity = this.#graph.resolve();
    this.#surface = new SurfaceMonitor({ window: host, onChange: reason => this.refresh({ force: true, reason }) });
    this.refresh();
  }
  get disposed() { return this.#session.disposed; }
  get revision() { return this.#session.revision; }
  get snapshot() {
    return clone({ version: DETECTOR_VERSION, revision: this.revision, context: this.#context,
      observations: this.#observations, model: this.#model, identity: this.#identity,
      surface: this.#surface.snapshot, calibrations: this.#session.calibrations.filter(item => !this.#dirty.has(item.axis)),
      physicallyValidated: false, disposed: this.disposed });
  }
  subscribe(callback) {
    if (typeof callback !== 'function') throw new TypeError('Invalid subscriber');
    if (this.disposed) return () => {};
    this.#listeners.add(callback); callback(this.snapshot);
    return () => this.#listeners.delete(callback);
  }
  #emit() { if (!this.disposed) for (const listener of this.#listeners) listener(this.snapshot); }
  #resolve() { this.#identity = this.#graph.resolve({ model: this.#model, uaTokens: this.#uaTokens, selectedId: this.#selected }); }
  refresh({ force = false, reason = 'context-review' } = {}) {
    if (this.disposed) return false;
    const rect = this.#zone.getBoundingClientRect();
    const segments = readSegments(this.#host), posture = readPosture(this.#host);
    const containment = segmentContains(segments, rect);
    const geometry = qualifyGeometry([this.#zone, ...this.#elements], element => this.#host.getComputedStyle(element));
    const sample = readBrowserContext({ window: this.#host, zone: 'truesizes-stage:' + this.#surface.bindingEpoch,
      zoneGeometry: geometry && positive(rect.width) && positive(rect.height) && containment.admissible ? 'controlled-untransformed' : 'unqualified' });
    const signature = JSON.stringify([sample.context, segments, posture, [rect.x, rect.y, rect.width, rect.height]]);
    const previous = this.revision;
    this.#context = sample.context;
    this.#observations = { ...sample.observations, segments, posture, containment };
    this.#session.observe(this.#context, { force: force || (this.#signature !== null && signature !== this.#signature) });
    this.#signature = signature;
    if (this.revision !== previous) {
      this.#controller?.abort(); this.#controller = null;
      this.#model = unavailable('not-requested'); this.#uaTokens = null; this.#selected = null;
      this.#dirty.clear(); this.#resolve();
      this.#observations.lastReview = reason;
    }
    if (this.revision !== previous) this.#emit();
    return true;
  }
  start() {
    if (this.disposed || this.#cleanup.length) return;
    const listen = (target, event, callback, options) => {
      target?.addEventListener?.(event, callback, options);
      this.#cleanup.push(() => target?.removeEventListener?.(event, callback, options));
    };
    listen(this.#host, 'resize', () => this.refresh({ force: true, reason: 'resize' }));
    listen(this.#host.visualViewport, 'resize', () => this.refresh());
    listen(this.#host, 'scroll', () => this.refresh(), true);
    for (const event of ['visibilitychange', 'fullscreenchange']) {
      listen(this.#host.document, event, () => this.refresh({ force: true, reason: event }));
    }
    listen(this.#host, 'pageshow', event => this.refresh({ force: event.persisted, reason: 'pageshow' }));
    listen(this.#host, 'pagehide', event => {
      this.refresh({ force: true, reason: 'pagehide' });
      if (!event.persisted) this.dispose();
    });
    this.#surface.start();
    if (typeof this.#host.ResizeObserver === 'function') {
      this.#resizeObserver = new this.#host.ResizeObserver(() => this.refresh());
      this.#resizeObserver.observe(this.#zone);
    }
    this.#poll = setInterval(() => {
      if (this.#host.document.visibilityState === 'visible') this.refresh();
    }, 1000);
  }
  async identify({ requested = false, signal, timeoutMs = 1500 } = {}) {
    if (this.disposed) return { status: 'cancelled' };
    if (!requested) return this.snapshot;
    if (!positive(timeoutMs) || timeoutMs > 30000) throw new TypeError('Invalid acquisition budget');
    if (signal?.aborted) return { status: 'cancelled' };
    this.refresh(); this.#controller?.abort();
    const controller = new AbortController(); this.#controller = controller;
    const externalAbort = () => controller.abort();
    signal?.addEventListener('abort', externalAbort, { once: true });
    if (signal?.aborted) controller.abort();
    const token = this.#session.beginTask();
    const uaTokens = acquireUaTokens(this.#host.navigator, { requested: true });
    let model;
    try { model = await acquireModel({ navigator: this.#host.navigator, requested: true,
      signal: controller.signal, timeoutMs }); }
    finally { signal?.removeEventListener('abort', externalAbort); }
    this.refresh();
    if (this.#controller !== controller || !this.#session.commitTask(token, { model, uaTokens })) return { status: 'cancelled' };
    this.#controller = null; this.#model = model; this.#uaTokens = uaTokens;
    this.#resolve(); this.#emit(); return this.snapshot;
  }
  search(query, options) { return this.#graph.search(query, options); }
  selectDeclaration(id) {
    if (this.disposed || (id !== null && !this.#graph.declaration(id))) return false;
    this.#controller?.abort(); this.#controller = null;
    this.#selected = id; this.#resolve(); this.#emit(); return true;
  }
  reviewAxis(axis) {
    if (!['x', 'y'].includes(axis)) throw new TypeError('Invalid axis');
    if (this.disposed) return false;
    this.#dirty.add(axis); this.#emit(); return true;
  }
  calibrate({ axis, cssLength, referenceCm, referenceKind = 'nominal-object' }) {
    if (this.disposed) return { status: 'cancelled' };
    this.refresh();
    const rect = this.#zone.getBoundingClientRect();
    if (this.#host.document.visibilityState !== 'visible' || !positive(cssLength) || !positive(referenceCm)
      || !positive(cssLength / referenceCm) || !['x', 'y'].includes(axis)
      || cssLength > (axis === 'x' ? rect.width : rect.height)) return { status: 'invalid' };
    this.#controller?.abort(); this.#controller = null;
    try {
      if (!this.#session.calibrate({ axis, cssLength, referenceCm, referenceKind, context: this.#context, zone: this.#context.zone })) return { status: 'cancelled' };
      this.#dirty.delete(axis); this.#model = unavailable('not-requested'); this.#uaTokens = null;
      this.#resolve(); this.#emit(); return { status: 'reference-scaled', physicallyValidated: false };
    } catch { return { status: 'invalid' }; }
  }
  decideObject(input) {
    if (this.disposed) return { status: 'abstain', reason: 'disposed', widthCss: null, heightCss: null, physicallyValidated: false };
    this.refresh();
    if (this.#host.document.visibilityState !== 'visible') return { status: 'abstain', reason: 'hidden-document', widthCss: null, heightCss: null, physicallyValidated: false };
    return decideObject({ ...input, context: this.#context, revision: this.revision, calibrations: this.snapshot.calibrations });
  }
  save(storage, options) { return this.disposed ? { status: 'cancelled' } : saveProfile(storage, this.snapshot.calibrations, options); }
  restore(storage) {
    if (this.disposed) return { status: 'cancelled', profile: null };
    const result = readProfile(storage);
    if (result.status === 'needs-reconfirmation') this.refresh({ force: true, reason: 'profile-proposal' });
    return result;
  }
  reset(storage, options) {
    if (this.disposed) return { status: 'cancelled' };
    const result = removeProfile(storage, options);
    if (options?.requested) this.refresh({ force: true, reason: 'profile-reset' });
    return result;
  }
  requestScreens(options) { return this.#surface.request(options); }
  selectScreen(id) { return this.#surface.select(id); }
  disconnectScreens() { this.#surface.disconnect(); }
  fullscreen(element) { return this.#surface.fullscreen(element); }
  dispose() {
    if (this.disposed) return;
    this.#session.dispose(); this.#surface.dispose();
    this.#controller?.abort(); this.#controller = null;
    clearInterval(this.#poll); this.#resizeObserver?.disconnect();
    for (const cleanup of this.#cleanup.splice(0)) cleanup();
    this.#listeners.clear();
  }
}
