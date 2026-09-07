import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { viewHtml } from '../../cli/src/cli.js';
import viewerConfig from '../src/viewer-config.json';

const template = readFileSync(new URL('../dist/visualiser.html', import.meta.url), 'utf8');
const windows: Window[] = [];
const caption = 'Save <script>alert("unsafe")</script> & publish the complete quarterly report with all supporting details';
const doc = {
  name: 'Semantic cards', version: '1', description: 'Card presentation fixture.', components: {
    Save: { description: 'Save command.', structure: { id: 'save-definition', type: 'button', label: 'Save changes' } },
  },
  structures: { window: { description: 'Main surface.', root: { id: 'window', type: 'container', children: [
    { id: 'save', type: 'button', component: 'Save', label: caption, events: [{ event: 'click', handler: 'handleSave', actions: ['submit'], effect: 'Saves changes.' }] },
    { id: 'title', type: 'text', label: 'Quarterly report' },
    { id: 'dialog', type: 'dialog', label: 'Confirm changes', presentation: 'overlay' },
    { id: 'logical', type: 'group', kind: 'logical' },
    { id: 'icon', type: 'icon-button', label: 'Refresh', icon: 'https://example.invalid/never-load.svg' },
  ] } } },
};

async function open() {
  const window = new Window({ settings: { enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true } });
  windows.push(window); window.document.write(viewHtml(doc, template));
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  await window.happyDOM.whenAsyncComplete();
  return window;
}

afterEach(async () => { await Promise.all(windows.splice(0).map(w => w.happyDOM.close())); });

describe('exported semantic cards', () => {
  it('renders type and event icons with a bounded literal preview and full accessible text', async () => {
    const window = await open(); const page = window.document;
    expect(page.querySelector('#errors')?.textContent).toBe('');
    expect(page.querySelector('.card.structure .type-icon')?.getAttribute('data-icon')).toBe('window');
    const card = page.querySelector('.card.component')!;
    expect(card.querySelector('.type-icon')?.getAttribute('data-icon')).toBe('button');
    expect(card.querySelector('.event-icon')?.getAttribute('data-icon')).toBe('event');
    expect(card.getAttribute('aria-label')).toContain(caption);
    expect(card.querySelector('title')?.textContent).toContain(caption);
    expect(card.querySelectorAll('.static-preview')).toHaveLength(2);
    expect(card.querySelectorAll('.static-preview')[1].textContent).toMatch(/…$/);
    expect(card.querySelector(':scope > rect')?.getAttribute('height')).toBe(String(viewerConfig.card.content.previewHeight));
    expect(card.querySelector('script')).toBeNull();
    expect(card.querySelector('.semantic-icon')?.getAttribute('aria-hidden')).toBe('true');
    card.querySelector('.type-icon path')!.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(page.querySelector('#detail')?.textContent).toContain(caption);
    expect(page.querySelector('#detail .static-text')?.textContent).toBe(caption);
    expect(page.querySelector('#detail script')).toBeNull();
    expect(page.querySelector('.card.selected')).not.toBeNull();
  });

  it('uses semantic icons in Structures and event detail cards without fetching authored icon URLs', async () => {
    const window = await open(); const page = window.document;
    const mode = page.querySelector<HTMLInputElement>('input[value="structures"]')!;
    mode.checked = true; mode.dispatchEvent(new window.Event('change'));
    for (const [id, icon] of [['title', 'text'], ['dialog', 'dialog'], ['logical', 'logical'], ['icon', 'icon-button']]) {
      expect(page.querySelector(`.card[data-id="entry:${id}"] .type-icon`)?.getAttribute('data-icon')).toBe(icon);
    }
    const icon = page.querySelector('.card[data-id="entry:icon"]')!;
    expect(icon.textContent).toContain('Accessible name: Refresh');
    expect(icon.querySelector('[href], [src], image')).toBeNull();
    const details = page.querySelector<HTMLInputElement>('#show-details')!;
    details.checked = true; details.dispatchEvent(new window.Event('change'));
    page.querySelector('.card[data-id="entry:save"] .toggle')!.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(page.querySelector('.card[data-id="entry:save#events"] .type-icon')?.getAttribute('data-icon')).toBe('event');
    page.querySelector('.card[data-id="entry:save#events"] .toggle')!.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(page.querySelector('.card[data-id="entry:save#events.0"] .type-icon')?.getAttribute('data-icon')).toBe('event');
  });
});
