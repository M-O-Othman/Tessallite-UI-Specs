# Draft upstream proposal for ctate/openui

Status: draft; not submitted. Opened only after v0.1 is proven on a real
product UI (plan decision D3). Kept current with the specification.

## Title

Proposal: structures, events, states and slots for OpenUI

## Summary

OpenUI describes components and their props. It does not describe how
components nest on a screen, what happens when the user acts on one, which
states a component can be in, or which named children it accepts. This
proposal adds those four things as optional fields, keeps every existing
field and meaning, ships a JSON Schema for the whole document, and comes with
a validator, a CLI and an MCP server that have been used to document a real
task pane.

## What is added

On a component definition (all optional):

- `events`: array of `{ name, description, type }`, the Custom Elements
  Manifest event shape.
- `states`: array of state names or `{ name, description, present }`.
- `slots`: array of `{ name, description }`, the CEM slot shape.
- `structure`: the anatomy of the component as a node tree.

At the top level (optional):

- `structures`: map of name to `{ description, root }`, where `root` is a
  node tree documenting one screen or surface.

A node has `id`, `type` (from a vocabulary of 43 types, or `custom:<name>`),
`kind` (visible or logical), `label`, `icon`, `component`, `$ref`, `props`,
`data`, `a11y`, `tokens`, `states`, `events`, `slots`/`slot`,
`columns`/`column`, `tracks`/`placement`, `repeat`, `presentation` and
`children`. No field carries visual information.

## Why in OpenUI rather than beside it

The envelope and props are OpenUI's; the structure refers to those
components by name and instantiates their props. Keeping the two in one
document lets an AI tool read the library and its use in one pass, which is
OpenUI's stated purpose ("AI-native"). The "Future Plans" section of the
OpenUI README lists component state and lifecycle, and complex UI patterns
such as modals and asynchronous loading; `states`, `presentation: overlay`
and the `loading`/`empty`/`error` states address those directly.

## Compatibility

- Existing documents are unchanged and remain valid.
- Tools that ignore unknown fields are unaffected. For tools that reject
  unknown fields, the same content may be written as `x-structures`,
  `x-events`, `x-states`, `x-slots`, `x-structure`; the validator accepts
  both spellings.
- The schema is JSON Schema 2020-12 and validates plain OpenUI documents.

## What is proposed for the OpenUI repository

1. A section in the README describing the four component fields and
   `structures`, with the node table.
2. `schema/openui.schema.json` (the schema here, renamed).
3. `vocabulary/` (node types, actions, states) as three short tables.
4. One example under `specs/` showing a structure.

The tooling stays in its own repository; OpenUI need not take a dependency.

## Open points for the maintainer

- Field names: `structures` versus a single `structure`; `events` versus
  the `onX` prop convention some published specs already use.
- Whether the containment vocabulary should be normative or a
  recommendation.
- Licence: this repository has none yet; the proposal will be licensed MIT
  to match OpenUI when submitted.
