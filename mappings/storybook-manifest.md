# Mapping: Storybook component manifest

Storybook's component manifest (the JSON produced by `storybook` for docs and
the Storybook MCP addon) lists components, their props from the argTypes
table, and the stories (named examples with args). Tessallite-UI-Specs takes
the component definitions and, optionally, one story as the `example`.

## Component definition fields

| Storybook manifest | Tessallite-UI-Specs (`components.<Name>`) | Note |
|---|---|---|
| `title` or component `displayName` | key of `components` | Last path segment of the title. |
| component `description` (docgen) | `description` | Verbatim. |
| `argTypes.<name>.type.name` | `props.<name>.type` | `enum` in Storybook is `type: string` plus `enum` here. |
| `argTypes.<name>.description` | `props.<name>.description` | |
| `argTypes.<name>.table.defaultValue.summary` | `props.<name>.default` | |
| `argTypes.<name>.type.required` | `props.<name>.required` | |
| `argTypes.<name>.options` | `props.<name>.enum` | |
| `argTypes.<name>.action` | `events[].name` | An arg wired to an action is an emitted event. |
| story `name` and `args` | `example` | Optional; the story rendered as usage text. |

## What Storybook does not carry

Storybook has no containment tree and no per-node behaviour. Structures,
states and slots are authored here; the manifest only seeds `components`.

## Instances

A node instantiating a Storybook-documented component sets `component` to
the key and `implementation.symbol` to the export name. `props` on the node
should only name props whose values matter to the structure (a `variant`, a
`mode`), not every prop the story sets.
