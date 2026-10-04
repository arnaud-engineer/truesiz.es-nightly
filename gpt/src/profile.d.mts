// SPDX-License-Identifier: MPL-2.0
import type { Calibration } from './core.mjs';

export const PROFILE_KEY: 'gpt-ddd:profile:v1';
export const MAX_PROFILE_BYTES: 4096;
export type ProfileAxis = Pick<Calibration, 'axis' | 'cssPerCm' | 'referenceCm' | 'cssLength' | 'referenceKind'>;
export interface ProposedProfile {
  schemaVersion: 1;
  contractVersion: '0.1.0-design';
  status: 'needs-reconfirmation';
  axes: ProfileAxis[];
}
type ParseFailure = { status: 'missing' | 'invalid' | 'unsupported-version'; profile: null; reason?: string };
type StorageFailure = { status: 'denied' | 'quota-exceeded' | 'error'; reason: 'storage-operation-failed' };
export type ProfileParseResult = { status: 'needs-reconfirmation'; profile: ProposedProfile } | ParseFailure;
export type ProfileReadResult = ProfileParseResult | (StorageFailure & { profile: null });
export type ProfileWriteResult = StorageFailure | { status: 'not-requested' | 'saved' }
  | { status: 'invalid'; reason: 'invalid-profile' | 'payload-budget' };
export function makeProfile(calibrations: readonly ProfileAxis[]): ProposedProfile;
export function validateProfile(profile: unknown): profile is ProposedProfile;
export function parseProfile(raw: unknown): ProfileParseResult;
export function readProfile(storage: Pick<Storage, 'getItem'>): ProfileReadResult;
export function saveProfile(storage: Pick<Storage, 'setItem'>, calibrations: readonly ProfileAxis[], options?: { requested?: boolean }): ProfileWriteResult;
export function removeProfile(storage: Pick<Storage, 'removeItem'>, options?: { requested?: boolean }): StorageFailure | { status: 'not-requested' | 'removed' };
