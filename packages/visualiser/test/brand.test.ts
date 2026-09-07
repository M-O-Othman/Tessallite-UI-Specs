import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('offline brand assets', () => {
  it('embeds only the official primary logo without external image requests', () => {
    const page = readFileSync(new URL('../dist/visualiser.html', import.meta.url), 'utf8');
    const primary = readFileSync(new URL('../assets/logo-primary.svg', import.meta.url));
    const brand = page.match(/<a class="brand".*?<\/a>/s)?.[0];

    expect(brand).toContain(`data:image/svg+xml;base64,${primary.toString('base64')}`);
    expect(brand).toContain('alt="Tessallite"');
    expect(page.match(/<img\b/g)).toHaveLength(1);
    expect(page).not.toContain('<picture>');
    expect(page).not.toContain('<source');
    expect(page).not.toContain('prefers-color-scheme: dark');
    expect(page).toContain('color-scheme: only light');
    expect(page).toContain('--bg: #FFFFFF');
    expect(page).not.toMatch(/\/\*BRAND_(PRIMARY|LIGHT|DARK)\*\//);
  });
});
