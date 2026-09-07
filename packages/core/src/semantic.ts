import { componentSlots, componentStates, componentStructure, SpecDocument, type IndexedNode } from './document.js';
import { stateName, type Issue, type Node, type TrackList } from './types.js';

/** Types that must have no children (vocabulary/node-types.md). */
const LEAF_TYPES = new Set(['icon', 'image', 'input', 'textarea', 'checkbox', 'radio', 'switch', 'slider', 'progress', 'skeleton', 'divider']);

/** Types whose parent (ignoring logical nodes) MUST be one of the listed types (R7, R8, R15). */
const REQUIRED_PARENT: Record<string, string[]> = {
  row: ['table'],
  cell: ['row'],
  tab: ['tablist'],
  'menu-item': ['menu'],
  'list-item': ['list'],
  radio: ['radio-group'],
};

const OVERLAY_TYPES = new Set(['dialog', 'drawer', 'menu', 'tooltip', 'toast']);

const REF_OVERRIDABLE = new Set(['id', 'type', '$ref', 'name', 'label', 'i18n', 'description', 'condition', 'props', 'states', 'events', 'data', 'implementation', 'slot', 'placement', 'repeat', 'presentation', 'children', 'tokens', 'kind', 'component']);

function trackCount(list: TrackList): number {
  return typeof list === 'number' ? list : list.length;
}

function trackIndex(list: TrackList, ref: number | string): number | undefined {
  if (typeof ref === 'number') return ref >= 1 && ref <= trackCount(list) ? ref : undefined;
  if (typeof list === 'number') return undefined;
  const i = list.indexOf(ref);
  return i === -1 ? undefined : i + 1;
}

function ancestorOfType(entry: IndexedNode, type: string): IndexedNode | undefined {
  let current = entry.parent;
  while (current && current.node.type !== type) current = current.parent;
  return current;
}

/** R4 exception: a repeated cell that names a repeat column is supplied by the table's data.columns. */
function isRepeatColumnCell(doc: SpecDocument, entry: IndexedNode): boolean {
  if (entry.node.type !== 'cell' || !entry.node.column) return false;
  const table = ancestorOfType(entry, 'table');
  const node = table ? doc.effectiveNode(table.node) : undefined;
  const column = node?.columns?.find((c) => c.id === entry.node.column);
  return Boolean(column?.repeat && node?.data?.columns);
}

function isDescendant(doc: SpecDocument, node: Node, id: string, visited = new Set<Node>()): boolean {
  if (visited.has(node)) return false;
  visited.add(node);
  if ((node.children ?? []).some((child) => child.id === id || isDescendant(doc, child, id, visited))) return true;
  const target = node.$ref ? doc.resolveRef(node.$ref) : undefined;
  return target ? isDescendant(doc, target, id, visited) : false;
}

