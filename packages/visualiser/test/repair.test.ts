import { describe, expect, it } from 'vitest';
import { buildModel, childrenOf, DEFAULT_FILTERS, expandedToDepth, pathOf, resolveVid, search, vid, visibleForest } from '../src/model.js';
import { clone, example } from '../../core/test/helpers.js';

describe('viewer containment regressions', () => {
  it('resolves dotted names and prop keys without confusing them with virtual paths', () => {
    const model = buildModel({ components: { 'Panel.Header': { description: 'header', props: { 'aria.label': 'string' } } }, structures: { 'home.v2': { root: { id: 'home.v2', type: 'container', component: 'Panel.Header' } } } });
    const instance = vid.instance(vid.structure('home.v2'), 'Panel.Header', 'home.v2');
    const node = resolveVid(instance, model)!;
    expect(node.card.id).toBe('Panel.Header');
    const section = childrenOf(node, model, DEFAULT_FILTERS).find((node) => node.lines[0] === 'props')!;
    const prop = childrenOf(section, model, DEFAULT_FILTERS)[0];
    expect(pathOf(prop, model).map((node) => node.lines[0])).toEqual(['home.v2', 'Panel.Header', 'props', 'aria.label']);
    expect(resolveVid('not-a-virtual-id', model)).toBeUndefined();
  });

  it('retains both instances, their children and unique detail IDs', () => {
    const doc = clone(example('containment'));
    doc.structures!.dashboard.root.children!.push({ id: 'another-badge', type: 'badge', $ref: '#/components/StatusBadge' });
    const model = buildModel(doc);
    const forest = visibleForest(model, 'components', DEFAULT_FILTERS, expandedToDepth(model, 'components', 8));
    expect(new Set(forest.nodes.map((node) => node.id)).size).toBe(forest.nodes.length);
    const dots = forest.nodes.filter((node) => node.vnode.entry?.id === 'status-badge-dot');
    expect(dots).toHaveLength(2);
    expect(pathOf(dots[0].vnode, model).map((node) => node.vid)).not.toEqual(pathOf(dots[1].vnode, model).map((node) => node.vid));
  });

  it('expands structure references and searches the referenced descendants', () => {
    const doc = clone(example('minimal'));
    doc.structures!.host = { description: 'Host', root: { id: 'host', type: 'container', children: [{ id: 'settings-ref', type: 'container', $ref: '#/structures/settings-bar' }] } };
    const model = buildModel(doc);
    const hits = search(model, 'structures', 'onOpenDiagnostics');
    expect(hits.length).toBe(2);
    expect(pathOf(hits[1], model)[0].entry.owner).toBe('host');
  });

  it('keeps a library reachable when its components reference one another without any screens', () => {
    const model = buildModel({ components: { A: { description: 'a', structure: { id: 'a', type: 'container', component: 'B' } }, B: { description: 'b', structure: { id: 'b', type: 'container', component: 'A' } } } });
    const forest = visibleForest(model, 'components', DEFAULT_FILTERS, expandedToDepth(model, 'components', 3));
    expect(forest.nodes.map((node) => node.id)).toContain('component:A');
    expect(forest.nodes.map((node) => node.id)).toContain('component:B');
  });

  it('follows reference aliases through to the actual child structure', () => {
    const model = buildModel({ components: {
      Alias: { description: 'Alias', structure: { id: 'alias', type: 'container', $ref: '#/components/Body' } },
      Body: { description: 'Body', structure: { id: 'body', type: 'container', children: [{ id: 'deep-button', type: 'button', label: 'Save' }] } },
    }, structures: { screen: { root: { id: 'screen', type: 'container', $ref: '#/components/Alias' } } } });
    const hits = search(model, 'structures', 'Save');
    expect(hits).toHaveLength(1);
    expect(pathOf(hits[0], model).map((node) => node.entry.id)).toEqual(['screen', 'deep-button']);
  });
});
