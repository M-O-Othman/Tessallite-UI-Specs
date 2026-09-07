/**
 * Pure model functions for the visualiser: no DOM. The drawing is a forest
 * of virtual nodes ("vnodes") at uniform level of detail: groups, component
 * definitions, structure entries, detail sections and their items. A vnode
 * is drawn as a summary card; its detail appears only when expanded.
 */
import viewerConfig from './viewer-config.json' with { type: 'json' };

export const LEAF_TYPES = new Set(['text', 'icon', 'divider', 'skeleton']);
export const DEFAULT_FILTERS = Object.freeze({ hideLogical: false, hideLeaves: false, onlyComponent: false, hideOverlays: false, collapseRepeat: false, hideDetails: false });
const ENTRY_FACTS = ['kind', 'name', 'label', 'i18n', 'description', 'condition', 'repeat', 'presentation', 'slot', 'icon', 'column', 'placement', 'tracks', '$ref'];
const ENTRY_SECTIONS = ['props', 'events', 'states', 'slots', 'columns', 'a11y', 'data', 'implementation', 'tokens'];
const COMPONENT_SECTIONS = ['props', 'events', 'states', 'slots'];

export function structuresOf(doc) { return doc.structures || doc['x-structures'] || {}; }
function componentStructure(component) { return component.structure || component['x-structure']; }
function sectionValue(obj, key) { return obj[key] ?? obj[`x-${key}`]; }
function walk(node, fn) { fn(node); for (const child of node.children || []) walk(child, fn); }

/** Name of the component a node instantiates, from `component` or a component `$ref`. */
export function componentOf(node) {
  if (node.component) return node.component;
  const ref = node.$ref;
  return typeof ref === 'string' && ref.startsWith('#/components/') ? ref.slice('#/components/'.length).replace(/~1/g, '/').replace(/~0/g, '~') : undefined;
}

/** Group of a component definition: group, then package, then Ungrouped. */
export function groupOf(component) { return component.group || component.package || 'Ungrouped'; }

/** Resolve inherited root facts without changing the authored source object. */
export function effectiveNode(model, node, seen = new Set()) {
  if (!node.$ref || seen.has(node.$ref)) return node;
  seen.add(node.$ref);
  const target = referenceTarget(model, node.$ref);
  return target ? { ...effectiveNode(model, target.node, seen), ...node } : node;
}

function referenceTarget(model, reference) {
  const component = reference.startsWith('#/components/');
  const name = reference.slice(13).replace(/~1/g, '/').replace(/~0/g, '~');
  return component ? model.componentRoots.get(name) : model.structureRoots.find((root) => root.owner === name);
}

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
  return { doc, entries, structureRoots, componentRoots, cards, groups: [...groups.entries()].map(([name, items]) => ({ name, items })), edges, virtual: new Map() };
}

// ---- vnodes ---------------------------------------------------------------

const encode = (name) => encodeURIComponent(name).replace(/\./g, '%2E');
export const vid = {
  group: (name) => `group:${encode(name)}`,
  component: (name) => `component:${encode(name)}`,
  entry: (id) => `entry:${id}`,
  structure: (name) => `ct:${encode(name)}`,
  instance: (parentVid, name, nodeId) => `${parentVid}/${encode(name)}@${encode(nodeId)}`,
  section: (parentVid, key) => `${parentVid}#${key}`,
  item: (sectionVid, key) => `${sectionVid}.${encode(key)}`,
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
      return { vid: vid.item(sectionVid, String(i)), kind: 'item', section: key, lines: [String(name), summarise(typeof v === 'string' ? '' : v)], data: v };
    });
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).map(([k, v]) => ({ vid: vid.item(sectionVid, k), kind: 'item', section: key, lines: [k, summarise(v)], data: v }));
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
    out.push({ vid: svid, kind: 'section', section: key, lines: [key, `${items.length} ${items.length === 1 ? 'entry' : 'entries'}`], data: value, items });
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

function groupVnode(group) {
  return { vid: vid.group(group.name), kind: 'group', group, lines: [group.name, `${group.items.length} components`], data: { group: group.name, components: group.items.map((c) => c.id) } };
}

/** Root of the Components view: one card per structure (a screen). */
export function structureVnode(root) {
  return { vid: vid.structure(root.owner), kind: 'structure', entry: root, lines: [root.owner, `structure, root ${root.id}`], data: root.node };
}

/**
 * Component instances contained in `node`, at the first component level:
 * a node that instantiates a component is one instance; other nodes are
 * transparent and yield the instances under them. Every authored instance
 * is retained: two instances may have different children and behaviour.
 */
