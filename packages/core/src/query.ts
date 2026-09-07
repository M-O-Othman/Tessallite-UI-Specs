import { SpecDocument, type IndexedNode } from './document.js';
import type { Event, Node } from './types.js';

export interface FindCriteria {
  type?: string;
  kind?: 'visible' | 'logical';
  /** Matches nodes with an event whose `event`, `handler`, an action or `target` equals the value. */
  event?: string;
  component?: string;
  /** Case-insensitive substring of id, name, label, i18n or description. */
  text?: string;
  /** Restrict to one structure name or `component:<Name>`. */
  structure?: string;
}

/** A node as returned by queries: the node plus where it lives. */
export interface NodeHit {
  id: string;
  type: string;
  structure: string;
  path: string;
  node: Node;
}

const hit = (entry: IndexedNode): NodeHit => ({ id: entry.node.id, type: entry.node.type, structure: entry.owner, path: entry.path, node: entry.node });

/** Names of the structures in the document. */
export function structures(doc: SpecDocument): { name: string; description: string; root: string }[] {
  return [...doc.roots.entries()].map(([name, root]) => ({
    name,
    description: (doc.raw.structures ?? doc.raw['x-structures'] ?? {})[name]?.description ?? '',
    root: root.node.id,
  }));
}

/** Copy of a node limited to `depth` levels of children (undefined = whole tree). */
export function prune(node: Node, depth?: number): Node {
  if (depth === undefined) return node;
  if (depth <= 0) {
    const { children, ...rest } = node;
    return children && children.length > 0 ? { ...rest, children: children.map((c) => ({ id: c.id, type: c.type })) } : rest;
  }
  return { ...node, children: node.children?.map((c) => prune(c, depth - 1)) };
}

/** The tree of one structure (the first structure when no name is given), optionally pruned. */
export function tree(doc: SpecDocument, structure?: string, depth?: number): Node | undefined {
  const root = structure === undefined ? doc.roots.values().next().value : doc.roots.get(structure) ?? doc.componentRoots.get(structure.replace(/^component:/, ''));
  return root ? prune(root.node, depth) : undefined;
}

export function node(doc: SpecDocument, id: string): NodeHit | undefined {
  const entry = doc.get(id);
  return entry ? hit(entry) : undefined;
}

function eventMatches(event: Event, value: string): boolean {
  return event.event === value || event.handler === value || event.handler?.split(/\s*->\s*/).includes(value) === true || event.target === value || event.emits === value || event.actions.includes(value);
}

export function find(doc: SpecDocument, criteria: FindCriteria): NodeHit[] {
  const text = criteria.text?.toLowerCase();
  const results: NodeHit[] = [];
  for (const entry of doc.all()) {
    const n = doc.effectiveNode(entry.node);
    if (criteria.structure !== undefined && entry.owner !== criteria.structure) continue;
    if (criteria.type !== undefined && n.type !== criteria.type) continue;
    if (criteria.kind !== undefined && (n.kind ?? 'visible') !== criteria.kind) continue;
    const componentRef = criteria.component?.replace(/~/g, '~0').replace(/\//g, '~1');
    if (criteria.component !== undefined && n.component !== criteria.component && n.$ref !== `#/components/${componentRef}`) continue;
    if (criteria.event !== undefined && !(n.events ?? []).some((e) => eventMatches(e, criteria.event!))) continue;
    if (text !== undefined && ![n.id, n.name, n.label, n.i18n, n.description].some((v) => v?.toLowerCase().includes(text))) continue;
    results.push(hit(entry));
  }
  return results;
}

/** The chain of nodes from the root to the node, inclusive. Empty when the id is unknown. */
export function pathTo(doc: SpecDocument, id: string): NodeHit[] {
  const chain: NodeHit[] = [];
  for (let entry = doc.get(id); entry; entry = entry.parent) chain.unshift(hit(entry));
  return chain;
}

export function eventsOf(doc: SpecDocument, id: string): Event[] | undefined {
  const entry = doc.get(id);
  return entry ? doc.effectiveNode(entry.node).events ?? [] : undefined;
}

export function childrenOf(doc: SpecDocument, id: string): NodeHit[] | undefined {
  const entry = doc.get(id);
  return entry ? entry.children.map(hit) : undefined;
}
