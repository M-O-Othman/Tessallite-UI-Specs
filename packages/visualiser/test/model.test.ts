import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildModel, childrenOf, countsByType, DEFAULT_FILTERS, expandPaths, expandedToDepth, pathOf, resolveVid, rootsOf, search, vid, visibleForest } from '../src/model.js';

const ROOT = new URL('../../../', import.meta.url);
const doc = JSON.parse(readFileSync(new URL('examples/containment.json', ROOT), 'utf8'));
const model = buildModel(doc);
const F = DEFAULT_FILTERS;

describe('model: components', () => {
  it('records used-by per component and component-to-component uses', () => {
    expect([...model.cards.keys()]).toEqual(['StatusBadge', 'Dialog']);
    expect(model.cards.get('StatusBadge')!.usedBy).toEqual([{ owner: 'dashboard', ownerKind: 'structure', nodeId: 'dashboard-status' }]);
    expect(model.edges).toEqual([]);
  });

  it('opens at the structure level with the top-level component instances collapsed and no detail drawn', () => {
    const expanded = expandedToDepth(model, 'components', 1);
    const forest = visibleForest(model, 'components', F, expanded);
    expect(forest.nodes.map((n) => n.id)).toEqual(['ct:dashboard', 'ct:dashboard/StatusBadge@dashboard-status', 'ct:dashboard/Dialog@confirm-delete']);
    expect(forest.nodes.filter((n) => n.vnode.kind === 'component').every((n) => n.collapsed)).toBe(true);
  });

  it('nests distinct component instances from definitions and preserves explicit instance children', () => {
    const d2 = JSON.parse(JSON.stringify(doc));
    d2.components.Panel = { description: 'p', group: 'Layout', structure: { id: 'panel', type: 'container', children: [
      { id: 'panel-badge', type: 'badge', $ref: '#/components/StatusBadge' }, { id: 'panel-badge-2', type: 'badge', component: 'StatusBadge' },
    ] } };
    d2.structures.dashboard.root.children.push({ id: 'dashboard-panel', type: 'container', component: 'Panel' });
    const m2 = buildModel(d2);
    const panel = resolveVid('ct:dashboard/Panel@dashboard-panel', m2)!;
    expect(panel.badge).toBe('Layout');
    const kids = childrenOf(panel, m2, F);
    expect(kids.filter((k) => k.kind === 'component').map((k) => k.lines)).toEqual([['StatusBadge', 'badge panel-badge'], ['StatusBadge', 'badge panel-badge-2']]);
    expect(kids.filter((k) => k.kind === 'section').map((k) => k.lines[0])).toEqual(['structure']);
    expect(pathOf(kids[1], m2).map((v) => v.lines[0])).toEqual(['dashboard', 'Panel', 'StatusBadge']);
    expect(rootsOf(m2, 'components').map((r) => r.vid)).toEqual(['ct:dashboard']);
    d2.structures.dashboard.root.children.at(-1).children = [{ id: 'dp-dialog', type: 'dialog', component: 'Dialog' }];
    const explicit = buildModel(d2);
    expect(childrenOf(resolveVid('ct:dashboard/Panel@dashboard-panel', explicit)!, explicit, F).filter((k) => k.kind === 'component').map((k) => k.card.id)).toEqual(['Dialog']);
  });

  it('does not recurse into a component that contains itself', () => {
    const d3 = JSON.parse(JSON.stringify(doc));
    d3.components.Tree = { description: 't', structure: { id: 'tree', type: 'list', children: [{ id: 'tree-child', type: 'list-item', component: 'Tree' }] } };
    d3.structures.dashboard.root.children.push({ id: 'dashboard-tree', type: 'list', component: 'Tree' });
    const m3 = buildModel(d3);
    const tree = resolveVid('ct:dashboard/Tree@dashboard-tree', m3)!;
    const inner = childrenOf(tree, m3, F).filter((k) => k.kind === 'component');
    expect(inner.map((k) => k.card.id)).toEqual(['Tree']);
    expect(childrenOf(inner[0], m3, F).filter((k) => k.kind === 'component')).toEqual([]);
  });

  it('expanding an instance reveals its sections one level at a time, then entries, then the instance node', () => {
    const inst = 'ct:dashboard/Dialog@confirm-delete';
    const comp = resolveVid(inst, model)!;
    expect(childrenOf(comp, model, F).map((c) => c.lines)).toEqual([['props', '1 entry'], ['events', '1 entry'], ['slots', '3 entries'], ['structure', 'root confirm-delete']]);
    const expanded = new Set(['ct:dashboard', inst, `${inst}#slots`]);
    const forest = visibleForest(model, 'components', F, expanded);
    expect(forest.nodes.map((n) => n.id)).toContain(`${inst}#slots.0`);
    expect(forest.nodes.map((n) => n.id)).not.toContain('entry:confirm-delete');
    expanded.add(`${inst}#structure`);
    expect(visibleForest(model, 'components', F, expanded).nodes.map((n) => n.id)).toContain(`${inst}#structure~confirm-delete`);
  });

  it('components nothing instantiates sit under an Unreferenced group', () => {
    const d4 = JSON.parse(JSON.stringify(doc));
    const prune = (n: { id: string; children?: { id: string }[] }) => { n.children = n.children?.filter((c) => c.id !== 'dashboard-status'); n.children?.forEach(prune); };
    prune(d4.structures.dashboard.root);
    const m4 = buildModel(d4);
    expect(rootsOf(m4, 'components').map((r) => r.vid)).toEqual(['ct:dashboard', 'group:Unreferenced']);
    const forest = visibleForest(m4, 'components', F, expandedToDepth(m4, 'components', 1));
    expect(forest.nodes.map((n) => n.id)).toContain('component:StatusBadge');
    expect(pathOf(resolveVid('component:StatusBadge', m4)!, m4).map((v) => v.vid)).toEqual(['group:Unreferenced', 'component:StatusBadge']);
  });

  it('search in the Components view finds instances by name and expands the path', () => {
    const hits = search(model, 'components', 'status');
    expect(hits.map((h) => h.vid)).toEqual(['ct:dashboard/StatusBadge@dashboard-status']);
    expect([...expandPaths(hits, new Set(), model)]).toEqual(['ct:dashboard']);
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
    expect(search(model, 'components', 'badge').map((h) => h.vid)).toEqual(['ct:dashboard/StatusBadge@dashboard-status']);
  });

  it('paths run from the component through its structure section to the entry', () => {
    const v = resolveVid('entry:status-badge-dot', model)!;
    expect(pathOf(v, model).map((p) => p.vid)).toEqual(['component:StatusBadge', 'component:StatusBadge#structure', 'entry:status-badge', 'entry:status-badge-dot']);
    expect(resolveVid('entry:dashboard#states.1', model)!.lines[0]).toBe('loading');
    expect(pathOf(resolveVid('entry:dashboard#states.1', model)!, model).map((p) => p.vid)).toEqual(['entry:dashboard', 'entry:dashboard#states', 'entry:dashboard#states.1']);
  });

  it('counts by node type for drawn entries and by kind otherwise', () => {
    const forest = visibleForest(model, 'structures', F, expandedToDepth(model, 'structures', 1));
    expect(countsByType(forest.nodes)).toEqual([['container', 2], ['section', 2], ['dialog', 1], ['grid', 1], ['skeleton', 1], ['table', 1], ['text', 1]]);
  });
});
