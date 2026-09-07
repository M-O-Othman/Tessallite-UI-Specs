# Project documentation and screenshots

Status: delivered; checks pass, 2026-09-07.

## Scope

Create a clear root README and a detailed, durable project guide under `docs/`.
Explain the format, validator, queries, MCP server, visualiser, authoring
rules, testing and safe contribution workflow in language a young reader can
follow. Include real screenshots of the viewer with stable filenames.

## Tasks

- [x] Review the current code, schema, vocabulary, tests and existing docs for
  accurate names and commands.
- [x] Write a concise but friendly root README with a first successful run,
  screenshots, links and a repository map.
- [x] Write a detailed `docs/project-guide.md` with a glossary, examples,
  diagrams, troubleshooting, safety rules and links to the normative sources.
- [x] Add screenshot index/alt text and update the documentation indexes and
  user guide. Keep claims timeless; put changing verification notes in known
  issues/session handouts.
- [x] Run build, tests, docs index checks, markdown link/path checks and inspect
  the screenshots. Update the handout and report any remaining browser gate.

## Scope guard

Documentation only. Do not change schema semantics, viewer behaviour, source
application code or generated specification JSON. Do not include credentials,
private source paths, timestamps in stable documentation, or fake runtime
claims. Screenshots must be local, real captures or clearly labelled fixtures.

## Evidence

`README.md` gives a beginner-first explanation, three local screenshot links
and a repository map. `docs/project-guide.md` contains the detailed format,
vocabulary, queries, viewer, MCP, testing, privacy and troubleshooting
reference. `docs/screenshots.md` provides stable filenames and alt text.

All 59 checked local Markdown links resolve. The three PNG captures are valid
and contain no credentials. `npm run check` passes 128 tests in 16 files.
Viewer exports load and respond to semantic-icon and search/selection checks in
the DOM test environment. Real browser rendering remains an explicitly open
verification gate because no browser connection is available.
