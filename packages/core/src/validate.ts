import { SpecDocument } from './document.js';
import { checkSchema } from './schema.js';
import { checkSemantics } from './semantic.js';
import type { UiSpecDocument, ValidationResult } from './types.js';

/**
 * Validate a parsed document: schema first, then the semantic rules. Semantic
 * rules run only on a schema-valid document because they rely on its shape.
 */
export function validateDocument(raw: unknown): ValidationResult {
  const errors = checkSchema(raw);
  if (errors.length === 0) errors.push(...checkSemantics(new SpecDocument(raw as UiSpecDocument)));
  return { valid: errors.length === 0, errors };
}

/** Validate and index in one step; throws with every error listed when invalid. */
export function openDocument(raw: unknown): SpecDocument {
  const result = validateDocument(raw);
  if (!result.valid) {
    throw new Error(`Invalid document:\n${result.errors.map((e) => `  ${e.rule} ${e.path}: ${e.message}`).join('\n')}`);
  }
  return new SpecDocument(raw as UiSpecDocument);
}
