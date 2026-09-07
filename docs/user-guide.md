# User guide

For a complete beginner-friendly explanation of the project, see the
[project guide](project-guide.md). This page is the task-focused
reference for opening, authoring and querying a document.

## Source-derived application documents

A route is not a complete screen specification. Include its shell, nested
controls, conditional panels, overlays and repeated content. Expand JSX held
in variables or render callbacks at its use site. Record non-rendering guards
when they affect navigation or visible confirmations.

Before handing over a document, validate it and check a deep `path-to`, a
handler `find --event` and an interactive node's `events-of`. Compare route,
panel, source-file and event-site coverage with the source inventory. Include
a short provenance note distinguishing active surfaces from unreferenced
source definitions. Static source coverage is not runtime verification.

## Open and explore a document

From the repository root:

```sh
npm install
npm run build
node packages/cli/dist/index.js view examples/containment.json --out /tmp/containment.html
```

Open the output HTML in a browser. It includes its document, application,
styles, schema validator, semantic checks and YAML parser. All runtime code is
bundled; no server, internet connection or separately installed package is
needed.

For a blank viewer, open `packages/visualiser/dist/visualiser.html`, then
choose Open document or drop a JSON or YAML file onto the page. Validation
errors name the field path and violated rule. A failed load does not
replace an already loaded valid document.

The left panel selects Components or Structures, limits the surface, searches
the document and controls display options. The centre shows containment.
The inspector describes the selected node. On load, the first authored surface
is selected and the graph opens at 100% zoom.

Cards use monochrome line icons to identify the represented element: text,
heading, button, clickable icon, window, dialog, logical group and the other
node types. An additional event symbol marks a card with events. Event sections
and event items also have their own symbol. These icons are embedded; the viewer
does not load a document's external icon URLs.

Literal captions and inline static text appear below the card identity. Text
previews occupy at most two lines; cards without text stay compact. Select a
card for its full **Static text** section, or hover for the full summary. Icon
and image names appear as **Accessible name**, not as visible text inside those
elements. Authored translations with a literal label are shown; unresolved
translation keys, dynamic bindings and component prop declarations are not
treated as literal text. Conditional/repeated descendants and separate nested
controls retain their own cards instead of being merged into an owner's text.

The viewer uses Tessallite's official primary logo, white surfaces and accessible
control borders. The logo is embedded. Inter and JetBrains Mono use system fallbacks when not installed;
the viewer does not request fonts from an external service.

- Components follows instances under their owning surface and parent component.
  Separate instances remain separate. A repeat template represents many runtime
  items, while two authored instances remain two cards.
- Structures shows every authored element and expands referenced subtrees
  in place. Instance-specific breadcrumbs identify the branch being read.
- Search matches names, IDs, labels, types, components, descriptions, event
  names, handlers, effects and targets. Surface scope limits results in both
  views; Structures display options also limit its results. Hidden matches
  are reported separately.
- Select a card or press Enter to inspect it. Its branch control or Space
  expands one level. Collapse all closes every branch. Depth 0 shows roots.
- The desktop graph fills the available window height. Navigation and
  inspector panels scroll independently, so long details do not shorten or
  push the drawing area down the page.
- Maximise view hides surrounding panels and the application header. The
  compact graph header keeps the controls, navigation hint, node count and
  live document status available, with no separate footer bars. Restore view or Escape restores the
  normal workspace and preserves the selected node and expanded branches.
- Drag the background to pan. On desktop, ordinary scrolling over the graph
  also pans it; Ctrl + scroll zooms. Fit shows the whole graph, and 100%
  restores reading size.
- Show detail branches adds properties, events and other facts to the graph.
  The inspector presents semantic detail in readable sections; Source JSON
  shows the selected card's underlying source object.

The viewer uses white backgrounds, charcoal text and Tessallite green accents
in both light and dark OS settings. Its official primary logo is embedded in
the exported page; viewing it does not require a network connection.

The automated DOM tests cover document loading and core interactions, but the
actual Chrome visual check is not complete. The enabled Browser extension is
missing its native-host manifest and must be repaired through the plugin UI
before layout, appearance and small-screen behaviour can be certified.

## Author a small document first

