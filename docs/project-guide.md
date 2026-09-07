# Tessallite UI Specifications: project guide

This guide explains the whole project from the beginning. It is written for
someone who has never seen this format before. You do not need to know what a
compiler or an API is. When a technical word is needed, it is explained first.

The short idea is simple: this project makes a readable map of a user
interface. The map says what is on a screen, what is inside what, and what
happens when someone uses it.

## 1. The big picture

Imagine a school map. The map does not contain the school or teach a lesson.
It tells you where rooms are, which hall leads to which room, and what each
room is for. A UI specification is the same kind of map for software.

```text
source code or careful authoring
                |
                v
       .openui.json or .openui.yaml
                |
       +--------+---------+
       |                  |
       v                  v
  core library          visualiser
  load + validate       graph + inspector
       |
       +------------------+
       |                  |
       v                  v
      CLI              read-only MCP server
  terminal commands     questions for AI tools
```

There is one source of truth: the document. The validator, command line tool,
viewer and MCP server all read that document and use the same core rules.

## 2. What this project is, and is not

It is:

- a text-based format built on the OpenUI component envelope;
- a JSON Schema that checks field shapes and required values;
- semantic checks for relationships that JSON Schema cannot easily check;
- a TypeScript library for loading, checking and querying documents;
- a terminal program named `tuis`;
- a self-contained HTML viewer;
- a read-only MCP server for AI clients.

It is not:

- the application described by a document;
- a replacement for React, HTML, CSS or a design-token system;
- a screenshot file or a pixel-perfect design tool;
- a database or an HTTP service;
- proof that the described product works in production.

The format deliberately leaves out pixels, colours, fonts, widths, heights and
coordinates. Those belong in the product's design system. This document tells
us what a thing is and how it relates to other things.

## 3. A small glossary

| Word | Meaning in this project |
|---|---|
| AI | A program that can read a document and help with work. |
| API | A set of names and rules that let programs talk to each other. |
| Child | A node contained by another node. A button can own a menu. |
| CLI | A command-line interface: commands typed in a terminal. |
| Component | A reusable UI part, such as a button, card or dialog. |
| Document | One `.openui.json` or `.openui.yaml` file. |
| Event | Something that happens, such as a click or a change. |
| Handler | The code symbol that responds to an event. |
| Instance | One use of a component on a screen. |
| JSON | A plain-text way to write objects, lists, strings and numbers. |
| JSON Schema | A machine-readable checklist for valid JSON shape. |
| Logical node | A grouping used for structure, not a thing a user sees. |
| MCP | A standard way for an AI client to ask a tool questions. |
| Node | One documented UI thing in a tree. |
| OpenUI | The component description format this project extends. |
| Prop | A value given to a component, such as `disabled: true`. |
| Reference | A pointer that reuses an existing component or structure. |
| State | A named situation, such as `loading`, `empty` or `selected`. |
| Structure | One screen, window, panel or other surface. |
| Tree | A parent-and-child shape. Each node has one parent. |
| View | A way to look at the document in the visualiser. |

## 4. Install and run it

Use a Node.js release that satisfies the `engines.node` entry in `package.json`.
From the project root:

```sh
npm install
npm run check
```

The first command downloads the development packages listed in
`package.json`. The second command builds the project and runs its checks. A
successful run means the checked-in examples and automated tests pass; it does
not mean a separate product described by a document was tested.

The most useful commands are:

```sh
npm run build
npm run validate:examples
npm test
npm run check
```

`npm run build` compiles the TypeScript packages and creates
`packages/visualiser/dist/visualiser.html`. `npm test` runs Vitest. `npm run
check` runs all of these normal checks together.

## 5. The document envelope

Every document begins with a small envelope:

```json
{
  "name": "Example product",
  "version": "1",
  "description": "A map of the product interface.",
  "tuis": "0.1",
  "components": {},
  "structures": {}
}
```

The fields mean:

- `name` is the product or document name.
- `version` is the version chosen by the document author.
- `description` is a plain sentence saying what the document describes.
- `tuis` identifies the Tessallite UI Specifications format version.
- `components` is a map of reusable component definitions.
- `structures` is a map of screens and other top-level surfaces.

The compatibility form `x-structures` is also accepted by the tooling. New
documents should use the plain `structures` name unless another system requires
the `x-` form.

## 6. Components and structures

A component definition describes a reusable part. It may list props, events,
states, slots and a `structure` showing its internal anatomy.

```json
{
  "components": {
    "SaveButton": {
      "description": "A button that saves the current work.",
      "props": {
        "disabled": { "type": "boolean", "required": false }
      },
      "events": [
        { "name": "click", "description": "The user activates the button." }
      ],
      "structure": {
        "id": "save-button",
        "type": "button",
        "label": "Save"
      }
    }
  }
}
```

