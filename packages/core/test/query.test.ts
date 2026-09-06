import { describe, expect, it } from 'vitest';
import { childrenOf, eventsOf, find, node, openDocument, pathTo, structures, tree } from '../src/index.js';
import { example } from './helpers.js';

const doc = openDocument(example('containment'));

describe('query API', () => {
  it('structures lists names, descriptions and roots', () => {
    expect(structures(doc)).toEqual([{ name: 'dashboard', description: expect.stringContaining('A dashboard screen'), root: 'dashboard' }]);
  });

  it('tree returns the first structure by default and prunes by depth', () => {
    expect(tree(doc)!.id).toBe('dashboard');
    const pruned = tree(doc, 'dashboard', 1)!;
    expect(pruned.children!.map((c) => c.id)).toContain('kpi-grid');
    const grid = pruned.children!.find((c) => c.id === 'kpi-grid')!;
    expect(grid.children).toEqual([{ id: 'kpi-card', type: 'card' }, { id: 'kpi-summary', type: 'card' }]);
    expect(tree(doc, 'component:StatusBadge')!.id).toBe('status-badge');
    expect(tree(doc, 'missing')).toBeUndefined();
  });

  it('node returns the node with its owner and pointer', () => {
    const hit = node(doc, 'results-cell-name-text')!;
    expect(hit.structure).toBe('dashboard');
    expect(hit.path).toBe('/structures/dashboard/root/children/4/children/1/children/0/children/0');
    expect(node(doc, 'status-badge-dot')!.structure).toBe('component:StatusBadge');
    expect(node(doc, 'nope')).toBeUndefined();
  });

  it('find by type, kind, event, component, text and structure', () => {
    expect(find(doc, { type: 'cell' }).map((h) => h.id)).toHaveLength(6);
    expect(find(doc, { type: 'icon', structure: 'component:StatusBadge' }).map((h) => h.id)).toEqual(['status-badge-dot']);
    expect(find(doc, { event: 'onConfirmDelete' }).map((h) => h.id)).toEqual(['confirm-delete-ok']);
    expect(find(doc, { event: 'refresh' }).map((h) => h.id)).toEqual(['confirm-delete-ok']);
    expect(find(doc, { event: 'confirm-delete' }).map((h) => h.id)).toEqual(['results-delete-button', 'confirm-delete-cancel']);
    expect(find(doc, { component: 'Dialog' }).map((h) => h.id)).toEqual(['confirm-delete']);
    expect(find(doc, { text: 'delete row' }).map((h) => h.id)).toEqual(['confirm-delete-title']);
    expect(find(doc, { type: 'text', text: 'kpi' }).length).toBeGreaterThan(1);
    expect(find(doc, { kind: 'logical' })).toEqual([]);
  });

  it('pathTo returns the chain from the root to a deep cell', () => {
    expect(pathTo(doc, 'results-cell-value-text').map((h) => h.id)).toEqual(['dashboard', 'results-table', 'results-row', 'results-cell-value', 'results-cell-value-text']);
    expect(pathTo(doc, 'nope')).toEqual([]);
  });

  it('eventsOf and childrenOf', () => {
    expect(eventsOf(doc, 'confirm-delete-ok')).toEqual([expect.objectContaining({ handler: 'onConfirmDelete', actions: ['remove', 'close', 'refresh'] })]);
    expect(eventsOf(doc, 'dashboard-title')).toEqual([]);
    expect(eventsOf(doc, 'nope')).toBeUndefined();
    expect(childrenOf(doc, 'results-header-row')!.map((h) => h.id)).toEqual(['results-header-name', 'results-header-value', 'results-header-actions']);
    expect(childrenOf(doc, 'nope')).toBeUndefined();
  });
});
