import { buildModel, countsByType, DEFAULT_FILTERS, expandedToDepth, expandPaths, pathOf, resolveVid, search, visibleForest } from './model.js';
import { layoutForest } from './layout.js';
import { createGraph } from './graph.js';
import { renderInspector } from './detail.js';
import { parseInput, validateInput } from './validation.js';
import viewerConfig from './viewer-config.json' with { type: 'json' };

const { captions, expansion, zoom } = viewerConfig;
const state = { model: null, view: 'components', filters: { ...DEFAULT_FILTERS, hideDetails: true }, expanded: new Set(), selected: null, hits: new Set(), structureFilter: '', scene: null, load: 0, maximised: false };
const $ = (selector) => document.querySelector(selector);
let graph;
let resizeObserver;
const setStatus = (text) => { $('#status').textContent = text; };

function showErrors(title, errors) {
  const panel = $('#errors'); panel.replaceChildren(); panel.hidden = false;
  const heading = document.createElement('strong'); heading.textContent = title; panel.append(heading);
  const list = document.createElement('ul');
  for (const error of errors) {
    const item = document.createElement('li');
    item.textContent = typeof error === 'string' ? error : error.rule + ' ' + error.path + ': ' + error.message;
    list.append(item);
  }
  panel.append(list);
  setStatus(captions.errors.documentNotLoaded);
}

function loadDocument(doc, source) {
  const validation = validateInput(doc);
  if (!validation.valid) { showErrors(captions.errors.cannotOpen + source, validation.errors); return; }
  const model = buildModel(doc);
  state.model = model; state.selected = null; state.hits.clear();
  $('#errors').hidden = true;
  $('#search').value = ''; $('#hits').textContent = ''; $('#search-results').replaceChildren();
  $('#document-name').textContent = doc.name;
  $('#document-meta').textContent = doc.version + ' · ' + model.entries.size + ' ' + captions.document.nodes + ' · ' + model.cards.size + ' ' + captions.document.components;
  const select = $('#structure');
  const option = (text, value) => Object.assign(document.createElement('option'), { textContent: text, value });
  select.replaceChildren(option(captions.document.allStructures, ''));
  for (const root of model.structureRoots) select.append(option(root.owner, root.owner));
  // Start with a single surface so a large document is legible at reading size.
  state.structureFilter = model.structureRoots[0]?.owner || '';
  select.value = state.structureFilter;
  state.expanded = expandedToDepth(model, state.view, expansion.defaultDepth, state.filters);
  setStatus(source + ' · ' + captions.document.validDocument + ' · ' + model.structureRoots.length + ' ' + captions.document.structures);
  redraw('read');
}

function scopeRoot(root) { return !state.structureFilter || root.entry?.owner === state.structureFilter; }

function buildScene() {
  const forest = visibleForest(state.model, state.view, state.filters, state.expanded, scopeRoot);
  const positions = layoutForest(forest.nodes, forest.edges);
  const cards = forest.nodes.map((item) => {
    const v = item.vnode;
    const n = v.entry?.node || v.node;
    return {
      id: item.id, lines: v.lines, badge: v.badge || '',
      toggle: item.hasChildren ? (item.collapsed ? '+' : '−') : '',
      classes: [v.kind, n?.kind === 'logical' ? 'logical' : '', n?.presentation === 'overlay' ? 'overlay' : '', state.selected === item.id ? 'selected' : '', state.hits.has(item.id) ? 'hit' : ''].filter(Boolean).join(' '),
      ariaLabel: v.lines.join(', '), expanded: item.hasChildren ? !item.collapsed : undefined,
    };
  });
  return { positions, cards, edges: forest.edges, items: forest.nodes };
}

