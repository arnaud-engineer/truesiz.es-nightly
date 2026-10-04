import type { Observation } from './core.mjs';
export interface Provenance { source: string; revision: string; license: string }
interface Assertion { id: string; provenance: Provenance; validation: 'nominal' | 'legacy-unverified' }
export interface MachineDeclaration extends Assertion { name: string; legacyUaClues: string[] }
export interface PanelDeclaration extends Assertion { name: string; diagonalInches: number | null }
export interface DeclarationData {
  schemaVersion: 1; provenance: Provenance;
  machines: MachineDeclaration[]; panels: PanelDeclaration[];
  modes: (Assertion & { axes: [number, number]; basis: string })[];
  aliases: (Assertion & { namespace: 'ua-ch-model' | 'user-model-code'; value: string; target: string; review: 'accepted' })[];
  relations: (Assertion & { kind: 'can-ship-with' | 'can-present'; from: string; to: string })[];
}
export type IdentityCandidate = (MachineDeclaration | PanelDeclaration) & {
  supports: string[]; conflicts: []; physicalMapping: 'unresolved';
};
export interface GraphResolution {
  machine: { status: 'single-compatible-known' | 'indicative' | 'unresolved'; candidates: IdentityCandidate[] };
  panel: { status: 'single-compatible-known' | 'indicative' | 'unresolved'; candidates: IdentityCandidate[] };
  proposedPanels: { declaration: PanelDeclaration | null; relation: DeclarationData['relations'][number] }[];
  unknown: { possible: true; reason: 'catalogue-not-proven-exhaustive' };
  excluded: []; physicalMapping: 'unresolved'; physicallyValidated: false;
}
export function validateGraph(input: DeclarationData): true;
export class DeclarationGraph {
  constructor(graph: DeclarationData);
  readonly counts: Record<'machines' | 'panels' | 'modes' | 'aliases' | 'relations', number>;
  declaration(id: string): MachineDeclaration | PanelDeclaration | null;
  search(query: string, options?: { limit?: number }): { rows: (MachineDeclaration | PanelDeclaration)[]; total: number };
  resolve(evidence?: { model?: Observation<string>; uaTokens?: Observation<string[]> | null; selectedId?: string | null }): GraphResolution;
}
