// Pure reading logic shared by content.js and the unit tests. No DOM or chrome.* access.
// Deliberately not guarded like content.js: after a hot reload the fresh copy must replace the old one.
globalThis.SRCore = (() => {
  function tokenize(text) {
    return text.trim().split(/\s+/)
      .flatMap((w) => w.split(/(?<=[–—]|--)(?=\S)/))
      .filter(Boolean);
  }

  function orpIndex(word) {
    const len = word.length;
    if (len <= 1) return 0;
    if (len <= 5) return 1;
    if (len <= 9) return 2;
    if (len <= 13) return 3;
    return 4;
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function msPerWord(word, wpm) {
    let base = 60000 / wpm;
    if (word.length > 7) base *= 1.15;
    if (/[,;:]$/.test(word)) base *= 1.4;
    if (/[.!?]$/.test(word)) base *= 1.9;
    if (/(?:[–—]|--)$/.test(word) || word === '-') base *= 1.7;
    return base;
  }

  // Walks from `from` in `direction` (±1) until about `budgetMs` of reading time is covered.
  function skipTarget(words, from, direction, wpm, budgetMs) {
    let i = from;
    let elapsed = 0;
    while (elapsed < budgetMs) {
      const next = i + direction;
      if (next < 0 || next >= words.length) break;
      elapsed += msPerWord(words[direction < 0 ? next : i], wpm);
      i = next;
    }
    return i;
  }

  return { tokenize, orpIndex, escapeHtml, msPerWord, skipTarget };
})();
