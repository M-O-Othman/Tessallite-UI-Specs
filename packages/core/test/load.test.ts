import { describe, expect, it } from 'vitest';
import { loadDocumentFile, openDocument, parseDocumentText } from '../src/index.js';

const ROOT = new URL('../../../', import.meta.url);

describe('loading', () => {
  it('reads JSON and YAML text', () => {
    expect(parseDocumentText('{"a": 1}')).toEqual({ a: 1 });
    expect(parseDocumentText('a: 1\nb:\n  - x', 'yaml')).toEqual({ a: 1, b: ['x'] });
    expect(parseDocumentText('name: x')).toEqual({ name: 'x' });
    expect(() => parseDocumentText('{oops', 'json')).toThrow(/Invalid JSON/);
    expect(() => parseDocumentText('just text')).toThrow(/not an object/);
  });

  it('loads the example files by path', () => {
    const path = decodeURIComponent(new URL('examples/minimal.json', ROOT).pathname);
    expect(openDocument(loadDocumentFile(path)).roots.has('settings-bar')).toBe(true);
  });

  it('openDocument throws with every error listed for an invalid document', () => {
    expect(() => openDocument({ name: 'x' })).toThrow(/Invalid document:[\s\S]*version/);
  });
});
