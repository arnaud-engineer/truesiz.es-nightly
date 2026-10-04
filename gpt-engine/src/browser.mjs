// SPDX-License-Identifier: MPL-2.0
import { observation, positive } from './core.mjs';

const defaultNow = () => globalThis.performance.now();

export function readBrowserContext({ window: host, zone, zoneGeometry, now = defaultNow }) {
  const at = now();
  const numbers = {};
  const read = (key, getter, source) => {
    try {
      const value = getter();
      const state = value === undefined || value === null ? 'unsupported' : positive(value) ? 'available' : 'invalid';
      numbers[key] = observation({ key, source, state, at, ...(state === 'available' ? { value } : {}) });
      return state === 'available' ? value : null;
    } catch {
      numbers[key] = observation({ key, source, state: 'error', at, reason: 'getter-failed' });
      return null;
    }
  };
  const screenWidthCss = read('screenWidthCss', () => host.screen?.width, 'screen.width');
  const screenHeightCss = read('screenHeightCss', () => host.screen?.height, 'screen.height');
  const pageDpr = read('pageDpr', () => host.devicePixelRatio, 'window.devicePixelRatio');
  const visualScale = read('visualScale', () => host.visualViewport?.scale, 'visualViewport.scale');
  const orientation = screenWidthCss === null || screenHeightCss === null ? 'unknown'
    : screenWidthCss > screenHeightCss ? 'landscape' : 'portrait';
  return { context: { screenWidthCss, screenHeightCss, pageDpr, visualScale, orientation, zone, zoneGeometry }, observations: numbers };
}

export async function acquireModel({ navigator: host, requested = false, signal, timeoutMs = 1500, now = defaultNow }) {
  const finish = (state, value, reason = null) => observation({ key: 'model', state, source: 'ua-ch-javascript', at: now(), reason,
    ...(state === 'available' ? { value } : {}) });
  if (!requested) return finish('not-requested');
  if (!positive(timeoutMs) || timeoutMs > 30000) throw new TypeError('Invalid acquisition budget');
  if (signal?.aborted) return finish('cancelled', undefined, 'aborted');
  let api;
  let method;
  try { api = host.userAgentData; method = api?.getHighEntropyValues; }
  catch { return finish('error', undefined, 'api-getter-failed'); }
  if (!api || typeof method !== 'function') return finish('unsupported');
  return new Promise(resolve => {
    let settled = false;
    let timer;
    const complete = result => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      resolve(result);
    };
    const abort = () => complete(finish('cancelled', undefined, 'aborted'));
    signal?.addEventListener('abort', abort, { once: true });
    timer = setTimeout(() => complete(finish('timeout', undefined, 'budget-exhausted')), timeoutMs);
    if (signal?.aborted) { abort(); return; }
    Promise.resolve().then(() => settled ? undefined : method.call(api, ['model'])).then(result => {
      if (settled) return;
      try {
        if (!result || typeof result !== 'object' || Array.isArray(result)) { complete(finish('invalid', undefined, 'invalid-response')); return; }
        if (!Object.hasOwn(result, 'model')) { complete(finish('omitted')); return; }
        const raw = result.model;
        if (typeof raw !== 'string' || raw.length > 256 || /[\x00-\x1F\x7F]/.test(raw)) { complete(finish('invalid', undefined, 'invalid-model')); return; }
        const value = raw.trim();
        complete(value ? finish('available', value) : finish('empty'));
      } catch {
        complete(finish('error', undefined, 'response-getter-failed'));
      }
    }, error => {
      if (settled) return;
      let name;
      try { name = error?.name; } catch { name = null; }
      complete(finish(name === 'NotAllowedError' ? 'denied' : 'error', undefined, 'api-call-rejected'));
    });
  });
}
