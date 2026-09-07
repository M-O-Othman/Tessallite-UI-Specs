import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';
import { viewHtml } from '../../cli/src/cli.js';
import { example } from '../../core/test/helpers.js';
import { validateDocument } from '../../core/src/index.js';
import { parseInput, validateInput } from '../src/validation.js';

const windows: Window[] = [];
const template = readFileSync(new URL('../dist/visualiser.html', import.meta.url), 'utf8');

type FileStub = { name: string; text: () => Promise<string> };

function yamlDocument(name: string) {
  return `name: ${JSON.stringify(name)}
version: "1"
description: Loaded from YAML
components:
  LoadedButton:
    description: Button loaded from YAML
structures:
  loaded-screen:
    description: Loaded screen
    root:
      id: loaded-root
      type: container
      name: Loaded root
      children:
        - id: loaded-button
          type: button
          component: LoadedButton
          label: Loaded action
`;
}

function selectFile(window: Window, file: FileStub) {
  const input = window.document.querySelector<HTMLInputElement>('#file')!;
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  input.dispatchEvent(new window.Event('change', { bubbles: true }));
  return input;
}

async function finishFileRead() {
  // readFile awaits file.text() before it parses, validates and redraws.
  await Promise.resolve();
  await Promise.resolve();
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function graphTransform(document: Document) {
  const value = document.querySelector('.viewport')?.getAttribute('transform') || '';
  const match = value.match(/^translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+)\)$/);
  if (!match) throw new Error(`Unexpected graph transform: ${value}`);
  return { x: Number(match[1]), y: Number(match[2]), scale: Number(match[3]) };
}

async function open(raw: unknown = example('minimal'), setup?: (window: Window) => void) {
  // Execute only our locally built application code. Fixture content is embedded as inert JSON.
  const window = new Window({ settings: { enableJavaScriptEvaluation: true, suppressInsecureJavaScriptEnvironmentWarning: true } });
  windows.push(window);
  setup?.(window);
  window.document.write(viewHtml(raw, template));
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  await window.happyDOM.whenAsyncComplete();
  return window;
}
afterEach(async () => { await Promise.all(windows.splice(0).map((window) => window.happyDOM.close())); });