A structure is a complete surface. It has a description and exactly one root
node. Every other node is below that root.

```json
{
  "structures": {
    "editor": {
      "description": "The editor screen.",
      "root": {
        "id": "editor-root",
        "type": "container",
        "children": []
      }
    }
  }
}
```

Use structures for screens, windows, drawers, panels and other surfaces that a
reader can enter or inspect. Use components for parts that appear in more than
one place or have a clear reusable identity.

## 7. Nodes and the containment tree

Each node has an `id` and a `type`. It can also have a name, description,
label, icon, props, data bindings, events, states and children.

```text
editor-root (container)
├── title (heading)
├── save (button)
└── help (dialog, overlay)
    ├── help-title (heading)
    └── close (button)
```

The tree answers a useful question: “Where does this thing live?” It does not
try to answer “How many pixels from the left is it?”

`kind` is normally `visible`. Use `kind: "logical"` for a group that helps a
reader understand the tree but is not itself a control or visible object. A
logical node must not carry a label, icon, event or accessibility facts.

`label` is the text a person sees or hears. `i18n` is a translation-key name
that supplies that label. `name` is for readers and tools; it is not a caption.

`data` holds an expression for changing data:

```json
{ "data": { "text": "record.displayName" } }
```

That expression is not sample text. The viewer keeps it as a binding and does
not pretend that `record.displayName` is what users see.

## 8. Common node types

The complete list is in [vocabulary/node-types.md](../vocabulary/node-types.md).
These are the most common groups:

| Group | Examples | What the group tells a reader |
|---|---|---|
| Text | `text`, `heading`, `badge` | Words or short labels. |
| Actions | `button`, `link`, `icon-button` | A person can activate something. |
| Fields | `input`, `textarea`, `select`, `checkbox` | A person can enter or choose a value. |
| Containers | `container`, `group`, `card`, `form` | Other nodes are held inside. |
| Navigation | `tablist`, `tab`, `tabpanel`, `menu`, `menu-item` | A person moves between choices or places. |
| Data | `list`, `list-item`, `table`, `row`, `cell`, `grid` | Repeated or arranged information. |
| Feedback | `dialog`, `drawer`, `toast`, `banner`, `progress`, `skeleton` | Information about a task or a temporary surface. |
| Media | `icon`, `image`, `chart` | A visual object with an accessible name. |

Unknown product-specific types use `custom:<name>`. The custom name should be
short and stable, such as `custom:lineage-panel`.

## 9. Lists, tables and grids

A list can contain many items. Do not write every runtime item. Write one item
template, mark it `repeat: true`, and name the collection on its parent:

```json
{
  "id": "people",
  "type": "list",
  "data": { "collection": "people" },
  "children": [
    {
      "id": "person",
      "type": "list-item",
      "repeat": true,
      "children": [
        { "id": "person-name", "type": "text", "data": { "text": "person.name" } }
      ]
    }
  ]
}
```

A table stores column definitions on the table. Rows contain cells, and each
cell names its column. A repeated data-driven column uses `repeat: true` on the
column and `data.columns` on the table.

```json
{
  "id": "results",
  "type": "table",
  "columns": [
    { "id": "name", "name": "Name" },
    { "id": "score", "name": "Score", "sortable": true }
  ],
  "data": { "collection": "results" },
  "children": [
    {
      "id": "result-row",
      "type": "row",
      "repeat": true,
      "children": [
        { "id": "result-name", "type": "cell", "column": "name" },
        { "id": "result-score", "type": "cell", "column": "score" }
      ]
    }
  ]
}
```

A grid declares named or counted tracks. Its direct children may declare where
they sit with `placement`. Track names describe structure, not pixel sizes.

## 10. Reuse and overlays

Use `component` when a node is an instance of a declared component. Use `$ref`
when the instance should expand the component's structure.

```json
{
  "id": "save-on-editor",
  "type": "button",
  "component": "SaveButton",
  "$ref": "#/components/SaveButton",
  "label": "Save this file"
}
```

A reference may override safe instance facts such as `id`, `label`, `props`,
`events`, `data` and `condition`. Its type must still match the referenced root.
Children on a reference are slot fillers only. This prevents the same node from
secretly having two parents.

Dialogs, drawers, menus, tooltips and toasts are overlays. Put an overlay under
the node that owns it. A menu opened by a button is a child of that button; a
screen-level dialog is a child of the screen. Set `presentation: "overlay"`.

## 11. Events and states

An event has a trigger, an optional real handler, one or more actions and an
effect sentence.

```json
{
  "event": "click",
  "handler": "handleSave",
  "actions": ["submit"],
  "effect": "Saves the current work and shows the saved state."
}
```

Use a handler symbol that exists in the source. If the handler is passed
through another component, show the chain:
`AppHeader.onOpen -> App.handleOpen`.

