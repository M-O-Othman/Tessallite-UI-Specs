import { describe, expect, it } from 'vitest';
import { getCardIcon } from '../src/card-icons.js';
import types from '../../../vocabulary/node-types.md?raw';

const vocabularyTypes = [...types.matchAll(/^\| `([^`]+)`/gm)].map((match) => match[1]);

describe('card icon catalogue', () => {
  it('maps every vocabulary node type to a safe icon', () => {
    expect(vocabularyTypes).toHaveLength(43);
    for (const type of vocabularyTypes) {
      const icon = getCardIcon({ type });
      expect(icon.key, type).not.toBe('genericcomponent');
      expect(icon.paths.length, type).toBeGreaterThan(0);
    }
  });

  it('keeps requested type distinctions and applies semantic category overrides', () => {
    expect(getCardIcon({ type: 'text' }).key).toBe('text');
    expect(getCardIcon({ type: 'dialog' }).key).toBe('dialog');
    expect(getCardIcon({ type: 'container' }).key).toBe('surface');
    expect(getCardIcon({ type: 'container', category: 'structure' }).key).toBe('window');
    expect(getCardIcon({ type: 'dialog', category: 'structure' }).key).toBe('dialog');
    expect(getCardIcon({ type: 'drawer', category: 'structure' }).key).toBe('drawer');
    expect(getCardIcon({ type: 'button' }).key).toBe('button');
    expect(getCardIcon({ type: 'icon-button' }).key).toBe('icon-button');
    expect(getCardIcon({ type: 'button', category: 'event' }).key).toBe('event');
    expect(getCardIcon({ type: 'button', kind: 'logical' }).key).toBe('logical');
  });

  it('resolves section and category fallbacks without network content', () => {
    expect(getCardIcon({ category: 'component' }).key).toBe('component');
    expect(getCardIcon({ category: 'section', section: 'props' }).key).toBe('properties');
    expect(getCardIcon({ section: 'states' }).key).toBe('state');
    expect(getCardIcon({ section: 'data' }).key).toBe('data');
    expect(getCardIcon({ section: 'implementation' }).key).toBe('source');
    expect(getCardIcon({ type: 'custom:widget' }).key).toBe('genericcomponent');
    expect(getCardIcon({ type: 'custom:widget', category: 'component' }).key).toBe('genericcomponent');
    expect(getCardIcon(null as unknown as undefined).key).toBe('genericcomponent');
    expect(getCardIcon({ type: 'custom:widget' }).label).toBe('Component');
  });

  it('returns only valid 24 by 24 path data and fresh path arrays', () => {
    const icon = getCardIcon({ type: 'chart' });
    expect(Object.keys(icon).sort()).toEqual(['key', 'label', 'paths', 'viewBox']);
    expect(icon.viewBox).toBe('0 0 24 24');
    expect(icon.paths).toEqual(expect.arrayContaining([expect.stringMatching(/^[MmZzLlHhVvCcSsQqTtAaEeFfGg0-9,.\-\s]+$/)]));
    expect(icon.paths.some((path) => /<|>|url\(|https?:|javascript:/i.test(path))).toBe(false);
    const next = getCardIcon({ type: 'chart' });
    icon.paths.push('M0 0');
    expect(next.paths).not.toContain('M0 0');
  });
});
