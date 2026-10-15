import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../speed-reader-extension/reader-core.js', import.meta.url), 'utf8');
const sandbox = {};
vm.runInNewContext(source, sandbox);
const { tokenize, orpIndex, escapeHtml, msPerWord, skipTarget } = sandbox.SRCore;

test('tokenize splits on any whitespace and drops empties', () => {
  assert.deepEqual([...tokenize('  one\ttwo\n\nthree  ')], ['one', 'two', 'three']);
});

test('tokenize returns nothing for blank text', () => {
  assert.equal(tokenize('   \n ').length, 0);
});

test('tokenize breaks words joined by dashes after the dash', () => {
  assert.deepEqual([...tokenize('wait—what and this--that')], ['wait—', 'what', 'and', 'this--', 'that']);
});

test('tokenize keeps hyphenated words whole', () => {
  assert.deepEqual([...tokenize('well-known')], ['well-known']);
});

test('orpIndex moves the pivot right as words get longer', () => {
  assert.equal(orpIndex('a'), 0);
  assert.equal(orpIndex('hello'), 1);
  assert.equal(orpIndex('reading'), 2);
  assert.equal(orpIndex('extraordinary'), 3);
  assert.equal(orpIndex('incomprehensibilities'), 4);
});

test('escapeHtml neutralizes markup characters', () => {
  assert.equal(escapeHtml('<b>&</b>'), '&lt;b&gt;&amp;&lt;/b&gt;');
});

test('msPerWord is 60000/wpm for a plain short word', () => {
  assert.equal(msPerWord('cat', 300), 200);
});

test('msPerWord lingers on punctuation and long words', () => {
  const base = msPerWord('cat', 300);
  assert.ok(msPerWord('cat,', 300) > base);
  assert.ok(msPerWord('cat.', 300) > msPerWord('cat,', 300));
  assert.ok(msPerWord('elephants', 300) > base);
  assert.ok(msPerWord('wait—', 300) > base);
});

test('skipTarget moves forward about the budgeted time', () => {
  const words = Array(50).fill('cat'); // 200ms each at 300wpm
  assert.equal(skipTarget(words, 0, 1, 300, 2000), 10);
});

test('skipTarget clamps at both ends of the text', () => {
  const words = Array(5).fill('cat');
  assert.equal(skipTarget(words, 2, -1, 300, 2000), 0);
  assert.equal(skipTarget(words, 2, 1, 300, 2000), 4);
});