describe('exported viewer interactions in a DOM environment', () => {
  it('loads embedded data and presents readable behaviour when selecting a card', async () => {
    const window = await open();
    const doc = window.document;
    expect(doc.querySelector('#errors')?.textContent).toBe('');
    expect(doc.querySelector('#status')?.textContent).toContain('Valid document');
    const card = doc.querySelector('.card.component')!;
    card.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(doc.querySelector('#detail-title')?.textContent).toBe('Button');
    expect(doc.querySelector('#detail')?.textContent).toContain('Opens the settings menu.');
    const target = doc.querySelector<HTMLButtonElement>('.target')!;
    target.click();
    expect(doc.querySelector('#view-title')?.textContent).toBe('UI structure');
    expect(doc.querySelector('#detail-title')?.textContent).toBe('settings-menu');
    expect(doc.querySelector('.card.selected')?.getAttribute('data-id')).toBe('entry:settings-menu');
  });

  it('searches handlers, navigates a result and accounts for hidden overlays', async () => {
    const window = await open();
    const doc = window.document;
    const radio = doc.querySelector<HTMLInputElement>('input[value="structures"]')!;
    radio.checked = true; radio.dispatchEvent(new window.Event('change'));
    const search = doc.querySelector<HTMLInputElement>('#search')!;
    search.value = 'onLogout'; search.dispatchEvent(new window.Event('input'));
    expect(doc.querySelector('#hits')?.textContent).toBe('1 results');
    doc.querySelector<HTMLButtonElement>('#search-results button')!.click();
    expect(doc.querySelector('#detail')?.textContent).toContain('signs the user out');
    const filter = doc.querySelector<HTMLInputElement>('[data-filter="hideOverlays"]')!;
    filter.checked = true; filter.dispatchEvent(new window.Event('change'));
    expect(doc.querySelector('#hits')?.textContent).toContain('0 results · 1 hidden');
    expect(doc.querySelectorAll('#search-results button')).toHaveLength(0);
  });

  it('collapses every branch and keeps zoom transforms finite on a small viewport', async () => {
    const window = await open(example('containment'));
    const doc = window.document;
    doc.querySelector<HTMLButtonElement>('#collapse-all')!.click();
    expect(doc.querySelectorAll('.card')).toHaveLength(1);
    doc.querySelector<HTMLButtonElement>('#fit')!.click();
    expect(doc.querySelector('.viewport')?.getAttribute('transform')).not.toMatch(/NaN|Infinity|scale\(-/);
    doc.querySelector<HTMLButtonElement>('#reset-zoom')!.click();
    expect(doc.querySelector('.viewport')?.getAttribute('transform')).toContain('scale(1)');
  });

  it('keeps graph controls, guidance, counts and live status in one compact header', async () => {
    const window = await open();
    const doc = window.document;
    const header = doc.querySelector<HTMLElement>('.graph-header')!;
    const primary = header.querySelector('.graph-primary')!;
    const metadata = header.querySelector('.graph-meta')!;

    expect(primary.querySelector('#view-title')).not.toBeNull();
    for (const selector of ['#depth', '#depth-apply', '#collapse-all', '#maximise-view', '#fit', '#zoom-out', '#zoom-in', '#reset-zoom']) {
      expect(primary.querySelector(selector), `${selector} should remain in the graph header`).not.toBeNull();
    }
    for (const selector of ['#view-description', '.graph-hint', '#visible-count', '#status']) {
      expect(metadata.querySelector(selector), `${selector} should remain in the graph metadata row`).not.toBeNull();
    }
    expect(metadata.querySelector('#status')?.getAttribute('role')).toBe('status');
    expect(metadata.querySelector('#status')?.getAttribute('aria-live')).toBe('polite');
    expect(header.nextElementSibling?.classList.contains('canvas-wrap')).toBe(true);
    expect(doc.querySelector('.canvas-footer')).toBeNull();
    expect(doc.querySelector('body > #status')).toBeNull();
  });

  it('stays on the white Tessallite theme when the operating system prefers dark', async () => {
    const window = await open(example('minimal'), (target) => {
      Object.defineProperty(target, 'matchMedia', {
        configurable: true,
        value: vi.fn((query: string) => ({ matches: query === '(prefers-color-scheme: dark)', media: query })),
      });
    });
    const doc = window.document;

    expect(window.getComputedStyle(doc.body).backgroundColor).toBe('#FFFFFF');
    expect(window.getComputedStyle(doc.body).color).toBe('#333333');
    expect(doc.querySelector('.brand picture')).toBeNull();
    expect(doc.querySelector('.brand source')).toBeNull();
    expect(doc.querySelector<HTMLImageElement>('.brand img')?.alt).toBe('Tessallite');
  });

  it('maximises and restores the graph without losing selection, expansion or zoom', async () => {
    const window = await open(example('containment'));
    const doc = window.document;
    expect(window.getComputedStyle(doc.body).overflow).toBe('hidden');
    expect(window.getComputedStyle(doc.querySelector('.navigation')!).overflowY).toBe('auto');
    expect(window.getComputedStyle(doc.querySelector('.side')!).overflowY).toBe('auto');
    expect(window.getComputedStyle(doc.querySelector('.canvas')!).height).toBe('100%');
    doc.querySelector('.card .toggle')!.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    doc.querySelector<HTMLButtonElement>('#zoom-in')!.click();
    const selected = doc.querySelector('.card.selected')?.getAttribute('data-id');
    const cards = Array.from(doc.querySelectorAll('.card'), (card) => card.getAttribute('data-id'));
    const scale = graphTransform(doc).scale;
    const control = doc.querySelector<HTMLButtonElement>('#maximise-view')!;
    const status = doc.querySelector<HTMLElement>('#status')!;
    const statusText = status.textContent;

    expect(control.closest('.graph-toolbar')).not.toBeNull();
    control.click();
    expect(doc.body.classList.contains('view-maximised')).toBe(true);
    expect(control.getAttribute('aria-pressed')).toBe('true');
    expect(control.getAttribute('aria-label')).toBe('Restore graph view');
    expect(control.textContent).toBe('Restore view');
    for (const selector of ['.app-header', '.navigation', '.side']) expect((doc.querySelector(selector) as HTMLElement).hidden).toBe(true);
    expect(status.hidden).toBe(false);
    expect(status.closest('.graph-header')).not.toBeNull();
    expect(status.textContent).toBe(statusText);
    expect(doc.querySelector('.card.selected')?.getAttribute('data-id')).toBe(selected);
    expect(Array.from(doc.querySelectorAll('.card'), (card) => card.getAttribute('data-id'))).toEqual(cards);
    expect(graphTransform(doc).scale).toBe(scale);

    doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(doc.body.classList.contains('view-maximised')).toBe(false);
    expect(control.getAttribute('aria-pressed')).toBe('false');
    expect(control.getAttribute('aria-label')).toBe('Maximise graph view');
    expect(control.textContent).toBe('Maximise view');
    expect(doc.activeElement).toBe(control);
    for (const selector of ['.app-header', '.navigation', '.side']) expect((doc.querySelector(selector) as HTMLElement).hidden).toBe(false);
    expect(status.hidden).toBe(false);
    expect(status.textContent).toBe(statusText);
    expect(doc.querySelector('.card.selected')?.getAttribute('data-id')).toBe(selected);
    expect(Array.from(doc.querySelectorAll('.card'), (card) => card.getAttribute('data-id'))).toEqual(cards);
    expect(graphTransform(doc).scale).toBe(scale);
  });

  it('pans the graph with an ordinary wheel while side-panel wheel remains native', async () => {
    const window = await open();
    const doc = window.document;
    const canvas = doc.querySelector<SVGElement>('#canvas')!;
    const before = graphTransform(doc);
    const pan = new window.WheelEvent('wheel', { deltaX: 17, deltaY: 29, bubbles: true, cancelable: true });

    canvas.dispatchEvent(pan);
    const after = graphTransform(doc);
    expect(pan.defaultPrevented).toBe(true);
    expect(after.x).toBe(before.x - 17);
    expect(after.y).toBe(before.y - 29);
    expect(after.scale).toBe(before.scale);

    const panelWheel = new window.WheelEvent('wheel', { deltaY: 29, bubbles: true, cancelable: true });
    doc.querySelector('.side')!.dispatchEvent(panelWheel);
    expect(panelWheel.defaultPrevented).toBe(false);
    expect(graphTransform(doc)).toEqual(after);
  });

  it('observes canvas size changes and refits when Fit was the last view action', async () => {
    let notifyResize = () => {};
    const observe = vi.fn();
    const window = await open(example('minimal'), (target) => {
      class TestResizeObserver {
        constructor(callback: ResizeObserverCallback) { notifyResize = () => callback([], this as unknown as ResizeObserver); }
        observe = observe;
        disconnect() {}
        unobserve() {}
      }
      Object.defineProperty(target, 'ResizeObserver', { configurable: true, value: TestResizeObserver });
    });
    const doc = window.document;
    const canvas = doc.querySelector<SVGElement>('#canvas')!;
    let size = { width: 400, height: 300 };
    Object.defineProperty(canvas, 'getBoundingClientRect', { configurable: true, value: () => ({ ...size, x: 0, y: 0, top: 0, left: 0, right: size.width, bottom: size.height }) });
    expect(observe).toHaveBeenCalledWith(canvas);

    doc.querySelector<HTMLButtonElement>('#fit')!.click();
    const before = graphTransform(doc);
    size = { width: 800, height: 600 };
    notifyResize();
    const after = graphTransform(doc);
    expect(after.scale).toBeGreaterThan(before.scale);
    expect(after.scale).toBeLessThanOrEqual(1.5);
  });

  it('rejects malformed embedded documents with actionable errors', async () => {
    const window = await open({ name: 'broken' });
    expect(window.document.querySelector('#errors')?.textContent).toContain("required property 'components'");
    expect(window.document.querySelectorAll('.card')).toHaveLength(0);
  });

  it('treats injected markup in document labels as text', async () => {
    const raw = example('minimal');
    raw.name = '</script><script>globalThis.compromised=true</script>';
    const window = await open(raw);
    expect(window.document.querySelector('#document-name')?.textContent).toBe(raw.name);
    expect((window as unknown as { compromised?: boolean }).compromised).toBeUndefined();
  });

  it('loads a valid YAML file through the file input change handler', async () => {
    const window = await open();
    const file = { name: 'loaded.yaml', text: vi.fn().mockResolvedValue(yamlDocument('Loaded YAML')) };

    selectFile(window, file);
    await finishFileRead();

    expect(file.text).toHaveBeenCalledOnce();
    expect(window.document.querySelector('#document-name')?.textContent).toBe('Loaded YAML');
    expect(window.document.querySelector('#status')?.textContent).toContain('loaded.yaml · Valid document');
    expect(window.document.querySelector<HTMLElement>('#errors')?.hidden).toBe(true);
  });

  it('keeps the prior valid document when a malformed replacement is selected', async () => {
    const window = await open();
    selectFile(window, { name: 'valid.yaml', text: async () => yamlDocument('Prior valid document') });
    await finishFileRead();
    const priorMeta = window.document.querySelector('#document-meta')?.textContent;
    const priorCards = Array.from(window.document.querySelectorAll('.card'), (card) => card.getAttribute('data-id'));

    selectFile(window, { name: 'broken.yaml', text: async () => 'name: [unterminated' });
    await finishFileRead();

    expect(window.document.querySelector('#errors')?.textContent).toContain('Cannot read broken.yaml');
    expect(window.document.querySelector<HTMLElement>('#errors')?.hidden).toBe(false);
    expect(window.document.querySelector('#document-name')?.textContent).toBe('Prior valid document');
    expect(window.document.querySelector('#document-meta')?.textContent).toBe(priorMeta);
    expect(Array.from(window.document.querySelectorAll('.card'), (card) => card.getAttribute('data-id'))).toEqual(priorCards);
  });

  it('keeps the newest selection when asynchronous file reads finish out of order', async () => {
    const window = await open();
    const older = deferred<string>();
    const newer = deferred<string>();

    selectFile(window, { name: 'older.yaml', text: () => older.promise });
    selectFile(window, { name: 'newer.yaml', text: () => newer.promise });
    newer.resolve(yamlDocument('Newest selection'));
    await finishFileRead();
    expect(window.document.querySelector('#document-name')?.textContent).toBe('Newest selection');

    older.resolve(yamlDocument('Stale selection'));
    await finishFileRead();
    expect(window.document.querySelector('#document-name')?.textContent).toBe('Newest selection');
    expect(window.document.querySelector('#status')?.textContent).toContain('newer.yaml · Valid document');
  });

  it('clears the file input so the same file can be selected again', async () => {
    const window = await open();
    const file = {
      name: 'same.yaml',
      text: vi.fn()
        .mockResolvedValueOnce(yamlDocument('First read'))
        .mockResolvedValueOnce(yamlDocument('Second read')),
    };

    const input = selectFile(window, file);
    await finishFileRead();
    expect(input.value).toBe('');
    expect(window.document.querySelector('#document-name')?.textContent).toBe('First read');

    selectFile(window, file);
    await finishFileRead();
    expect(file.text).toHaveBeenCalledTimes(2);
    expect(input.value).toBe('');
    expect(window.document.querySelector('#document-name')?.textContent).toBe('Second read');
  });
});

describe('offline validation parity', () => {
  it('uses the same schema and semantic results as the CLI', () => {
    for (const raw of [example('minimal'), example('containment'), { name: 'broken' }, { ...example('minimal'), components: {} }]) {
      expect(validateInput(raw)).toEqual(validateDocument(raw));
    }
  });
  it('accepts YAML as well as JSON', () => {
    const text = 'name: Sample\nversion: "1"\ndescription: Sample\ncomponents: {}\n';
    expect(validateInput(parseInput(text, 'sample.yaml')).valid).toBe(true);
    expect(() => parseInput('{broken', 'sample.json')).toThrow();
  });
});
