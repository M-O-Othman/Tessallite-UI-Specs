# Change log

## 0.2.0 (unreleased)

- packages/visualiser: a self-contained HTML visualiser (vanilla JavaScript
  and SVG, no dependencies) that draws a document as a pannable, zoomable
  left-to-right graph at uniform level of detail. Components view opens at
  group and component cards; Structures view opens with every root collapsed
  to depth 1; detail (props, events, states, slots, structure, facts) appears
  only when a card is expanded, one level at a time. Filters, search that
  expands the path to hits, a detail panel with clickable breadcrumb, counts
  by type and fit to view.
- `tuis view <file> [--out page.html]`: writes the visualiser page with the
  document embedded.
- The specification, schema and vocabularies are unchanged; a 0.1 document
  is a 0.2 document.

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
