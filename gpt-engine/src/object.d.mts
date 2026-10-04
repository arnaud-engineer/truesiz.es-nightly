import type { RenderingContext, Calibration, Resolution, LengthDecision } from './core.mjs';
export interface ObjectRequest {
  width: number; height: number; unit?: 'cm' | 'in'; rotation?: 0 | 90;
  capacity: { width: number; height: number };
}
interface ObjectDecisionBase {
  reason: string; revision: number; zone: string; physicallyValidated: false;
  axes: { x: LengthDecision; y: LengthDecision } | null;
}
export type ObjectDecision = ObjectDecisionBase & (
  { status:'reference-scaled'; widthCss:number; heightCss:number; widthCm:number; heightCm:number }
  | { status:'needs-reference' | 'abstain' | 'out-of-zone'; widthCss:null; heightCss:null }
);
export function toCentimeters(value: number, unit: 'cm' | 'in'): number;
export function decideObject(input: ObjectRequest & { context: RenderingContext; revision: number;
  calibrations?: readonly Calibration[]; resolution?: Resolution | null }): ObjectDecision;
export function graduations(input: { cssPerCm: number; lengthCss: number; unit?: 'cm' | 'in'; maxTicks?: number }):
  { value: number; cssPosition: number; major: boolean; label: string | null }[];
