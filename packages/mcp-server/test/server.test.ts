import { readFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { openDocument } from '@tessallite-ui-specs/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { createServer } from '../src/server.js';

const ROOT = new URL('../../../', import.meta.url);
const containment = readFileSync(new URL('examples/containment.json', ROOT), 'utf8');

let client: Client;

async function call(name: string, args: Record<string, unknown> = {}): Promise<{ text: string; isError: boolean; json: () => unknown }> {
  const result = await client.callTool({ name, arguments: args });
  const text = (result.content as { type: string; text: string }[]).map((c) => c.text).join('');
  return { text, isError: result.isError === true, json: () => JSON.parse(text) };
}

beforeAll(async () => {
  const server = createServer(openDocument(JSON.parse(containment)), 'containment.json');
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  client = new Client({ name: 'test', version: '0.0.0' });
  await client.connect(clientTransport);
});

describe('MCP server tools', () => {
  it('lists exactly the read-only tools', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(['children_of', 'events_of', 'find', 'get_node', 'get_tree', 'list_structures', 'path_to', 'validate']);
  });

  it('list_structures', async () => {
    expect((await call('list_structures')).json()).toEqual([{ name: 'dashboard', description: expect.any(String), root: 'dashboard' }]);
  });

  it('get_tree with and without depth, and an unknown structure', async () => {
    expect(((await call('get_tree')).json() as { id: string }).id).toBe('dashboard');
    const pruned = (await call('get_tree', { structure: 'dashboard', depth: 1 })).json() as { children: { id: string; children?: unknown[] }[] };
    expect(pruned.children.find((c) => c.id === 'kpi-grid')!.children).toEqual([{ id: 'kpi-card', type: 'card' }, { id: 'kpi-summary', type: 'card' }]);
    expect((await call('get_tree', { structure: 'nope' })).isError).toBe(true);
  });

  it('get_node', async () => {
    expect(((await call('get_node', { id: 'results-row' })).json() as { node: { repeat: boolean } }).node.repeat).toBe(true);
    expect((await call('get_node', { id: 'nope' })).isError).toBe(true);
  });

  it('find by event, type and text', async () => {
    expect(((await call('find', { event: 'onConfirmDelete' })).json() as { id: string }[]).map((h) => h.id)).toEqual(['confirm-delete-ok']);
    expect(((await call('find', { type: 'cell', text: 'header' })).json() as unknown[]).length).toBe(3);
    expect(((await call('find', { kind: 'logical' })).json() as unknown[]).length).toBe(0);
  });

  it('path_to a deep cell', async () => {
    expect(((await call('path_to', { id: 'results-cell-name-text' })).json() as { id: string }[]).map((h) => h.id)).toEqual(['dashboard', 'results-table', 'results-row', 'results-cell-name', 'results-cell-name-text']);
    expect((await call('path_to', { id: 'nope' })).isError).toBe(true);
  });

  it('events_of and children_of', async () => {
    expect(((await call('events_of', { id: 'confirm-delete-cancel' })).json() as { actions: string[] }[])[0].actions).toEqual(['close']);
    expect(((await call('children_of', { id: 'kpi-grid' })).json() as { id: string }[]).map((h) => h.id)).toEqual(['kpi-card', 'kpi-summary']);
    expect((await call('children_of', { id: 'nope' })).isError).toBe(true);
  });

  it('validate the loaded document, a document passed as text, and malformed text', async () => {
    expect((await call('validate')).json()).toEqual({ valid: true, errors: [] });
    const broken = containment.replace('"column": "col-value"', '"column": "col-nope"');
    const result = (await call('validate', { document: broken })).json() as { valid: boolean; errors: { rule: string }[] };
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.rule)).toContain('R8');
    expect((await call('validate', { document: 'name: only' })).json()).toMatchObject({ valid: false });
    expect((await call('validate', { document: '{broken' })).isError).toBe(true);
  });
});
