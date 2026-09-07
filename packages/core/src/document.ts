import type { Component, EventDefinition, Node, Slot, State, Structure, UiSpecDocument } from './types.js';
const pointerKey = (value: string): string => value.replace(/~/g, '~0').replace(/\//g, '~1');

/** A node with its position in the document. */
export interface IndexedNode {
  node: Node;
  parent: IndexedNode | undefined;
  /** Name of the structure, or `component:<Name>` for a component's structure. */
  owner: string;
  /** JSON Pointer to the node. */
  path: string;
  children: IndexedNode[];
}

/** Structures with the x- spelling folded in. */
export function structuresOf(raw: UiSpecDocument): Record<string, Structure> {
  return raw.structures ?? raw['x-structures'] ?? {};
}

export function componentEvents(component: Component): EventDefinition[] {
  return component.events ?? component['x-events'] ?? [];
}
export function componentStates(component: Component): State[] {
  return component.states ?? component['x-states'] ?? [];
}
export function componentSlots(component: Component): Slot[] {
  return component.slots ?? component['x-slots'] ?? [];
}
export function componentStructure(component: Component): Node | undefined {
  return component.structure ?? component['x-structure'];
}

/**
 * An indexed document: every node reachable from every structure root and
 * every component structure, keyed by id, with parent links. Duplicate ids are
 * recorded and the first occurrence is kept in the index.
 */
export class SpecDocument {
  readonly nodes = new Map<string, IndexedNode>();
  readonly duplicates: IndexedNode[] = [];
  readonly roots = new Map<string, IndexedNode>();
  readonly componentRoots = new Map<string, IndexedNode>();

  constructor(readonly raw: UiSpecDocument) {
    for (const [name, structure] of Object.entries(structuresOf(raw))) {
      const key = raw.structures ? 'structures' : 'x-structures';
      this.roots.set(name, this.index(structure.root, undefined, name, `/${key}/${pointerKey(name)}/root`));
    }
    for (const [name, component] of Object.entries(raw.components ?? {})) {
      const structure = componentStructure(component);
      if (!structure) continue;
      const key = component.structure ? 'structure' : 'x-structure';
      this.componentRoots.set(name, this.index(structure, undefined, `component:${name}`, `/components/${pointerKey(name)}/${key}`));
    }
  }

  private index(node: Node, parent: IndexedNode | undefined, owner: string, path: string): IndexedNode {
    const entry: IndexedNode = { node, parent, owner, path, children: [] };
    if (this.nodes.has(node.id)) this.duplicates.push(entry);
    else this.nodes.set(node.id, entry);
    entry.children = (node.children ?? []).map((child, i) => this.index(child, entry, owner, `${path}/children/${i}`));
    return entry;
  }

  get(id: string): IndexedNode | undefined {
    return this.nodes.get(id);
  }

  component(name: string): Component | undefined {
    return Object.hasOwn(this.raw.components ?? {}, name) ? this.raw.components[name] : undefined;
  }

  /** Walk every indexed node in document order. */
  *all(): IterableIterator<IndexedNode> {
    const walk = function* (entry: IndexedNode): IterableIterator<IndexedNode> {
      yield entry;
      for (const child of entry.children) yield* walk(child);
    };
    for (const root of [...this.roots.values(), ...this.componentRoots.values()]) yield* walk(root);
  }

  /** Every entry for an id, including duplicates. */
  entriesOf(id: string): IndexedNode[] {
    const first = this.nodes.get(id);
    return [...(first ? [first] : []), ...this.duplicates.filter((d) => d.node.id === id)];
  }

  /** Nearest ancestor (excluding the node itself) that is not `kind: logical`. */
  nearestNonLogicalAncestor(entry: IndexedNode): IndexedNode | undefined {
    let current = entry.parent;
    while (current && current.node.kind === 'logical') current = current.parent;
    return current;
  }

  /** Resolve a `$ref` to the node it stands for, or undefined. */
  resolveRef(ref: string): Node | undefined {
    const match = /^#\/(components|structures)\/(.+)$/.exec(ref);
    if (!match) return undefined;
    const [, kind, encoded] = match;
    const name = encoded.replace(/~1/g, '/').replace(/~0/g, '~');
    if (kind === 'components') {
      const component = this.component(name);
      return component ? componentStructure(component) : undefined;
    }
    const structures = structuresOf(this.raw);
    return Object.hasOwn(structures, name) ? structures[name].root : undefined;
  }

  /** Effective root fields of a reference; preserve instance identity and overrides. */
  effectiveNode(node: Node, seen = new Set<string>()): Node {
    if (!node.$ref || seen.has(node.$ref)) return node;
    const target = this.resolveRef(node.$ref);
    if (!target) return node;
    seen.add(node.$ref);
    return { ...this.effectiveNode(target, seen), ...node };
  }

  /** Slots a node declares: its own `slots`, else those of its component or $ref target. */
  declaredSlots(node: Node): Slot[] | undefined {
    if (node.slots) return node.slots;
    const componentName = node.component ?? (node.$ref?.startsWith('#/components/') ? node.$ref.slice('#/components/'.length).replace(/~1/g, '/').replace(/~0/g, '~') : undefined);
    if (!componentName) return undefined;
    const component = this.component(componentName);
    return component ? componentSlots(component) : undefined;
  }
}
