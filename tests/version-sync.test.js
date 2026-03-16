import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const refVersion = JSON.parse(
  readFileSync(join(root, 'package.json'), 'utf-8')
).version;

function getOpenApiVersion(content) {
  const m = content.match(/\binfo:\s*\n[\s\S]*?version:\s*["']?([^"'\s\n]+)["']?/);
  return m ? m[1] : null;
}

function getChartVersions(content) {
  const versionMatch = content.match(/^version:\s*["']?([^"'\s\n]+)["']?/m);
  const appVersionMatch = content.match(/^appVersion:\s*["']?([^"'\s\n]+)["']?/m);
  return {
    version: versionMatch ? versionMatch[1] : null,
    appVersion: appVersionMatch ? appVersionMatch[1] : null,
  };
}

describe('Version sync (reference: package.json)', () => {
  it('public/docs/crash-test-api.yaml info.version matches package.json', () => {
    const content = readFileSync(
      join(root, 'public', 'docs', 'crash-test-api.yaml'),
      'utf-8'
    );
    const apiVersion = getOpenApiVersion(content);
    expect(apiVersion).toBe(refVersion);
  });

  it('charts/crash-test/Chart.yaml version and appVersion match package.json', () => {
    const content = readFileSync(
      join(root, 'charts', 'crash-test', 'Chart.yaml'),
      'utf-8'
    );
    const { version, appVersion } = getChartVersions(content);
    expect(version).toBe(refVersion);
    expect(appVersion).toBe(refVersion);
  });
});
