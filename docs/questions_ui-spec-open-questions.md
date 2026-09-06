# Open questions: a technology-independent UI hierarchy and behaviour specification

Status: awaiting answers, 2026-09-06. No code or spec text is written until these are settled.

## Positioning (pushback first)

P1. Do not reinvent the parts that exist. OpenUI already models props; Custom
Elements Manifest already models events and slots; W3C Design Tokens already
models tokens; DSDS already models guidelines. What none of them model is the
hierarchy of a real product screen with typed nodes and the behaviour attached
to each node. I propose the spec covers exactly that gap and defines mappings
TO those formats (props in OpenUI shape, events in CEM shape, tokens by W3C
token name) rather than its own dialect of each. Agree?

P2. "APIs and all" needs a definition. For an AI coding agent, "usable" in 2026
means three concrete things, in this order of value:
  1. a JSON Schema so any agent can validate what it writes;
  2. an MCP server (Model Context Protocol) exposing the tree as tools -
     get_tree, get_node, find (by type / kind / event / component),
     events_of, path_to - so an agent can query a large spec instead of
     reading 5,000 lines;
  3. an llms.txt and an AGENTS.md in the repo telling an agent how to author
     and consume specs.
  A REST API is NOT worth building for v0.1: agents do not call HTTP by
  default, they call tools. I propose: schema + validator CLI + MCP server +
  one converter (react-docgen / tsc declarations -> node props). Agree, or do
  you want an HTTP API as well?

P3. Do not encode pixel layout. Layout belongs to design tools; a hierarchy
spec that carries x/y/width rots on the first redesign and is what makes such
specs unusable. Keep structural order plus an optional layout hint enum
(row | column | grid | stack | overlay). Agree?

P4. Behaviour must be structured, not only prose. Free-text "effect" is what
humans read; agents need a small action vocabulary to act on: navigate,
open, close, set-state, call, emit, submit. Each event carries both: a
structured `actions` list and a human `effect`. Agree?

P5. Everything is text, icons are links: agreed. Add one rule - icon
references are URIs, relative to the spec file, SVG recommended, and a node
of type icon MUST carry an accessible name (`label`) so the text alone is
complete without the image. Agree?

## Decisions I cannot make for you

Q1. Name. Candidates (all checked for collisions at a glance, not registered):
   a. UI Hierarchy Specification (UIHS)
   b. Interface Tree Spec (ITS)
   c. OpenUITree
   d. your own
   Note: "UI Specification Schema" is already a W3C community group name and
   "OpenUI" is taken - avoid both as-is.

Q2. Canonical format: JSON (machine first, validates directly) with YAML
   permitted for hand authoring, or YAML canonical like DSDS? I recommend JSON
   canonical, YAML accepted by the validator.

Q3. Licence: Apache-2.0 for code (validator, MCP server) and CC-BY-4.0 for the
   specification text is the common split. Agree?

Q4. GitHub: create the remote now under your account (via gh), public, or keep
   it local until v0.1 is presentable? Repository name = the spec name in
   kebab-case.

Q5. Reference example: the Tessallite Excel task pane, generalised (no
   product internals, sample data only), as the worked example in the repo?
   It is real, already rendered and verified, and shows every node type.

Q6. Language of the tooling: Node/TypeScript (fits the JSON Schema / MCP
   ecosystem and most front-end agents) or Python? I recommend TypeScript.

Q7. Scope of v0.1 node fields (say if anything is missing or unwanted):
   id, name, kind (visible | logical), type (controlled vocabulary with a
   `custom:` escape), description, label (accessible name), icon (URI),
   implementation (per technology: file, symbol, tag - optional, repeatable),
   props (OpenUI shape), states, events (event, handler, actions, effect,
   emits), data (bindings to named data sources), a11y (role, aria),
   tokens (W3C token names), layout (hint enum), children, ref (reuse of a
   node defined elsewhere by id).

Q8. Type vocabulary for v0.1: container, text, heading, icon, image, button,
   icon-button, link, input, select, checkbox, radio, switch, slider, tab,
   tablist, chip, badge, list, list-item, card, table, dialog, drawer, menu,
   menu-item, tooltip, toast, banner, skeleton, chart, divider, form.
   Add or remove?

## What v0.1 would contain once answered

- SPEC.md (normative, RFC 2119 language), schema/<name>.schema.json,
  vocabulary/types.md and actions.md, mappings/ (OpenUI, CEM, W3C tokens,
  Storybook manifest), examples/<reference example>.json + .md,
  tools/validate (CLI), tools/mcp-server, llms.txt, AGENTS.md, README, LICENSE,
  CHANGELOG, CONTRIBUTING.
