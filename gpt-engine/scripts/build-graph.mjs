// SPDX-License-Identifier: MPL-2.0
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateGraph } from '../src/graph.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = JSON.parse(await fs.readFile(path.join(root, 'catalogue/legacy-declarations.json'), 'utf8'));
const provenance = { source: 'inherited/data.js', revision: source.source.sha256, license: 'MPL-2.0' };
const graph = { schemaVersion: 1, provenance, machines: [], panels: [], modes: [], aliases: [], relations: [] };
for (const row of source.rows) {
  const base = { provenance, validation: 'legacy-unverified' };
  const machineId = row.id + '-machine';
  const panelId = row.id + '-panel';
  const modeId = row.id + '-mode';
  if (row.legacy.family !== 'lMonitor') {
    graph.machines.push({ ...base, id: machineId, name: row.name,
      legacyUaClues: row.legacy.family === 'lUserAgentDetectable' ? row.legacy.uaClues : [],
      legacyId: row.id, sourceLine: row.legacy.line });
  }
  graph.panels.push({ ...base, id: panelId, name: row.name + ' (declaration de panneau)',
    diagonalInches: row.diagonalInches, legacyId: row.id });
  graph.modes.push({ ...base, id: modeId, axes: row.legacy.declaredPixelAxes, basis: 'legacy-unqualified' });
  graph.relations.push({ ...base, id: row.id + '-mode-edge', kind: 'can-present', from: panelId, to: modeId });
  if (row.legacy.family !== 'lMonitor' && row.legacy.builtIn) {
    graph.relations.push({ ...base, id: row.id + '-panel-edge', kind: 'can-ship-with', from: machineId, to: panelId });
  }
}
validateGraph(graph);
await fs.writeFile(path.join(root, 'catalogue/runtime-graph.json'), JSON.stringify(graph) + '\n');
console.log(JSON.stringify({ ...Object.fromEntries(['machines', 'panels', 'modes', 'aliases', 'relations'].map(key => [key, graph[key].length])),
  physicalMapping: 'unresolved', acceptedAliases: 0 }));
