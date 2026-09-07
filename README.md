# Tessallite-UI-Specs

An extension of [OpenUI](https://openuispec.org) that documents the structure
and behaviour of a product's user interface: which element contains which,
what each element is, what it shows, what happens when the user acts on it,
and which states it can take. It is text only, renders nothing and carries no
visual information. Design tools, documentation tools and AI coding agents
read it; a validator, a query CLI and a read-only MCP server ship with it.

Format version 0.1; tooling version 0.2. Specification: [SPEC.md](SPEC.md). Schema:
[schema/tessallite-ui-specs.schema.json](schema/tessallite-ui-specs.schema.json).

## What it adds to OpenUI

OpenUI describes a component library: `name`, `version`, `description` and a
`components` map with typed `props`. It has no containment, no slots, no
events, no states and no JSON Schema. Tessallite-UI-Specs keeps the OpenUI
envelope verbatim and adds:

- `structures` at the top level: single-parent trees of typed nodes, one per
  screen or surface;
- `events`, `states`, `slots` and `structure` on a component definition;
- a JSON Schema for the whole document, where every field carries a
  description so that an agent can author from the schema alone;
- semantic rules the schema cannot express (unique IDs, `$ref` targets,
  table and grid relationships, slot declarations and event targets), enforced
  by the validator.

Nothing OpenUI defines is changed. A tool that knows only OpenUI reads the
envelope and ignores the rest.

## Why

A screenshot shows a UI; a component library lists its parts; neither says
how the parts nest, what a click does, or what the empty state contains. That
is what a coding agent, a design tool building a wireframe, or a writer
producing help pages needs, and it is what this format records:

- Containment, not layout. A table is the parent of rows; a row of cells; a
  tab list of tabs; a button of the menu it opens. No sizes, colours or
  coordinates.
- Repetition by template. A list declares one item template with
  `repeat: true`; a reader sees the shape once.
- Behaviour that is both structured and readable. Every event has an
  `actions` list from a small vocabulary and an `effect` sentence, and names
  its real handler.
- States that say which children exist, and a `condition` on elements that
  exist only under a runtime condition.

## Quick start

Requires Node 22.

```sh
git clone https://github.com/M-O-Othman/Tessallite-UI-Specs.git
cd Tessallite-UI-Specs
npm install
npm run build
node packages/cli/dist/index.js validate examples/containment.json
node packages/cli/dist/index.js query examples/containment.json path-to results-cell-value-text
node packages/cli/dist/index.js query examples/containment.json find --event onConfirmDelete
```

Serve a document to an agent over MCP (stdio):

```sh
node packages/mcp-server/dist/index.js examples/containment.json
```

Claude Code registration, for example:

```sh
claude mcp add tuis -- node /path/to/packages/mcp-server/dist/index.js /path/to/your.openui.json
```

Tools: `list_structures`, `get_tree`, `get_node`, `find`, `path_to`,
`events_of`, `children_of`, `validate`. All read-only.

## Visualiser

A document of a thousand nodes is not readable as text. `packages/visualiser`
builds one self-contained page, `dist/visualiser.html`, that draws the
document as a left-to-right node-link graph. Drag pans; Ctrl+wheel or the
zoom buttons zoom. On desktop, the plain wheel pans the graph, while the
navigation and inspector scroll independently. Its defining
feature is level of detail: every card is a summary (id and type, plus the
component it instantiates). Expanding a card reveals graph branches one level
at a time; selecting it opens the readable inspector.

- Components view (default): one card per structure (a screen) with the
  component instances it contains nested by containment: a component sits
  under the component whose node tree holds it, through the component's own
  structure when it has one. Nodes that instantiate nothing are transparent.
  Each authored instance stays separate, including its own children and
  behaviour. Explicit instance children take precedence over a component
  definition unless the node uses `$ref`. Components not reachable from
  any screen sit under an Unreferenced group in All structures.
- Structures view follows the full containment tree, including referenced
  subtrees. Search matches names, IDs, labels, components and event handlers;
  click a result to reveal its path. Scope and display filters apply to
  search results.
- The viewer opens the first surface at 100% zoom. Select a card to read its
  purpose, behaviour, properties, states and source in the inspector.
  Use its branch control or Space to expand; Enter selects. Source JSON
  and optional detail branches remain available.
- White surfaces, charcoal typography and restrained Tessallite green accents
  define the navigation, graph and inspector, regardless of OS theme.
  Fit, 100%, depth and zoom controls
  adjust the graph without changing document content.
- The desktop drawing area fills the remaining window height. Maximise view
  hides the surrounding panels and application header; Restore view or Escape brings
  them back without losing the selected node or expanded branches.
- The compact graph header combines the title, controls, navigation hint,
  visible-node count and live document status. No separate footer bars take
  space from the canvas. Controls wrap on narrow screens.

The header uses the official Tessallite primary horizontal logo on white.
Brand assets and their licence are in
`packages/visualiser/assets/`; the build embeds the logo directly into the
page. Palette, control boundaries and Inter/JetBrains Mono font stacks follow
the supplied Tessallite brand-identity kit and the white surfaces in the
[website brand stylesheet](https://www.tessallite.io/css/brand.css). Fonts fall back to installed
system fonts when those families are unavailable; no remote font is loaded.

```sh
npm run build                                   # writes packages/visualiser/dist/visualiser.html
node packages/cli/dist/index.js view doc.openui.json --out doc.html   # page with the document embedded
```

Open `packages/visualiser/dist/visualiser.html` from disk and drop a JSON or
YAML document on it, or open the page `tuis view` wrote. The page includes
the schema validator, semantic checks and YAML parser. All runtime code is
bundled, so it makes no network requests and needs no separately installed
packages. Viewer labels and interaction defaults come from
`packages/visualiser/src/viewer-config.json`, which is embedded at build time
rather than fetched at runtime. The white theme does not change with system preference.
Invalid files produce errors with paths; the previous valid document stays
loaded. The CLI refuses invalid exports and source overwrite.

See [the user guide](Docs/user-guide.md) for authoring, references,
validation errors and the distinction between component definitions and
instances. Run `npm run check` for the full build and test suite, including
exported-page interactions in a DOM test environment. Actual Chrome visual
verification is not complete: the enabled Browser extension is missing its
native-host manifest and must be repaired through the plugin UI before that
check can run. DOM tests do not certify browser layout or appearance. This
blocker is tracked in [known issues](Docs/known_issues.md).

## A document in brief

```json
{
  "name": "My product", "version": "1.0.0", "description": "...", "tuis": "0.1",
  "components": { "Button": { "description": "...", "props": { "variant": { "type": "string", "enum": ["primary", "secondary"] } } } },
  "structures": {
    "settings-bar": {
      "description": "...",
      "root": { "id": "bar", "type": "container", "children": [
        { "id": "settings", "type": "icon-button", "label": "Settings", "component": "Button",
          "events": [{ "event": "click", "handler": "onOpenSettings", "actions": ["open"], "target": "settings-menu", "effect": "Opens the settings menu." }],
          "children": [
            { "id": "settings-icon", "type": "icon", "icon": "icons/settings.svg", "label": "Settings" },
            { "id": "settings-menu", "type": "menu", "presentation": "overlay", "children": [ ] }
          ] }
      ] }
    }
  }
}
```

See [examples/](examples/) for the full forms, [vocabulary/](vocabulary/)
for node types, actions and states, and [mappings/](mappings/) for how the
Custom Elements Manifest, W3C Design Tokens, Storybook manifests and
react-docgen output map onto the format.

## Repository

| Path | Contents |
|---|---|
| `SPEC.md` | The normative specification (RFC 2119). |
| `schema/` | JSON Schema 2020-12. |
| `vocabulary/` | Node types with containment rules, event actions, states. |
| `mappings/` | Field tables for CEM, design tokens, Storybook, react-docgen. |
| `examples/` | Synthetic documents used by the tests. |
| `packages/core` | Load, validate, query (TypeScript). |
| `packages/cli` | `tuis validate`, `tuis query`, `tuis view`. |
| `packages/mcp-server` | Read-only MCP server, stdio. |
| `packages/visualiser` | Level-of-detail graph visualiser, one HTML file. |
| `Docs/` | User guide and current known issues. |
| `docs/` | Documentation index, upstream proposal and design questions. |
| `AGENTS.md`, `llms.txt` | How an agent authors and consumes a document. |

## Relation to the other projects called OpenUI

- [ctate/openui](https://github.com/ctate/openui) (openuispec.org): the
  specification this extends. Same envelope, same props.
- [Open UI](https://open-ui.org), a W3C community group standardising HTML
  controls (selectmenu, popover). Unrelated; a browser platform effort.
- [wandb/openui](https://github.com/wandb/openui): a tool that generates UI
  from prompts with an LLM. Unrelated.
- OpenUI5, SAP's UI framework. Unrelated.

## Status

v0.1 is being proven on a real task pane before an upstream pull request is
proposed (see [docs/upstream-proposal.md](docs/upstream-proposal.md)). No
licence file is present yet; see [docs/_INDEX.md](docs/_INDEX.md).
