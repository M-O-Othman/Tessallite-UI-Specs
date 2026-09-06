import { describe, expect, it } from 'vitest';
import { validateDocument, type UiSpecDocument } from '../src/index.js';
import { clone, example, rawNode } from './helpers.js';

const rulesOf = (doc: UiSpecDocument) => validateDocument(doc).errors.map((e) => e.rule);
const messages = (doc: UiSpecDocument) => validateDocument(doc).errors.map((e) => `${e.rule} ${e.message}`);

describe('semantic rules', () => {
  it('examples pass every rule', () => {
    expect(validateDocument(example('minimal'))).toEqual({ valid: true, errors: [] });
    expect(validateDocument(example('containment'))).toEqual({ valid: true, errors: [] });
  });

  it('R1 duplicate ids across structures and component structures', () => {
    const doc = clone(example('containment'));
    rawNode(doc, 'kpi-card-name').id = 'status-badge-dot';
    expect(messages(doc)).toContainEqual(expect.stringContaining('R1 duplicate id "status-badge-dot"'));
  });

  it('R4 repeat parent must declare data.collection', () => {
    const doc = clone(example('containment'));
    delete rawNode(doc, 'kpi-grid').data;
    expect(rulesOf(doc)).toContain('R4');
  });

  it('R5 at most one repeat child', () => {
    const doc = clone(example('containment'));
    rawNode(doc, 'kpi-summary').repeat = true;
    expect(rulesOf(doc)).toContain('R5');
  });

  it('R6 column ids unique and only on tables', () => {
    const doc = clone(example('containment'));
    rawNode(doc, 'results-table').columns!.push({ id: 'col-name' });
    rawNode(doc, 'kpi-summary').columns = [{ id: 'x' }];
    expect(rulesOf(doc).filter((r) => r === 'R6')).toHaveLength(2);
  });

  it('R7/R15 row must sit under a table, cell under a row, tab under tablist', () => {
    const doc = clone(example('containment'));
    const row = rawNode(doc, 'results-row');
    rawNode(doc, 'kpi-summary').children!.push({ id: 'stray-row', type: 'row' });
    rawNode(doc, 'kpi-summary').children!.push({ id: 'stray-tab', type: 'tab' });
    row.children!.push({ id: 'nested-cell-host', type: 'group', children: [{ id: 'stray-cell', type: 'cell', column: 'col-name' }] });
    const found = messages(doc);
    expect(found).toContainEqual(expect.stringContaining('R15 "stray-row" (row) must be a child of table'));
    expect(found).toContainEqual(expect.stringContaining('R15 "stray-tab" (tab) must be a child of tablist'));
    expect(found).toContainEqual(expect.stringContaining('R15 "stray-cell" (cell) must be a child of row'));
  });

  it('R7 a logical node between a table and its rows is allowed', () => {
    const doc = clone(example('containment'));
    const table = rawNode(doc, 'results-table');
    const rows = table.children!;
    table.children = [{ id: 'results-body', type: 'group', kind: 'logical', children: rows }];
    expect(rulesOf(doc)).not.toContain('R15');
  });

  it('R8 cell column must exist on the enclosing table', () => {
    const doc = clone(example('containment'));
    rawNode(doc, 'results-cell-value').column = 'col-missing';
    expect(messages(doc)).toContainEqual(expect.stringContaining('R8 cell "results-cell-value" names column "col-missing"'));
  });

  it('R9 tracks only on a grid', () => {
    const doc = clone(example('containment'));
    rawNode(doc, 'kpi-summary').tracks = { columns: 1 };
    expect(rulesOf(doc)).toContain('R9');
  });

  it('R10 placement must lie inside the declared tracks', () => {
    const doc = clone(example('containment'));
    rawNode(doc, 'kpi-card').placement = { column: 'missing' };
    rawNode(doc, 'kpi-summary').placement = { column: 'side', row: 2, rowSpan: 2 };
    const found = messages(doc);
    expect(found).toContainEqual(expect.stringContaining('R10 "kpi-card" placement.column "missing"'));
    expect(found).toContainEqual(expect.stringContaining('R10 "kpi-summary" rowSpan 2 extends past'));
  });

  it('R10 placement on a node whose parent is not a grid, or names a row when none is declared', () => {
    const doc = clone(example('containment'));
    rawNode(doc, 'dashboard-title').placement = { column: 1 };
    delete rawNode(doc, 'kpi-grid').tracks!.rows;
    const found = messages(doc);
    expect(found).toContainEqual(expect.stringContaining('R10 "dashboard-title" has placement but its parent is not a grid'));
    expect(found).toContainEqual(expect.stringContaining('R10 "kpi-summary" placement.row given but grid'));
  });

  it('R11 a slot must be declared by the parent (own slots, component or $ref)', () => {
    const doc = clone(example('containment'));
    rawNode(doc, 'confirm-delete-body').slot = 'footer';
    rawNode(doc, 'dashboard-title').slot = 'title';
    const found = messages(doc);
    expect(found).toContainEqual(expect.stringContaining('R25 "confirm-delete-body" fills slot "footer"'));
    expect(found).toContainEqual(expect.stringContaining('R11 "dashboard-title" fills slot "title"'));
  });

  it('R11 a node may declare its own slots for its children', () => {
    const doc = clone(example('containment'));
    rawNode(doc, 'dashboard-header').slots = [{ name: 'end' }];
    rawNode(doc, 'dashboard-status').slot = 'end';
    expect(validateDocument(doc).valid).toBe(true);
  });

  it('R12 slot names unique on nodes and components', () => {
    const doc = clone(example('containment'));
    doc.components.Dialog.slots!.push({ name: 'title' });
    rawNode(doc, 'dashboard-header').slots = [{ name: 'a' }, { name: 'a' }];
    expect(rulesOf(doc).filter((r) => r === 'R12')).toHaveLength(2);
  });

  it('R17 event target must exist, R18 emit needs emits', () => {
    const doc = clone(example('containment'));
    rawNode(doc, 'results-delete-button').events![0].target = 'nowhere';
    delete rawNode(doc, 'dialog-close').events![0].emits;
    const found = rulesOf(doc);
    expect(found).toContain('R17');
    expect(found).toContain('R18');
  });

  it('R20 state names unique, R21 present ids are descendants', () => {
    const doc = clone(example('containment'));
    rawNode(doc, 'kpi-card').states = ['default', 'default'];
    (rawNode(doc, 'dashboard').states![1] as { present: string[] }).present.push('kpi-summary-text', 'status-badge-dot');
    const found = messages(doc);
    expect(found).toContainEqual(expect.stringContaining('R20 state "default" declared twice'));
    expect(found).toContainEqual(expect.stringContaining('R21 state "loading" lists "status-badge-dot"'));
    expect(found).not.toContainEqual(expect.stringContaining('lists "kpi-summary-text"'));
  });

  it('R23 $ref must resolve, R24 type must match, R25 children must be slot fillers, R26 no cycles', () => {
    const doc = clone(example('containment'));
    rawNode(doc, 'dashboard-status').$ref = '#/components/Missing';
    rawNode(doc, 'confirm-delete').type = 'drawer';
    rawNode(doc, 'confirm-delete-title').slot = undefined;
    delete rawNode(doc, 'confirm-delete-title').slot;
    doc.components.StatusBadge.structure!.children!.push({ id: 'self', type: 'badge', $ref: '#/components/StatusBadge' });
    const found = rulesOf(doc);
    for (const rule of ['R23', 'R24', 'R25', 'R26']) expect(found).toContain(rule);
  });

  it('R24 a $ref node may not override columns or tracks', () => {
    const doc = clone(example('containment'));
    rawNode(doc, 'dashboard-status').columns = [{ id: 'c' }];
    expect(messages(doc)).toContainEqual(expect.stringContaining('R24 "dashboard-status" overrides "columns"'));
  });

  it('R25 a $ref to a structure must not have children', () => {
    const doc = clone(example('containment'));
    doc.structures!.reuse = { description: 'r', root: { id: 'reuse-root', type: 'container', children: [{ id: 'reuse-child', type: 'container', $ref: '#/structures/dashboard', children: [{ id: 'x', type: 'text' }] }] } };
    expect(messages(doc)).toContainEqual(expect.stringContaining('R25 "x": a $ref to a structure must not have children'));
    delete rawNode(doc, 'reuse-child').children;
    expect(validateDocument(doc).valid).toBe(true);
  });

  it('R15 leaf types must not have children', () => {
    const doc = clone(example('containment'));
    rawNode(doc, 'kpi-card-trend').children = [{ id: 'inner', type: 'text' }];
    expect(messages(doc)).toContainEqual(expect.stringContaining('R15 "kpi-card-trend" (icon) is a leaf type'));
  });
});
