import { afterEach, describe, expect, it, vi } from 'vitest';
import { Window } from 'happy-dom';
import { createGraph } from '../src/graph.js';
import { CARD } from '../src/layout.js';

const windows: Window[] = [];

function transform(svg: SVGSVGElement) {
  const value = svg.querySelector('.viewport')?.getAttribute('transform') || '';
  const match = value.match(/^translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+)\)$/);
  if (!match) throw new Error(`Unexpected graph transform: ${value}`);
  return { x: Number(match[1]), y: Number(match[2]), scale: Number(match[3]) };
}

function worldCentre(size: { width: number; height: number }, view: { x: number; y: number; scale: number }) {
  return {
    x: (size.width / 2 - view.x) / view.scale,
    y: (size.height / 2 - view.y) / view.scale,
  };
}

afterEach(async () => {
  vi.unstubAllGlobals();
  await Promise.all(windows.splice(0).map((window) => window.happyDOM.close()));
});

describe('graph viewport resizing', () => {
  it('preserves the viewed centre and scale across a manual canvas resize', () => {
    const window = new Window();
    windows.push(window);
    vi.stubGlobal('document', window.document);
    const svg = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    let size = { width: 400, height: 300 };
    Object.defineProperty(svg, 'getBoundingClientRect', { value: () => ({ ...size, x: 0, y: 0, top: 0, left: 0, right: size.width, bottom: size.height }) });
    const graph = createGraph(svg, { onSelect() {}, onToggle() {} });
    graph.render({
      positions: new Map([['card', { x: 0, y: 0, width: CARD.width, height: CARD.height }]]),
      cards: [{ id: 'card', lines: ['Card'] }],
      edges: [],
    });
    graph.readable();
    const before = transform(svg);
    const beforeCentre = worldCentre(size, before);

    size = { width: 800, height: 600 };
    graph.resize();
    const after = transform(svg);
    expect(after.scale).toBe(before.scale);
    expect(worldCentre(size, after)).toEqual(beforeCentre);

    size = { width: 400, height: 300 };
    graph.resize();
    expect(transform(svg)).toEqual(before);
  });

  it('refits the complete graph when a fitted canvas grows', () => {
    const window = new Window();
    windows.push(window);
    vi.stubGlobal('document', window.document);
    const svg = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    let size = { width: 400, height: 300 };
    Object.defineProperty(svg, 'getBoundingClientRect', { value: () => ({ ...size, x: 0, y: 0, top: 0, left: 0, right: size.width, bottom: size.height }) });
    const graph = createGraph(svg, { onSelect() {}, onToggle() {} });
    graph.render({
      positions: new Map([['card', { x: 0, y: 0, width: CARD.width, height: CARD.height }]]),
      cards: [{ id: 'card', lines: ['Card'] }],
      edges: [],
    });
    graph.fit();
    const before = transform(svg);

    size = { width: 800, height: 600 };
    graph.resize();
    const after = transform(svg);
    expect(after.scale).toBeGreaterThan(before.scale);
    expect(after.scale).toBeLessThanOrEqual(1.5);
  });
});
