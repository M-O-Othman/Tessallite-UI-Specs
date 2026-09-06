#!/usr/bin/env node
import { resolve } from 'node:path';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadDocumentFile, validateDocument, SpecDocument, type UiSpecDocument } from '@tessallite-ui-specs/core';
import { createServer } from './server.js';

const file = process.argv[2];
if (!file) {
  console.error('Usage: tuis-mcp <document.json|yaml>');
  process.exit(2);
}
const raw = loadDocumentFile(resolve(file));
const result = validateDocument(raw);
if (!result.valid) {
  console.error(`${file}: ${result.errors.length} error(s); fix them before serving`);
  for (const issue of result.errors) console.error(`  ${issue.rule} ${issue.path}: ${issue.message}`);
  process.exit(1);
}
const server = createServer(new SpecDocument(raw as UiSpecDocument), file);
await server.connect(new StdioServerTransport());
