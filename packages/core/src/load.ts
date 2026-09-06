import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { parse as parseYaml } from 'yaml';

/**
 * Parse document text. JSON is tried first unless the hint says YAML; YAML is
 * a superset of JSON, so a YAML parse is the fallback for any text.
 */
export function parseDocumentText(text: string, hint?: 'json' | 'yaml'): unknown {
  if (hint !== 'yaml') {
    try {
      return JSON.parse(text);
    } catch (error) {
      if (hint === 'json') throw new Error(`Invalid JSON: ${(error as Error).message}`);
    }
  }
  const value = parseYaml(text);
  if (value === null || typeof value !== 'object') throw new Error('Document is not an object');
  return value;
}

/** Read a .json, .yaml or .yml file and parse it. */
export function loadDocumentFile(path: string): unknown {
  const ext = extname(path).toLowerCase();
  const hint = ext === '.json' ? 'json' : ext === '.yaml' || ext === '.yml' ? 'yaml' : undefined;
  return parseDocumentText(readFileSync(path, 'utf8'), hint);
}
