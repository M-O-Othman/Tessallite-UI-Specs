import { describe, expect, it } from 'vitest';
import { checkSchema, validateDocument } from '../src/index.js';
import { clone, example, rawNode } from './helpers.js';

describe('schema: valid fixtures', () => {
  it('accepts minimal.json and containment.json', () => {
    expect(checkSchema(example('minimal'))).toEqual([]);
    expect(checkSchema(example('containment'))).toEqual([]);
  });

  it('accepts a plain OpenUI document without structures', () => {
    expect(checkSchema({ name: 'lib', version: '1.0.0', description: 'd', components: { Button: { description: 'b', props: { variant: 'string' } } } })).toEqual([]);
  });

  it('accepts the x- compatibility spelling', () => {
    const doc = clone(example('containment')) as unknown as Record<string, unknown>;
    doc['x-structures'] = doc.structures;
    delete doc.structures;
    const components = doc.components as Record<string, Record<string, unknown>>;
    for (const component of Object.values(components)) {
      for (const key of ['events', 'states', 'slots', 'structure']) {
        if (component[key] !== undefined) {
          component[`x-${key}`] = component[key];
          delete component[key];
        }
      }
    }
    expect(checkSchema(doc)).toEqual([]);
    expect(validateDocument(doc).valid).toBe(true);
  });
});

describe('schema: invalid fixtures', () => {
  const rules = (doc: unknown) => checkSchema(doc).map((e) => `${e.path}: ${e.message}`);

  it('rejects a document missing the OpenUI envelope', () => {
    expect(rules({ name: 'x' })).toContainEqual(expect.stringContaining("required property 'version'"));
  });

  it('rejects both spellings of structures at once', () => {
    const doc = clone(example('minimal')) as unknown as Record<string, unknown>;
    doc['x-structures'] = doc.structures;
    expect(checkSchema(doc).length).toBeGreaterThan(0);
  });

  it('rejects a node without id or type', () => {
    const doc = clone(example('minimal'));
    delete (doc.structures!['settings-bar'].root as Partial<{ type: string }>).type;
    expect(rules(doc)).toContainEqual(expect.stringContaining("required property 'type'"));
  });

  it('rejects an unknown node type, state and action', () => {
    const doc = clone(example('minimal'));
    rawNode(doc, 'settings-icon').type = 'glyph';
    rawNode(doc, 'settings-button').states = ['sparkling'];
    rawNode(doc, 'settings-button').events![0].actions = ['launch'];
    const errors = rules(doc);
    expect(errors.some((e) => e.endsWith('/type: must match a schema in anyOf'))).toBe(true);
    expect(errors.some((e) => e.includes('/states/0'))).toBe(true);
    expect(errors.some((e) => e.includes('/actions/0'))).toBe(true);
  });

  it('accepts custom:<name> for type, state and action', () => {
    const doc = clone(example('minimal'));
    rawNode(doc, 'settings-icon').type = 'custom:glyph';
    rawNode(doc, 'settings-button').states = ['custom:sparkling'];
    rawNode(doc, 'settings-button').events![0].actions = ['custom:launch'];
    expect(rules(doc)).toEqual([]);
  });

  it('rejects an icon without a label', () => {
    const doc = clone(example('minimal'));
    delete rawNode(doc, 'settings-icon').label;
    expect(rules(doc)).toContainEqual(expect.stringContaining("required property 'label'"));
  });

  it('rejects a table without columns, a grid without tracks and a cell without column', () => {
    const doc = clone(example('containment'));
    delete rawNode(doc, 'results-table').columns;
    delete rawNode(doc, 'kpi-grid').tracks;
    delete rawNode(doc, 'results-cell-name').column;
    const errors = rules(doc);
    expect(errors).toContainEqual(expect.stringContaining("required property 'columns'"));
    expect(errors).toContainEqual(expect.stringContaining("required property 'tracks'"));
    expect(errors).toContainEqual(expect.stringContaining("required property 'column'"));
  });

  it('rejects an overlay type without presentation: overlay', () => {
    const doc = clone(example('minimal'));
    delete rawNode(doc, 'settings-menu').presentation;
    expect(rules(doc)).toContainEqual(expect.stringContaining("required property 'presentation'"));
  });

  it('rejects a logical node with a label or events', () => {
    const doc = clone(example('containment'));
    const node = rawNode(doc, 'dashboard-header');
    node.kind = 'logical';
    node.label = 'Header';
    expect(rules(doc).length).toBeGreaterThan(0);
  });

  it('rejects an event without actions or effect, and an empty actions list', () => {
    const doc = clone(example('minimal'));
    const event = rawNode(doc, 'settings-menu-sign-out').events![0];
    event.actions = [];
    delete (event as Partial<{ effect: string }>).effect;
    const errors = rules(doc);
    expect(errors).toContainEqual(expect.stringContaining('must NOT have fewer than 1 items'));
    expect(errors).toContainEqual(expect.stringContaining("required property 'effect'"));
  });

  it('rejects visual fields: there is no width, colour or position', () => {
    const doc = clone(example('minimal'));
    Object.assign(rawNode(doc, 'settings-button'), { width: 120, color: '#fff' });
    const errors = rules(doc);
    expect(errors).toContainEqual(expect.stringContaining('unknown field "width"'));
    expect(errors).toContainEqual(expect.stringContaining('unknown field "color"'));
  });

  it('rejects a malformed $ref and a bad id', () => {
    const doc = clone(example('containment'));
    rawNode(doc, 'dashboard-status').$ref = 'StatusBadge';
    rawNode(doc, 'dashboard-title').id = '1-title';
    const errors = rules(doc);
    expect(errors.some((e) => e.includes('/$ref'))).toBe(true);
    expect(errors.some((e) => e.includes('/id'))).toBe(true);
  });
});