`target` names another node affected by the event. `emits` names a component
event when the action list contains `emit`. `condition` explains when the event
exists.

States describe meaningful situations, not colours or styling:

```json
{
  "id": "results",
  "type": "list",
  "states": [
    { "name": "loading", "description": "The request is still running." },
    { "name": "empty", "description": "The request finished with no rows." },
    { "name": "error", "description": "The request could not finish." }
  ]
}
```

Use `present` when a whole alternative set of children exists in a state. Use a
node `condition` for one optional child, such as an error message.

## 12. Validate before sharing

The schema checks shape. The semantic validator checks relationships. Run both
with one command:

```sh
node packages/cli/dist/index.js validate my-screen.openui.json
```

Common errors include:

- two nodes have the same `id`;
- a row is not inside a table;
- a cell names a column that the table does not declare;
- a repeated child has no collection binding;
- an overlay is missing `presentation: "overlay"`;
- an event target does not exist;
- a `$ref` points to a missing component;
- a logical node has a label or event;
- a slot filler names a slot that its parent does not declare.

The error path points to the exact place in the JSON. Fix the relationship at
its source; do not delete the field just to make the error disappear.

## 13. Query from the terminal

The CLI reads JSON, YAML and YML files. Query output is JSON.

```sh
# What surfaces exist?
node packages/cli/dist/index.js query my-screen.openui.json structures

# What is under a surface? Limit the answer to two levels.
node packages/cli/dist/index.js query my-screen.openui.json tree editor --depth 2

# Which nodes are buttons?
node packages/cli/dist/index.js query my-screen.openui.json find --type button

# Which node uses a handler or action?
node packages/cli/dist/index.js query my-screen.openui.json find --event handleSave

# Where is a node in the tree?
node packages/cli/dist/index.js query my-screen.openui.json path-to save-on-editor

# What does it do and what is directly inside it?
node packages/cli/dist/index.js query my-screen.openui.json events-of save-on-editor
node packages/cli/dist/index.js query my-screen.openui.json children-of save-on-editor
```

`find` can also filter by `kind`, `component`, `text` and `structure`. Search
text matches IDs, names, labels, translation keys, descriptions and event
details. A handler chain can be found by either individual handler symbol.

## 14. Use the visualiser

Build it with `npm run build`, then open
`packages/visualiser/dist/visualiser.html`. To make a page with a document
already inside it, run:

```sh
node packages/cli/dist/index.js view my-screen.openui.json --out my-screen.html
```

The page works offline. It validates a dropped document before replacing the
current one. If the new file is bad, the last valid document stays visible.

The **Components** view begins with each structure and follows component
instances. It is useful when you want to understand reuse. The **Structures**
view follows every authored node. It is useful when you want to understand the
exact screen tree.

The graph has three reading levels:

1. A card gives the identity and semantic icon.
2. A card with a branch control reveals its children.
3. Selecting a card opens the inspector with its full facts.

Cards with literal text show a short preview. The inspector's **Static text**
section shows the full literal text. Dynamic expressions stay labelled as data
bindings. Icon names appear as **Accessible name**, because an icon's label is
not visible text drawn inside it. Event cards use an event symbol.

Keyboard and pointer controls:

| Action | Result |
|---|---|
| Click a card | Select it and show its details. |
| Click `+` or `−` | Expand or collapse that branch. |
| Enter on a focused card | Select it. |
| Space on a card with a branch | Expand or collapse it. |
| Drag the graph | Pan across the drawing. |
| Mouse wheel | Pan vertically or horizontally. |
| Ctrl/Command + wheel | Zoom at the pointer. |
| Fit | Fit the drawing into the available canvas. |
| 100% | Return to the normal reading scale. |
| Maximise view | Give the graph the full page. |
| Escape | Restore the normal page around the graph. |

## 15. Connect an AI client with MCP

MCP means Model Context Protocol. In this project it is a read-only question
line for one document. Start it after building:

```sh
node packages/mcp-server/dist/index.js my-screen.openui.json
```

The server speaks through standard input and output. It does not write to the
document. Its tools are:

| Tool | Question it answers |
|---|---|
| `list_structures` | What screens and surfaces are present? |
| `get_tree` | What is the tree, optionally to a chosen depth? |
| `get_node` | What are the facts for this ID? |
| `find` | Which nodes match these type, text or event filters? |
| `path_to` | Which parents contain this node? |
| `events_of` | What events belong to this node? |
| `children_of` | Which nodes are direct children? |
| `validate` | Does this document follow the schema and semantic rules? |

Ask for a small answer first. For example: find a handler, follow its path,
then read its events. This keeps the answer easy to inspect and avoids sending
a huge document when a small part is enough.

## 16. How the code is organised

