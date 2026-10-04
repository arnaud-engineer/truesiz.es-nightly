// SPDX-License-Identifier: MPL-2.0
import { CONTRACT_VERSION, positive } from './core.mjs';

export const PROFILE_KEY = 'gpt-ddd:profile:v1';
export const MAX_PROFILE_BYTES = 4096;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const keysMatch = (value, keys) => record(value) && Object.keys(value).length === keys.length
  && keys.every(key => Object.hasOwn(value, key));
const axisKeys = ['axis', 'cssPerCm', 'referenceCm', 'cssLength', 'referenceKind'];
const profileKeys = ['schemaVersion', 'contractVersion', 'status', 'axes'];

export function makeProfile(calibrations) {
  if (!Array.isArray(calibrations) || calibrations.length < 1 || calibrations.length > 2) throw new TypeError('Invalid profile axes');
  const profile = {
    schemaVersion: 1, contractVersion: CONTRACT_VERSION, status: 'needs-reconfirmation',
    axes: calibrations.map(({ axis, cssPerCm, referenceCm, cssLength, referenceKind }) => ({ axis, cssPerCm, referenceCm, cssLength, referenceKind })),
  };
  if (!validateProfile(profile)) throw new TypeError('Invalid profile');
  return profile;
}

export function validateProfile(profile) {
  if (!keysMatch(profile, profileKeys) || profile.schemaVersion !== 1 || profile.contractVersion !== CONTRACT_VERSION
    || profile.status !== 'needs-reconfirmation' || !Array.isArray(profile.axes) || profile.axes.length < 1 || profile.axes.length > 2) return false;
  const seen = new Set();
  for (const item of profile.axes) {
    if (!keysMatch(item, axisKeys) || !['x', 'y'].includes(item.axis) || seen.has(item.axis)
      || !positive(item.cssPerCm) || !positive(item.referenceCm) || !positive(item.cssLength)
      || !['nominal-object', 'independent-measurement'].includes(item.referenceKind)) return false;
    const ratio = item.cssLength / item.referenceCm;
    // Encoding consistency only; this tolerance is not a physical-error bound.
    if (!positive(ratio) || Math.abs(ratio / item.cssPerCm - 1) > 1e-12) return false;
    seen.add(item.axis);
  }
  return true;
}

export function parseProfile(raw) {
  if (raw === null) return { status: 'missing', profile: null };
  if (typeof raw !== 'string' || raw.length > MAX_PROFILE_BYTES || new TextEncoder().encode(raw).length > MAX_PROFILE_BYTES) return { status: 'invalid', reason: 'payload-budget', profile: null };
  let profile;
  try { profile = JSON.parse(raw); }
  catch { return { status: 'invalid', reason: 'invalid-json', profile: null }; }
  if (record(profile) && (profile.schemaVersion !== 1 || profile.contractVersion !== CONTRACT_VERSION)) return { status: 'unsupported-version', profile: null };
  if (!validateProfile(profile)) return { status: 'invalid', reason: 'invalid-schema', profile: null };
  return { status: 'needs-reconfirmation', profile };
}

const storageFailure = error => {
  let name;
  try { name = error?.name; } catch { name = null; }
  return { status: name === 'SecurityError' ? 'denied'
    : name === 'QuotaExceededError' ? 'quota-exceeded' : 'error', reason: 'storage-operation-failed' };
};

export function readProfile(storage) {
  try { return parseProfile(storage.getItem(PROFILE_KEY)); }
  catch (error) { return { ...storageFailure(error), profile: null }; }
}

export function saveProfile(storage, calibrations, { requested = false } = {}) {
  if (!requested) return { status: 'not-requested' };
  let raw;
  try { raw = JSON.stringify(makeProfile(calibrations)); }
  catch { return { status: 'invalid', reason: 'invalid-profile' }; }
  if (new TextEncoder().encode(raw).length > MAX_PROFILE_BYTES) return { status: 'invalid', reason: 'payload-budget' };
  try { storage.setItem(PROFILE_KEY, raw); return { status: 'saved' }; }
  catch (error) { return storageFailure(error); }
}

export function removeProfile(storage, { requested = false } = {}) {
  if (!requested) return { status: 'not-requested' };
  try { storage.removeItem(PROFILE_KEY); return { status: 'removed' }; }
  catch (error) { return storageFailure(error); }
}
