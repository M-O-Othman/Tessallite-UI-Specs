# Viewer card icons and static text

Status: implemented; automated checks pass; actual browser verification pending,
2026-09-07.

## Tasks

- [x] Add consistent monochrome semantic icons for node types, logical groups,
  surfaces and event-bearing cards, with accessible text equivalents.
- [x] Show authored static text on component and structure cards, including
  referenced roots and inline text children. Do not present bindings, handlers,
  component names or translation keys as literal rendered text.
- [x] Preserve compact, unclipped card layout, selection, expansion, zoom,
  search and offline export. Add behaviour tests and run the full suite.
- [x] Update README, user guide, issue log and handout; refresh existing web
  application and Excel preview HTML without changing their specification JSON.

## Scope guard

No schema change, runtime app rendering, document rewriting, remote icon loads,
emoji, new dependencies, frontend source changes, commit or push. Literal text
is sourced from the document, never invented by the viewer. Long content has
a bounded card preview and full accessible/inspector text. Existing browser
connection limits must be reported honestly, not treated as a visual pass.

## Verification

`npm run check`: 128 tests pass in 16 files. Tests cover all 43 vocabulary
type mappings, logical/window/event semantics, explicit/static/translated text,
references and overrides, dynamic/conditional exclusions, accessibility,
unsafe markup as inert text, bounded previews, mixed-height geometry and
exported card interactions. Both private exports load with semantic icons and
support handler search/selection in the DOM environment. Excel preview HTTP
200; web JSON SHA-256 unchanged. No schema or frontend source changes.

Remaining verification: real desktop/narrow-browser rendering. Browser runtime
reports no available browser and discovery returns `[]`; see
`docs/questions/viewer-browser-verification.md`. This is not waived.
