import { describe, expect, it } from 'vitest';
import { bounds, CARD, edgePath, fitTransform, layoutForest, overlaps } from '../src/layout.js';

const nodes = ['r', 'a', 'b', 'c', 'd', 'e'].map((id) => ({ id }));
const edges = [{ from: 'r', to: 'a' }, { from: 'r', to: 'b' }, { from: 'a', to: 'c' }, { from: 'a', to: 'd' }, { from: 'b', to: 'e' }];

describe('layout', () => {
  it('reserves full height for text previews, including tall parents above short children', () => {
    const items = [{ id: 'r', height: 108 }, { id: 'a', height: 180 }, { id: 'b', height: 76 }, { id: 'c', height: 76 }, { id: 'd', height: 108 }];
    const links = [{ from: 'r', to: 'a' }, { from: 'r', to: 'b' }, { from: 'a', to: 'c' }, { from: 'b', to: 'd' }];
    const positions = layoutForest(items, links);
    for (const item of items) expect(positions.get(item.id)!.height).toBe(item.height);
    const all = [...positions.values()];
    for (const p of all) expect(p.y).toBeGreaterThanOrEqual(0);
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) expect(overlaps(all[i], all[j])).toBe(false);
    for (const link of links.filter((l) => l.from !== 'r')) {
      const parent = positions.get(link.from)!; const child = positions.get(link.to)!;
      expect(parent.y + parent.height / 2).toBe(child.y + child.height / 2);
    }
  });
  it('places depth on x and stacks leaves without overlap', () => {
    const p = layoutForest(nodes, edges);
    expect(p.get('r')!.x).toBe(0);
    expect(p.get('a')!.x).toBe(CARD.width + CARD.gapX);
    expect(p.get('c')!.x).toBe(2 * (CARD.width + CARD.gapX));
    const leaves = ['c', 'd', 'e'].map((id) => p.get(id)!);
    for (let i = 0; i < leaves.length; i += 1) for (let j = i + 1; j < leaves.length; j += 1) expect(overlaps(leaves[i], leaves[j])).toBe(false);
    const sameLayer = ['a', 'b'].map((id) => p.get(id)!);
    expect(overlaps(sameLayer[0], sameLayer[1])).toBe(false);
  });

  it('centres a parent on its children', () => {
    const p = layoutForest(nodes, edges);
    expect(p.get('a')!.y).toBe((p.get('c')!.y + p.get('d')!.y) / 2);
    expect(p.get('r')!.y).toBe((p.get('a')!.y + p.get('b')!.y) / 2);
  });

  it('stacks separate roots of a forest', () => {
    const p = layoutForest([{ id: 'x' }, { id: 'y' }], []);
    expect(p.get('y')!.y).toBeGreaterThan(p.get('x')!.y + CARD.height);
  });

  it('bounds, fit and edge path', () => {
    const p = layoutForest(nodes, edges);
    const box = bounds(p)!;
    expect(box.x).toBe(0);
    expect(box.width).toBe(3 * CARD.width + 2 * CARD.gapX);
    const t = fitTransform(box, { width: 800, height: 600 });
    expect(t.k).toBeLessThanOrEqual(1.5);
    expect(t.k * box.width).toBeLessThanOrEqual(800);
    expect(edgePath({ x: 0, y: 0, width: 10, height: 10 }, { x: 30, y: 20, width: 10, height: 10 })).toBe('M10,5 C20,5 20,25 30,25');
    expect(bounds(new Map())).toBeNull();
  });
});
