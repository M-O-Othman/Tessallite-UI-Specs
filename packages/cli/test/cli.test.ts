import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatIssue, main, parseArgs, runQuery } from '../src/cli.js';

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

  it('formats an issue with rule, path and id', () => {
    expect(formatIssue({ rule: 'R1', path: '/a', id: 'x', message: 'm' })).toBe('R1     /a (x): m');
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