The repository is a TypeScript workspace with one private visualiser package.

```text
packages/
├── core/          loading, types, schema and semantic validation, queries
├── cli/           validate, query and view commands
├── mcp-server/    read-only MCP tools over one document
└── visualiser/    offline HTML page, model, layout, graph and inspector
```

Inside `packages/core/src/`:

- `load.ts` reads JSON or YAML text and files;
- `types.ts` describes documents, nodes, events, states and issues;
- `schema.ts` runs JSON Schema;
- `semantic.ts` checks parent/child and reference rules;
- `document.ts` indexes nodes and resolves inherited references;
- `query.ts` implements structures, tree, node, find, path and event queries;
- `validate.ts` runs schema first, then semantic checks.

Inside `packages/visualiser/src/`:

- `app.js` connects page controls to the model and graph;
- `model.js` creates view nodes, instances, sections and search hits;
- `layout.js` places cards without overlap;
- `graph.js` draws the SVG graph and handles pan/zoom;
- `card-icons.json` and `card-icons.js` provide embedded semantic icons;
- `card-content.js` finds safe literal text and accessible names;
- `detail.js` renders the inspector;
- `validation.js` uses the same schema and semantic checks in the page;
- `viewer-config.json` stores labels and non-secret viewer settings.

## 17. Testing and contribution

Tests are written around things a user or consumer can observe. A useful change
usually needs a focused test plus the full suite.

```sh
npm run build
npm run validate:examples
npm test
npm run check
```

Before editing:

1. Read `AGENTS.md`.
2. Read the active `work/action-plan.md` and newest session handout.
3. Read the relevant part of `SPEC.md` and vocabulary.
4. Find the package that owns the behaviour.

After editing:

1. Check that every new function is called and every import is used.
2. Check producer and consumer field names together.
3. Run the full check command.
4. Update README, user guide and relevant indexes.
5. Log every real bug fixed in `docs/known_issues.md`.
6. Keep unrelated worktree edits intact.

Do not silently change the format or remove a planned item. A new architecture
question belongs in a question file and needs a decision before implementation.

## 18. Privacy, safety and trust

An interface document can reveal private product names, routes and handler
names. Keep private documents in the private project that owns them. Do not
put passwords, access tokens, customer data or private source dumps in this
repository's examples or screenshots.

The visualiser is offline and the MCP server is read-only, but neither makes a
document secret. Anyone who receives a document can read it. Validate files
before opening them, and use a trusted client for MCP connections.

Keep these claims separate:

```text
schema pass       = the document has the right shape
semantic pass     = its relationships follow the format rules
unit test pass    = the tested code produced the expected result
browser check     = a real browser displayed and accepted interactions
runtime check     = the described product worked in its real environment
```

One line does not prove the next line. A specification can be perfectly valid
while the product it describes still has a bug.

## 19. Troubleshooting

### “Node.js is too old”

Install a supported Node.js release, then run `node --version` and try
`npm install` again.

### “Cannot find module” after changing TypeScript

Run `npm run build`. The CLI and MCP server use the compiled files in `dist/`.

### A document is rejected

Run `validate` directly. Read the rule, JSON path and message together. Check
the nearest parent, referenced component and field spelling before changing
anything else.

### The viewer shows no nodes

Check that the file loaded, that the document is valid and that a structure is
selected. Clear display filters and choose **All structures**.

### A card's caption looks empty

The viewer shows literal labels and safe literal props. A `data` expression,
translation key without a resolved label, component name or handler is not
treated as visible text. Select the card and inspect **Static text**, **Identity**
and **Data**.

### The graph looks crowded

Use **Depth**, **Fit**, a structure scope and the logical/leaf/overlay filters.
Open one branch at a time. Maximise the graph when the side panels are not
needed.

### The visualiser does not match a real browser

The exported-page tests run in a DOM test environment. They do not replace a
desktop or narrow-width browser check. Record any actual browser problem as a
known issue with the page, viewport and steps to reproduce.

## 20. The durable reading order

If you are learning the project, read these files in this order:

1. This guide for the story and vocabulary.
2. [README.md](../README.md) for the quick commands.
3. [examples/containment.json](../examples/containment.json) for a small real
   document.
4. [vocabulary/node-types.md](../vocabulary/node-types.md) for allowed types.
5. [vocabulary/actions.md](../vocabulary/actions.md) and
   [vocabulary/states.md](../vocabulary/states.md).
6. [SPEC.md](../SPEC.md) for the exact MUST and MUST NOT rules.
7. [AGENTS.md](../AGENTS.md) when authoring from source code or consuming a
   document programmatically.
8. [User guide](user-guide.md) for the viewer's detailed usage.

The project index is the stable way to find more documents:
[docs/_INDEX.md](./_INDEX.md).
