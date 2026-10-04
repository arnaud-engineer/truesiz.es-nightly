// SPDX-License-Identifier: MPL-2.0
declare const unit: unique symbol;
export type Centimeters = number & { readonly [unit]: 'cm' };
export type CssPixels = number & { readonly [unit]: 'css-px' };
export type CssPerCm = number & { readonly [unit]: 'css-px/cm' };
export type Axis = 'x' | 'y';
export type UnavailableState = 'not-requested' | 'unsupported' | 'empty' | 'omitted'
  | 'denied' | 'timeout' | 'cancelled' | 'error' | 'invalid';
export type ObservationState = 'available' | UnavailableState;
export interface Envelope { readonly key: string; readonly source: string; readonly at: number; readonly reason?: string | null }
export type Observation<T> = Readonly<Envelope & (
  { state: 'available'; value: T } | { state: UnavailableState; value?: never }
)>;
export interface CoordinateTuple { axes: readonly [number, number]; basis: string }
export interface CatalogueRow {
  id: string;
  name: string;
  entity: 'machine' | 'panel' | 'composite';
  modelCodes: readonly string[];
  webTuple?: CoordinateTuple | null;
  diagonalInches?: number | null;
  provenance: { source: string; revision: string; license: string };
  validation: 'nominal' | 'legacy-unverified' | 'measured';
}
export interface Candidate {
  id: string;
  entity: CatalogueRow['entity'];
  supports: string[];
  conflicts: string[];
  validation: CatalogueRow['validation'];
}
export interface Resolution {
  candidates: Candidate[];
  excluded: Candidate[];
  unknown: { possible: true; reason: 'catalogue-not-proven-exhaustive' };
  identity: 'single-compatible-known' | 'unresolved';
  physicalMapping: 'unresolved';
}
export interface RenderingContext {
  screenWidthCss: CssPixels | null;
  screenHeightCss: CssPixels | null;
  pageDpr: number | null;
  visualScale: number | null;
  zone: string;
  orientation: 'portrait' | 'landscape' | 'unknown';
  zoneGeometry: 'controlled-untransformed' | 'unqualified';
}
export type ReferenceKind = 'nominal-object' | 'independent-measurement';
export interface ReferenceInput {
  axis: Axis;
  cssLength: CssPixels;
  referenceCm: Centimeters;
  referenceKind: ReferenceKind;
  context: RenderingContext;
  revision: number;
  zone: string;
}
export interface Calibration {
  readonly axis: Axis;
  readonly cssPerCm: CssPerCm;
  readonly referenceCm: Centimeters;
  readonly cssLength: CssPixels;
  readonly referenceKind: ReferenceKind;
  readonly contextKey: string;
  readonly revision: number;
  readonly zone: string;
  readonly validation: 'user-reference';
  readonly independentlyChecked: false;
}
export interface LengthRequest {
  lengthCm: Centimeters;
  axis: Axis;
  context: RenderingContext;
  revision: number;
  calibrations?: readonly Calibration[];
  resolution?: Resolution | null;
}
interface DecisionBase {
  contractVersion: string;
  axis: Axis;
  lengthCm: Centimeters;
  revision: number;
  zone: string;
  identity: Resolution['identity'];
  unknownPossible: boolean;
  physicallyValidated: false;
}
export type LengthDecision = DecisionBase & (
  { status: 'reference-scaled'; reason: 'current-user-reference'; cssLength: CssPixels; cssPerCm: CssPerCm; referenceKind: ReferenceKind }
  | { status: 'needs-reference'; reason: 'no-current-axis-calibration'; cssLength: null }
  | { status: 'abstain'; reason: 'unqualified-zone' | 'conflicting-calibrations' | 'numeric-overflow'; cssLength: null }
);
declare const sessionToken: unique symbol;
export interface TaskToken { readonly [sessionToken]: true; readonly revision: number; readonly task: number }
export const CONTRACT_VERSION: '0.1.0-design';
export const OBSERVATION_STATES: readonly ObservationState[];
export function positive(value: unknown): value is number;
export function centimeters(value: unknown): Centimeters;
export function cssPixels(value: unknown): CssPixels;
export function observation<T>(input: Observation<T>): Observation<T>;
export function axisPairMatches(expected: readonly number[], actual: readonly number[], tolerance?: number): boolean;
export function validateCatalogue(rows: readonly CatalogueRow[]): true;
export function resolveCandidates(rows: readonly CatalogueRow[], evidence?: {
  machineModel?: Observation<string>;
  panelModel?: Observation<string>;
  webTuple?: Observation<CoordinateTuple>;
}): Resolution;
export function contextKey(sample: RenderingContext): string;
export function calibrationFromReference(input: ReferenceInput): Calibration;
export function decideLength(input: LengthRequest): LengthDecision;
export function closedIntervalEstimate(lower: CssPerCm, upper: CssPerCm): {
  cssPerCm: CssPerCm;
  relativeErrorBound: number;
  scope: 'assumed-closed-interval-only';
  physicallyValidated: false;
};
export class DetectionSession {
  readonly revision: number;
  readonly disposed: boolean;
  readonly result: unknown;
  readonly calibrations: Calibration[];
  observe(context: RenderingContext, options?: { force?: boolean }): boolean;
  invalidate(reason: string): boolean;
  beginTask(): TaskToken | null;
  commitTask(token: TaskToken | null, result: unknown): boolean;
  calibrate(input: Omit<ReferenceInput, 'revision'>): boolean;
  dispose(): void;
}
