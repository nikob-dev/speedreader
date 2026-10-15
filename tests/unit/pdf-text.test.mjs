import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../speed-reader-extension/pdf-text.js', import.meta.url), 'utf8');
const sandbox = {};
vm.runInNewContext(source, sandbox);
const { joinPdfTextItems } = sandbox.SRPdfText;

const line = (str) => ({ str, hasEOL: true });
const run = (str) => ({ str, hasEOL: false });

test('joinPdfTextItems puts a space where a line ends', () => {
  assert.equal(joinPdfTextItems([[line('first line'), line('second line')]]), 'first line second line');
});

test('joinPdfTextItems concatenates items within a line as given', () => {
  assert.equal(joinPdfTextItems([[run('Hello '), run('world'), line('.')]]), 'Hello world.');
});

test('joinPdfTextItems rejoins a word hyphenated across lines', () => {
  assert.equal(joinPdfTextItems([[line('a hyphen-'), line('ated word')]]), 'a hyphenated word');
});

test('joinPdfTextItems keeps a line-final dash before a non-lowercase start', () => {
  assert.equal(joinPdfTextItems([[line('from 1990-'), line('2000 and A-'), line('B')]]), 'from 1990- 2000 and A- B');
});

test('joinPdfTextItems separates pages with a blank line and drops empty pages', () => {
  assert.equal(joinPdfTextItems([[line('page one')], [line('  ')], [line('page two')]]), 'page one\n\npage two');
});

test('joinPdfTextItems returns an empty string for a PDF with no text', () => {
  assert.equal(joinPdfTextItems([]), '');
  assert.equal(joinPdfTextItems([[], [run('')]]), '');
});
