/** Application state and UI wiring. Depends on model.js, layout.js, graph.js. */

const state = { model: null, view: 'components', filters: { ...DEFAULT_FILTERS }, expanded: new Set(), selected: null, hits: new Set(), structureFilter: '', scene: null };
const $ = (sel) => document.querySelector(sel);
let graph;

function setStatus(text) { $('#status').textContent = text; }

function loadDocument(doc, source) {
  state.model = buildModel(doc);
  state.selected = null;
  state.hits = new Set();
  $('#search').value = '';
  $('#hits').textContent = '';
  const select = $('#structure');
  select.replaceChildren(new Option('All structures', ''));
  for (const root of state.model.structureRoots) select.add(new Option(root.owner, root.id));
  state.structureFilter = '';
  state.expanded = expandedToDepth(state.model, state.view, 1, state.filters);
  setStatus(`${doc.name || 'document'} ${doc.version || ''} from ${source}: ${state.model.entries.size} nodes, ${state.model.cards.size} components in ${state.model.groups.length} groups, ${state.model.structureRoots.length} structures`);
  redraw(true);
}

function buildScene() {
  const rootFilter = state.view === 'structures' && state.structureFilter ? (root) => root.entry.id === state.structureFilter : undefined;
  const forest = visibleForest(state.model, state.view, state.filters, state.expanded, rootFilter);
  const positions = layoutForest(forest.nodes, forest.edges);
  const cards = forest.nodes.map((item) => {
    const v = item.vnode;
    const flags = v.kind === 'entry' ? [v.entry.node.kind === 'logical' ? 'logical' : '', v.entry.node.presentation === 'overlay' ? 'overlay' : '', componentOf(v.entry.node) ? 'has-component' : ''] : [];
    return {
      id: item.id, lines: v.lines,
      toggle: item.hasChildren ? (item.collapsed ? '+' : '−') : '',
      classes: [v.kind, ...flags, state.selected === item.id ? 'selected' : '', state.hits.has(item.id) ? 'hit' : ''].filter(Boolean).join(' '),
      ariaLabel: `${v.kind} ${v.lines[0]}${item.hasChildren ? (item.collapsed ? ', collapsed' : ', expanded') : ''}`,
    };
  });
  const edges = forest.edges.map((e) => ({ ...e }));
  if (state.view === 'components') {
    const drawn = new Set(forest.nodes.map((n) => n.id));
    for (const e of state.model.edges) {
      const from = vid.component(e.from); const to = vid.component(e.to);
      if (drawn.has(from) && drawn.has(to)) edges.push({ from, to, classes: 'uses' });
    }
  }
  return { positions, cards, edges, items: forest.nodes };
}

function redraw(fit) {
  if (!state.model) return;
  state.scene = buildScene();
  graph.render(state.scene);
  if (fit) graph.fit();
  renderCounts();
  renderDetail();
  $('#structure').disabled = state.view !== 'structures';
  for (const box of document.querySelectorAll('.filters input')) box.disabled = state.view !== 'structures';
}

function renderCounts() {
  const list = $('#counts');
  list.replaceChildren();
  for (const [type, n] of countsByType(state.scene.items)) {
    const li = document.createElement('li');
    li.append(Object.assign(document.createElement('span'), { textContent: type }), Object.assign(document.createElement('span'), { textContent: String(n) }));
    list.appendChild(li);
  }
  $('#counts-title').textContent = `Drawn: ${state.scene.cards.length}`;
}

