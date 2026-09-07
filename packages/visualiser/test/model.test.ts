import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildModel, childrenOf, countsByType, DEFAULT_FILTERS, expandPaths, expandedToDepth, pathOf, resolveVid, search, vid, visibleForest } from '../src/model.js';

const ROOT = new URL('../../../', import.meta.url);
const doc = JSON.parse(readFileSync(new URL('examples/containment.json', ROOT), 'utf8'));
const model = buildModel(doc);
const F = DEFAULT_FILTERS;

describe('model: components', () => {
  it('groups component definitions and records used-by edges', () => {
    expect(model.groups.map((g) => g.name)).toEqual(['Ungrouped']);
    expect([...model.cards.keys()]).toEqual(['StatusBadge', 'Dialog']);
    expect(model.cards.get('StatusBadge')!.usedBy).toEqual([{ owner: 'dashboard', ownerKind: 'structure', nodeId: 'dashboard-status' }]);
    expect(model.edges).toEqual([]);
  });

  it('draws component-to-component uses as edges', () => {
    const d2 = JSON.parse(JSON.stringify(doc));
    d2.components.Panel = { description: 'p', group: 'Layout', structure: { id: 'panel', type: 'container', children: [{ id: 'panel-badge', type: 'badge', $ref: '#/components/StatusBadge' }] } };
    const m2 = buildModel(d2);
    expect(m2.edges).toEqual([{ from: 'Panel', to: 'StatusBadge' }]);
    expect(m2.groups.map((g) => g.name)).toEqual(['Ungrouped', 'Layout']);
  });

  it('opens at the group level with components collapsed and no detail drawn', () => {
    const expanded = expandedToDepth(model, 'components', 1);
    const forest = visibleForest(model, 'components', F, expanded);
    expect(forest.nodes.map((n) => n.id)).toEqual(['group:Ungrouped', 'component:StatusBadge', 'component:Dialog']);
    expect(forest.nodes.filter((n) => n.vnode.kind === 'component').every((n) => n.collapsed)).toBe(true);
  });

  it('expanding a component reveals sections one level at a time, then entries, then the structure root', () => {
    const comp = resolveVid('component:Dialog', model)!;
    expect(childrenOf(comp, model, F).map((c) => c.lines)).toEqual([['props', '1 entry'], ['events', '1 entry'], ['slots', '3 entries'], ['structure', 'root dialog-frame']]);
    const expanded = new Set(['group:Ungrouped', 'component:Dialog', 'component:Dialog#slots']);
    const forest = visibleForest(model, 'components', F, expanded);
    expect(forest.nodes.map((n) => n.id)).toContain('component:Dialog#slots.0');
    expect(forest.nodes.map((n) => n.id)).not.toContain('entry:dialog-frame');
    expanded.add('component:Dialog#structure');
    expect(visibleForest(model, 'components', F, expanded).nodes.map((n) => n.id)).toContain('entry:dialog-frame');
  });
});

describe('model: structures', () => {
  it('opens every structure root collapsed to depth 1', () => {
    const expanded = expandedToDepth(model, 'structures', 1);
    const forest = visibleForest(model, 'structures', F, expanded);
    expect(forest.nodes[0].id).toBe('entry:dashboard');
    const drawnEntries = forest.nodes.filter((n) => n.vnode.kind === 'entry').map((n) => n.id);
    expect(drawnEntries).toEqual(['entry:dashboard', 'entry:dashboard-header', 'entry:dashboard-skeleton', 'entry:dashboard-empty', 'entry:kpi-grid', 'entry:results-table', 'entry:confirm-delete']);
    expect(forest.nodes.filter((n) => n.vnode.kind === 'section').map((n) => n.id)).toEqual(['entry:dashboard#facts', 'entry:dashboard#states']);
    expect(forest.nodes.filter((n) => n.id !== 'entry:dashboard').every((n) => !n.hasChildren || n.collapsed)).toBe(true);
  });

  it('cards carry only id, type and component', () => {
    expect(resolveVid('entry:dashboard-status', model)!.lines).toEqual(['dashboard-status', 'badge : StatusBadge']);
    expect(resolveVid('entry:kpi-card', model)!.lines).toEqual(['kpi-card', 'card']);
  });

  it('filters: hide leaves, hide overlays, only component, hide logical hoists, collapse repeat', () => {
    const all = expandedToDepth(model, 'structures', 40);
    const entries = (filters: typeof F) => visibleForest(model, 'structures', filters, all).nodes.filter((n) => n.vnode.kind === 'entry').map((n) => n.id.slice(6));
    expect(entries({ ...F, hideLeaves: true })).not.toContain('kpi-card-trend');
    expect(entries({ ...F, hideOverlays: true })).not.toContain('confirm-delete-title');
    expect(entries({ ...F, onlyComponent: true })).toEqual(['dashboard', 'dashboard-status', 'confirm-delete']);
    const d2 = JSON.parse(JSON.stringify(doc));
    d2.structures.dashboard.root.children[0].kind = 'logical';
    const hoisted = visibleForest(buildModel(d2), 'structures', { ...F, hideLogical: true }, all);
    expect(hoisted.edges).toContainEqual({ from: 'entry:dashboard', to: 'entry:dashboard-title' });
    const collapsed = entries({ ...F, collapseRepeat: true });
    expect(collapsed).toContain('kpi-card');
    expect(collapsed).not.toContain('kpi-card-name');
  });

  it('search finds by id, label, component and expands the path to each hit', () => {
    const hits = search(model, 'structures', 'delete row');
    expect(hits.map((h) => h.vid)).toEqual(['entry:confirm-delete-title']);
    const expanded = expandPaths(hits, expandedToDepth(model, 'structures', 1), model);
    expect(expanded.has('entry:confirm-delete')).toBe(true);
    expect(visibleForest(model, 'structures', F, expanded).nodes.map((n) => n.id)).toContain('entry:confirm-delete-title');
    expect(search(model, 'structures', 'StatusBadge').map((h) => h.vid)).toEqual(['entry:dashboard-status']);
    expect(search(model, 'components', 'badge').map((h) => h.vid)).toEqual(['component:StatusBadge', 'entry:status-badge', 'entry:status-badge-dot', 'entry:status-badge-text']);
  });

  it('paths run from the group through the component and structure section to the entry', () => {
    const v = resolveVid('entry:status-badge-dot', model)!;
    expect(pathOf(v, model).map((p) => p.vid)).toEqual(['group:Ungrouped', 'component:StatusBadge', 'component:StatusBadge#structure', 'entry:status-badge', 'entry:status-badge-dot']);
    expect(resolveVid('entry:dashboard#states.1', model)!.lines[0]).toBe('loading');
    expect(pathOf(resolveVid('entry:dashboard#states.1', model)!, model).map((p) => p.vid)).toEqual(['entry:dashboard', 'entry:dashboard#states', 'entry:dashboard#states.1']);
  });

  it('counts by node type for drawn entries and by kind otherwise', () => {
    const forest = visibleForest(model, 'structures', F, expandedToDepth(model, 'structures', 1));
    expect(countsByType(forest.nodes)).toEqual([['container', 2], ['section', 2], ['dialog', 1], ['grid', 1], ['skeleton', 1], ['table', 1], ['text', 1]]);
  });
});
