/**
 * Build an offline HTML page with local styles, bundled modules and a
 * precompiled schema validator. The CLI inserts the document into this page.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import standalone from 'ajv/dist/standalone/index.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const src = (name) => readFileSync(new URL(`src/${name}`, `file://${here}`), 'utf8');

/** The page with the sources inlined and, optionally, a document embedded. */
export function buildHtml(document) {
  mkdirSync(new URL('dist/', `file://${here}`), { recursive: true });
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false, code: { source: true, esm: true } });
  addFormats(ajv);
  const schema = JSON.parse(readFileSync(new URL('../../schema/tessallite-ui-specs.schema.json', import.meta.url), 'utf8'));
  writeFileSync(new URL('dist/schema-validator.js', `file://${here}`), standalone(ajv, ajv.compile(schema)));
  const script = buildSync({ entryPoints: [fileURLToPath(new URL('src/app.js', `file://${here}`))], bundle: true, format: 'iife', platform: 'browser', write: false, minify: true }).outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const embedded = document === undefined ? '<!--DOCUMENT-->' : JSON.stringify(document).replace(/<\//g, '<\\/');
  return src('index.html')
    .replace('/*BRAND_PRIMARY*/', () => 'data:image/svg+xml;base64,' + readFileSync(new URL('assets/logo-primary.svg', `file://${here}`)).toString('base64'))
    .replace('/*STYLE*/', () => src('theme.css') + '\n' + src('style.css'))
    .replace('/*SCRIPT*/', () => script)
    .replace('<!--DOCUMENT-->', () => embedded);
}

export function build() {
  mkdirSync(new URL('dist/', `file://${here}`), { recursive: true });
  const out = fileURLToPath(new URL('dist/visualiser.html', `file://${here}`));
  writeFileSync(out, buildHtml());
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(`built ${build()}`);
}
