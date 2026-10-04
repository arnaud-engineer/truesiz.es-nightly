export interface Segment { x: number; y: number; width: number; height: number }
export interface SegmentObservation { state: 'available' | 'unsupported' | 'invalid' | 'error'; value: Segment[] | null }
export interface SurfaceSnapshot {
  status: 'not-requested' | 'unsupported' | 'available' | 'invalid' | 'error' | 'denied' | 'cancelled' | 'timeout';
  screens: { id: string; widthCss: number | null; heightCss: number | null; internal: boolean | null }[];
  selectedId: string | null; binding: 'proposed' | 'unresolved'; physicallyValidated: false;
}
export function qualifyGeometry(elements: readonly Element[], getStyle: (element: Element) => CSSStyleDeclaration): boolean;
export function readSegments(host: Window): SegmentObservation;
export function readPosture(host: Window): { state: string; value: 'continuous' | 'folded' | null };
export function segmentContains(segments: SegmentObservation, rect: Segment): { status: 'unresolved' | 'unqualified' | 'contained'; admissible: boolean; segment: number | null };
export class SurfaceMonitor {
  constructor(input: { window: Window; onChange?: (reason: string) => void });
  readonly bindingEpoch: number; readonly snapshot: SurfaceSnapshot;
  start(): void;
  request(options?: { requested?: boolean; signal?: AbortSignal; timeoutMs?: number }): Promise<SurfaceSnapshot | { status: 'cancelled' }>;
  select(id: string): boolean;
  fullscreen(element: Element): Promise<{ status: 'available' | 'unsupported' | 'denied' | 'error' }>;
  disconnect(): void; dispose(): void;
}
