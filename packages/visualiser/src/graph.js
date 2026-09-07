/** SVG drawing, pan and zoom. Depends on layout.js. */

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}, text) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) node.setAttribute(k, String(v));
  if (text !== undefined) node.textContent = text;
  return node;
}

function clip(text, max) {
  const s = String(text ?? '');
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

/**
 * A pannable, zoomable SVG canvas. `render(scene)` replaces the drawing;
 * a scene is { positions, cards: [{id, lines, classes, badge, toggle}], edges: [{from, to}], headers }.
 * Callbacks: onSelect(id), onToggle(id).
 */
export function createGraph(svg, callbacks) {
  const viewport = el('g', { class: 'viewport' });
  svg.appendChild(viewport);
  const state = { k: 1, tx: 40, ty: 40, positions: new Map(), drag: null };

  const apply = () => viewport.setAttribute('transform', `translate(${state.tx},${state.ty}) scale(${state.k})`);

  svg.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.card')) return;
    state.drag = { x: e.clientX, y: e.clientY, tx: state.tx, ty: state.ty };
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener('pointermove', (e) => {
    if (!state.drag) return;
    state.tx = state.drag.tx + (e.clientX - state.drag.x);
    state.ty = state.drag.ty + (e.clientY - state.drag.y);
    apply();
  });
  const endDrag = () => { state.drag = null; };
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);
  function zoomAt(px, py, factor) {
    const k = Math.min(4, Math.max(0.05, state.k * factor));
    state.tx = px - ((px - state.tx) * k) / state.k;
    state.ty = py - ((py - state.ty) * k) / state.k;
    state.k = k;
    apply();
  }
  // Plain wheel scrolls the page; Ctrl (or pinch) zooms the graph at the pointer.
  svg.addEventListener('wheel', (e) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const rect = svg.getBoundingClientRect();
    zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * 0.0015));
  }, { passive: false });
  function zoomBy(factor) {
    const rect = svg.getBoundingClientRect();
    zoomAt(rect.width / 2, rect.height / 2, factor);
  }

  function fit() {
    const rect = svg.getBoundingClientRect();
    const t = fitTransform(bounds(state.positions), { width: rect.width, height: rect.height });
    state.k = t.k;
    state.tx = t.tx;
    state.ty = t.ty;
    apply();
  }

  function centerOn(id) {
    const p = state.positions.get(id);
    if (!p) return;
    const rect = svg.getBoundingClientRect();
    state.tx = rect.width / 2 - (p.x + p.width / 2) * state.k;
    state.ty = rect.height / 2 - (p.y + p.height / 2) * state.k;
    apply();
  }

  function drawCard(card, p) {
    const g = el('g', { class: `card ${card.classes || ''}`.trim(), transform: `translate(${p.x},${p.y})`, tabindex: 0, role: 'button', 'data-id': card.id, 'aria-label': card.ariaLabel || card.id });
    g.appendChild(el('rect', { width: p.width, height: p.height, rx: 4 }));
    card.lines.forEach((line, i) => {
      g.appendChild(el('text', { x: 10, y: 20 + i * 16, class: `line line-${i}` }, clip(line, 30)));
    });
    if (card.badge) g.appendChild(el('text', { x: p.width - 10, y: p.height - 8, class: 'badge', 'text-anchor': 'end' }, clip(card.badge, 26)));
    if (card.toggle) {
      const t = el('g', { class: 'toggle', transform: `translate(${p.width - 22},${6})`, 'data-toggle': card.id });
      t.appendChild(el('rect', { width: 16, height: 16, rx: 3 }));
      t.appendChild(el('text', { x: 8, y: 12, 'text-anchor': 'middle' }, card.toggle));
      t.appendChild(el('title', {}, card.toggle === '+' ? 'Expand' : 'Collapse'));
      g.appendChild(t);
    }
    g.addEventListener('click', (e) => {
      if (e.target.closest('.toggle')) callbacks.onToggle(card.id);
      else callbacks.onSelect(card.id);
    });
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') callbacks.onSelect(card.id);
      if (e.key === ' ' && card.toggle) { e.preventDefault(); callbacks.onToggle(card.id); }
    });
    return g;
  }

  function render(scene) {
    viewport.replaceChildren();
    state.positions = scene.positions;
    const edgesLayer = el('g', { class: 'edges' });
    for (const e of scene.edges) {
      const a = scene.positions.get(e.from);
      const b = scene.positions.get(e.to);
      if (a && b) edgesLayer.appendChild(el('path', { d: edgePath(a, b), class: e.classes || '' }));
    }
    viewport.appendChild(edgesLayer);
    for (const h of scene.headers || []) {
      viewport.appendChild(el('text', { x: h.x, y: h.y + 14, class: 'group-header' }, `${h.name} (${h.count})`));
    }
    const cardsLayer = el('g', { class: 'cards' });
    for (const card of scene.cards) {
      const p = scene.positions.get(card.id);
      if (p) cardsLayer.appendChild(drawCard(card, p));
    }
    viewport.appendChild(cardsLayer);
    apply();
  }

  function focusCard(id) {
    const g = svg.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
    if (g) g.focus();
  }

  return { render, fit, centerOn, focusCard, zoomBy };
}
