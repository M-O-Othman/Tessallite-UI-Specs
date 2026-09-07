/**
 * Builds dist/visualiser.html: index.html with style.css and the four
 * source modules inlined as one classic script. Exports buildHtml for the
 * CLI, which embeds a document into the page.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const src = (name) => readFileSync(new URL(`src/${name}`, `file://${here}`), 'utf8');

const MODULES = ['model.js', 'layout.js', 'graph.js', 'app.js'];

/** Strip ESM syntax so the modules concatenate into one classic script. */
export function toClassicScript(text) {
  return text
    .split('\n')
    .filter((line) => !/^import\s/.test(line))
    .map((line) => line.replace(/^export\s+(const|function|let|class)\s/, '$1 '))
    .join('\n');
}

/** The page with the sources inlined and, optionally, a document embedded. */
export function buildHtml(document) {
  const script = MODULES.map((m) => `// ---- ${m}\n${toClassicScript(src(m))}`).join('\n');
  const embedded = document === undefined ? '<!--DOCUMENT-->' : JSON.stringify(document).replace(/<\//g, '<\\/');
  return src('index.html')
    .replace('/*STYLE*/', () => src('style.css'))
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
