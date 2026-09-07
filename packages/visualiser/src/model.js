/**
 * Pure model functions for the visualiser: no DOM. The drawing is a forest
 * of virtual nodes ("vnodes") at uniform level of detail: groups, component
 * definitions, structure entries, detail sections and their items. A vnode
 * is drawn as a summary card; its detail appears only when expanded.
 */

export const LEAF_TYPES = new Set(['text', 'icon', 'divider', 'skeleton']);
export const DEFAULT_FILTERS = Object.freeze({ hideLogical: false, hideLeaves: false, onlyComponent: false, hideOverlays: false, collapseRepeat: false });
const ENTRY_FACTS = ['kind', 'name', 'label', 'i18n', 'description', 'condition', 'repeat', 'presentation', 'slot', 'icon', 'column', 'placement', 'tracks', '$ref'];
const ENTRY_SECTIONS = ['props', 'events', 'states', 'slots', 'columns', 'a11y', 'data', 'implementation', 'tokens'];
const COMPONENT_SECTIONS = ['props', 'events', 'states', 'slots'];

function structuresOf(doc) { return doc.structures || doc['x-structures'] || {}; }
function componentStructure(component) { return component.structure || component['x-structure']; }
function sectionValue(obj, key) { return obj[key] ?? obj[`x-${key}`]; }
function walk(node, fn) { fn(node); for (const child of node.children || []) walk(child, fn); }

/** Name of the component a node instantiates, from `component` or a component `$ref`. */
export function componentOf(node) {
  if (node.component) return node.component;
  const ref = node.$ref;
  return typeof ref === 'string' && ref.startsWith('#/components/') ? ref.slice('#/components/'.length) : undefined;
}

/** Group of a component definition: group, then package, then Ungrouped. */
export function groupOf(component) { return component.group || component.package || 'Ungrouped'; }

/**
 * Builds the model: structure entries (one per node, with parent and
 * depth), component cards grouped by category, used-by lists and edges.
 */
export function buildModel(doc) {
  const entries = new Map();
  const structureRoots = [];
  const componentRoots = new Map();
  const add = (node, parent, owner, ownerKind) => {
    const entry = { id: node.id, node, parent, owner, ownerKind, depth: parent ? parent.depth + 1 : 0, children: [] };
    if (!entries.has(node.id)) entries.set(node.id, entry);
    if (parent) parent.children.push(entry);
    for (const child of node.children || []) add(child, entry, owner, ownerKind);
    return entry;
  };
  for (const [name, structure] of Object.entries(structuresOf(doc))) structureRoots.push(add(structure.root, undefined, name, 'structure'));
  const components = doc.components || {};
  const cards = new Map();
  for (const [name, component] of Object.entries(components)) {
    const structure = componentStructure(component);
    if (structure) componentRoots.set(name, add(structure, undefined, name, 'component'));
    cards.set(name, { id: name, definition: component, group: groupOf(component), hasStructure: Boolean(structure), usedBy: [] });
  }
  const edges = [];
  const seen = new Set();
  const record = (owner, ownerKind, node) => {
    const target = componentOf(node);
    if (!target || !cards.has(target)) return;
    cards.get(target).usedBy.push({ owner, ownerKind, nodeId: node.id });
    const key = `${owner}>${target}`;
    if (ownerKind === 'component' && owner !== target && !seen.has(key)) { seen.add(key); edges.push({ from: owner, to: target }); }
  };
  for (const [name, structure] of Object.entries(structuresOf(doc))) walk(structure.root, (n) => record(name, 'structure', n));
  for (const [name, component] of Object.entries(components)) { const s = componentStructure(component); if (s) walk(s, (n) => record(name, 'component', n)); }
  const groups = new Map();
  for (const card of cards.values()) { if (!groups.has(card.group)) groups.set(card.group, []); groups.get(card.group).push(card); }
  return { doc, entries, structureRoots, componentRoots, cards, groups: [...groups.entries()].map(([name, items]) => ({ name, items })), edges };
}

// ---- vnodes ---------------------------------------------------------------

export const vid = {
  group: (name) => `group:${name}`,
  component: (name) => `component:${name}`,
  entry: (id) => `entry:${id}`,
  section: (parentVid, key) => `${parentVid}#${key}`,
  item: (sectionVid, key) => `${sectionVid}.${key}`,
};

