// SPDX-License-Identifier: MPL-2.0
import { decideLength, positive } from './core.mjs';

export function toCentimeters(value, unit) {
  if (!positive(value) || !['cm', 'in'].includes(unit)) throw new TypeError('Invalid object length');
  const result = unit === 'in' ? value * 2.54 : value;
  if (!positive(result)) throw new TypeError('Object length overflow');
  return result;
}

export function decideObject({ width, height, unit = 'cm', rotation = 0, context, revision,
  calibrations = [], resolution = null, capacity }) {
  const base = { revision, zone: context?.zone, physicallyValidated: false, widthCss: null, heightCss: null };
  if (![0, 90].includes(rotation) || !capacity || !positive(capacity.width) || !positive(capacity.height)) {
    return { ...base, status: 'abstain', reason: 'invalid-object-request', axes: null };
  }
  let widthCm, heightCm;
  try {
    widthCm = toCentimeters(width, unit); heightCm = toCentimeters(height, unit);
    if (rotation === 90) [widthCm, heightCm] = [heightCm, widthCm];
  } catch { return { ...base, status: 'abstain', reason: 'invalid-object-request', axes: null }; }
  const axes = {
    x: decideLength({ lengthCm: widthCm, axis: 'x', context, revision, calibrations, resolution }),
    y: decideLength({ lengthCm: heightCm, axis: 'y', context, revision, calibrations, resolution }),
  };
  const failure = Object.values(axes).find(axis => axis.status === 'abstain');
  if (failure) return { ...base, status: 'abstain', reason: failure.reason, axes };
  if (Object.values(axes).some(axis => axis.status === 'needs-reference')) {
    return { ...base, status: 'needs-reference', reason: 'missing-axis-reference', axes };
  }
  if (axes.x.cssLength > capacity.width || axes.y.cssLength > capacity.height) {
    return { ...base, status: 'out-of-zone', reason: 'object-does-not-fit', axes };
  }
  return { ...base, status: 'reference-scaled', reason: 'two-current-axis-references', axes,
    widthCm, heightCm, widthCss: axes.x.cssLength, heightCss: axes.y.cssLength };
}

export function graduations({ cssPerCm, lengthCss, unit = 'cm', maxTicks = 400 }) {
  if (!positive(cssPerCm) || !positive(lengthCss) || !['cm', 'in'].includes(unit)
    || !Number.isSafeInteger(maxTicks) || maxTicks < 2 || maxTicks > 1000) return [];
  const q = cssPerCm * (unit === 'in' ? 2.54 : 1);
  if (!positive(q)) return [];
  const minimum = Math.max(8, lengthCss / (maxTicks - 1));
  const raw = minimum / q;
  if (!positive(raw)) return [];
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map(n => n * power).find(n => n >= raw);
  if (!positive(step) || !positive(step * q)) return [];
  const count = Math.min(maxTicks, Math.floor(lengthCss / (step * q)) + 1);
  return Array.from({ length: count }, (_, i) => ({ value: i * step, cssPosition: i * (step * q),
    major: i % 5 === 0, label: i % 5 === 0 ? Number((i * step).toPrecision(8)).toString() : null }))
    .filter(tick => Number.isFinite(tick.value) && Number.isFinite(tick.cssPosition) && tick.cssPosition <= lengthCss);
}
