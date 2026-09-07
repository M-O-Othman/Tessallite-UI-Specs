import { readFileSync } from 'node:fs';
import { Ajv2020, type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { Issue } from './types.js';
import { schemaIssues } from './schema-errors.js';

const SCHEMA_URL = new URL('../../../schema/tessallite-ui-specs.schema.json', import.meta.url);

let compiled: ValidateFunction | undefined;

/** The JSON Schema object, read from schema/ at the repository root. */
export function readSchema(): Record<string, unknown> {
  return JSON.parse(readFileSync(SCHEMA_URL, 'utf8')) as Record<string, unknown>;
}

function validator(): ValidateFunction {
  if (!compiled) {
    const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
    addFormats.default(ajv);
    compiled = ajv.compile(readSchema());
  }
  return compiled;
}

/** Validate a parsed document against the schema. Returns one issue per schema error. */
export function checkSchema(document: unknown): Issue[] {
  const validate = validator();
  if (validate(document)) return [];
  return schemaIssues(validate.errors);
}
