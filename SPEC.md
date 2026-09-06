# Tessallite-UI-Specs v0.1

An extension of the OpenUI specification (openuispec.org, github.com/ctate/openui)
that documents the structure and behaviour of a product's user interface. This
document is normative. The JSON Schema in `schema/tessallite-ui-specs.schema.json`
is the machine-readable form of sections 4 to 9; where the two disagree, this
text governs and the schema is a defect.

## 1. Scope

A Tessallite-UI-Specs document describes:

- the components of a UI library, exactly as OpenUI describes them;
- for each component, the events it emits, the states it can be in and the
  slots it accepts;
- one or more structures: single-parent trees of typed nodes that say which
  element contains which, what each element is, what it shows, what happens
  when the user acts on it and what states it can take.

It does not describe layout, size, colour, typography, spacing, coordinates,
animation or any other visual property. Those live in design tokens and design
tools. The only positional information permitted is containment (which node is
inside which), order (the order of `children`), grid placement by track index or
name, and table placement by column id. None of these is a size.

## 2. Conformance

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT,
RECOMMENDED, MAY and OPTIONAL are to be interpreted as described in RFC 2119.

A document conforms when it validates against the schema and satisfies every
rule in this text marked MUST. A validator conforms when it rejects every
document that violates a MUST rule in sections 4 to 9 and reports the rule
violated. A consumer conforms when it ignores fields it does not understand.

## 3. Document layout

A document is a JSON or YAML object. The OpenUI envelope is kept verbatim:

| Field | Type | Origin | Meaning |
|---|---|---|---|
| `name` | string | OpenUI | Name of the UI library or product. |
| `version` | string | OpenUI | Version of the library or product. |
| `description` | string | OpenUI | Overview of the library or product. |
| `components` | object | OpenUI | Component definitions keyed by name. |
| `structures` | object | this spec | Structures keyed by name. |
| `tuis` | string | this spec | Version of this specification the document follows. `"0.1"` for this version. |

`name`, `version`, `description` and `components` MUST be present, as OpenUI
requires. `structures` MAY be absent; a document without it is a plain OpenUI
document. `tuis` SHOULD be present when `structures` or any extension field on
a component is present.

An OpenUI document MUST be named `openui.json` or `openui.yaml`. A document
that carries structures for a product rather than a library SHOULD use the
suffix `.openui.json` or `.openui.yaml` on a descriptive name, for example
`task-pane.openui.json`, so that it is discoverable by the same tools.

### 3.1 Compatibility mode

A document MAY use the vendor-prefixed names `x-structures` (top level) and
`x-events`, `x-states`, `x-slots`, `x-structure` (on a component) instead of the
plain names. A validator MUST accept both spellings and MUST treat them as the
same field. A document MUST NOT use both spellings of the same field. Plain
names are RECOMMENDED.

## 4. Components

A component definition keeps every OpenUI field (`description`, `package`,
`example`, `props`) with OpenUI semantics. `props` is a map from prop name to
either a type string or an object with `type`, `description`, `default`, `enum`,
`required` (OpenUI), plus `items` and `properties` as used by published OpenUI
specifications.

This specification adds four OPTIONAL fields to a component definition:

| Field | Type | Meaning |
|---|---|---|
| `events` | array of Event definition | Events the component emits. Shape follows the Custom Elements Manifest `Event`: `name`, `description`, `type`. |
| `states` | array of State | States the component can take. See section 8. |
| `slots` | array of Slot | Named insertion points the component accepts: `name`, `description`. A slot named `""` (empty string) is the default slot, as in the Custom Elements Manifest. |
| `structure` | Node | The anatomy of the component: the tree a `$ref` instance expands to. |

## 5. Structures

`structures` maps a structure name to an object with `description` (string,
REQUIRED) and `root` (Node, REQUIRED). A structure is one screen, surface or
reusable subtree. The `root` node is the single parent of everything in the
structure.

## 6. Nodes

A node is an object. Every node MUST have `id` and `type`. All other fields
are OPTIONAL unless a rule below requires them.

