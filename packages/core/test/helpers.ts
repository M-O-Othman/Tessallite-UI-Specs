import { readFileSync } from 'node:fs';
import type { Node, UiSpecDocument } from '../src/index.js';

const ROOT = new URL('../../../', import.meta.url);

export function example(name: 'minimal' | 'containment'): UiSpecDocument {
  return JSON.parse(readFileSync(new URL(`examples/${name}.json`, ROOT), 'utf8')) as UiSpecDocument;
}

/** Deep copy of an example, for mutation in a test. */
export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Find a node by id in a raw tree. */
export function findRaw(node: Node, id: string): Node | undefined {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const hit = findRaw(child, id);
    if (hit) return hit;
  }
  return undefined;
}

export function rawNode(doc: UiSpecDocument, id: string): Node {
  for (const structure of Object.values(doc.structures ?? {})) {
    const hit = findRaw(structure.root, id);
    if (hit) return hit;
  }
  for (const component of Object.values(doc.components)) {
    if (component.structure) {
      const hit = findRaw(component.structure, id);
      if (hit) return hit;
    }
  }
  throw new Error(`no raw node ${id}`);
}
