# Agent guide

How a coding agent authors a Tessallite-UI-Specs document from source code
and how it consumes one. Rules of the format are in SPEC.md; this file is
the procedure.

## Authoring from code

1. Read `SPEC.md` sections 3 to 9 and `vocabulary/node-types.md`. Load
   `schema/tessallite-ui-specs.schema.json`; every field has a description.
2. Fill the OpenUI envelope. `components` lists the reusable components with
   their real props (from `.d.ts`, react-docgen, a CEM or a Storybook
   manifest: see `mappings/`). Give each component `events` for the
   callbacks it exposes and `slots` for named children it accepts.
3. One structure per screen or surface. Start at the root container and
   descend in render order. For every element the user can see or operate,
   write a node with `id`, `type`, `label` (or `i18n` key) and, for icons,
   `icon` plus `label`. Group for structure only with `kind: logical`.
4. Lists: one child with `repeat: true`; put `data.collection` on the parent.
   Tables: `columns` on the table, `column` on each cell, a header row with
   `props.role: header`. Grids: `tracks` on the grid, `placement` on
   children. Overlays: children of the node that opens them, with
   `presentation: overlay`.
5. Events: for every handler wired in the code, one Event with the real
   `handler` symbol, `actions` from `vocabulary/actions.md`, `target` when
   another node is affected, and an `effect` sentence that says what the
   user observes. Do not invent handlers.
6. States: name the conditions the code renders differently (`loading`,
   `empty`, `error`, `selected`, `expanded`). Use `present` to list the
   children that exist in each.
7. Record `implementation` (file and symbol) on nodes that map to a
   component so a reader can go from the tree to the code.
8. Never write sizes, colours, fonts, coordinates or CSS. The schema rejects
   them.
9. Validate: `tuis validate <file>`. Fix every reported rule. Then check the
   queries an agent will run: `path-to` a deep node, `find --event
   <handler>`, `events-of` an interactive node.

## Consuming

Command line:

```sh
tuis query doc.openui.json structures
tuis query doc.openui.json tree task-pane --depth 2
tuis query doc.openui.json find --type button --text insert
tuis query doc.openui.json path-to kpi-card-value
tuis query doc.openui.json events-of mode-tabs
```

MCP (stdio, one document per server): register
`node packages/mcp-server/dist/index.js <file>` and call `list_structures`,
`get_tree` (with `depth` to keep responses small), `get_node`, `find`,
`path_to`, `events_of`, `children_of`, `validate`.

Programmatic:

```ts
import { loadDocumentFile, openDocument, find, pathTo } from '@tessallite-ui-specs/core';
const doc = openDocument(loadDocumentFile('doc.openui.json'));
find(doc, { event: 'onInsert' });
pathTo(doc, 'kpi-card-value');
```

## Reading a document well

- `find` with `event: <handler>` answers "where is this handler wired".
- `path_to` gives the containment chain, which is the answer to "where does
  this element live on screen" without any layout information.
- A node with `repeat: true` stands for many; read `data.collection` on its
  parent for what it iterates.
- A `$ref` node expands to the referenced component's `structure`; its
  children are slot fillers.
- Overlays are under their owner. To list every dialog, `find` with
  `type: dialog`.