function redraw(position) {
  if (!state.model) return;
  state.scene = buildScene(); graph.render(state.scene);
  if (position === 'fit') graph.fit();
  if (position === 'read') graph.readable();
  $('#empty').hidden = state.scene.cards.length > 0;
  if (!state.scene.cards.length) {
    $('#empty h2').textContent = captions.emptyView.title;
    $('#empty p').textContent = captions.emptyView.description;
  }
  $('#view-title').textContent = captions.views[state.view].title;
  $('#view-description').textContent = captions.views[state.view].description;
  const list = $('#counts'); list.replaceChildren();
  for (const [type, count] of countsByType(state.scene.items)) {
    const li = document.createElement('li');
    li.append(Object.assign(document.createElement('span'), { textContent: type }), Object.assign(document.createElement('span'), { textContent: String(count) }));
    list.append(li);
  }
  $('#visible-count').textContent = state.scene.cards.length + ' ' + captions.visibleNodes;
  const selected = state.selected ? resolveVid(state.selected, state.model) : undefined;
  renderInspector(selected, state.model, (id) => selectNode(id, true), revealTarget);
  for (const box of document.querySelectorAll('.filters input')) box.disabled = state.view !== 'structures';
}

function selectNode(id, reveal = false) {
  const vnode = resolveVid(id, state.model);
  if (!vnode) return;
  state.selected = id;
  if (reveal) state.expanded = expandPaths([vnode], state.expanded, state.model);
  redraw();
  if (reveal) graph.centerOn(id);
  graph.focusCard(id);
}

function revealTarget(id) {
  const entry = state.model.entries.get(id);
  if (!entry) return;
  state.view = entry.ownerKind === 'structure' ? 'structures' : 'components';
  $('input[name="view"][value="' + state.view + '"]').checked = true;
  state.structureFilter = entry.ownerKind === 'structure' ? entry.owner : '';
  $('#structure').value = state.structureFilter;
  state.filters = { ...DEFAULT_FILTERS };
  $('#show-details').checked = true;
  for (const box of document.querySelectorAll('.filters input')) box.checked = false;
  // A definition target is reached through its actual component instance detail branch.
  if (entry.ownerKind === 'component') {
    const all = expandedToDepth(state.model, 'components', expansion.componentTargetDepth, state.filters);
    const forest = visibleForest(state.model, 'components', state.filters, all);
    const target = forest.nodes.find((item) => item.vnode.entry?.id === id);
    if (target) { state.expanded = all; selectNode(target.id, true); return; }
  }
  state.expanded = expandedToDepth(state.model, state.view, expansion.defaultDepth, state.filters);
  selectNode('entry:' + id, true);
}

function toggleNode(id) {
  if (state.expanded.has(id)) state.expanded.delete(id); else state.expanded.add(id);
  state.selected = id; redraw(); graph.focusCard(id);
}

function runSearch() {
  if (!state.model) return;
  const query = $('#search').value;
  const hits = search(state.model, state.view, query).filter((hit) => !state.structureFilter || pathOf(hit, state.model)[0]?.entry?.owner === state.structureFilter);
  // Search results are limited to nodes reachable under the current display options.
  const all = expandedToDepth(state.model, state.view, expansion.searchMaxDepth, state.filters);
  const available = new Set(visibleForest(state.model, state.view, state.filters, all, scopeRoot).nodes.map((n) => n.id));
  const shown = hits.filter((hit) => available.has(hit.vid));
  state.hits = new Set(shown.map((hit) => hit.vid));
  state.expanded = expandPaths(shown, state.expanded, state.model);
  $('#hits').textContent = query.trim() ? shown.length + ' ' + captions.search.results + (hits.length > shown.length ? ' · ' + (hits.length - shown.length) + ' ' + captions.search.hidden : '') : '';
  const list = $('#search-results'); list.replaceChildren();
  for (const hit of shown) {
    const button = document.createElement('button'); button.type = 'button';
    button.textContent = hit.lines[0] + (hit.node ? ' · ' + hit.node.id : '');
    button.addEventListener('click', () => selectNode(hit.vid, true)); list.append(button);
  }
  redraw();
  if (shown.length) graph.centerOn(shown[0].vid);
}

