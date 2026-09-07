/**
 * Minimal ambient declarations for the Node.js surface this repository uses.
 * @types/node is not an approved dependency for v0.1; this file declares only
 * what the packages call. Replace with @types/node once approved (see
 * docs/questions/ui-spec-open-questions.md, follow-up questions).
 */

declare module 'node:fs' {
  export function readFileSync(path: string | URL, encoding: 'utf8'): string;
  export function writeFileSync(path: string | URL, data: string): void;
}

declare module 'node:path' {
  export function extname(path: string): string;
  export function resolve(...segments: string[]): string;
}

declare class URL {
  constructor(url: string, base?: string | URL);
  readonly href: string;
  readonly pathname: string;
}

interface ImportMeta {
  readonly url: string;
}

declare const console: {
  log(...args: unknown[]): void;
  error(...args: unknown[]): void;
};

declare const process: {
  argv: string[];
  exitCode: number | undefined;
  exit(code?: number): never;
};
