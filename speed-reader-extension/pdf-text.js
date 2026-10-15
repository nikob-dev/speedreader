// Pure PDF text assembly shared by offscreen.js and the unit tests. No DOM or chrome.* access.
globalThis.SRPdfText = (() => {
  // pages: one array per page of PDF.js text items ({ str, hasEOL }).
  function joinPdfTextItems(pages) {
    return pages
      .map((items) => {
        const raw = items.map((item) => item.str + (item.hasEOL ? '\n' : '')).join('');
        // A word split across lines ("exam-\nple") is rejoined only when the next line
        // continues in lowercase, so line-final dashes like "1990-\n2000" survive.
        return raw.replace(/(\p{L})-\n(\p{Ll})/gu, '$1$2').replace(/\s*\n\s*/g, ' ').trim();
      })
      .filter(Boolean)
      .join('\n\n');
  }

  return { joinPdfTextItems };
})();
