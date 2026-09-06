# Tessallite-UI-Specs v0.1 plan

Status: approved decisions 2026-09-06; Phases 1-4 executed 2026-09-06 (Excel document lives in the workspace, uncommitted, per D8).
Repository: https://github.com/M-O-Othman/Tessallite-UI-Specs

## Goal

An extension of OpenUI (openuispec.org) that documents the STRUCTURE and
BEHAVIOUR of a product's user interface - a single-parent tree of typed nodes
with props, states, events and actions - in a technology-independent, text-only
form that design tools, documentation tools and AI coding agents can read and
validate. It renders nothing and carries no visual information.

## Decisions (final)

D1  Name Tessallite-UI-Specs; public from day one; no LICENSE file yet.
D2  Extension of OpenUI: the OpenUI envelope (`name`, `version`,
    `description`, `components` with OpenUI-shaped props) is kept verbatim.
    Added: top-level `structures`; `events`, `states`, `slots` on component
    definitions. The validator also accepts `x-structures`, `x-events`,
    `x-states`, `x-slots`.
D3  Independent; upstream PR considered only after v0.1 is proven on the
    Tessallite Excel plugin. No upstream issue now.
D4  No rendering, no layout, no visual hints. Structure = containment.
D5  Containment model: single-parent tree; node `kind` visible | logical;
    repeat-templates for lists; table -> row -> cell with column definitions
    on the table; grid with named tracks and per-child placement; named
    slots; reuse by `$ref`; overlays owned by their opener with
    `presentation: overlay`; per-node states; events with `actions` plus
    `effect`; icons as URIs with mandatory `label`.
D6  Vocabularies as listed in the open-questions file (node fields, node
    types with `custom:<name>`, event actions).
D7  Tooling in TypeScript: packages/core (parse, validate, query),
    packages/cli (validate, query), packages/mcp-server (read-only tools:
    list_structures, get_tree, get_node, find, path_to, events_of,
    children_of, validate).
D8  Worked example deferred: examples/ ships a small synthetic sample used by
    the tests; the Tessallite task pane example lands after it is tuned on
    the plugin (separate lane in the workspace repo).
D9  Mappings documented for Custom Elements Manifest (events), W3C Design
    Tokens (token references), Storybook component manifest and react-docgen
    (prop extraction) - prose plus field tables, no converters in v0.1.
D10 Agent-facing: llms.txt at the root, AGENTS.md, and every schema field
    carries a `description` so an agent can author from the schema alone.

## Phases and tasks

Phase 1 - Specification text and schema
  1.1 SPEC.md: scope, conformance (RFC 2119), document layout, the node
      model, containment rules C1-C8, events and actions, states, reuse,
      versioning, compatibility with OpenUI, the x- compatibility mode.
  1.2 schema/tessallite-ui-specs.schema.json: JSON Schema 2020-12 for the
      whole document (OpenUI envelope + extension), every field described.
  1.3 vocabulary/node-types.md, vocabulary/actions.md,
      vocabulary/states.md: one table each, with meaning and containment
      rules per type (what may be a parent of what).
  1.4 mappings/: cem.md, design-tokens.md, storybook-manifest.md,
      react-docgen.md.
  1.5 examples/minimal.json and examples/containment.json (list, table,
      grid, slots, $ref, overlay) - synthetic, used by tests.

Phase 2 - Tooling
  2.1 packages/core: load JSON/YAML, validate against the schema plus the
      semantic rules the schema cannot express (unique ids, $ref targets
      exist, cell.column exists on the table, placement inside tracks, one
      repeat child per list, slot names declared), and a query API
      (tree, node, find, pathTo, eventsOf, childrenOf).
  2.2 packages/cli: `tuis validate <file>` and `tuis query <file> <op>`.
  2.3 packages/mcp-server: the read-only tools over packages/core, stdio
      transport, one document per server instance.
  2.4 Tests: schema fixtures (valid and invalid), semantic rule tests, query
      tests, MCP tool tests.

Phase 3 - Repository surface
  3.1 README (what, why, quick start, relation to OpenUI), llms.txt,
      AGENTS.md, CONTRIBUTING, CHANGELOG, docs/_INDEX.md.
  3.2 CI: validate examples and run tests on push.
  3.3 docs/upstream-proposal.md: the future PR text, kept current.

Phase 4 - Proving on the Tessallite Excel plugin (workspace repo, later)
  4.1 Author tessallite/excel-plugin/docs/architecture/excel-plugin-ui.openui.json
      from the shell, three screens and overlays; validate; tune the spec
      where it fails to express something.
  4.2 Feed back spec changes here; then publish the generalised example
      (D8).

Phase 5 - Visualiser (v0.2, approved 2026-09-07)
  Problem: the plugin document has 993 nodes; a human cannot read it or
  even find the components in it. Wanted: a small browser visualiser in
  the style of jsoncrack (node-link graph, left to right, pan and zoom),
  whose defining feature is level of detail, not fidelity.
  5.1 packages/visualiser: vanilla JavaScript + SVG, zero dependencies,
      no framework. Sources src/index.html, src/app.js (state, views,
      filters, search, detail panel), src/graph.js (model builder +
      layered tree layout + pan/zoom), src/style.css; build.mjs inlines
      them into dist/visualiser.html, one self-contained file that opens
      from disk and takes a document by drag-drop or file picker.
  5.2 Views. "Components": one card per component definition, grouped by
      group/package, edges = used-by (component field and $ref from
      structures and other component structures); no structure nodes.
      "Structures": containment tree per structure, every root collapsed
      to depth 1 on load; click to expand/collapse a node; "expand to
      depth N"; filters: hide logical nodes, hide leaf types (text, icon,
      divider, skeleton), only nodes with a component, hide overlays,
      collapse repeat templates. Search on id/name/label/component expands
      the path to each hit and highlights it.
  5.3 Node card: id, type, kind, component, condition, repeat, overlay
      markers. Detail panel on select: the node's full JSON plus its
      path (breadcrumb, clickable). Counts panel: nodes by type for the
      visible selection. Fit-to-view button.
  5.4 CLI: `tuis view <file> [--out file.html]` writes dist/visualiser.html
      with the document embedded, so `tuis view doc.json` gives a file that
      opens without a picker.
  5.5 Tests (vitest): model builder (component graph edges, filter
      results, search expansion), layout (no overlaps in one layer, parent
      centred on children), CLI view (embeds document, output is a single
      file). Docs: README section, CHANGELOG 0.2.0, docs/_INDEX.md.
  5.6 Gate: open the Excel plugin document in the built file; the
      Components view must be readable at a glance and the Structures view
      must open collapsed and expand on demand. Record results in the
      handoff, not in the repo.
  Design rules: corporate look, no icons/emojis, restrained palette, light
  and dark via prefers-color-scheme. No plugin content committed anywhere
  in this repo.

## Scope guard

- No rendering, converters, HTTP API, authoring MCP tools, or LICENSE in v0.1.
- The visualiser (Phase 5) draws the containment tree, never the UI; no layout or visual
  information is inferred or shown.
- The Excel example is out of v0.1 by decision, not omission (D8).
- Nothing in the Tessallite workspace repo changes in Phases 1-3.