| Field | Type | Meaning |
|---|---|---|
| `id` | string | Identifier unique across the whole document. Pattern `^[A-Za-z][A-Za-z0-9_.:-]*$`. |
| `type` | string | Node type from `vocabulary/node-types.md`, or `custom:<name>`. |
| `kind` | `visible` or `logical` | `visible` (default): the user sees or operates it. `logical`: a grouping that exists for structure only. |
| `name` | string | Human name of the node for readers; not shown to the user. |
| `description` | string | What the node is for. |
| `condition` | string | When the node exists, if not always: a plain expression over runtime state, for example `profiles.length > 0`. |
| `label` | string | The text the user sees or hears: the visible text of a text node, the caption of a button, the accessible name of an icon. |
| `i18n` | string | Key of the string resource that supplies `label`, for example `app.title`. |
| `icon` | string | URI of the icon shown, relative to the document unless absolute. SVG is RECOMMENDED. |
| `component` | string | Name of the component in `components` this node is an instance of. |
| `$ref` | string | Reuse: a JSON Pointer to a component (`#/components/<Name>`) or a structure (`#/structures/<name>`). See section 9. |
| `props` | object | Prop values for this instance, keyed by prop name. Values are JSON values. |
| `implementation` | array of Implementation | Where the node lives in code: `technology`, `file`, `symbol`, `tag`. |
| `data` | object | Data bindings as a map from binding name to expression string. `collection` names the collection a repeat template iterates. |
| `a11y` | object | `role` (string), `aria` (map of attribute name to value), `keyboard` (array of `{ key, effect }`). |
| `tokens` | array of string | W3C Design Token names the node references, for example `color.text.secondary`. Names only; never values. |
| `states` | array of State | States this node can take. See section 8. |
| `events` | array of Event | What happens when the user or the system acts on this node. See section 7. |
| `slots` | array of Slot | Slots this node accepts, when it is not an instance of a component that declares them. |
| `slot` | string | The slot of the parent this node fills. |
| `columns` | array of Column | Column definitions. Permitted only on `table`. |
| `tracks` | object | Grid tracks: `columns` and `rows`, each a count or an array of names. Permitted only on `grid`. |
| `placement` | object | Where a child sits in its parent grid: `column`, `row` (index from 1, or track name), `columnSpan`, `rowSpan` (counts). |
| `repeat` | boolean | This node is the item template of its parent: it stands for N instances. |
| `presentation` | `inline` or `overlay` | `overlay`: the node floats over its owner rather than sitting inside its flow. |
| `children` | array of Node | Contained nodes in document order. |

### 6.1 Identity

- R1. Every `id` MUST be unique across the whole document, including nodes
  inside component `structure` trees and every structure.
- R2. A node MUST have exactly one parent. The tree is the only place a node
  appears; reuse goes through `$ref`.

### 6.2 Kinds

- R3. A `logical` node MUST NOT have `label`, `icon`, `events` or `a11y`;
  those belong to things the user perceives. It MAY have everything else.

### 6.3 Repetition

- R4. A node with `repeat: true` is the item template of its parent. Its
  parent MUST have `data.collection` naming what is iterated, except that a
  repeated `cell` naming a repeat column (R6) is supplied by the enclosing
  table's `data.columns`.
- R5. A node MUST NOT have more than one child with `repeat: true`. Variation
  between items is expressed by states on the template (section 8).

### 6.4 Tables

- R6. A `table` MUST declare `columns`, a non-empty array of Column: `id`
  (REQUIRED, unique within the table), `name`, `type`, `sortable`,
  `description`, `repeat`. Columns are not nodes. A column with
  `repeat: true` stands for N data-driven columns; the table then declares
  `data.columns` naming what supplies them, and the cell that names the
  column is the repeated cell of its row.
- R7. A `row` MUST be a child of a `table`, or of a `logical` node whose
  nearest non-logical ancestor is a `table`. A header row is a `row` with
  `props: { "role": "header" }`.
- R8. A `cell` MUST be a child of a `row` and MUST carry `column`, the id of
  a column declared on the enclosing `table`.

### 6.5 Grids

- R9. A `grid` MUST declare `tracks`. `tracks.columns` is REQUIRED and is a
  positive integer or a non-empty array of unique names; `tracks.rows` is
  OPTIONAL with the same shape. Names are identifiers, never sizes.
- R10. `placement` MAY appear only on a direct child of a `grid`. Every index
  it names MUST lie within the declared count, and every name MUST be a
  declared track name. `columnSpan` and `rowSpan` MUST NOT extend past the
  last declared track. A child of a grid without `placement` flows in
  document order.

### 6.6 Slots

- R11. A node with `slot` MUST fill a slot declared by its parent. The parent
  declares slots through its own `slots`, or through the component named by
  its `component` or `$ref`.
- R12. A slot name MUST be unique within the declaring component or node.

### 6.7 Overlays

- R13. A node whose `type` is `dialog`, `drawer`, `menu`, `tooltip` or
  `toast` MUST have `presentation: "overlay"`.
- R14. An overlay node is a child of the node that owns it: the button that
  opens a menu owns the menu; the screen owns its dialogs. Ownership, not
  stacking order, decides the parent.

### 6.8 Type containment

- R15. `tab` MUST be a child of `tablist`; `menu-item` of `menu`;
  `list-item` of `list`; `radio` of `radio-group`; `tabpanel` of the same
  parent as its `tablist` or of a container. `vocabulary/node-types.md` lists
  the containment rule of every type; a validator MUST enforce the rules it
  marks as MUST.

