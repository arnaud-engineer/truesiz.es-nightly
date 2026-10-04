// SPDX-License-Identifier: MPL-2.0
// Experimental contracts: these functions do not establish physical accuracy.
export const CONTRACT_VERSION = '0.1.0-design';
export const OBSERVATION_STATES = Object.freeze([
  'available', 'not-requested', 'unsupported', 'empty', 'omitted',
  'denied', 'timeout', 'cancelled', 'error', 'invalid',
]);

export const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
export function centimeters(value) {
  if (!positive(value)) throw new TypeError('Invalid centimeters');
  return value;
}
export function cssPixels(value) {
  if (!positive(value)) throw new TypeError('Invalid CSS pixels');
  return value;
}
const nonnegative = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const text = value => typeof value === 'string' && value.length > 0 && value.length <= 256;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = message => { throw new TypeError(message); };
const clone = value => structuredClone(value);

export function observation({ key, state, source, at, value, reason = null }) {
  if (!text(key) || !text(source) || !nonnegative(at) || !OBSERVATION_STATES.includes(state)) fail('Invalid observation envelope');
  if (reason !== null && !text(reason)) fail('Invalid observation reason');
  if (state !== 'available' && value !== undefined) fail('Unavailable observation cannot carry a value');
  if (state === 'available' && value === undefined) fail('Available observation requires a value');
  return Object.freeze({ key, state, source, at, ...(state === 'available' ? { value: clone(value) } : {}), reason });
}

export function axisPairMatches(expected, actual, tolerance = 0) {
  if (!Array.isArray(expected) || !Array.isArray(actual) || expected.length !== 2 || actual.length !== 2
    || !expected.every(positive) || !actual.every(positive) || !nonnegative(tolerance)) return false;
  const close = (a, b) => Math.abs(a - b) <= tolerance;
  return (close(expected[0], actual[0]) && close(expected[1], actual[1]))
    || (close(expected[0], actual[1]) && close(expected[1], actual[0]));
}

export function validateCatalogue(rows) {
  if (!Array.isArray(rows) || rows.length > 100000) fail('Invalid catalogue');
  const ids = new Set();
  for (const row of rows) {
    if (!record(row) || !text(row.id) || ids.has(row.id) || !text(row.name)
      || !['machine', 'panel', 'composite'].includes(row.entity)
      || !Array.isArray(row.modelCodes) || !row.modelCodes.every(value => text(value) && value.trim() && !/[\u0000-\u001f\u007f]/.test(value))
      || !record(row.provenance) || !text(row.provenance.source) || !text(row.provenance.revision)
      || !text(row.provenance.license) || !['nominal', 'legacy-unverified', 'measured'].includes(row.validation)) fail('Invalid catalogue row');
    ids.add(row.id);
    if (row.webTuple != null && (!record(row.webTuple) || !text(row.webTuple.basis)
      || !Array.isArray(row.webTuple.axes) || row.webTuple.axes.length !== 2 || !row.webTuple.axes.every(positive))) fail('Invalid catalogue web tuple');
    if (row.diagonalInches != null && !positive(row.diagonalInches)) fail('Invalid diagonal declaration');
  }
  return true;
}

const modelCode = value => text(value) ? value.trim().toUpperCase() : null;

export function resolveCandidates(rows, evidence = {}) {
  validateCatalogue(rows);
  const tuple = evidence.webTuple;
  const useTuple = tuple?.state === 'available' && record(tuple.value)
    && text(tuple.value.basis) && Array.isArray(tuple.value.axes) && tuple.value.axes.length === 2
    && tuple.value.axes.every(positive);
  const candidates = [];
  const excluded = [];
  for (const row of rows) {
    const supports = [];
    const conflicts = [];
    const model = row.entity === 'machine' ? evidence.machineModel : row.entity === 'panel' ? evidence.panelModel : null;
    const code = model?.state === 'available' ? modelCode(model.value) : null;
    if (code && row.modelCodes.length) {
      if (row.modelCodes.some(alias => modelCode(alias) === code)) supports.push(row.entity + '-model-code');
      else conflicts.push(row.entity + '-model-code');
    }
    // Active-panel geometry must not disprove a machine whose external screen is unknown.
    if (row.entity === 'panel' && useTuple && row.webTuple && tuple.value.basis === row.webTuple.basis) {
      if (axisPairMatches(row.webTuple.axes, tuple.value.axes)) supports.push('web-tuple');
      else conflicts.push('web-tuple');
    }
    const result = { id: row.id, entity: row.entity, supports, conflicts, validation: row.validation };
    // Alias lists and exposed-mode declarations are not proven exhaustive.
    candidates.push(result);
  }
  return {
    candidates, excluded,
    unknown: { possible: true, reason: 'catalogue-not-proven-exhaustive' },
    identity: candidates.length === 1 && candidates[0].supports.length && !candidates[0].conflicts.length ? 'single-compatible-known' : 'unresolved',
    physicalMapping: 'unresolved',
  };
}

