import type { ErrorObject } from 'ajv';
import type { Issue } from './types.js';

/** Shared by Node and the offline browser validator. */
export function schemaIssues(errors: ErrorObject[] | null | undefined): Issue[] {
  const seen = new Set<string>();
  const issues: Issue[] = [];
  for (const error of errors ?? []) {
    if (error.keyword === 'if') continue;
    let message = error.message ?? error.keyword;
    if (error.keyword === 'additionalProperties') message = `unknown field "${error.params.additionalProperty}"`;
    if (error.keyword === 'enum') message = `must be one of: ${error.params.allowedValues.join(', ')}`;
    if (error.keyword === 'not') message = 'conflicting fields: use only one spelling of an extension field; logical nodes cannot carry label, icon, events or a11y';
    const key = `${error.instancePath}|${message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    issues.push({ rule: 'schema', path: error.instancePath || '/', message });
  }
  return issues;
}