function containedInstances(parentVid, node, model, ancestors, includeSelf) {
  const found = [];
  const collect = (n, self, refs = new Set()) => {
    const name = self ? componentOf(n) : undefined;
    if (name && model.cards.has(name)) { found.push({ name, node: n }); return; }
    for (const child of n.children || []) collect(child, true, refs);
    if (n.$ref?.startsWith('#/structures/') && !refs.has(n.$ref)) {
      const name = n.$ref.slice(13).replace(/~1/g, '/').replace(/~0/g, '~');
      const target = model.structureRoots.find((root) => root.owner === name);
      if (target) collect(target.node, true, new Set([...refs, n.$ref]));
    }
  };
  collect(node, includeSelf);
  return found.map((m) => instanceVnode(parentVid, m, model, ancestors));
}

function instanceVnode(parentVid, m, model, ancestors) {
  const card = model.cards.get(m.name);
  const n = m.node;
  const lines = [m.name, `${n.type} ${n.id}`];
  return { vid: vid.instance(parentVid, m.name, n.id), kind: 'component', card, node: n, ancestors: [...ancestors, m.name], badge: card.group === 'Ungrouped' ? '' : card.group, lines, data: card.definition };
}

/** Components no structure or component instantiates. */
function unreferencedGroup(model) {
  const reachable = new Set();
  const visit = (node) => {
    const name = componentOf(node);
    if (name && !reachable.has(name)) {
      reachable.add(name);
      const own = model.componentRoots.get(name);
      if (own) visit(own.node);
    }
    for (const child of node.children || []) visit(child);
    if (node.$ref?.startsWith('#/structures/')) {
      const name = node.$ref.slice(13).replace(/~1/g, '/').replace(/~0/g, '~');
      const key = 'structure:' + name;
      if (!reachable.has(key)) { reachable.add(key); const root = model.structureRoots.find((r) => r.owner === name); if (root) visit(root.node); }
    }
  };
  for (const root of model.structureRoots) visit(root.node);
  const items = [...model.cards.values()].filter((c) => !reachable.has(c.id));
  return items.length ? { name: 'Unreferenced', items } : undefined;
}

/** Children a vnode reveals when expanded. */
function rawChildren(vnode, model, filters) {
  switch (vnode.kind) {
    case 'group': return vnode.group.items.map(componentVnode);
    case 'structure': return containedInstances(vnode.vid, vnode.entry.node, model, [], true);
    case 'component': {
      const contained = [];
      if (vnode.node) {
        // Internals from the component's own structure first (unless it recurses), then what the instance holds.
        const own = model.componentRoots.get(vnode.card.id);
        const recursive = vnode.ancestors.slice(0, -1).includes(vnode.card.id);
        if (own && !recursive && (vnode.node.$ref || !vnode.node.children?.length)) contained.push(...containedInstances(vnode.vid, own.node, model, vnode.ancestors, componentOf(own.node) !== vnode.card.id));
        contained.push(...containedInstances(vnode.vid, vnode.node, model, vnode.ancestors, false));
      } else {
        const own = model.componentRoots.get(vnode.card.id);
        if (own) contained.push(...containedInstances(vnode.vid, own.node, model, [vnode.card.id], componentOf(own.node) !== vnode.card.id));
      }
      const seen = new Set();
      const unique = contained.filter((c) => (seen.has(c.vid) ? false : seen.add(c.vid)));
      const sections = sectionsOf(vnode.vid, vnode.card.definition, COMPONENT_SECTIONS);
      const root = vnode.node ? model.entries.get(vnode.node.id) : model.componentRoots.get(vnode.card.id);
      if (root) sections.push({ vid: vid.section(vnode.vid, 'structure'), kind: 'section', lines: ['structure', `root ${root.id}`], data: root.node, items: [entryVnode(root)] });
      return [...unique, ...(filters.hideDetails ? [] : sections)];
    }
    case 'entry': {
      const detail = sectionsOf(vnode.vid, vnode.entry.node, ENTRY_SECTIONS, ENTRY_FACTS);
      const reference = vnode.entry.node.$ref;
      const refs = vnode.refs || [];
      const inherited = [];
      const seen = new Set(refs);
      let next = reference;
      while (next && !seen.has(next)) {
        seen.add(next);
        const target = referenceTarget(model, next);
        if (!target) break;
        inherited.push(...shownChildren(target, filters));
        next = target.node.$ref;
      }
      const entries = [...inherited, ...shownChildren(vnode.entry, filters)];
      const contained = (filters.collapseRepeat && vnode.entry.node.repeat === true) ? [] : entries.map((entry) => ({ ...entryVnode(entry), refs: [...seen] }));
      return [...(filters.hideDetails ? [] : detail), ...contained];
    }
    case 'section': return vnode.items;
    default: return [];
  }
}

