import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const browserSourceRoots = [join(projectRoot, 'src', 'components'), join(projectRoot, 'src', 'app')];
const forbiddenPatterns = [
  { label: 'server configuration access', pattern: /process\.env\.(?:NIROG_[A-Z0-9_]+|CLERK_SECRET_KEY|DATABASE_URL)\b/ },
  { label: 'downstream authorization header', pattern: /authorization\s*:/i },
  { label: 'downstream bearer authorization', pattern: /bearer\s+/i },
];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === 'api' ? [] : sourceFiles(entryPath);
    return entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [entryPath] : [];
  });
}

describe('browser source server boundary', () => {
  it('keeps private server configuration and downstream bearer headers out of browser-rendered source', () => {
    const violations = browserSourceRoots.flatMap((directory) => sourceFiles(directory).flatMap((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      return forbiddenPatterns
        .filter(({ pattern }) => pattern.test(source))
        .map(({ label }) => `${relative(projectRoot, filePath)}: ${label}`);
    }));

    expect(violations).toEqual([]);
  });
});
