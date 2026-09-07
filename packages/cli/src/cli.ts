import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  childrenOf, eventsOf, find, loadDocumentFile, node, openDocument, pathTo, structures, tree, validateDocument,
  type FindCriteria, type Issue,
} from '@tessallite-ui-specs/core';

const USAGE = `Usage:
  tuis validate <file>
  tuis query <file> structures
  tuis query <file> tree [structure] [--depth N]
  tuis query <file> node <id>
  tuis query <file> find [--type T] [--kind visible|logical] [--event E] [--component C] [--text S] [--structure S]
  tuis query <file> path-to <id>
  tuis query <file> events-of <id>
  tuis query <file> children-of <id>
  tuis view <file> [--out page.html]

<file> is a .json, .yaml or .yml document. Query output is JSON on stdout.
view writes the visualiser page with the document embedded (default <file>.html).`;

/** Parse `--name value` options and positional arguments. */
export function parseArgs(args: string[]): { positional: string[]; options: Record<string, string> } {
  const positional: string[] = [];
  const options: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      options[arg.slice(2)] = args[i + 1] ?? '';
      i += 1;
    } else positional.push(arg);
  }
  return { positional, options };
}

export function formatIssue(issue: Issue): string {
  return `${issue.rule.padEnd(6)} ${issue.path}${issue.id ? ` (${issue.id})` : ''}: ${issue.message}`;
}

function validate(file: string): number {
  const result = validateDocument(loadDocumentFile(resolve(file)));
  if (result.valid) {
    console.log(`${file}: valid`);
    return 0;
  }
  console.error(`${file}: ${result.errors.length} error(s)`);
  for (const issue of result.errors) console.error(`  ${formatIssue(issue)}`);
  return 1;
}

/** Run one query operation and return the JSON-serialisable result, or undefined for an unknown id. */
export function runQuery(file: string, op: string, positional: string[], options: Record<string, string>): unknown {
  const doc = openDocument(loadDocumentFile(resolve(file)));
  switch (op) {
    case 'structures': return structures(doc);
    case 'tree': return tree(doc, positional[0], options.depth === undefined ? undefined : Number(options.depth));
    case 'node': return node(doc, required(positional[0], 'id'));
    case 'find': {
      const criteria: FindCriteria = {};
      for (const key of ['type', 'kind', 'event', 'component', 'text', 'structure'] as const) {
        if (options[key] !== undefined) (criteria as Record<string, string>)[key] = options[key];
      }
      return find(doc, criteria);
    }
    case 'path-to': return pathTo(doc, required(positional[0], 'id'));
    case 'events-of': return eventsOf(doc, required(positional[0], 'id'));
    case 'children-of': return childrenOf(doc, required(positional[0], 'id'));
    default: throw new Error(`Unknown query operation "${op}"\n${USAGE}`);
  }
}

const VISUALISER = new URL('../../visualiser/dist/visualiser.html', import.meta.url);

/** The visualiser page with the document embedded in its document slot. */
export function viewHtml(document: unknown, template: string = readFileSync(VISUALISER, 'utf8')): string {
  const embedded = JSON.stringify(document).replace(/<\//g, '<\\/');
  if (!template.includes('<!--DOCUMENT-->')) throw new Error('Visualiser template has no document slot; rebuild with npm run build');
  return template.replace('<!--DOCUMENT-->', () => embedded);
}

function view(file: string, out: string | undefined): number {
  const document = loadDocumentFile(resolve(file));
  const result = validateDocument(document);
  if (!result.valid) console.error(`${file}: ${result.errors.length} validation error(s); the page is written anyway`);
  const target = resolve(out ?? `${file}.html`);
  writeFileSync(target, viewHtml(document));
  console.log(`${target}: written`);
  return 0;
}

function required(value: string | undefined, name: string): string {
  if (value === undefined) throw new Error(`Missing argument <${name}>\n${USAGE}`);
  return value;
}

export function main(argv: string[]): number {
  const [command, file, ...rest] = argv;
  try {
    if (command === 'validate' && file) return validate(file);
    if (command === 'view' && file) return view(file, parseArgs(rest).options.out);
    if (command === 'query' && file && rest[0]) {
      const { positional, options } = parseArgs(rest.slice(1));
      const result = runQuery(file, rest[0], positional, options);
      if (result === undefined) {
        console.error('not found');
        return 1;
      }
      console.log(JSON.stringify(result, null, 2));
      return 0;
    }
    console.error(USAGE);
    return 2;
  } catch (error) {
    console.error((error as Error).message);
    return 1;
  }
}

