// Writes a store version into the built manifest. CI only; never committed.
// Usage: node scripts/stamp-version.mjs <version> [version_name]
import { readFileSync, writeFileSync } from 'node:fs';

const MANIFEST = new URL('../speed-reader-extension/manifest.json', import.meta.url);
const [version, versionName] = process.argv.slice(2);

// Chrome allows 1–4 dot-separated integers, each 0–65535, no leading zeros.
const isValidPart = (part) => /^(0|[1-9]\d*)$/.test(part) && Number(part) <= 65535;
const parts = (version ?? '').split('.');
if (parts.length < 1 || parts.length > 4 || !parts.every(isValidPart)) {
  console.error(`Invalid Chrome extension version: "${version}"`);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
manifest.version = version;
if (versionName) manifest.version_name = versionName;
else delete manifest.version_name;
writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`manifest version=${version}${versionName ? ` version_name=${versionName}` : ''}`);