export function contextKey(sample) {
  const exposed = value => value === null || positive(value);
  if (!record(sample) || !exposed(sample.screenWidthCss) || !exposed(sample.screenHeightCss)
    || !exposed(sample.pageDpr) || !exposed(sample.visualScale) || !text(sample.zone)
    || !['portrait', 'landscape', 'unknown'].includes(sample.orientation)
    || !['controlled-untransformed', 'unqualified'].includes(sample.zoneGeometry)) fail('Invalid rendering context');
  // This is a change detector, never a unique or persistent display identifier.
  return JSON.stringify([sample.screenWidthCss, sample.screenHeightCss, sample.pageDpr,
    sample.visualScale, sample.orientation, sample.zone, sample.zoneGeometry]);
}

export function calibrationFromReference({ axis, cssLength, referenceCm, referenceKind, context, revision, zone }) {
  if (!['x', 'y'].includes(axis) || !positive(cssLength) || !positive(referenceCm)
    || !['nominal-object', 'independent-measurement'].includes(referenceKind)
    || !Number.isSafeInteger(revision) || revision < 0 || !text(zone) || zone !== context?.zone) fail('Invalid calibration');
  const key = contextKey(context);
  if (context.zoneGeometry !== 'controlled-untransformed') fail('Calibration zone is not qualified');
  const q = cssLength / referenceCm;
  if (!positive(q)) fail('Invalid calibration ratio');
  return Object.freeze({ axis, cssPerCm: q, referenceCm, cssLength, referenceKind, contextKey: key,
    revision, zone, validation: 'user-reference', independentlyChecked: false });
}

export function decideLength({ lengthCm, axis, context, revision, calibrations = [], resolution = null }) {
  if (!positive(lengthCm) || !['x', 'y'].includes(axis) || !Number.isSafeInteger(revision) || revision < 0) fail('Invalid length request');
  const key = contextKey(context);
  const matches = calibrations.filter(item => item?.axis === axis && item.zone === context.zone
    && item.contextKey === key && item.revision === revision && positive(item.cssPerCm)
    && item.validation === 'user-reference');
  const base = { contractVersion: CONTRACT_VERSION, axis, lengthCm, revision, zone: context.zone,
    identity: resolution?.identity ?? 'unresolved', unknownPossible: resolution?.unknown?.possible ?? true,
    physicallyValidated: false };
  if (context.zoneGeometry !== 'controlled-untransformed') return { ...base, status: 'abstain', reason: 'unqualified-zone', cssLength: null };
  if (matches.length > 1 && matches.some(item => item.cssPerCm !== matches[0].cssPerCm)) return { ...base, status: 'abstain', reason: 'conflicting-calibrations', cssLength: null };
  if (!matches.length) return { ...base, status: 'needs-reference', reason: 'no-current-axis-calibration', cssLength: null };
  const cssLength = matches[0].cssPerCm * lengthCm;
  if (!positive(cssLength)) return { ...base, status: 'abstain', reason: 'numeric-overflow', cssLength: null };
  return { ...base, status: 'reference-scaled', reason: 'current-user-reference', cssLength,
    cssPerCm: matches[0].cssPerCm, referenceKind: matches[0].referenceKind };
}

export function closedIntervalEstimate(lower, upper) {
  if (!positive(lower) || !positive(upper) || lower > upper) fail('Invalid closed interval');
  const ratio = lower / upper;
  return { cssPerCm: lower * (2 / (1 + ratio)), relativeErrorBound: (1 - ratio) / (1 + ratio),
    scope: 'assumed-closed-interval-only', physicallyValidated: false };
}

export class DetectionSession {
  #owner = {};
  #revision = 0;
  #task = 0;
  #key = null;
  #disposed = false;
  #calibrations = [];
  #result = null;

  get revision() { return this.#revision; }
  get disposed() { return this.#disposed; }
  get result() { return clone(this.#result); }
  get calibrations() { return clone(this.#calibrations); }

  observe(context, { force = false } = {}) {
    if (this.#disposed) return false;
    let key;
    try { key = contextKey(context); }
    catch (error) { this.invalidate('invalid-context'); throw error; }
    if (force || key !== this.#key) {
      this.invalidate(force ? 'forced-context-review' : 'context-change');
      this.#key = key;
    }
    return true;
  }

  invalidate(reason) {
    if (this.#disposed) return false;
    if (!text(reason)) fail('Invalid invalidation reason');
    this.#revision++;
    this.#key = null;
    this.#calibrations = [];
    this.#result = null;
    return true;
  }

  beginTask() {
    if (this.#disposed || this.#key === null) return null;
    return Object.freeze({ owner: this.#owner, revision: this.#revision, task: ++this.#task });
  }

  commitTask(token, result) {
    if (this.#disposed || !token || token.owner !== this.#owner || token.revision !== this.#revision || token.task !== this.#task) return false;
    this.#result = clone(result);
    this.#task++;
    return true;
  }

  calibrate(input) {
    if (this.#disposed || this.#key === null || contextKey(input.context) !== this.#key) return false;
    const nextRevision = this.#revision + 1;
    const calibration = calibrationFromReference({ ...input, revision: nextRevision });
    this.#revision = nextRevision;
    this.#result = null;
    this.#calibrations = this.#calibrations.filter(item => item.axis !== calibration.axis)
      .map(item => Object.freeze({ ...item, revision: nextRevision }));
    this.#calibrations.push(calibration);
    return true;
  }

  dispose() {
    if (this.#disposed) return;
    this.invalidate('dispose');
    this.#key = null;
    this.#disposed = true;
  }
}
