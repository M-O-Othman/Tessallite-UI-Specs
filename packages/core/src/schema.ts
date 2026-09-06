import { readFileSync } from 'node:fs';
import { Ajv2020, type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { Issue } from './types.js';

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

function describe(error: ErrorObject): string {
  if (error.keyword === 'additionalProperties') {
    return `unknown field "${(error.params as { additionalProperty: string }).additionalProperty}"`;
  }
  if (error.keyword === 'enum' || error.keyword === 'pattern' || error.keyword === 'anyOf') {
    return `${error.message ?? 'invalid value'}`;
  }
  return error.message ?? error.keyword;
}

/** Validate a parsed document against the schema. Returns one issue per schema error. */
export function checkSchema(document: unknown): Issue[] {
  const validate = validator();
  if (validate(document)) return [];
  const seen = new Set<string>();
  const issues: Issue[] = [];
  for (const error of validate.errors ?? []) {
    // The if/then and anyOf keywords produce a wrapper error beside the useful one.
    if (error.keyword === 'if' || error.keyword === 'not' && error.instancePath.endsWith('/kind')) continue;
    const key = `${error.instancePath}|${error.keyword}|${describe(error)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    issues.push({ rule: 'schema', path: error.instancePath || '/', message: describe(error) });
  }
  return issues;
}
