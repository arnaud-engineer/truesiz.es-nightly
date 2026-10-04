// SPDX-License-Identifier: MPL-2.0
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { positive, validateCatalogue } from '../src/core.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = await fs.readFile(path.join(root, 'data.js'));
const sourceSha256 = crypto.createHash('sha256').update(input).digest('hex');
const source = ts.createSourceFile('data.js', input.toString('utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(source.parseDiagnostics.length, 0, 'Legacy source must parse without recovery');
const declarations = [];
const rejected = [];
const occurrences = new Map();
const digestContents = new Map();
const reviewedFamilies = new Set(['lIphone', 'lIpad', 'lMac', 'lChromebook', 'lTablet',
  'lMobile', 'lLaptop', 'lMonitor', 'lComputer', 'lUserAgentDetectable']);
function literal(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isNumericLiteral(node)) return Number(node.text);
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
  throw new TypeError('Non-literal Device argument at ' + source.getLineAndCharacterOfPosition(node.getStart()).line);
}
function familyFor(node) {
  let cursor = node.parent;
  while (cursor) {
    if (ts.isVariableDeclaration(cursor) && ts.isIdentifier(cursor.name)) return cursor.name.text;
    cursor = cursor.parent;
  }
  throw new TypeError('Device declaration outside a named family');
}
function visit(node) {
  if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Device') {
    const args = (node.arguments ?? []).map(literal);
    const family = familyFor(node);
    assert(reviewedFamilies.has(family), 'Unreviewed Device family: ' + family);
    const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
    const [name, uaClues, gpuClues, diagonalInches, width, height, confidence = 3, builtIn = true] = args;
    const list = value => typeof value === 'string' ? (value ? [value] : [])
      : Array.isArray(value) && value.every(item => typeof item === 'string') ? value : null;
    if (args.length < 6 || args.length > 8 || typeof name !== 'string' || !name || name.length > 256
      || !list(uaClues) || !list(gpuClues) || !positive(diagonalInches) || !positive(width) || !positive(height)
      || !Number.isInteger(confidence) || confidence < 0 || confidence > 3 || typeof builtIn !== 'boolean') {
      rejected.push({ family, line, name: typeof name === 'string' ? name : null, reason: 'invalid-literal-declaration', arguments: args });
    } else {
      const content = JSON.stringify({ family, args });
      const digest = crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
      assert(!digestContents.has(digest) || digestContents.get(digest) === content, 'Truncated declaration hash collision');
      digestContents.set(digest, content);
      const occurrence = (occurrences.get(digest) ?? 0) + 1;
      occurrences.set(digest, occurrence);
      declarations.push({
        id: `legacy-${digest}-${occurrence}`, name,
        entity: 'composite', modelCodes: [], diagonalInches,
        provenance: { source: 'inherited/data.js', revision: sourceSha256, license: 'MPL-2.0' },
        validation: 'legacy-unverified',
        legacy: { family, line, uaClues: list(uaClues), gpuClues: list(gpuClues), confidence, builtIn,
          declaredPixelAxes: [width, height], coordinateBasis: 'legacy-unqualified',
          aliasPolicy: 'ua-substring-clue-not-a-reviewed-model-code',
          conversionAllowed: false, relationToActivePanel: 'unresolved' },
      });
    }
  }
  ts.forEachChild(node, visit);
}
visit(source);
validateCatalogue(declarations);
const families = {};
const aliases = new Map();
for (const row of declarations) {
  families[row.legacy.family] = (families[row.legacy.family] ?? 0) + 1;
  for (const clue of row.legacy.uaClues) {
    const key = clue.trim().toUpperCase();
    if (!aliases.has(key)) aliases.set(key, []);
    aliases.get(key).push({ id: row.id, name: row.name, diagonalInches: row.diagonalInches, line: row.legacy.line });
  }
}
const collisions = [...aliases].filter(([, rows]) => rows.length > 1).map(([clue, rows]) => ({ clue, rows,
  differentDiagonal: new Set(rows.map(row => row.diagonalInches)).size > 1 }));
const result = { schemaVersion: 1, source: { filename: 'data.js', sha256: sourceSha256 },
  method: 'TypeScript AST, literal arguments only, no execution. Legacy substring clues are NOT automatically model-code aliases; all imported rows are unverified composites, never scale providers.',
  counts: { declarations: declarations.length, rejected: rejected.length, families,
    aliasCollisions: collisions.length, aliasCollisionsDifferentDiagonal: collisions.filter(row => row.differentDiagonal).length },
  rows: declarations, rejected, collisions };
await fs.mkdir(path.join(root, 'catalogue'), { recursive: true });
await fs.writeFile(path.join(root, 'catalogue/legacy-declarations.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ source: result.source, counts: result.counts }));