async function readFile(file) {
  const sequence = ++state.load;
  try {
    const text = await file.text();
    if (sequence !== state.load) return;
    loadDocument(parseInput(text, file.name), file.name);
  } catch (error) { if (sequence === state.load) showErrors(captions.errors.cannotRead + file.name, [error.message]); }
}

function setMaximised(maximised) {
  state.maximised = maximised;
  document.body.classList.toggle('view-maximised', maximised);
  $('.app-header').hidden = maximised;
  $('.navigation').hidden = maximised;
  $('.side').hidden = maximised;
  const control = $('#maximise-view');
  control.setAttribute('aria-pressed', String(maximised));
  control.setAttribute('aria-label', maximised ? captions.workspace.restoreLabel : captions.workspace.maximiseLabel);
  control.textContent = maximised ? captions.workspace.restore : captions.workspace.maximise;
  graph.resize();
}

function wire() {
  const canvas = $('#canvas');
  graph = createGraph(canvas, { onSelect: selectNode, onToggle: toggleNode });
  if (window.ResizeObserver) {
    resizeObserver = new window.ResizeObserver(() => graph.resize());
    resizeObserver.observe(canvas);
  } else window.addEventListener('resize', () => graph.resize());
  $('#file').addEventListener('change', (event) => { if (event.target.files[0]) readFile(event.target.files[0]); event.target.value = ''; });
  document.body.addEventListener('dragover', (event) => { event.preventDefault(); document.body.classList.add('dragging'); });
  document.body.addEventListener('dragleave', () => document.body.classList.remove('dragging'));
  document.body.addEventListener('drop', (event) => { event.preventDefault(); document.body.classList.remove('dragging'); if (event.dataTransfer.files[0]) readFile(event.dataTransfer.files[0]); });
  for (const radio of document.querySelectorAll('input[name="view"]')) radio.addEventListener('change', () => {
    state.view = radio.value; state.selected = null; state.hits.clear();
    if (state.model) { state.expanded = expandedToDepth(state.model, state.view, expansion.defaultDepth, state.filters); redraw('read'); runSearch(); }
  });
  for (const box of document.querySelectorAll('.filters input')) box.addEventListener('change', () => { state.filters[box.dataset.filter] = box.checked; runSearch(); });
  $('#show-details').addEventListener('change', (event) => { state.filters.hideDetails = !event.target.checked; redraw(); });
  $('#structure').addEventListener('change', (event) => { state.structureFilter = event.target.value; state.selected = null; redraw('read'); runSearch(); });
  $('#depth-apply').addEventListener('click', () => {
    if (!state.model || !$('#depth').reportValidity()) return;
    state.expanded = expandedToDepth(state.model, state.view, Number($('#depth').value), state.filters); redraw('read');
  });
  $('#collapse-all').addEventListener('click', () => { state.expanded.clear(); redraw('read'); });
  $('#maximise-view').addEventListener('click', () => setMaximised(!state.maximised));
  $('#fit').addEventListener('click', () => graph.fit());
  $('#reset-zoom').addEventListener('click', () => graph.readable());
  $('#zoom-in').addEventListener('click', () => graph.zoomBy(zoom.inFactor));
  $('#zoom-out').addEventListener('click', () => graph.zoomBy(zoom.outFactor));
  $('#search').addEventListener('input', runSearch);
  $('#search').addEventListener('keydown', (event) => { if (event.key === 'Escape') { event.target.value = ''; runSearch(); } });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !state.maximised) return;
    event.preventDefault();
    setMaximised(false);
    $('#maximise-view').focus();
  });
  const embedded = $('#tuis-document').textContent.trim();
  if (embedded && !embedded.startsWith('<!--')) {
    try { loadDocument(parseInput(embedded), captions.document.embeddedSource); }
    catch (error) { showErrors(captions.errors.cannotReadEmbedded, [error.message]); }
  }
}

document.addEventListener('DOMContentLoaded', wire);
