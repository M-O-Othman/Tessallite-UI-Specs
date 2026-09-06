# Open questions: an OpenUI extension for UI structure and behaviour

Status: rewritten 2026-09-06 after the positioning discussion. Awaiting
answers; no spec text or code until settled.

## What this is, and is not

- It documents the STRUCTURE and BEHAVIOUR of a product's UI so that design
  tools, documentation tools and AI coding agents can read it. It does not
  render anything and carries no rendering hints: no pixels, no colours, no
  fonts. Visual identity lives in design tokens and design tools.
- It is an extension of OpenUI (openuispec.org, github.com/ctate/openui,
  MIT). OpenUI already defines the library envelope (name, version,
  description, components) and props. It has no children, slots, events,
  states or hierarchy, no JSON Schema file and no extension mechanism. This
  work adds the missing part and is proposed upstream as a pull request; the
  repository here is the incubator and remains valid on its own if the PR
  stalls (a one-maintainer project, 69 stars).
- Structure hints are containment semantics, not layout: a table is the
  parent of rows, a row is the parent of cells; a tab list is the parent of
  tabs; a dialog is the parent of its title, body and actions. The tree is
  single-parent and serialisable.

## Pushback already agreed (recorded so it is not re-litigated)

- Reuse, do not reinvent: props in OpenUI shape; events modelled after the
  Custom Elements Manifest event shape; tokens referenced by W3C Design
  Tokens name; guidelines in DSDS style with RFC 2119 words.
- Behaviour is structured plus prose: each event carries an `actions` list
  from a small vocabulary and a human `effect`.
- Everything is text; icons are URI references (SVG recommended) and an icon
  node must carry an accessible `label`.
- "APIs" means agent tooling: JSON Schema, a validator CLI, an MCP server, and
  a programmatic library the MCP server is built on. No HTTP API in v0.1.

## The containment model (needs your eye - this is the hard design)

C1. Node kinds. `visible` (a thing the user sees or operates) and `logical`
    (a grouping that exists for structure only, e.g. "title section"). Both
    are ordinary tree nodes so the tree stays one shape.

C2. Repetition. A list does not enumerate its items. It declares ONE item
    template child marked `repeat: true` and a `data` binding naming the
    collection. The same rule serves menus, tab lists driven by data, chip
    groups and table bodies. An agent reading the spec sees the item shape
    once; a design tool may instantiate it N times.

C3. Tables. `table` -> `row` (repeat) -> `cell`. Columns are NOT nodes: a
    table carries a `columns` array of column definitions (id, name, type,
    sortable, ...), and each cell references its column by id (`column`).
    Header rows are `row` nodes with `role: header`. This keeps a single
    parent per node while a cell still knows its column. Alternative: model
    columns as nodes and cells reference the row - rejected because rows are
    the repeated unit in practice. Agree?

C4. Grids (arbitrary children arranged in tracks, e.g. a template gallery or
    a KPI card grid). A `grid` node declares `tracks` (named columns and rows,
    counts or names - never sizes) and each child carries a `placement`
    (column, row, columnSpan, rowSpan by index or name). Children remain
    single-parent; placement is structural, not visual. Agree?

C5. Slots. A component may declare named slots (`slots`) it accepts; a child
    that fills one names it (`slot`). This is how a dialog's `actions` slot or
    a chat canvas's `headerSlot` are documented without new node types.

C6. Reuse. A node defined once (e.g. StatusBadge) is referenced elsewhere by
    `$ref` to its id with optional prop overrides. Definitions live in the
    OpenUI `components` map; instances live in the tree.

C7. Overlays. Dialogs, drawers, menus and toasts are children of the node
    that OWNS them (the button that opens a menu owns the menu; the screen
    owns its dialogs) with `presentation: overlay`. Ownership, not z-order.

C8. States. Per node: a list of named states (default, loading, error,
    empty, disabled, selected, expanded, ...) and, optionally, which children
    are present in each state. Variants are OpenUI props with enums.

