# Change log

## 0.2.0 (unreleased)

### Viewer and validation repair - 2026-09-07

- Screenshot follow-up: make the desktop graph fill the available viewport,
  scroll navigation and inspector independently, add maximise/restore with
  Escape, and keep graph position coherent when its viewport changes.
- Apply the supplied brand kit's official primary logo and accessible
  control borders. Embed the logo in the offline page and retain its licence.
- Use white backgrounds regardless of OS theme, matching tessallite.io.
  Consolidate the graph title, controls and both footer information areas in
  a compact responsive header to leave more vertical space for drawing.

- Changed Components into a containment hierarchy: surface, authored component
  instance, then contained component instance. Distinct instances keep their
  own descendants and behaviour. Components unreachable from a surface remain
  available under Unreferenced when All structures is selected.
- Kept both graph views. Components shows the component hierarchy; Structures
  shows the full element tree and expands referenced subtrees at each use.
- The viewer now opens the first surface at 100% zoom. Added a readable
  inspector, optional detail branches, depth and collapse controls, Fit and
  100% controls, and responsive navigation and inspector panels. The ordinary
  wheel pans the desktop graph; Ctrl+wheel and the zoom controls scale it.
- Added selectable search results for names, IDs, labels, components, event
  names, handlers, effects and targets. Surface scope limits both views;
  Structures display filters limit its graph and search results.
- Parse and validate local JSON and YAML inside the offline page. The schema
  validator, semantic checks and YAML parser are bundled; no network access or
  separately installed runtime package is required. A failed or stale file
  load does not replace the current valid document.
- Moved viewer labels and interaction defaults into `viewer-config.json`; the
  build embeds this configuration in the offline page instead of fetching it.
- Corrected inherited table, grid and reference requirements; event queries;
  escaped JSON Pointers; reference-cycle checks; and missing component and
  data-binding checks.
- `tuis view` now refuses invalid documents and source overwrite. Query depth
  and missing-path failures now return errors.
- Added exported-page DOM interaction coverage and authoring documentation.
- Actual Chrome visual verification remains pending. The enabled Browser
  extension is missing its native-host manifest and must be repaired through
  the plugin UI; DOM tests do not certify layout or appearance.

### Initial 0.2 visualiser history

- The first 0.2 implementation introduced a self-contained HTML visualiser
  using JavaScript and SVG, plus `tuis view <file> [--out page.html]` for a
  page with an embedded document. It drew pannable, zoomable left-to-right
  graphs with filters, path-expanding search, detail branches, breadcrumbs,
  type counts and Fit.
- That initial implementation opened component definitions under group cards
  and auto-fitted broader content. Those interaction details are historical;
  the repair above defines the current component hierarchy and initial view.
- The format remains 0.1. Tooling 0.2 does not require a document migration.

## 0.1.0 (unreleased)

Initial version.

- SPEC.md with rules R1-R26; JSON Schema 2020-12 with the x- compatibility
  mode; vocabularies for node types, actions and states; mappings for CEM,
  W3C Design Tokens, Storybook manifests and react-docgen.
- packages/core (load, validate, query), packages/cli (`tuis`),
  packages/mcp-server (read-only, stdio).
- Examples: minimal.json, containment.json.

### Tuned on the Tessallite Excel plugin

Changes made while describing the Tessallite Excel task pane with the
format. Recorded here so the reason for each field survives.

- Node `condition` (SPEC section 6, R22a). The task pane has dozens of
  elements that exist only under a runtime condition (the profile switcher
  when profiles exist, the Trace button after a query, the remove button on
  a non-active profile). Expressing each as a state with `present` lists at
  leaf scale was unreadable; a one-line condition on the node is what the
  code says.
- Column `repeat` and table `data.columns` (R4, R6). The chat data table and
  the drill-through table take their columns from the result set; a fixed
  column list cannot describe them. A repeat column stands for N data-driven
  columns and the cell that names it is the repeated cell of its row, fed by
  `data.columns` on the table rather than a per-row collection.
- `$ref` instances may override `condition`, `kind`, `component` and
  `tokens` (R24). Every chat sub-component instance is conditional
  (citations only with citations, feedback only when enabled).
- Recorded, not changed: no real `grid` exists in the task pane (the template
  gallery is a flowing list), so tracks and placement remain covered by the
  synthetic example only. `tooltip` nodes are used only for explicit tooltip
  components; native `title` attributes are folded into `label`.
- Handler strings record the callback chain (`AppHeader.onOpenDrill ->
  App.handleOpenDrill`) when a leaf's handler is a pass-through prop. No
  field change was needed; AGENTS.md documents the convention.