Start with `examples/minimal.json`. Keep the four OpenUI envelope fields:
`name`, `version`, `description`, `components`. The components map may be
empty. Add `tuis: "0.1"` and one entry in `structures` per screen or surface.
Each structure has a description and one root.

Each node needs an ID unique across the document and a type from
`vocabulary/node-types.md`. Add a label, children and behaviour as needed.
Use real handler symbols and source file paths. Do not describe pixels,
colours, CSS or font sizes in the specification.

| Location | What belongs here | Example |
|---|---|---|
| `components.Button.props` | Prop type declarations | `{ "disabled": "boolean" }` |
| Node `props` | Values on this particular instance | `{ "disabled": false }` |
| `components.Button.events` | Public callback/event declarations | `[{ "name": "onPress", "description": "The button was pressed." }]` |
| Node `events` | Wired trigger, handler, action and observed effect | `[{ "event": "click", "handler": "App.save", "actions": ["submit"], "effect": "Saves the report." }]` |
| Node `component` | Name of a declared component; children are authored here | `"Button"` |
| Node `$ref` | Reuse of a component structure or screen root | `"#/components/Button"` |

An editor can associate the local file
`schema/tessallite-ui-specs.schema.json` with your documents for field
completion. JSON Schema checks field shape; the CLI also checks cross-node
rules, so always validate before handing over a document.

## Reuse without copying

A component must have a `structure` before it can be used through `$ref`.
The reference instance needs its own ID and the same root type. It inherits
root facts and may override the fields listed in SPEC section 9.

For example, a component whose root is a table declares `columns` once in
its definition. An instance is:

```json
{ "id": "results", "type": "table", "$ref": "#/components/ResultsTable" }
```

Do not copy columns or grid tracks onto the reference instance. Those fields
are inherited and are not permitted overrides. Reference children must fill
declared component slots. Structure references have no authored children.
Reference cycles are rejected.

Use `component` without `$ref` when you are documenting the instance's
children directly. For names containing slash or tilde, JSON Pointers escape
them as `~1` and `~0`. Ordinary component names in `component` stay unchanged.

## Lists, tables and conditional content

For a data-driven list, give the parent `data.collection` and mark one child
`repeat: true`. Describe the template once. A table declares columns; its
rows contain cells naming those column IDs. Data-driven columns also need
`data.columns` on the table.

Use `condition` for an optional element. Use named states for alternate
renderings such as loading, empty or error. A state's `present` lists
descendants, including those reached through references. A logical group
cannot carry a label, icon, events or accessibility facts; those describe
perceptible elements.

## Validate and query

```sh
node packages/cli/dist/index.js validate examples/containment.json
node packages/cli/dist/index.js query examples/containment.json structures
node packages/cli/dist/index.js query examples/containment.json tree dashboard --depth 2
node packages/cli/dist/index.js query examples/containment.json path-to results-cell-value-text
node packages/cli/dist/index.js query examples/containment.json find --event onConfirmDelete
node packages/cli/dist/index.js query examples/containment.json events-of confirm-delete-ok
```

Handler search matches an individual symbol within a recorded chain such as
`Button.onPress -> App.save`. Event queries inherit events from a referenced
root unless the instance overrides them.

CLI/MCP node, tree and path queries describe the authored document locations.
The viewer additionally expands references at their usage locations. A
component-definition node therefore has an authored path and may appear in
several viewer branches.

The MCP server exposes the same read-only queries over standard input/output:

```sh
node packages/mcp-server/dist/index.js examples/containment.json
```

## Common validation errors

| Error | Correction |
|---|---|
| Required property missing | Add the named field at the reported path. |
| Unknown node type, action or state | Use the vocabulary or a `custom:name` value. |
| R1 duplicate ID | Give every authored node its own document-wide ID. |
| R4 or R6 missing data binding | Add the parent collection or table columns expression. |
| R11 undeclared slot | Match a slot declared by the parent component. |
| R17 missing target | Point to an existing node ID. |
| R21 invalid state descendant | Name a descendant of that node. |
| R23 unresolved component or reference | Declare the component; for reuse, give it a structure. |
| R24 forbidden override | Put structural definitions on the reference target. |
| R26 circular reference | Remove the cycle; use a repeat template for runtime repetition. |

See [known issues](known_issues.md) for verification status and
[the specification](../SPEC.md) for the complete format.