## Decisions I cannot make for you

Q1. Name. Candidates for the extension and the repository:
    a. OpenUI Structure  (fields under `structure`, repo `openui-structure`)
    b. OpenUI Tree
    c. OpenUI Anatomy
    Avoid "OpenUI" alone (taken three times over) and "UI Specification
    Schema" (a W3C community group).

Q2. Extension mechanism to propose upstream. OpenUI has none. Options:
    a. New top-level keys beside `components`: `structures` (the trees, one
       per screen or surface) and `events` / `states` / `slots` on each
       component definition. Cleanest for readers; needs upstream buy-in.
    b. OpenAPI-style `x-` vendor fields (`x-structure`, `x-events`) that
       tools ignore gracefully. Safest for compatibility; uglier.
    Recommendation: author with (a), and have the validator accept (b) as a
    compatibility mode until upstream decides.

Q3. Format. OpenUI mandates `openui.json` or `openui.yaml` at the repo root;
    both are already permitted, so nothing to decide except that examples
    ship as JSON and the validator accepts both. Confirm.

Q4. Licence. MIT for everything, matching OpenUI, so the PR is frictionless.
    Confirm (the earlier Apache-2.0 / CC-BY-4.0 idea is withdrawn).

Q5. Upstream sequencing. (a) open an issue at ctate/openui describing the
    proposal before building, (b) build v0.1 here first and PR with a working
    schema, examples and tools, or (c) both - issue now, PR at v0.1.
    Recommendation: (c).

Q6. GitHub remote now (public, under your account, name = Q1 in kebab-case)
    or stay local until v0.1 is presentable?

Q7. Reference example: the Tessallite Excel task pane, generalised (sample
    data, no product internals), as the worked example. It exercises the
    shell, tabs, a builder screen with lists and chips, a KPI card grid, a
    chat surface, dialogs and menus - every containment case in C1-C8.
    Confirm.

Q8. Tooling language: TypeScript (matches the OpenUI repo and the MCP SDK).
    Confirm.

Q9. Node fields for v0.1 - strike or add:
    id, name, kind, type, description, label, icon, implementation[]
    (technology, file, symbol, tag - optional), props, states, events[]
    (event, handler, actions[], effect, emits), data (bindings), a11y (role,
    aria, keyboard), tokens[] (token names), slots[], slot, columns[] (table),
    tracks (grid), placement (grid child), repeat, presentation
    (inline | overlay), children[], $ref.

Q10. Type vocabulary for v0.1 - strike or add:
    container, group, text, heading, icon, image, link, button, icon-button,
    toggle, input, textarea, select, combobox, checkbox, radio, switch,
    slider, tablist, tab, tabpanel, chip, badge, list, list-item, table, row,
    cell, grid, card, dialog, drawer, menu, menu-item, tooltip, toast, banner,
    progress, skeleton, chart, divider, form, custom:<name>.

Q11. Action vocabulary for events - strike or add:
    navigate, open, close, toggle, select, set-state, submit, call, emit,
    copy, insert, refresh.

Q12. MCP server tools for v0.1 - strike or add:
    list_structures, get_tree(structure, depth), get_node(id), find(type,
    kind, event, component, text), path_to(id), events_of(id),
    children_of(id), validate(document). Read-only; no authoring tools yet.

## v0.1 contents once answered

SPEC.md (normative, RFC 2119), schema/*.schema.json (a superset of the OpenUI
envelope), vocabulary/ (types, actions, states), mappings/ (Custom Elements
Manifest, W3C tokens, Storybook manifest, react-docgen), examples/ (the
reference example as openui.json plus a narrative .md), packages/core
(parse, validate, query), packages/cli, packages/mcp-server, llms.txt,
AGENTS.md, README, LICENSE (MIT), CHANGELOG, CONTRIBUTING, and the draft
upstream proposal (docs/upstream-proposal.md).
