# Contributing

## Setup

Node 22. `npm install`, then `npm run check` (build, validate the examples,
run the tests). All three must pass before a change is proposed.

## What goes where

- Normative text: `SPEC.md`. A rule is numbered once and never renumbered;
  a removed rule keeps its number with the note "removed in <version>".
- Field shapes: the schema. Every field carries a `description`.
- Rules the schema cannot express: `packages/core/src/semantic.ts`, one
  block per rule, each with a test in `packages/core/test/semantic.test.ts`.
- Vocabularies: one table each under `vocabulary/`; the enumerations in the
  schema mirror them exactly.
- Every change that alters what a document may contain: a line in
  `CHANGELOG.md` and, when it affects OpenUI compatibility, a line in
  `docs/upstream-proposal.md`.

## Rules for changes

- Structure means containment. No field may carry a size, colour, font,
  coordinate, spacing or animation. Proposals that need them belong in a
  design-token file or a design tool.
- A new node type, action or state needs a meaning that no existing entry
  covers and a containment rule.
- Tests assert behaviour: an invalid document is rejected with the right rule
  number; a query returns the right nodes. Do not weaken a test to pass.
- Dependencies: typescript, tsx, vitest, ajv, ajv-formats, yaml,
  @modelcontextprotocol/sdk, zod. Anything else needs agreement first.
- Prose is direct and short. No decorative characters.

## Commit messages

`[scope] short summary`, with detail lines below when useful. Scopes: spec,
schema, core, cli, mcp, docs, ci.
