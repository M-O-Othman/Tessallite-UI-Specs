/** SVG drawing, pan and zoom. Depends on layout.js. */
import { bounds, edgePath, fitTransform } from './layout.js';
import viewerConfig from './viewer-config.json' with { type: 'json' };

const SVG_NS = 'http://www.w3.org/2000/svg';
const drawing = viewerConfig.card.drawing;
const zoom = viewerConfig.zoom;
const captions = viewerConfig.captions.graph;

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
 * a scene is { positions, cards: [{id, lines, classes, badge, toggle}], edges: [{from, to}] }.
 * Callbacks: onSelect(id), onToggle(id).
 */
export function createGraph(svg, callbacks) {
  const viewport = el('g', { class: 'viewport' });
  svg.appendChild(viewport);
  const state = { k: zoom.initialScale, tx: zoom.initialOffset, ty: zoom.initialOffset, positions: new Map(), drag: null };
  const measure = () => {
    const rect = svg.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  };
  let viewportSize = measure();
  let fitted = false;

  const apply = () => viewport.setAttribute('transform', `translate(${state.tx},${state.ty}) scale(${state.k})`);

  function resize() {
    const next = measure();
    if (next.width <= 0 || next.height <= 0 || (next.width === viewportSize.width && next.height === viewportSize.height)) return;
    if (fitted) { viewportSize = next; fit(); return; }
    if (viewportSize.width > 0 && viewportSize.height > 0) {
      const worldX = (viewportSize.width / 2 - state.tx) / state.k;
      const worldY = (viewportSize.height / 2 - state.ty) / state.k;
      state.tx = next.width / 2 - worldX * state.k;
      state.ty = next.height / 2 - worldY * state.k;
    }
    viewportSize = next;
    apply();
  }

  svg.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.card')) return;
    resize();
    state.drag = { x: e.clientX, y: e.clientY, tx: state.tx, ty: state.ty };
    svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener('pointermove', (e) => {
    if (!state.drag) return;
    fitted = false;
    state.tx = state.drag.tx + (e.clientX - state.drag.x);
    state.ty = state.drag.ty + (e.clientY - state.drag.y);
    apply();
  });
  const endDrag = () => { state.drag = null; };
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);
  function zoomAt(px, py, factor) {
    fitted = false;
    const k = Math.min(zoom.maximumScale, Math.max(zoom.minimumScale, state.k * factor));
    state.tx = px - ((px - state.tx) * k) / state.k;
    state.ty = py - ((py - state.ty) * k) / state.k;
    state.k = k;
    apply();
  }
  // Wheel pans the graph; Ctrl/Command-wheel (or pinch) zooms at the pointer.
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    resize();
    if (!e.ctrlKey && !e.metaKey) {
      fitted = false;
      state.tx -= e.deltaX * zoom.wheelPanFactor;
      state.ty -= e.deltaY * zoom.wheelPanFactor;
      apply();
      return;
    }
    const rect = svg.getBoundingClientRect();
    zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * zoom.wheelSensitivity));
  }, { passive: false });
  function zoomBy(factor) {
    resize();
    const rect = svg.getBoundingClientRect();
    zoomAt(rect.width / 2, rect.height / 2, factor);
  }

  function fit() {
    const rect = svg.getBoundingClientRect();
    viewportSize = { width: rect.width, height: rect.height };
    const t = fitTransform(bounds(state.positions), { width: rect.width, height: rect.height });
    state.k = t.k;
    state.tx = t.tx;
    state.ty = t.ty;
    fitted = true;
    apply();
  }

  function centerOn(id) {
    const p = state.positions.get(id);
    if (!p) return;
    resize();
    const rect = svg.getBoundingClientRect();
    fitted = false;
    state.tx = rect.width / 2 - (p.x + p.width / 2) * state.k;
    state.ty = rect.height / 2 - (p.y + p.height / 2) * state.k;
    apply();
  }

  function readable() {
    const box = bounds(state.positions);
    viewportSize = measure();
    fitted = false;
    state.k = zoom.readableScale;
    state.tx = zoom.readablePadding - (box?.x || 0);
    state.ty = zoom.readablePadding - (box?.y || 0);
    apply();
  }

  function drawCard(card, p) {
    const g = el('g', { class: `card ${card.classes || ''}`.trim(), transform: `translate(${p.x},${p.y})`, tabindex: 0, role: 'button', 'data-id': card.id, 'aria-label': card.ariaLabel || card.id, 'aria-expanded': card.expanded });
    g.appendChild(el('title', {}, card.lines.join('\n')));
    g.appendChild(el('rect', { width: p.width, height: p.height, rx: drawing.cornerRadius }));
    card.lines.forEach((line, i) => {
      const besideToggle = i === 0 && card.toggle;
      const right = besideToggle ? p.width - drawing.toggleInsetX - drawing.textToggleGap : p.width - drawing.textRightInset;
      const lineViewport = el('svg', {
        x: drawing.textInsetX,
        y: drawing.textViewportTop + i * drawing.textLineSpacing,
        width: Math.max(0, right - drawing.textInsetX),
        height: drawing.textViewportHeight,
        overflow: 'hidden',
      });
      lineViewport.appendChild(el('text', { x: 0, y: drawing.textFirstBaseline - drawing.textViewportTop, class: `line line-${i}` }, clip(line, besideToggle ? drawing.textWithToggleMaxCharacters : drawing.textMaxCharacters)));
      g.appendChild(lineViewport);
    });
    if (card.badge) g.appendChild(el('text', { x: p.width - drawing.badgeInsetX, y: p.height - drawing.badgeInsetY, class: 'badge', 'text-anchor': 'end' }, clip(card.badge, drawing.badgeMaxCharacters)));
    if (card.toggle) {
      const t = el('g', { class: 'toggle', transform: `translate(${p.width - drawing.toggleInsetX},${drawing.toggleInsetY})`, 'data-toggle': card.id });
      t.appendChild(el('rect', { width: drawing.toggleSize, height: drawing.toggleSize, rx: drawing.toggleCornerRadius }));
      t.appendChild(el('text', { x: drawing.toggleTextX, y: drawing.toggleTextY, 'text-anchor': 'middle' }, card.toggle));
      t.appendChild(el('title', {}, card.toggle === '+' ? captions.expand : captions.collapse));
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

  return { render, fit, centerOn, focusCard, zoomBy, readable, resize };
}
