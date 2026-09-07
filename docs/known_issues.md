# Known issues

Repair session: 2026-09-07. Automated verification is complete; actual Chrome visual verification remains open.

| ID | Status | Description and file |
|---|---|---|
| UI-11 | Fixed (automated checks); visual check pending | Cards only showed technical identifiers and omitted semantic icons and authored static captions. Added offline type/event symbols, literal-text/reference resolution, separate accessible names, full inspector text and variable-height non-overlapping previews. `packages/visualiser/src/card-{content,icons}.js`, `card-icons.json`, `graph.js`, `layout.js`, `detail.js`, `app.js`. |
| AUTHOR-01 | Fixed in delivered source-derived document | Temporary authoring treated reused JSX variables as text and lost initializer guards/array-builder iteration. Expanded source references and preserved conditional/repeated ownership; verified complete distinct JSX event-site coverage. `work/web-application-spec-plan.md`, temporary authoring `extract.mjs`, `adapt.mjs`, `normalise.mjs`. |
| UI-10 | Fixed (automated checks); visual check pending | Removed automatic dark-green theme in favour of permanent white Tessallite surfaces. Consolidated heading, controls and footer information into a compact header, retained live status in maximised mode, and allowed long filenames/hints to wrap. `packages/visualiser/src/theme.css`, `style.css`, `index.html`, `app.js`. |
| UI-09 | Fixed (automated checks); visual check pending | Screenshot showed graph truncation at a fixed SVG height while the inspector stretched the page. The desktop shell now fills the viewport with independent panel scrolling, a flexible canvas and maximise/restore controls. `packages/visualiser/src/style.css`, `index.html`, `app.js`, `graph.js`. |
| UI-01 | Fixed (automated checks) | Unreferenced component breadcrumbs omit their group. `packages/visualiser/src/model.js`. |
| UI-02 | Fixed (automated checks) | Virtual identifiers misparse dots and unknown IDs can recurse indefinitely. `packages/visualiser/src/model.js`. |
| UI-03 | Fixed (automated checks) | Merging components by name loses distinct instances and their descendants; definition contents can duplicate explicitly authored children. `packages/visualiser/src/model.js`. |
| UI-04 | Fixed (automated checks) | Reused detail nodes share canvas IDs and incorrect breadcrumb parents. `packages/visualiser/src/model.js`. |
| UI-05 | Fixed (automated checks) | Browser loads bypass validation and YAML support; failed or racing loads can leave misleading document state. `packages/visualiser/src/app.js`. |
| UI-06 | Fixed (automated checks) | Search counts filtered-out nodes, ignores handlers and provides no selectable results. `packages/visualiser/src/app.js`, `model.js`. |
| UI-07 | Implemented; visual check pending | Crowded controls, raw JSON inspector and auto-fitting large documents make the viewer hard to read. `packages/visualiser/src/index.html`, `style.css`, `graph.js`. |
| SC-01 | Fixed (automated checks) | Missing node type triggers unrelated conditional required-field errors. `schema/tessallite-ui-specs.schema.json`. |
| SC-02 | Fixed (automated checks) | Table/grid/cell references require fields forbidden as reference overrides, making valid reuse impossible; queries omit inherited root events. `schema/tessallite-ui-specs.schema.json`, `packages/core/src/{document,semantic,query}.ts`. |
| SC-03 | Fixed (automated checks) | Undeclared component instances and repeated columns without data.columns pass validation. `packages/core/src/semantic.ts`. |
| SC-04 | Fixed (automated checks) | Handler-chain search requires the entire chain rather than its individual handler symbols. `packages/core/src/query.ts`. |
| SC-05 | Fixed (automated checks) | JSON Pointer escaped component names do not resolve; inherited object keys can be mistaken for components. `packages/core/src/document.ts`. |
| UI-08 | Open | Browser verification blocked: Chrome extension is enabled but Browser plugin native-host manifest is missing. Reinstall Browser plugin through ChatGPT plugin UI. |
| SC-06 | Fixed (automated checks) | Structure-reference cycles bypass cycle validation. `packages/core/src/semantic.ts`. |
| CLI-01 | Fixed (automated checks) | View returns success and writes HTML for invalid documents; an output matching the input overwrites source; invalid depth and missing paths return misleading results. `packages/cli/src/cli.ts`. |
| SC-07 | Fixed (automated checks) | Inherited logical-node facts and component-level state duplicates/descendants bypass semantic checks; unused ancestor helper parameter obscures the active interface. `packages/core/src/semantic.ts`. |

Verification: `npm run check` passes all 128 tests in 16 files, including semantic icons, literal text/ref overrides, injection-safe full text, bounded previews, mixed-height layout, maximise/restore, Escape, resize/refit, wheel panning, embedded logo, compact header and white surfaces. Refreshed private web/Excel exports pass load, semantic-icon and handler-search/selection checks in a DOM environment. Earlier unused-local checks and eight-tool MCP checks remain recorded in the repair handout. Browser discovery was retried for UI-11 and returned no connected browsers; no actual rendering or narrow-screen visual claim is made.