function summarise(value) {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object') return String(value);
  if (Array.isArray(value)) return value.length === 0 ? '[]' : value.map(summarise).join(', ');
  if (typeof value.type === 'string' && !value.event) return value.type;
  if (value.event) return `${value.event}${value.handler ? ` : ${value.handler}` : ''}`;
  if (value.name) return String(value.name);
  if (value.id) return String(value.id);
  return Object.keys(value).join(', ');
}

function itemsOf(sectionVid, key, value) {
  if (Array.isArray(value)) {
    return value.map((v, i) => {
      const name = typeof v === 'string' ? v : v.name || v.id || v.event || String(i);
      return { vid: vid.item(sectionVid, String(i)), kind: 'item', lines: [String(name), summarise(typeof v === 'string' ? '' : v)], data: v };
    });
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).map(([k, v]) => ({ vid: vid.item(sectionVid, k), kind: 'item', lines: [k, summarise(v)], data: v }));
  }
  return [];
}

function sectionsOf(parentVid, obj, keys, facts) {
  const out = [];
  if (facts) {
    const present = facts.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]]);
    if (present.length) out.push({ vid: vid.section(parentVid, 'facts'), kind: 'section', lines: ['facts', `${present.length} fields`], data: Object.fromEntries(present), items: present.map(([k, v]) => ({ vid: vid.item(vid.section(parentVid, 'facts'), k), kind: 'item', lines: [k, summarise(v)], data: v })) });
  }
  for (const key of keys) {
    const value = sectionValue(obj, key);
    if (value === undefined) continue;
    const svid = vid.section(parentVid, key);
    const items = itemsOf(svid, key, value);
    out.push({ vid: svid, kind: 'section', lines: [key, `${items.length} ${items.length === 1 ? 'entry' : 'entries'}`], data: value, items });
  }
  return out;
}

/** True when the filters remove a structure entry from the drawing. */
export function isFiltered(entry, filters) {
  const n = entry.node;
  if (filters.hideLogical && n.kind === 'logical') return true;
  if (filters.hideLeaves && LEAF_TYPES.has(n.type)) return true;
  if (filters.hideOverlays && n.presentation === 'overlay') return true;
  if (filters.onlyComponent && !componentOf(n) && entry.depth > 0) return true;
  return false;
}

/** Contained entries an entry shows under the filters; filtered nodes hoist their children, overlays take theirs with them. */
export function shownChildren(entry, filters) {
  const out = [];
  for (const child of entry.children) {
    if (!isFiltered(child, filters)) out.push(child);
    else if (!(filters.hideOverlays && child.node.presentation === 'overlay')) out.push(...shownChildren(child, filters));
  }
  return out;
}

export function entryVnode(entry) {
  const n = entry.node;
  const comp = componentOf(n);
  return { vid: vid.entry(entry.id), kind: 'entry', entry, lines: [n.id, `${n.type}${comp ? ` : ${comp}` : ''}`], data: n };
}

export function componentVnode(card) {
  return { vid: vid.component(card.id), kind: 'component', card, lines: [card.id, card.hasStructure ? 'component, has structure' : 'component'], data: card.definition };
}

export function groupVnode(group) {
  return { vid: vid.group(group.name), kind: 'group', group, lines: [group.name, `${group.items.length} components`], data: { group: group.name, components: group.items.map((c) => c.id) } };
}

/** Children a vnode reveals when expanded. */
export function childrenOf(vnode, model, filters) {
  switch (vnode.kind) {
    case 'group': return vnode.group.items.map(componentVnode);
    case 'component': {
      const sections = sectionsOf(vnode.vid, vnode.card.definition, COMPONENT_SECTIONS);
      const root = model.componentRoots.get(vnode.card.id);
      if (root) sections.push({ vid: vid.section(vnode.vid, 'structure'), kind: 'section', lines: ['structure', `root ${root.id}`], data: root.node, items: [entryVnode(root)] });
      return sections;
    }
    case 'entry': {
      const detail = sectionsOf(vnode.vid, vnode.entry.node, ENTRY_SECTIONS, ENTRY_FACTS);
      const contained = (filters.collapseRepeat && vnode.entry.node.repeat === true) ? [] : shownChildren(vnode.entry, filters).map(entryVnode);
      return [...detail, ...contained];
    }
    case 'section': return vnode.items;
    default: return [];
  }
}

