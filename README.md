# Tessallite-UI-Specs

An extension of [OpenUI](https://openuispec.org) that documents the structure
and behaviour of a product's user interface: which element contains which,
what each element is, what it shows, what happens when the user acts on it,
and which states it can take. It is text only, renders nothing and carries no
visual information. Design tools, documentation tools and AI coding agents
read it; a validator, a query CLI and a read-only MCP server ship with it.

Version 0.1. Specification: [SPEC.md](SPEC.md). Schema:
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
- semantic rules the schema cannot express (unique ids, `$ref` targets,
  table columns, grid tracks, slot declarations, overlay ownership), enforced
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
- States that say which children exist.

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
| `packages/cli` | `tuis validate`, `tuis query`. |
| `packages/mcp-server` | Read-only MCP server, stdio. |
| `docs/` | Index, upstream proposal, open questions. |
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
