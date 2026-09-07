# Web application UI specification

Status: delivered and statically validated, 2026-09-07.

## Scope

Generate `docs/front-end-design/tessallite-web-application.openui.json` in
the sibling Tessallite workspace from `tessallite/frontend`. Preserve the
existing Excel JSON and schema. Source code is read-only; no commit/push.
Use the existing OpenUI envelope and final schema, not a new format.

## Tasks

- [x] Inventory production routes, rendered components and shared UI imports.
- [x] Author source-linked structures, component props, containment, conditions,
  repeated templates and actual event handlers for the web application.
- [x] Cross-check route/component coverage and source references; validate
  schema and semantics, exercise queries and build an offline viewer export.
- [x] Deliver the JSON with a concise provenance/coverage companion and update
  the session handout. Report any unrepresented source shape explicitly.

## Scope guard

Do not substitute a routes-only outline for the component/control specification.
Do not infer runtime state or invent handlers. Record dynamic data as bindings,
not sample data. Do not include CSS, dimensions, colours or credentials. Do not
modify frontend code or unrelated workspace changes. Generated frontend content
stays in the sibling workspace and must not be added to this public spec repo.

The earlier viewer browser-verification gate is independent and remains open.

## Evidence

403 component definitions, 50 surfaces (17 route records and 33 panels),
17,728 authored nodes, 2,256 event records, 512 repeat templates. All 246
production TSX files have source references; all 2,078 distinct extracted JSX
event sites are represented. Source hashes match the unchanged source files.
Schema and semantic checks, handler/path/event queries, model-picker guard
regression and exported-page load/search/selection checks pass. The latter
checks run in a DOM environment, not an actual browser.

`npm run check`: 111 tests pass in 13 files. Workspace documentation index
check passes. JSON, HTML, coverage report and README delivered privately.
No source code changes, commit or push. Six unreferenced source files are
explicitly distinguished from active routes in the document and README.
