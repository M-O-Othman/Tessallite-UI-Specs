import { describe, expect, it } from 'vitest';
import { bounds, CARD, edgePath, fitTransform, layoutForest, layoutGroups, overlaps } from '../src/layout.js';

const nodes = ['r', 'a', 'b', 'c', 'd', 'e'].map((id) => ({ id }));
const edges = [{ from: 'r', to: 'a' }, { from: 'r', to: 'b' }, { from: 'a', to: 'c' }, { from: 'a', to: 'd' }, { from: 'b', to: 'e' }];

describe('layout', () => {
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

  it('lays groups out as columns with headers', () => {
    const { positions, headers } = layoutGroups([{ name: 'A', items: [{ id: 'a1' }, { id: 'a2' }] }, { name: 'B', items: [{ id: 'b1' }] }]);
    expect(headers.map((h) => h.name)).toEqual(['A', 'B']);
    expect(positions.get('b1')!.x).toBe(CARD.width + CARD.groupGap);
    expect(overlaps(positions.get('a1')!, positions.get('a2')!)).toBe(false);
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