/** Parent vnode id, for breadcrumbs and search expansion. */
export function parentVid(vnode, model) {
  if (vnode.kind === 'entry') {
    const e = vnode.entry;
    if (e.parent) return vid.entry(e.parent.id);
    return e.ownerKind === 'component' ? vid.section(vid.component(e.owner), 'structure') : undefined;
  }
  if (vnode.kind === 'component') return vid.group(vnode.card.group);
  if (vnode.kind === 'section' || vnode.kind === 'item') return vnode.vid.slice(0, vnode.vid.lastIndexOf(vnode.kind === 'section' ? '#' : '.'));
  return undefined;
}

/** Roots of a view: group vnodes for Components, structure entry vnodes for Structures. */
export function rootsOf(model, view) {
  return view === 'components' ? model.groups.map(groupVnode) : model.structureRoots.map(entryVnode);
}

/** The drawn forest for a view under expansion and filters. */
export function visibleForest(model, view, filters, expanded, rootFilter) {
  const nodes = [];
  const edges = [];
  const visit = (vnode, parent) => {
    const kids = childrenOf(vnode, model, filters);
    const open = expanded.has(vnode.vid);
    nodes.push({ vnode, id: vnode.vid, hasChildren: kids.length > 0, collapsed: kids.length > 0 && !open });
    if (parent) edges.push({ from: parent.vid, to: vnode.vid });
    if (open) for (const kid of kids) visit(kid, vnode);
  };
  for (const root of rootsOf(model, view)) {
    if (rootFilter && !rootFilter(root)) continue;
    if (root.kind === 'entry' && isFiltered(root.entry, filters)) continue;
    visit(root, undefined);
  }
  return { nodes, edges };
}

/** Expanded set so every root of the view shows `depth` levels (1 = roots plus their children). */
export function expandedToDepth(model, view, depth, filters = DEFAULT_FILTERS) {
  const expanded = new Set();
  const visit = (vnode, level) => {
    if (level >= depth) return;
    expanded.add(vnode.vid);
    for (const kid of childrenOf(vnode, model, filters)) visit(kid, level + 1);
  };
  for (const root of rootsOf(model, view)) visit(root, 0);
  return expanded;
}

/** Search hits as vnodes: structure entries (id, name, label, i18n, component, type) and component cards (name). */
export function search(model, view, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits = [];
  if (view === 'components') {
    for (const card of model.cards.values()) if (card.id.toLowerCase().includes(q)) hits.push(componentVnode(card));
  }
  for (const entry of model.entries.values()) {
    if (view === 'structures' && entry.ownerKind !== 'structure') continue;
    if (view === 'components' && entry.ownerKind !== 'component') continue;
    const n = entry.node;
    if ([n.id, n.name, n.label, n.i18n, componentOf(n), n.type].some((f) => typeof f === 'string' && f.toLowerCase().includes(q))) hits.push(entryVnode(entry));
  }
  return hits;
}

/** Ancestor chain of vnode ids from the root down to the vnode, inclusive. */
export function pathOf(vnode, model) {
  const chain = [];
  let current = vnode;
  while (current) {
    chain.unshift(current);
    const p = parentVid(current, model);
    current = p ? resolveVid(p, model) : undefined;
  }
  return chain;
}

/** Rebuild a vnode from its id. */
export function resolveVid(id, model, filters = DEFAULT_FILTERS) {
  if (id.startsWith('group:')) { const g = model.groups.find((x) => x.name === id.slice(6)); return g ? groupVnode(g) : undefined; }
  if (id.startsWith('component:') && !id.includes('#')) { const c = model.cards.get(id.slice(10)); return c ? componentVnode(c) : undefined; }
  if (id.startsWith('entry:') && !id.includes('#')) { const e = model.entries.get(id.slice(6)); return e ? entryVnode(e) : undefined; }
  const cut = Math.max(id.lastIndexOf('#'), id.lastIndexOf('.'));
  const parent = resolveVid(id.slice(0, cut), model, filters);
  return parent ? childrenOf(parent, model, filters).find((k) => k.vid === id) : undefined;
}

/** Expanded set extended so every hit is reachable. */
export function expandPaths(hits, expanded, model) {
  const next = new Set(expanded);
  for (const hit of hits) for (const ancestor of pathOf(hit, model).slice(0, -1)) next.add(ancestor.vid);
  return next;
}

/** Drawn nodes by type: node types for entries, the vnode kind otherwise. */
export function countsByType(items) {
  const counts = new Map();
  for (const item of items) {
    const key = item.vnode.kind === 'entry' ? item.vnode.entry.node.type : item.vnode.kind;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
