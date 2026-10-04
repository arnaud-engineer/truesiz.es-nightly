// SPDX-License-Identifier: MPL-2.0
import { positive } from './core.mjs';

const text = value => typeof value === 'string' && value.length > 0 && value.length <= 256
  && !/[\x00-\x1f\x7f]/.test(value);
const code = value => text(value) ? value.trim().toUpperCase() : null;
const clone = value => structuredClone(value);
const provenance = value => value && ['source', 'revision', 'license'].every(key => text(value[key]));
const fail = () => { throw new TypeError('Invalid declaration graph'); };

export function validateGraph(graph) {
  if (!graph || graph.schemaVersion !== 1 || !provenance(graph.provenance)) fail();
  const ids = new Map();
  for (const type of ['machines', 'panels', 'modes', 'aliases', 'relations']) {
    if (!Array.isArray(graph[type]) || graph[type].length > 100000) fail();
    for (const item of graph[type]) {
      if (!item || !text(item.id) || ids.has(item.id) || !provenance(item.provenance)
        || !['nominal', 'legacy-unverified'].includes(item.validation)) fail();
      ids.set(item.id, type);
      if (['machines', 'panels'].includes(type) && !text(item.name)) fail();
      if (type === 'machines' && (!Array.isArray(item.legacyUaClues)
        || !item.legacyUaClues.every(text))) fail();
      if (type === 'panels' && item.diagonalInches !== null && !positive(item.diagonalInches)) fail();
      if (type === 'modes' && (!Array.isArray(item.axes) || item.axes.length !== 2 || !item.axes.every(positive)
        || !text(item.basis))) fail();
      if (type === 'aliases' && (!['ua-ch-model', 'user-model-code'].includes(item.namespace)
        || !code(item.value) || item.review !== 'accepted')) fail();
    }
  }
  for (const item of graph.aliases) if (ids.get(item.target) !== 'machines') fail();
  for (const item of graph.relations) {
    const pair = item.kind === 'can-ship-with' ? ['machines', 'panels']
      : item.kind === 'can-present' ? ['panels', 'modes'] : null;
    if (!pair || ids.get(item.from) !== pair[0] || ids.get(item.to) !== pair[1]) fail();
  }
  return true;
}

export class DeclarationGraph {
  #graph;
  #entities;
  constructor(graph) {
    validateGraph(graph);
    this.#graph = clone(graph);
    this.#entities = new Map([...this.#graph.machines, ...this.#graph.panels].map(item => [item.id, item]));
  }
  get counts() {
    return Object.fromEntries(['machines', 'panels', 'modes', 'aliases', 'relations'].map(key => [key, this.#graph[key].length]));
  }
  declaration(id) { return clone(this.#entities.get(id) ?? null); }
  search(query, { limit = 30 } = {}) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new TypeError('Invalid result limit');
    const q = typeof query === 'string' && query.length <= 256 ? query.trim().toUpperCase() : '';
    if (!q) return { rows: [], total: 0 };
    const rows = [...this.#entities.values()].filter(item => item.name.toUpperCase().includes(q));
    return { rows: clone(rows.slice(0, limit)), total: rows.length };
  }
  resolve({ model, uaTokens, selectedId = null } = {}) {
    const supports = new Map();
    const add = (id, reason) => {
      if (!supports.has(id)) supports.set(id, []);
      supports.get(id).push(reason);
    };
    if (model?.state === 'available' && code(model.value)) {
      for (const alias of this.#graph.aliases) if (alias.namespace === 'ua-ch-model' && code(alias.value) === code(model.value)) {
        add(alias.target, 'reviewed-model-alias');
      }
    }
    // Only the original UA consumer family is admissible, never Apple/GPU positional clues.
    if (uaTokens?.state === 'available' && Array.isArray(uaTokens.value) && uaTokens.value.length <= 64) {
      const tokens = new Set(uaTokens.value.map(code).filter(Boolean));
      for (const machine of this.#graph.machines) if (machine.legacyUaClues.some(clue => tokens.has(code(clue)))) {
        add(machine.id, 'exact-legacy-ua-clue-unverified');
      }
    }
    if (this.#entities.has(selectedId)) add(selectedId, 'user-declaration');
    const candidates = [...supports].map(([id, reasons]) => ({ ...this.declaration(id), supports: reasons,
      conflicts: [], physicalMapping: 'unresolved' }));
    const machine = candidates.filter(item => this.#graph.machines.some(row => row.id === item.id));
    const panel = candidates.filter(item => this.#graph.panels.some(row => row.id === item.id));
    const branch = rows => ({ status: rows.length === 1 && rows[0].supports.includes('reviewed-model-alias')
      ? 'single-compatible-known' : rows.length ? 'indicative' : 'unresolved', candidates: rows });
    const proposedPanels = this.#graph.relations.filter(edge => edge.kind === 'can-ship-with'
      && machine.some(item => item.id === edge.from)).map(edge => ({ declaration: this.declaration(edge.to), relation: clone(edge) }));
    return { machine: branch(machine), panel: branch(panel), proposedPanels,
      unknown: { possible: true, reason: 'catalogue-not-proven-exhaustive' }, excluded: [],
      physicalMapping: 'unresolved', physicallyValidated: false };
  }
}
