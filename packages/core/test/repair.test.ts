import { describe, expect, it } from 'vitest';
import { checkSchema, validateDocument, openDocument, eventsOf, find } from '../src/index.js';
import { clone, example, rawNode } from './helpers.js';

describe('schema and reuse regressions', () => {
  it('reports the missing type without unrelated requirements', () => {
    const doc = clone(example('minimal'));
    delete (doc.structures!['settings-bar'].root as Partial<{ type: string }>).type;
    expect(checkSchema(doc).map((error) => error.message)).toEqual(["must have required property 'type'"]);
  });

  it('accepts table and grid references without forbidden duplicate definitions', () => {
    const doc = clone(example('minimal'));
    doc.components.Table = { description: 'Table', structure: { id: 'table-definition', type: 'table', columns: [{ id: 'value' }] } };
    doc.components.Grid = { description: 'Grid', slots: [{ name: '' }], structure: { id: 'grid-definition', type: 'grid', tracks: { columns: 2 } } };
    doc.structures!['settings-bar'].root.children!.push(
      { id: 'table-instance', type: 'table', $ref: '#/components/Table' },
      { id: 'grid-instance', type: 'grid', $ref: '#/components/Grid', children: [{ id: 'grid-child', type: 'text', slot: '', placement: { column: 2 } }] },
    );
    expect(validateDocument(doc)).toEqual({ valid: true, errors: [] });
    rawNode(doc, 'grid-child').placement!.column = 3;
    expect(validateDocument(doc).errors.some((error) => error.rule === 'R10')).toBe(true);
  });

  it('resolves escaped component names and inherited handler chains', () => {
    const doc = clone(example('minimal'));
    doc.components['Action/Button'] = { description: 'Action', structure: { id: 'action-def', type: 'button', events: [{ event: 'click', handler: 'Button.onPress -> App.save', actions: ['submit'], effect: 'Saves changes.' }] } };
    doc.structures!['settings-bar'].root.children!.push({ id: 'save', type: 'button', $ref: '#/components/Action~1Button' });
    const opened = openDocument(doc);
    expect(eventsOf(opened, 'save')?.[0].effect).toBe('Saves changes.');
    expect(find(opened, { event: 'App.save' }).map((node) => node.id)).toContain('save');
    expect(find(opened, { component: 'Action/Button' }).map((node) => node.id)).toEqual(['save']);
    expect(opened.get('action-def')?.path).toBe('/components/Action~1Button/structure');
  });

  it('rejects undeclared components including prototype names', () => {
    const doc = clone(example('minimal'));
    rawNode(doc, 'settings-button').component = 'constructor';
    expect(validateDocument(doc).errors.some((error) => error.rule === 'R23')).toBe(true);
  });

  it('rejects structure and mixed reference cycles with a diagnostic', () => {
    const doc = clone(example('minimal'));
    doc.structures!['settings-bar'].root.children!.push({ id: 'recursive', type: 'container', $ref: '#/structures/settings-bar' });
    expect(validateDocument(doc).errors.some((error) => error.rule === 'R26')).toBe(true);
  });

  it('requires data.columns even before a repeated column has a rendered cell', () => {
    const doc = clone(example('containment'));
    rawNode(doc, 'results-table').columns!.push({ id: 'dynamic', repeat: true });
    expect(validateDocument(doc).errors.some((error) => error.rule === 'R6')).toBe(true);
  });

  it('validates inherited logical facts and component-level state declarations', () => {
    const doc = clone(example('containment'));
    rawNode(doc, 'dashboard-status').kind = 'logical';
    doc.components.StatusBadge.structure!.label = 'Status';
    delete rawNode(doc, 'dashboard-status').label;
    doc.components.StatusBadge.states = ['default', 'default', { name: 'empty', present: ['missing-child'] }];
    const rules = validateDocument(doc).errors.map((error) => error.rule);
    expect(rules).toContain('R3');
    expect(rules).toContain('R20');
    expect(rules).toContain('R21');
  });
});