/** Register actual parents, including component detail branches, without guessing from node ids. */
export function childrenOf(vnode, model, filters = DEFAULT_FILTERS) {
  const children = rawChildren(vnode, model, filters).map((child) => {
    // A definition may appear in many instances; each drawn entry needs its own identity.
    if (child.kind === 'entry' && (vnode.kind === 'section' || vnode.context || (vnode.entry?.node.$ref && child.entry.parent !== vnode.entry))) {
      child = { ...child, vid: `${vnode.vid}~${encode(child.entry.id)}`, context: true };
    }
    return { ...child, parent: vnode.vid };
  });
  model.virtual.set(vnode.vid, vnode);
  for (const child of children) model.virtual.set(child.vid, child);
  return children;
}

/** Parent vnode id, for breadcrumbs and search expansion. */
export function parentVid(vnode, model) {
  if (vnode.parent !== undefined) return vnode.parent;
  if (vnode.kind === 'entry') {
    const e = vnode.entry;
    if (e.parent) return vid.entry(e.parent.id);
    return e.ownerKind === 'component' ? vid.section(vid.component(e.owner), 'structure') : undefined;
  }
  if (vnode.kind === 'component') return vnode.node ? vnode.vid.slice(0, vnode.vid.lastIndexOf('/')) : (unreferencedGroup(model)?.items.some((card) => card.id === vnode.card.id) ? vid.group('Unreferenced') : undefined);
  if (vnode.kind === 'section' || vnode.kind === 'item') return vnode.vid.slice(0, vnode.vid.lastIndexOf(vnode.kind === 'section' ? '#' : '.'));
  return undefined;
}

/** Roots of a view: structure cards (plus the unreferenced group) for Components, structure entry vnodes for Structures. */
export function rootsOf(model, view) {
  if (view === 'structures') return model.structureRoots.map(entryVnode);
  const roots = model.structureRoots.map(structureVnode);
  const rest = unreferencedGroup(model);
  if (rest) roots.push(groupVnode(rest));
  return roots;
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

/** Search hits as vnodes: component instances by name (Components view) or structure entries by id, name, label, i18n, component and type. */
export function search(model, view, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits = [];
  if (view === 'components') {
    const visit = (vnode) => {
      for (const kid of childrenOf(vnode, model, DEFAULT_FILTERS)) {
        if (kid.kind !== 'component') continue;
        if (matches(effectiveNode(model, kid.node || {}), q, kid.card.id, kid.card.definition.description)) hits.push(kid);
        visit(kid);
      }
    };
    for (const root of rootsOf(model, view)) visit(root);
    return hits;
  }
  const filters = { ...DEFAULT_FILTERS, hideDetails: true };
  const forest = visibleForest(model, view, filters, expandedToDepth(model, view, viewerConfig.expansion.searchMaxDepth, filters));
  for (const item of forest.nodes) {
    const vnode = item.vnode;
    if (vnode.kind === 'entry' && matches(effectiveNode(model, vnode.entry.node), q)) hits.push(vnode);
  }
  return hits;
}

function matches(n, query, ...extra) {
  return [n.id, n.name, n.label, n.i18n, n.description, componentOf(n), n.type, ...extra,
    ...(n.events || []).flatMap((e) => [e.event, e.handler, e.effect, e.target])]
    .some((value) => typeof value === 'string' && value.toLowerCase().includes(query));
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
  if (!id) return undefined;
  if (model.virtual.has(id)) return model.virtual.get(id);
  if (id.startsWith('group:')) { const g = id === 'group:Unreferenced' ? unreferencedGroup(model) : model.groups.find((x) => vid.group(x.name) === id); return g ? groupVnode(g) : undefined; }
  if (id.startsWith('component:') && !id.includes('#')) { const c = model.cards.get(decodeURIComponent(id.slice(10))); return c ? componentVnode(c) : undefined; }
  if (id.startsWith('entry:') && !id.includes('#')) { const e = model.entries.get(id.slice(6)); return e ? entryVnode(e) : undefined; }
  if (id.startsWith('ct:') && !/[#.]/.test(id)) {
    const slash = id.lastIndexOf('/');
    if (slash < 0) { const r = model.structureRoots.find((x) => vid.structure(x.owner) === id); return r ? structureVnode(r) : undefined; }
    const parent = resolveVid(id.slice(0, slash), model, filters);
    return parent ? childrenOf(parent, model, filters).find((k) => k.vid === id) : undefined;
  }
  const cut = Math.max(id.lastIndexOf('#'), id.lastIndexOf('.'));
  if (cut < 1) return undefined;
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