/** Rules the schema cannot express. Assumes the document already passed the schema. */
export function checkSemantics(doc: SpecDocument): Issue[] {
  const issues: Issue[] = [];
  const add = (rule: string, entry: IndexedNode | { path: string; node?: Node }, message: string) =>
    issues.push({ rule, path: entry.path, message, ...(entry.node ? { id: entry.node.id } : {}) });

  for (const dup of doc.duplicates) add('R1', dup, `duplicate id "${dup.node.id}" (first at ${doc.get(dup.node.id)?.path})`);

  for (const entry of doc.all()) {
    const node = doc.effectiveNode(entry.node);
    const parent = entry.parent;
    const effectiveParent = doc.nearestNonLogicalAncestor(entry);
    if (node.component && !doc.component(node.component)) add('R23', entry, `component "${node.component}" is not declared in components`);
    if (node.kind === 'logical' && ['label', 'icon', 'events', 'a11y'].some((field) => node[field as keyof Node] !== undefined)) add('R3', entry, `logical node "${node.id}" inherits perceptual fields; use a visible node or a separate logical parent`);

    // R4, R5: repetition
    const repeatChildren = entry.children.filter((c) => c.node.repeat === true);
    if (repeatChildren.length > 1) add('R5', entry, `"${node.id}" has ${repeatChildren.length} repeat children; at most one is allowed`);
    if (repeatChildren.length === 1 && !node.data?.collection && !isRepeatColumnCell(doc, repeatChildren[0])) add('R4', entry, `"${node.id}" has a repeat child but no data.collection`);

    // R6: unique column ids
    if (node.columns) {
      const seen = new Set<string>();
      for (const column of node.columns) {
        if (seen.has(column.id)) add('R6', entry, `table "${node.id}" declares column "${column.id}" twice`);
        seen.add(column.id);
        if (column.repeat && !node.data?.columns) add('R6', entry, `repeat column "${column.id}" requires data.columns on table "${node.id}"`);
      }
    }
    if (node.columns && node.type !== 'table') add('R6', entry, `"${node.id}" is a ${node.type}; only a table may declare columns`);
    if (node.tracks && node.type !== 'grid') add('R9', entry, `"${node.id}" is a ${node.type}; only a grid may declare tracks`);
    if (node.column && node.type !== 'cell') add('R8', entry, `"${node.id}" is a ${node.type}; only a cell may name a column`);

    // R7, R8, R15: containment
    const requiredParents = REQUIRED_PARENT[node.type];
    if (requiredParents) {
      const parentType = effectiveParent?.node.type;
      if (!parentType || !requiredParents.includes(parentType)) {
        add('R15', entry, `"${node.id}" (${node.type}) must be a child of ${requiredParents.join(' or ')}, found ${parentType ?? 'none'}`);
      }
    }
    if (LEAF_TYPES.has(node.type) && entry.children.length > 0) add('R15', entry, `"${node.id}" (${node.type}) is a leaf type and must not have children`);
    if (node.type === 'cell' && node.column) {
      const table = ancestorOfType(entry, 'table');
      if (table && !(doc.effectiveNode(table.node).columns ?? []).some((c) => c.id === node.column)) {
        add('R8', entry, `cell "${node.id}" names column "${node.column}" which table "${table.node.id}" does not declare`);
      }
    }

    // R10: placement
    if (node.placement) {
      if (parent?.node.type !== 'grid') add('R10', entry, `"${node.id}" has placement but its parent is not a grid`);
      else {
        const tracks = doc.effectiveNode(parent.node).tracks;
        if (!tracks) add('R10', entry, `parent grid "${parent.node.id}" has no resolved tracks`);
        const { column, row, columnSpan = 1, rowSpan = 1 } = node.placement;
        if (tracks && column !== undefined) {
          const start = trackIndex(tracks.columns, column);
          if (start === undefined) add('R10', entry, `"${node.id}" placement.column ${JSON.stringify(column)} is not a declared column track of "${parent.node.id}"`);
          else if (start + columnSpan - 1 > trackCount(tracks.columns)) add('R10', entry, `"${node.id}" columnSpan ${columnSpan} extends past the last column track`);
        }
        if (tracks && row !== undefined) {
          if (!tracks.rows) add('R10', entry, `"${node.id}" placement.row given but grid "${parent.node.id}" declares no rows`);
          else {
            const start = trackIndex(tracks.rows, row);
            if (start === undefined) add('R10', entry, `"${node.id}" placement.row ${JSON.stringify(row)} is not a declared row track of "${parent.node.id}"`);
            else if (start + rowSpan - 1 > trackCount(tracks.rows)) add('R10', entry, `"${node.id}" rowSpan ${rowSpan} extends past the last row track`);
          }
        }
      }
    }

    // R11, R12: slots
    if (node.slots) {
      const seen = new Set<string>();
      for (const slot of node.slots) {
        if (seen.has(slot.name)) add('R12', entry, `"${node.id}" declares slot "${slot.name}" twice`);
        seen.add(slot.name);
      }
    }
    if (node.slot !== undefined) {
      const declared = parent ? doc.declaredSlots(parent.node) : undefined;
      if (!declared || !declared.some((s) => s.name === node.slot)) {
        add('R11', entry, `"${node.id}" fills slot "${node.slot}" which its parent "${parent?.node.id ?? 'none'}" does not declare`);
      }
    }

    // R13: overlays
    if (OVERLAY_TYPES.has(node.type) && node.presentation !== 'overlay') add('R13', entry, `"${node.id}" (${node.type}) must have presentation: overlay`);

    // R17, R18: events
    for (const [i, event] of (node.events ?? []).entries()) {
      if (event.target !== undefined && !doc.get(event.target)) add('R17', { path: `${entry.path}/events/${i}`, node }, `event target "${event.target}" is not a node id`);
      if (event.actions.includes('emit') && !event.emits) add('R18', { path: `${entry.path}/events/${i}`, node }, `event with action emit must carry emits`);
    }

    // R20, R21: states
    const names = new Set<string>();
    for (const [i, state] of (node.states ?? []).entries()) {
      const name = stateName(state);
      if (names.has(name)) add('R20', { path: `${entry.path}/states/${i}`, node }, `state "${name}" declared twice on "${node.id}"`);
      names.add(name);
      if (typeof state !== 'string') {
        for (const id of state.present ?? []) {
          if (!isDescendant(doc, entry.node, id)) add('R21', { path: `${entry.path}/states/${i}`, node }, `state "${name}" lists "${id}" which is not a descendant of "${node.id}"`);
        }
      }
    }

    // R23, R24, R25: reuse
    if (node.$ref !== undefined) {
      const target = doc.resolveRef(node.$ref);
      if (!target) add('R23', entry, `"${node.id}" $ref "${node.$ref}" does not resolve to a component structure or a structure root`);
      else if (target.type !== node.type) add('R24', entry, `"${node.id}" has type ${node.type} but its $ref target has type ${target.type}`);
      for (const key of Object.keys(entry.node)) {
        if (!REF_OVERRIDABLE.has(key)) add('R24', entry, `"${node.id}" overrides "${key}", which a $ref node may not override`);
      }
      const isStructureRef = node.$ref.startsWith('#/structures/');
      const declared = isStructureRef ? [] : doc.declaredSlots(node) ?? [];
      for (const child of entry.children) {
        if (isStructureRef) add('R25', child, `"${child.node.id}": a $ref to a structure must not have children`);
        else if (child.node.slot === undefined) add('R25', child, `"${child.node.id}": children of a $ref node must fill a slot`);
        else if (!declared.some((s) => s.name === child.node.slot)) add('R25', child, `"${child.node.id}" fills slot "${child.node.slot}" which the referenced component does not declare`);
      }
    }
  }

  // R12 on component slot declarations, R26 on component reference cycles.
  for (const [name, component] of Object.entries(doc.raw.components ?? {})) {
    const seen = new Set<string>();
    for (const slot of componentSlots(component)) {
      if (seen.has(slot.name)) add('R12', { path: `/components/${name}/slots` }, `component "${name}" declares slot "${slot.name}" twice`);
      seen.add(slot.name);
    }
    const states = new Set<string>();
    for (const state of componentStates(component)) {
      const stateId = stateName(state);
      const location = { path: `/components/${name}/states` };
      if (states.has(stateId)) add('R20', location, `component "${name}" declares state "${stateId}" twice`);
      states.add(stateId);
      if (typeof state === 'string') continue;
      const root = componentStructure(component);
      for (const id of state.present ?? []) {
        if (!root || !isDescendant(doc, root, id)) add('R21', location, `component state "${stateId}" lists "${id}" which is not a descendant of its structure`);
      }
    }
  }
  for (const root of [...doc.roots.values(), ...doc.componentRoots.values()]) {
    if (referenceCycle(doc, root.node, new Set(), new Set())) add('R26', root, `"${root.node.id}" contains a circular $ref`);
  }
  return issues;
}

function referenceCycle(doc: SpecDocument, node: Node, active: Set<Node>, complete: Set<Node>): boolean {
  if (active.has(node)) return true;
  if (complete.has(node)) return false;
  active.add(node);
  const target = node.$ref ? doc.resolveRef(node.$ref) : undefined;
  if (target && referenceCycle(doc, target, active, complete)) return true;
  if ((node.children ?? []).some((child) => referenceCycle(doc, child, active, complete))) return true;
  active.delete(node); complete.add(node); return false;
}
