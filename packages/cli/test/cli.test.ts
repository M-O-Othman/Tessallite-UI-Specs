import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { formatIssue, main, parseArgs, runQuery, viewHtml } from '../src/cli.js';

const ROOT = decodeURIComponent(new URL('../../../', import.meta.url).pathname);
const MINIMAL = `${ROOT}examples/minimal.json`;
const CONTAINMENT = `${ROOT}examples/containment.json`;
const INVALID = `${ROOT}packages/cli/test/fixtures/invalid.json`;

describe('tuis CLI', () => {
  const logs: string[] = [];
  const errors: string[] = [];
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => { logs.push(args.join(' ')); });
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => { errors.push(args.join(' ')); });
  afterEach(() => { logs.length = 0; errors.length = 0; });

  it('parses --options and positionals', () => {
    expect(parseArgs(['tree', 'x', '--depth', '2'])).toEqual({ positional: ['tree', 'x'], options: { depth: '2' } });
  });

  it('validate reports valid documents with exit 0', () => {
    expect(main(['validate', MINIMAL])).toBe(0);
    expect(logs[0]).toMatch(/minimal\.json: valid$/);
  });

  it('validate lists every error and exits 1', () => {
    expect(main(['validate', INVALID])).toBe(1);
    expect(errors[0]).toMatch(/error\(s\)$/);
    expect(errors.join('\n')).toMatch(/R8 .*col-missing/);
    expect(errors.join('\n')).toMatch(/R17 .*nowhere/);
  });

  it('view embeds the document into a single self-contained page', () => {
    const template = '<html><script id="tuis-document" type="application/json"><!--DOCUMENT--></script></html>';
    const html = viewHtml({ name: 'x', note: '</script><b>' }, template);
    expect(html).toContain('"name":"x"');
    expect(html).not.toContain('</script><b>');
    expect(html).toContain('<\\/script>');
    expect(() => viewHtml({}, '<html></html>')).toThrow(/document slot/);
    const built = readFileSync(`${ROOT}packages/visualiser/dist/visualiser.html`, 'utf8');
    const page = viewHtml(JSON.parse(readFileSync(MINIMAL, 'utf8')), built);
    expect(page).not.toContain('<!--DOCUMENT-->');
    expect(page).not.toMatch(/<script src=|<link /);
    expect(page).toContain('Minimal example');
    const out = `${ROOT}packages/cli/test/fixtures/minimal.view.html`;
    expect(main(['view', MINIMAL, '--out', out])).toBe(0);
    expect(readFileSync(out, 'utf8')).toContain('"tuis":"0.1"');
  });

  it('formats an issue with rule, path and id', () => {
    expect(formatIssue({ rule: 'R1', path: '/a', id: 'x', message: 'm' })).toBe('R1     /a (x): m');
  });

  it('rejects invalid exports, source overwrite and invalid depth; missing paths fail', () => {
    expect(main(['view', INVALID])).toBe(1);
    expect(errors.join('\n')).toContain('no page written');
    expect(main(['view', MINIMAL, '--out', MINIMAL])).toBe(1);
    expect(errors.at(-1)).toContain('Output must differ');
    expect(main(['query', MINIMAL, 'tree', '--depth', 'wrong'])).toBe(1);
    expect(main(['query', MINIMAL, 'path-to', 'missing'])).toBe(1);
  });

  it('query runs every operation', () => {
    expect((runQuery(CONTAINMENT, 'structures', [], {}) as { name: string }[]).map((s) => s.name)).toEqual(['dashboard']);
    expect((runQuery(CONTAINMENT, 'tree', ['dashboard'], { depth: '0' }) as { children: unknown[] }).children).toHaveLength(6);
    expect((runQuery(CONTAINMENT, 'node', ['kpi-card'], {}) as { type: string }).type).toBe('card');
    expect((runQuery(CONTAINMENT, 'find', [], { type: 'button', text: 'delete' }) as { id: string }[]).map((h) => h.id)).toEqual(['confirm-delete-cancel', 'confirm-delete-ok']);
    expect((runQuery(CONTAINMENT, 'path-to', ['results-cell-name'], {}) as { id: string }[]).map((h) => h.id)).toEqual(['dashboard', 'results-table', 'results-row', 'results-cell-name']);
    expect((runQuery(CONTAINMENT, 'events-of', ['results-delete-button'], {}) as unknown[]).length).toBe(1);
    expect((runQuery(CONTAINMENT, 'children-of', ['results-table'], {}) as { id: string }[]).map((h) => h.id)).toEqual(['results-header-row', 'results-row']);
  });

  it('query prints JSON and exits 0; unknown ids exit 1; unknown ops exit 1; bad usage exits 2', () => {
    expect(main(['query', MINIMAL, 'node', 'settings-menu'])).toBe(0);
    expect(JSON.parse(logs[0]).id).toBe('settings-menu');
    expect(main(['query', MINIMAL, 'node', 'missing'])).toBe(1);
    expect(main(['query', MINIMAL, 'explode'])).toBe(1);
    expect(errors.at(-1)).toMatch(/Unknown query operation/);
    expect(main(['query', INVALID, 'structures'])).toBe(1);
    expect(errors.at(-1)).toMatch(/Invalid document/);
    expect(main([])).toBe(2);
  });
});
