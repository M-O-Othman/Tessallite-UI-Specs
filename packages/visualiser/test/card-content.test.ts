import { describe, expect, it } from 'vitest';
import { buildModel, childrenOf, entryVnode, componentVnode, rootsOf } from '../src/model.js';
import { cardPresentation, cardText } from '../src/card-content.js';

function setup(root: object, components = {}) {
  const model = buildModel({ name: 'Cards', version: '1', components, structures: { screen: { root } } });
  return { model, vnode: entryVnode(model.structureRoots[0]) };
}

describe('card content from authored UI facts', () => {
  it('shows literal captions, without changing the document or repeating its text child', () => {
    const root = { id: 'save', type: 'button', label: 'Save changes', children: [{ id: 'caption', type: 'text', label: 'Save changes' }] };
    const before = JSON.stringify(root);
    const { model, vnode } = setup(root);
    expect(cardText(vnode, model).text).toEqual(['Save changes']);
    expect(cardPresentation(vnode, model).ariaLabel).toContain('Save changes');
    expect(JSON.stringify(root)).toBe(before);
  });

  it('collects inline text through logical wrappers but not nested controls or conditional/repeated content', () => {
    const { model, vnode } = setup({ id: 'button', type: 'button', children: [
      { id: 'wrap', type: 'group', kind: 'logical', children: [{ id: 'caption', type: 'text', label: 'Save' }] },
      { id: 'conditional', type: 'text', label: 'Saving', condition: 'busy' },
      { id: 'repeated', type: 'text', label: 'Item', repeat: true },
      { id: 'menu', type: 'menu', presentation: 'overlay', children: [{ id: 'remove', type: 'menu-item', label: 'Delete' }] },
      { id: 'other', type: 'button', label: 'Unrelated' },
    ] });
    expect(cardText(vnode, model).text).toEqual(['Save']);
  });

  it('does not mistake names, i18n keys, dynamic data, prop schemas or default prop declarations for static text', () => {
    const { model, vnode } = setup({ id: 'bound', type: 'text', name: 'currentLabel', i18n: 'ui.label', data: { text: 'record.label' } });
    expect(cardText(vnode, model).text).toEqual([]);
    const { model: definitions } = setup({ id: 'root', type: 'container' }, {
      Label: { description: 'Label', props: { label: { type: 'string', default: 'Example only' } } },
    });
    expect(cardText(componentVnode(definitions.cards.get('Label')), definitions).text).toEqual([]);
    const keyOnly = setup({ id: 'key', type: 'text', label: 'ui.label', i18n: 'ui.label' });
    expect(cardText(keyOnly.vnode, keyOnly.model).text).toEqual([]);
  });

  it('shows resolved translated text and literal instance props; excludes bound props', () => {
    const translated = setup({ id: 't', type: 'text', label: 'Welcome', i18n: 'ui.welcome' });
    expect(cardText(translated.vnode, translated.model).text).toEqual(['Welcome']);
    const instance = setup({ id: 'p', type: 'text', props: { text: 'Literal' } });
    expect(cardText(instance.vnode, instance.model).text).toEqual(['Literal']);
    instance.vnode.entry.node.data = { text: 'model.text' };
    expect(cardText(instance.vnode, instance.model).text).toEqual([]);
  });

  it('distinguishes an icon accessible name from visible text', () => {
    const { model, vnode } = setup({ id: 'save', type: 'icon-button', label: 'Save', icon: 'https://example.invalid/icon.svg' });
    expect(cardText(vnode, model)).toEqual({ text: [], accessibleName: 'Save' });
    expect(cardPresentation(vnode, model).preview).toBe('Accessible name: Save');
  });

  it('resolves component root content, a reference override and escaped component names in both views', () => {
    const components = { 'Save/Action': { description: 'Save button', structure: { id: 'def', type: 'button', label: 'Save' } } };
    const { model, vnode } = setup({ id: 'instance', type: 'container', $ref: '#/components/Save~1Action', label: 'Save copy' }, components);
    expect(cardText(vnode, model).text).toEqual(['Save copy']);
    const component = childrenOf(rootsOf(model, 'components')[0], model).find((v: any) => v.kind === 'component');
    expect(cardText(component, model).text).toEqual(['Save copy']);
    expect(cardText(componentVnode(model.cards.get('Save/Action')), model).text).toEqual(['Save']);
    expect(cardPresentation(vnode, model).icon.key).toBe('button');
  });

  it('shows text from a single neutral component wrapper and inline referenced text', () => {
    const components = {
      Action: { description: 'Action', structure: { id: 'wrapper', type: 'container', children: [{ id: 'actual', type: 'button', label: 'Publish' }] } },
      Caption: { description: 'Caption', structure: { id: 'caption-root', type: 'text', label: 'Deploy' } },
    };
    const own = setup({ id: 'instance', type: 'container', component: 'Action' }, components);
    expect(cardText(own.vnode, own.model).text).toEqual(['Publish']);
    const inline = setup({ id: 'b', type: 'button', children: [{ id: 'label', type: 'text', $ref: '#/components/Caption' }] }, components);
    expect(cardText(inline.vnode, inline.model).text).toEqual(['Deploy']);
  });

  it('literal instance props replace definition bindings without evaluating expressions', () => {
    const components = { Label: { description: 'Label', structure: { id: 'definition', type: 'text', data: { label: 'props.label' } } } };
    const literal = setup({ id: 'instance', type: 'text', $ref: '#/components/Label', props: { label: 'Published' } }, components);
    expect(cardText(literal.vnode, literal.model).text).toEqual(['Published']);
    const dynamic = setup({ id: 'instance', type: 'text', $ref: '#/components/Label', data: { label: 'project.name' } }, components);
    expect(cardText(dynamic.vnode, dynamic.model).text).toEqual([]);
  });

  it('terminates on recursive component anatomy and preserves repeated labels within a caption', () => {
    const components = { Tree: { description: 'Tree', structure: { id: 'def', type: 'container', component: 'Tree' } } };
    const recursive = setup({ id: 'instance', type: 'container', component: 'Tree' }, components);
    expect(cardText(recursive.vnode, recursive.model).text).toEqual([]);
    const repeated = setup({ id: 'button', type: 'button', children: [{ id: 'one', type: 'text', label: 'Go' }, { id: 'two', type: 'text', label: 'Go' }] });
    expect(cardText(repeated.vnode, repeated.model).text).toEqual(['Go', 'Go']);
  });

  it('assigns semantic event icons to event sections and items; interactive cards keep their type', () => {
    const { model, vnode } = setup({ id: 'save', type: 'button', label: 'Save', events: [{ event: 'click', handler: 'save', actions: ['submit'], effect: 'Saves.' }] });
    const card = cardPresentation(vnode, model);
    expect(card.icon.key).toBe('button'); expect(card.eventCount).toBe(1);
    const events = childrenOf(vnode, model).find((v: any) => v.section === 'events');
    expect(cardPresentation(events, model).icon.key).toBe('event');
    expect(cardPresentation(childrenOf(events, model)[0], model).icon.key).toBe('event');
  });
});
