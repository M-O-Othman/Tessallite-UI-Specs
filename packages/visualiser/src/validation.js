import checkShape from '../dist/schema-validator.js';
import { SpecDocument } from '../../core/src/document.ts';
import { checkSemantics } from '../../core/src/semantic.ts';
import { schemaIssues } from '../../core/src/schema-errors.ts';
import { parse } from 'yaml';

/** Same schema and semantic rules as the CLI, compiled into the offline page. */
export function validateInput(raw) {
  const errors = checkShape(raw) ? checkSemantics(new SpecDocument(raw)) : schemaIssues(checkShape.errors);
  return { valid: errors.length === 0, errors };
}

export function parseInput(text, name = '') {
  return /\.ya?ml$/i.test(name) ? parse(text, { maxAliasCount: 100 }) : JSON.parse(text);
}