## 7. Events

An Event on a node says what happens when the user or the system acts on it.

| Field | Type | Meaning |
|---|---|---|
| `event` | string | REQUIRED. What triggers it: `click`, `change`, `submit`, `keydown`, `open`, `close`, `drop`, `hover`, `focus`, or a custom name. |
| `handler` | string | The symbol in code that handles it, for example `onOpenDrill`. |
| `actions` | array of string | REQUIRED. One or more actions from `vocabulary/actions.md`. |
| `effect` | string | REQUIRED. What the user observes, in one or two sentences. |
| `target` | string | The id of the node the action acts on, when the action affects another node (the menu opened, the panel refreshed). |
| `emits` | string | The name of the component event emitted, when `actions` contains `emit`. |
| `keys` | array of string | The keys that trigger it, when `event` is `keydown`. |
| `condition` | string | When the event applies, if not always (for example `profiles.length > 0`). |

- R16. `actions` MUST be non-empty and every entry MUST be a defined action
  or `custom:<name>`.
- R17. `target`, when present, MUST be the id of a node in the document.
- R18. An event with the `emit` action MUST carry `emits`.

## 8. States

A State is a string (the state name) or an object with `name` (REQUIRED),
`description` and `present`: the ids of the children that exist in that
state. States name conditions the node can be in; they are not visual styles.

- R19. Every state name MUST be from `vocabulary/states.md` or
  `custom:<name>`.
- R20. State names MUST be unique within one `states` array.
- R21. Every id in `present` MUST be the id of a descendant of the node.
- R22. A node with no `states` is in the `default` state only.
- R22a. `present` and `condition` compose: a node listed in `present` for
  the current state exists only if its `condition`, when given, also holds.

Variants (visual styles a component exposes as a choice) are OpenUI props
with `enum`, never states.

## 9. Reuse

- R23. A `$ref` MUST resolve to `#/components/<Name>` where `<Name>` is a key
  of `components`, or to `#/structures/<name>` where `<name>` is a key of
  `structures`.
- R24. A `$ref` node stands for the referenced component's `structure` (or
  the referenced structure's `root`). It MAY override `id`, `name`, `label`,
  `i18n`, `description`, `condition`, `kind`, `component`, `tokens`, `props`,
  `states`, `events`, `data`, `implementation`, `slot`, `placement`, `repeat`
  and `presentation`. Its
  `type` MUST equal the type of the referenced node.
- R25. A `$ref` node MUST NOT have `children` other than slot fillers: every
  child MUST carry `slot`, and every such slot MUST be declared by the
  referenced component. A `$ref` to a structure MUST NOT have children.
- R26. A component `structure` MUST NOT contain, directly or through another
  `$ref`, a `$ref` to itself.

`component` without `$ref` records that a node is an instance of a component
without expanding a structure. It is the RECOMMENDED form when the component
has no `structure` or when the instance's own `children` describe it.

## 10. Versioning

`tuis` carries the version of this specification. Documents written for
`"0.1"` remain valid against later `0.x` versions unless the change log says
otherwise. Consumers MUST ignore fields they do not know.

## 11. Relation to OpenUI

Everything OpenUI defines keeps its meaning. A tool that understands only
OpenUI reads `name`, `version`, `description`, `components` and `props` and
ignores the rest, which is why the plain field names are safe even before any
upstream decision; the `x-` form of section 3.1 is provided for tools that
reject unknown top-level fields. The four fields added to a component and the
`structures` object are the whole extension; nothing OpenUI defines is
changed or removed.

## 12. Rule index

| Rule | Enforced by |
|---|---|
| Field shapes, required fields, enumerations, patterns | schema |
| R1 unique ids | validator |
| R3 logical nodes carry no perceptual fields | schema and validator |
| R4 repeat parent declares `data.collection` | validator |
| R5 at most one repeat child | validator |
| R6 table declares columns with unique ids | schema and validator |
| R7 row under table | validator |
| R8 cell under row, column declared | schema and validator |
| R9 grid declares tracks | schema and validator |
| R10 placement within tracks, only under grid | validator |
| R11 slot declared by parent | validator |
| R12 slot names unique | validator |
| R13 overlay types have presentation overlay | schema and validator |
| R15 type containment | validator |
| R16 actions non-empty and known | schema |
| R17 event target exists | validator |
| R18 emit carries emits | validator |
| R19, R20 state names known and unique | schema and validator |
| R21 present ids are descendants | validator |
| R23 $ref resolves | validator |
| R24 $ref type matches target | validator |
| R25 $ref children are slot fillers | validator |
| R26 no $ref cycles | validator |