function renderDetail() {
  const crumbs = $('#breadcrumb');
  const json = $('#json');
  crumbs.replaceChildren();
  const vnode = state.selected ? resolveVid(state.selected, state.model, state.filters) : undefined;
  if (!vnode) { json.textContent = 'Select a card.'; return; }
  for (const ancestor of pathOf(vnode, state.model)) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'crumb'; b.textContent = ancestor.lines[0];
    b.addEventListener('click', () => selectNode(ancestor.vid, true));
    crumbs.appendChild(b);
  }
  let value = vnode.data;
  if (vnode.kind === 'entry') { const { children, ...rest } = vnode.entry.node; value = { ...rest, children: children ? `${children.length} children` : undefined, owner: `${vnode.entry.ownerKind} ${vnode.entry.owner}` }; }
  if (vnode.kind === 'component') { const { structure, ...rest } = vnode.card.definition; value = { ...rest, structure: structure ? `root ${structure.id}` : undefined, usedBy: vnode.card.usedBy.map((u) => `${u.ownerKind} ${u.owner} at ${u.nodeId}`) }; }
  json.textContent = JSON.stringify(value, null, 2);
}

function selectNode(id, reveal) {
  state.selected = id;
  if (reveal) { const v = resolveVid(id, state.model, state.filters); if (v) state.expanded = expandPaths([v], state.expanded, state.model); }
  redraw(false);
  if (reveal) graph.centerOn(id);
  graph.focusCard(id);
}

function toggleNode(id) {
  if (state.expanded.has(id)) state.expanded.delete(id); else state.expanded.add(id);
  redraw(false);
}

function runSearch() {
  const query = $('#search').value;
  const hits = search(state.model, state.view, query);
  state.hits = new Set(hits.map((h) => h.vid));
  if (hits.length) state.expanded = expandPaths(hits, state.expanded, state.model);
  $('#hits').textContent = query.trim() ? `${hits.length} hits` : '';
  redraw(false);
  if (hits.length) graph.centerOn(hits[0].vid);
}

function readFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try { loadDocument(JSON.parse(String(reader.result)), file.name); }
    catch (error) { setStatus(`Could not read ${file.name}: ${error.message}. The visualiser takes JSON; convert YAML with the tuis CLI.`); }
  };
  reader.readAsText(file);
}

function wire() {
  graph = createGraph($('#canvas'), { onSelect: (id) => selectNode(id, false), onToggle: toggleNode });
  $('#file').addEventListener('change', (e) => { if (e.target.files[0]) readFile(e.target.files[0]); });
  document.body.addEventListener('dragover', (e) => { e.preventDefault(); document.body.classList.add('dragging'); });
  document.body.addEventListener('dragleave', () => document.body.classList.remove('dragging'));
  document.body.addEventListener('drop', (e) => { e.preventDefault(); document.body.classList.remove('dragging'); if (e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]); });
  for (const radio of document.querySelectorAll('input[name="view"]')) {
    radio.addEventListener('change', () => {
      state.view = radio.value; state.selected = null; state.hits = new Set(); $('#hits').textContent = ''; $('#search').value = '';
      if (state.model) { state.expanded = expandedToDepth(state.model, state.view, 1, state.filters); redraw(true); }
    });
  }
  for (const box of document.querySelectorAll('.filters input')) box.addEventListener('change', () => { state.filters[box.dataset.filter] = box.checked; redraw(false); });
  $('#structure').addEventListener('change', (e) => { state.structureFilter = e.target.value; redraw(true); });
  $('#depth-apply').addEventListener('click', () => { if (state.model) { state.expanded = expandedToDepth(state.model, state.view, Number($('#depth').value) || 1, state.filters); redraw(true); } });
  $('#collapse-all').addEventListener('click', () => { if (state.model) { state.expanded = expandedToDepth(state.model, state.view, 1, state.filters); redraw(true); } });
  $('#fit').addEventListener('click', () => graph.fit());
  $('#search').addEventListener('input', () => { if (state.model) runSearch(); });
  $('#search').addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.target.value = ''; runSearch(); } });
  const embedded = document.getElementById('tuis-document');
  if (embedded && embedded.textContent.trim() && !embedded.textContent.trim().startsWith('<!--')) {
    try { loadDocument(JSON.parse(embedded.textContent), 'embedded document'); } catch (error) { setStatus(`Embedded document is not valid JSON: ${error.message}`); }
  } else setStatus('Open a Tessallite-UI-Specs document: drop a .json file on the page or use the file picker.');
}

document.addEventListener('DOMContentLoaded', wire);
