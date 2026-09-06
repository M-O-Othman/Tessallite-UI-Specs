import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  childrenOf, eventsOf, find, node, parseDocumentText, pathTo, structures, tree, validateDocument,
  type SpecDocument,
} from '@tessallite-ui-specs/core';

const text = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] });
const notFound = (id: string) => ({ content: [{ type: 'text' as const, text: `No node with id "${id}"` }], isError: true });

const id = z.string().describe('Node id');

/**
 * A read-only MCP server over one validated document. Every tool answers from
 * the document given at start-up; `validate` may also check a document passed as text.
 */
export function createServer(doc: SpecDocument, source: string): McpServer {
  const server = new McpServer({ name: 'tessallite-ui-specs', version: '0.1.0' });

  server.registerTool('list_structures', {
    title: 'List structures',
    description: `Names, descriptions and root ids of the structures in ${source}.`,
    inputSchema: {},
  }, async () => text(structures(doc)));

  server.registerTool('get_tree', {
    title: 'Get tree',
    description: 'The node tree of a structure (the first structure by default), optionally limited to a depth; children below the depth appear as {id, type} only.',
    inputSchema: {
      structure: z.string().optional().describe('Structure name, or component:<Name> for a component structure'),
      depth: z.number().int().min(0).optional().describe('Levels of children to include'),
    },
  }, async ({ structure, depth }) => {
    const result = tree(doc, structure, depth);
    return result ? text(result) : { content: [{ type: 'text', text: `No structure "${structure}"` }], isError: true };
  });

  server.registerTool('get_node', {
    title: 'Get node',
    description: 'One node by id, with the structure it belongs to and its JSON Pointer.',
    inputSchema: { id },
  }, async ({ id: nodeId }) => {
    const result = node(doc, nodeId);
    return result ? text(result) : notFound(nodeId);
  });

  server.registerTool('find', {
    title: 'Find nodes',
    description: 'Nodes matching every given criterion: type, kind, event (event name, handler, action or target), component, text (substring of id, name, label, i18n or description), structure.',
    inputSchema: {
      type: z.string().optional().describe('Node type, for example button or custom:kpi-card'),
      kind: z.enum(['visible', 'logical']).optional().describe('Node kind'),
      event: z.string().optional().describe('Event name, handler symbol, action or target id'),
      component: z.string().optional().describe('Component name the node instantiates'),
      text: z.string().optional().describe('Case-insensitive substring of id, name, label, i18n or description'),
      structure: z.string().optional().describe('Restrict to one structure'),
    },
  }, async (criteria) => text(find(doc, criteria)));

  server.registerTool('path_to', {
    title: 'Path to node',
    description: 'The chain of nodes from the structure root to the node, inclusive.',
    inputSchema: { id },
  }, async ({ id: nodeId }) => {
    const result = pathTo(doc, nodeId);
    return result.length > 0 ? text(result) : notFound(nodeId);
  });

  server.registerTool('events_of', {
    title: 'Events of node',
    description: 'The events declared on a node: trigger, handler, actions, effect, target.',
    inputSchema: { id },
  }, async ({ id: nodeId }) => {
    const result = eventsOf(doc, nodeId);
    return result ? text(result) : notFound(nodeId);
  });

  server.registerTool('children_of', {
    title: 'Children of node',
    description: 'The direct children of a node in document order.',
    inputSchema: { id },
  }, async ({ id: nodeId }) => {
    const result = childrenOf(doc, nodeId);
    return result ? text(result) : notFound(nodeId);
  });

  server.registerTool('validate', {
    title: 'Validate',
    description: 'Validate a document (JSON or YAML text) against the schema and the semantic rules. Without a document, re-validates the loaded one.',
    inputSchema: { document: z.string().optional().describe('Document text in JSON or YAML') },
  }, async ({ document }) => {
    try {
      const raw = document === undefined ? doc.raw : parseDocumentText(document);
      return text(validateDocument(raw));
    } catch (error) {
      return { content: [{ type: 'text', text: (error as Error).message }], isError: true };
    }
  });

  return server;
}
