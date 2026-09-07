/** Pure layout functions: coordinates only, no DOM. */
import viewerConfig from './viewer-config.json' with { type: 'json' };

export const CARD = Object.freeze(viewerConfig.card.layout);

/**
 * Layered left-to-right tree layout. Depth decides x; leaves are stacked
 * top to bottom; every parent is centred on its children. Roots of the
 * forest are stacked in order. Returns positions keyed by id.
 */
export function layoutForest(nodes, edges, card = CARD) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const children = new Map(nodes.map((n) => [n.id, []]));
  const hasParent = new Set();
  for (const e of edges) {
    if (children.has(e.from) && byId.has(e.to)) {
      children.get(e.from).push(e.to);
      hasParent.add(e.to);
    }
  }
  const positions = new Map();
  let cursor = 0;
  const place = (id, depth) => {
    const kids = children.get(id);
    const x = depth * (card.width + card.gapX);
    if (kids.length === 0) {
      positions.set(id, { x, y: cursor, width: card.width, height: card.height });
      cursor += card.height + card.gapY;
      return;
    }
    for (const kid of kids) place(kid, depth + 1);
    const first = positions.get(kids[0]);
    const last = positions.get(kids[kids.length - 1]);
    positions.set(id, { x, y: (first.y + last.y) / 2, width: card.width, height: card.height });
  };
  for (const n of nodes) {
    if (hasParent.has(n.id)) continue;
    place(n.id, 0);
    cursor += card.gapY;
  }
  return positions;
}

/** Bounding box of a set of positions, or null when empty. */
export function bounds(positions) {
  let box = null;
  for (const p of positions.values()) {
    if (!box) box = { x: p.x, y: p.y, right: p.x + p.width, bottom: p.y + p.height };
    else {
      box.x = Math.min(box.x, p.x);
      box.y = Math.min(box.y, p.y);
      box.right = Math.max(box.right, p.x + p.width);
      box.bottom = Math.max(box.bottom, p.y + p.height);
    }
  }
  return box ? { x: box.x, y: box.y, width: box.right - box.x, height: box.bottom - box.y } : null;
}

/** Scale and translation that fit a box into a viewport with padding. */
export function fitTransform(box, viewport, padding = viewerConfig.zoom.fitPadding) {
  if (!box || box.width === 0 || box.height === 0) return { k: viewerConfig.zoom.initialScale, tx: padding, ty: padding };
  const k = Math.max(viewerConfig.zoom.minimumScale, Math.min((viewport.width - 2 * padding) / box.width, (viewport.height - 2 * padding) / box.height, viewerConfig.zoom.fitMaximumScale));
  const tx = (viewport.width - box.width * k) / 2 - box.x * k;
  const ty = (viewport.height - box.height * k) / 2 - box.y * k;
  return { k, tx, ty };
}

/** SVG path for an edge from the right edge of `a` to the left edge of `b`. */
export function edgePath(a, b) {
  const x1 = a.x + a.width;
  const y1 = a.y + a.height / 2;
  const x2 = b.x;
  const y2 = b.y + b.height / 2;
  const mid = (x1 + x2) / 2;
  return `M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`;
}

/** True when two rectangles overlap. */
export function overlaps(a, b) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}
