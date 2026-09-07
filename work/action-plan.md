# Viewer and schema repair

Current task: consolidate documentation under one lowercase `docs/` tree and
remove duplicate navigation paths before committing. The delivered README and
project guide are recorded in `work/documentation-plan.md`. Viewer card
icons/static text are recorded in `work/viewer-card-content-plan.md`; web
application delivery in `work/web-application-spec-plan.md`. Repair history
follows.

Status: documentation housekeeping complete; browser verification pending,
2026-09-07. User approved committing and pushing after housekeeping. Continues
`tessallite-ui-specs-plan.md` and session `2026-09-07-172551.md`.

## Documentation housekeeping tasks

- [x] Use one canonical lowercase `docs/` directory for guides and issue logs.
- [x] Move question documents under `docs/questions/` and update every link.
- [x] Keep one documentation index and remove stale `Docs/` navigation.
- [x] Run link, build and test checks; record the browser gate without hiding it.

## Tasks

- [x] Second screenshot follow-up: use a white canvas and panels regardless of OS theme; match the live tessallite.io brand stylesheet with restrained green accents.
- [x] Merge graph heading, controls and both footer information areas into a compact responsive graph header without dropping information or controls.
- [x] Add regression tests, run the full suite, refresh the private preview and update documentation for this follow-up.

- [x] Screenshot follow-up: use the full available viewport for drawing, scroll side panels independently, and add accessible maximise/restore viewing mode while preserving the graph and Tessallite styling. Rendered visual check remains in the browser gate below.
- [x] Apply the user-specified brand-identity kit: official light/dark logo, palette, control borders and font stacks, embedded offline with asset licence retained.
- [x] Verify maximise/restore, Escape, resize handling and export with automated tests; refresh the existing preview and documentation.

- [x] Reproduce the reported failures with the full suite and the private Excel document.
- [x] Repair containment navigation, identifier resolution, search visibility and document loading; preserve distinct component instances.
- [x] Apply Tessallite green, mint, charcoal, typography and panel conventions from the workspace. Organise navigation, graph controls and readable node details; retain graph views and progressive disclosure. Implementation complete; visual verification remains below.
- [x] Repair evidenced schema/validator inconsistencies within the approved format; explain authoring with a concise guide and useful validation errors.
- [ ] Verify the complete suite, CLI and MCP, and browser interactions with the private Excel document, including small-screen layout.
- [x] Update README, user guide, issue log, documentation index and session handout with evidence and scope check.

## Scope guard

Keep the approved OpenUI envelope, text-only containment/behaviour format, both graph views, filters, search, depth controls, details, offline HTML, CLI and read-only MCP. Preserve existing changes. The sibling workspace is a read-only design/data reference; never commit its private Excel document here. The user now authorizes committing and pushing this repository's current repair; no sibling workspace changes or package publication. A replacement format or other critical architecture change needs a recorded question and user review.

## Evidence

Baseline: `npm run check`: build and examples pass; 78 tests pass, one fails (Unreferenced breadcrumb). Prior browser gate was not completed.
Design reference: `../tessallite-workspace/tessallite-workspace/tessallite/frontend/src/theme/tokens.ts` and brand `05_website_ui_kit/ui-tokens.json`.

The private Excel document validates and all eight MCP tools passed over a real
stdio connection. Exported-page DOM checks include the real document, handler
search and selection; automated regressions cover loading and error recovery.
The actual Chrome gate is blocked by the missing Browser native host, recorded
in `docs/questions/viewer-browser-verification.md`. It is not waived.

Final automated gate: `npm run check` passes 111 tests in 13 files. TypeScript
checks with `--noUnusedLocals --noUnusedParameters` pass for core, CLI and MCP.
The final private export loads, finds `handleOpenDrill`, and selects `hdr-drill`
in the DOM test environment; the loopback preview returns HTTP 200. Sol Max
implemented upload regressions, configuration extraction, label clipping and
the documentation consistency pass under separate file ownership.

Screenshot follow-up adds regression coverage for maximise/restore state,
Escape, wheel panning, resize/refit and embedded official logos. The refreshed
private Excel export passes loading and maximise/Escape checks in the DOM
environment and the existing preview returns HTTP 200. Actual Chrome rendering
remains the explicit outstanding gate.

Second screenshot follow-up: white theme is fixed across OS preferences;
the primary logo is the only embedded logo. Both footer information areas
now live in the compact graph header, including live status in maximised mode.
The refreshed private export passes loading, white-background, header status,
footer removal and maximise/Escape DOM checks; preview HTTP 200.
