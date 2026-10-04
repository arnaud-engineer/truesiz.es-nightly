import type { Calibration, RenderingContext, Observation, ReferenceKind } from './core.mjs';
import type { DeclarationData, GraphResolution, MachineDeclaration, PanelDeclaration } from './graph.mjs';
import type { ObjectRequest, ObjectDecision } from './object.mjs';
import type { SurfaceSnapshot } from './surface.mjs';
import type { ProfileReadResult, ProfileWriteResult } from './profile.mjs';
export const DETECTOR_VERSION: '0.2.0-experimental';
export interface DetectorSnapshot {
  version: typeof DETECTOR_VERSION; revision: number; context: RenderingContext;
  observations: Record<string, unknown>; model: Observation<string>; identity: GraphResolution;
  surface: SurfaceSnapshot; calibrations: Calibration[]; physicallyValidated: false; disposed: boolean;
}
export function acquireUaTokens(host: Navigator, options?: { requested?: boolean }): Observation<string[]>;
export class DeviceDetector {
  constructor(input: { window: Window; zone: Element; elements?: Element[]; graph: DeclarationData });
  readonly snapshot: DetectorSnapshot; readonly revision: number; readonly disposed: boolean;
  subscribe(callback: (snapshot: DetectorSnapshot) => void): () => void;
  refresh(options?: { force?: boolean; reason?: string }): boolean;
  start(): void;
  identify(options?: { requested?: boolean; signal?: AbortSignal; timeoutMs?: number }): Promise<DetectorSnapshot | { status: 'cancelled' }>;
  search(query: string, options?: { limit?: number }): { rows: (MachineDeclaration | PanelDeclaration)[]; total: number };
  selectDeclaration(id: string | null): boolean;
  reviewAxis(axis: 'x' | 'y'): boolean;
  calibrate(input: { axis: 'x' | 'y'; cssLength: number; referenceCm: number; referenceKind?: ReferenceKind }):
    { status: 'reference-scaled' | 'invalid' | 'cancelled'; physicallyValidated?: false };
  decideObject(input: ObjectRequest): ObjectDecision | { status: 'abstain'; reason: 'disposed' | 'hidden-document'; widthCss: null; heightCss: null; physicallyValidated: false };
  save(storage: Storage, options?: { requested?: boolean }): ProfileWriteResult | { status: 'cancelled' };
  restore(storage: Storage): ProfileReadResult | { status: 'cancelled'; profile: null };
  reset(storage: Storage, options?: { requested?: boolean }): ReturnType<typeof import('./profile.mjs').removeProfile> | { status: 'cancelled' };
  requestScreens(options?: { requested?: boolean; signal?: AbortSignal; timeoutMs?: number }): Promise<SurfaceSnapshot | { status: 'cancelled' }>;
  selectScreen(id: string): boolean; disconnectScreens(): void;
  fullscreen(element: Element): Promise<{ status: 'available' | 'unsupported' | 'denied' | 'error' }>;
  dispose(): void;
}
