import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(
  readFileSync(new URL('../../speed-reader-extension/manifest.json', import.meta.url), 'utf8'),
);
const listing = readFileSync(new URL('../../store/listing.md', import.meta.url), 'utf8');

// The Chrome Web Store rejects uploads past these limits; catch them here instead.
test('manifest description fits the store 132-char limit', () => {
  assert.ok(manifest.description.length <= 132, `description is ${manifest.description.length} chars`);
});

test('manifest name fits the store 75-char limit', () => {
  assert.ok(manifest.name.length <= 75, `name is ${manifest.name.length} chars`);
});

// The manifest description is shown as the store summary, so keep it identical to the listing copy.
test('manifest description matches the summary in store/listing.md', () => {
  const summary = listing.match(/\*\*Summary \(≤132 chars\):\*\*\n(.+)/)?.[1];
  assert.equal(manifest.description, summary);
});
