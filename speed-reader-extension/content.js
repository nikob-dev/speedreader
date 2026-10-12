(function () {
  if (window.__srLoaded) return;
  window.__srLoaded = true;

  const OVERLAY_CSS = `
    :host { all: initial; }
    .sr-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(8, 8, 12, 0.82);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
    }
    .sr-backdrop[data-size="full"] { background: #0b0c11; }
    .sr-card {
      --sr-card-w: 680px;
      --sr-reader-h: 220px;
      --sr-word-size: 42px;
      width: min(var(--sr-card-w), calc(100vw - 32px));
      background: #1b1d27;
      border: 1px solid #2a2d3b;
      border-radius: 16px;
      position: relative;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
    .sr-backdrop[data-size="s"] .sr-card { --sr-card-w: 560px; --sr-reader-h: 180px; --sr-word-size: 34px; }
    .sr-backdrop[data-size="l"] .sr-card { --sr-card-w: min(1000px, 94vw); --sr-reader-h: 340px; --sr-word-size: 64px; }
    .sr-backdrop[data-size="full"] .sr-card {
      --sr-word-size: clamp(56px, 7vw, 120px);
      width: 100vw;
      height: 100vh;
      border: none;
      border-radius: 0;
      box-shadow: none;
      display: flex;
      flex-direction: column;
    }
    .sr-backdrop[data-size="full"] .sr-reader { flex: 1; height: auto; }
    .sr-backdrop[data-size="full"] .sr-resize { display: none; }
    .sr-close {
      position: absolute;
      top: 12px;
      right: 14px;
      background: transparent;
      border: none;
      color: #7d8095;
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
    }
    .sr-close:hover { color: #ece9e2; background: #2a2d3b; }
    .sr-reader {
      position: relative;
      height: var(--sr-reader-h);
      display: flex;
      align-items: center;
      justify-content: center;
      border-bottom: 1px solid #2a2d3b;
    }
    .sr-guide {
      position: absolute;
      left: 50%;
      width: 1px;
      background: #3a3e52;
    }
    .sr-guide.top { top: 26px; height: 22px; }
    .sr-guide.bottom { bottom: 26px; height: 22px; }
    .sr-word {
      display: flex;
      align-items: baseline;
      font-family: Georgia, "Times New Roman", serif;
      font-size: var(--sr-word-size);
      line-height: 1;
    }
    .sr-word .before { text-align: right; min-width: calc(var(--sr-word-size) * 3.6); color: #ece9e2; }
    .sr-word .pivot { color: #ff5d3a; text-align: center; padding: 0 1px; }
    .sr-word .after { text-align: left; min-width: calc(var(--sr-word-size) * 3.6); color: #ece9e2; }
    .sr-placeholder { font-family: inherit; font-size: 15px; color: #7d8095; }
    .sr-skip-badge {
      position: absolute;
      top: 14px;
      left: 18px;
      font-size: 12px;
      font-weight: 600;
      color: #7d8095;
      opacity: 0;
      transition: opacity 0.25s ease;
      pointer-events: none;
    }
    .sr-skip-badge.visible { opacity: 1; transition: none; }
    .sr-progress-hit {
      height: 14px;
      margin: -6px 0 -5px;
      position: relative;
      display: flex;
      align-items: center;
      cursor: pointer;
      touch-action: none;
      outline: none;
    }
    .sr-progress-track { width: 100%; height: 3px; background: #2a2d3b; transition: height 0.1s ease; }
    .sr-progress-hit:hover .sr-progress-track,
    .sr-progress-hit:focus-visible .sr-progress-track,
    .sr-progress-hit.dragging .sr-progress-track { height: 6px; }
    .sr-progress-fill { height: 100%; width: 0%; background: #4fd1a5; transition: width 0.08s linear; }
    .sr-progress-hit.dragging .sr-progress-fill { transition: none; }
    .sr-controls { padding: 18px 22px 20px; }
    .sr-row { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
    .sr-row:last-child { margin-bottom: 0; }
    .sr-btn {
      font-family: inherit;
      font-weight: 600;
      font-size: 14px;
      border-radius: 8px;
      border: none;
      padding: 9px 16px;
      cursor: pointer;
    }
    .sr-btn-primary { background: #ece9e2; color: #14151c; }
    .sr-btn-secondary { background: transparent; color: #ece9e2; border: 1px solid #2a2d3b; }
    .sr-btn:hover { opacity: 0.85; }
    .sr-stats { font-size: 12px; color: #7d8095; }
    .sr-row label { font-size: 12px; color: #7d8095; white-space: nowrap; }
    .sr-row input[type="range"] { flex: 1; accent-color: #ff5d3a; }
    .sr-step { padding: 4px 0; width: 30px; font-size: 16px; line-height: 1; }
    .sr-wpm-value { font-size: 13px; color: #ece9e2; font-weight: 600; min-width: 60px; text-align: right; }
    .sr-sizes { display: flex; border: 1px solid #2a2d3b; border-radius: 8px; overflow: hidden; }
    .sr-sizes button {
      font-family: inherit;
      font-size: 12px;
      font-weight: 600;
      background: transparent;
      color: #7d8095;
      border: none;
      padding: 6px 12px;
      cursor: pointer;
    }
    .sr-sizes button + button { border-left: 1px solid #2a2d3b; }
    .sr-sizes button:hover { color: #ece9e2; }
    .sr-sizes button[aria-pressed="true"] { background: #2a2d3b; color: #ece9e2; }
    .sr-resize {
      position: absolute;
      right: 3px;
      bottom: 3px;
      width: 16px;
      height: 16px;
      cursor: nwse-resize;
      touch-action: none;
      background: linear-gradient(135deg, transparent 55%, #3a3e52 55%, #3a3e52 62%, transparent 62%, transparent 75%, #3a3e52 75%, #3a3e52 82%, transparent 82%);
      border-bottom-right-radius: 12px;
    }
    .sr-resize:hover { filter: brightness(1.6); }
    .sr-hint { font-size: 11px; color: #565968; text-align: center; margin: 0; padding-bottom: 16px; }
  `;

  let shadowHost = null;
  let shadowRoot = null;
  let els = {};
  let words = [];
  let index = 0;
  // tick() advances index past the displayed word, so track the displayed one separately.
  let shownIndex = 0;
  let playing = false;
  let timer = null;
  let wpm = 350;
  let keyHandler = null;
  let readerSize = 'm';
  let readerCustom = null;
  let lastWindowedSize = 'm';
  const SIZE_PRESETS = ['s', 'm', 'l', 'full'];
  const MIN_CARD_W = 420;
  const MIN_READER_H = 140;
  const MIN_WPM = 150;
  const MAX_WPM = 900;
  const WPM_STEP = 10;
  const SKIP_MS = 2000;
  const SKIP_HOLD_MS = 400;
  const SKIP_BADGE_MS = 700;
  let skipBurstWords = 0;
  let skipBadgeTimer = null;

  function extractPageText() {
    const primary = ['article', 'main', '[role="main"]'];
    for (const sel of primary) {
      const el = document.querySelector(sel);
      if (el && el.innerText && el.innerText.trim().length > 300) {
        return el.innerText;
      }
    }
    const paragraphs = Array.from(document.querySelectorAll('p'));
    const scores = new Map();
    paragraphs.forEach((p) => {
      const text = p.innerText || '';
      if (text.trim().length < 40) return;
      const container = p.closest('div, section, article') || p.parentElement;
      if (!container) return;
      scores.set(container, (scores.get(container) || 0) + text.length);
    });
    let best = null;
    let bestScore = 0;
    scores.forEach((score, el) => {
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    });
    if (best) return best.innerText;
    return document.body.innerText;
  }

  function getSourceText(mode) {
    if (mode === 'selection') {
      const sel = window.getSelection().toString();
      if (sel && sel.trim().length) return sel;
    }
    return extractPageText();
  }

  function orpIndex(word) {
    const len = word.length;
    if (len <= 1) return 0;
    if (len <= 5) return 1;
    if (len <= 9) return 2;
    if (len <= 13) return 3;
    return 4;
  }

  function renderWord(word) {
    if (!word) {
      els.word.innerHTML = '<span class="sr-placeholder">Ready. Press Start or Space.</span>';
      return;
    }
    const p = orpIndex(word);
    const before = word.slice(0, p);
    const pivotChar = word.slice(p, p + 1);
    const after = word.slice(p + 1);
    els.word.innerHTML =
      '<span class="before">' + escapeHtml(before) + '</span>' +
      '<span class="pivot">' + escapeHtml(pivotChar) + '</span>' +
      '<span class="after">' + escapeHtml(after) + '</span>';
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function updateStats() {
    const remaining = Math.max(words.length - index, 0);
    els.wordsLeft.textContent = remaining;
    const secondsLeft = (remaining / wpm) * 60;
    const m = Math.floor(secondsLeft / 60);
    const s = Math.round(secondsLeft % 60);
    els.timeLeft.textContent = m + ':' + String(s).padStart(2, '0');
    const pct = words.length ? (index / words.length) * 100 : 0;
    els.progressFill.style.width = pct + '%';
    els.progressHit.setAttribute('aria-valuemax', words.length);
    els.progressHit.setAttribute('aria-valuenow', index);
    els.progressHit.setAttribute('aria-valuetext', `word ${Math.min(index + 1, words.length)} of ${words.length}`);
  }

  // Leaves index on the previewed word so tick() shows it again on resume.
  function seekTo(ratio) {
    if (!words.length) return;
    const clamped = Math.min(Math.max(ratio, 0), 1);
    index = Math.min(Math.floor(clamped * words.length), words.length - 1);
    shownIndex = index;
    renderWord(words[index]);
    updateStats();
  }

  function skipTarget(direction) {
    let i = shownIndex;
    let elapsed = 0;
    while (elapsed < SKIP_MS) {
      const next = i + direction;
      if (next < 0 || next >= words.length) break;
      elapsed += msPerWord(words[direction < 0 ? next : i]);
      i = next;
    }
    return i;
  }

  // While playing, holds the target word briefly before continuing; repeated
  // presses reschedule the hold, so they stack. While paused it only previews.
  function skipByTime(direction) {
    if (!words.length || els.play.disabled) return;
    const target = skipTarget(direction);
    showSkipBadge(target - shownIndex);
    index = target;
    shownIndex = target;
    renderWord(words[target]);
    updateStats();
    if (playing) {
      clearTimeout(timer);
      index = target + 1;
      timer = setTimeout(tick, SKIP_HOLD_MS + msPerWord(words[target]));
    }
  }

  function showSkipBadge(delta) {
    skipBurstWords += delta;
    const sign = skipBurstWords < 0 ? '−' : '+';
    const n = Math.abs(skipBurstWords);
    els.skipBadge.textContent = `${sign}${n} word${n === 1 ? '' : 's'}`;
    els.skipBadge.classList.add('visible');
    clearTimeout(skipBadgeTimer);
    skipBadgeTimer = setTimeout(() => {
      els.skipBadge.classList.remove('visible');
      skipBurstWords = 0;
    }, SKIP_BADGE_MS);
  }

  function setWpm(value) {
    wpm = Math.min(MAX_WPM, Math.max(MIN_WPM, Math.round(value)));
    els.wpmSlider.value = wpm;
    els.wpmValue.textContent = wpm;
    updateStats();
    chrome.storage.sync.set({ wpm });
  }

  function msPerWord(word) {
    let base = 60000 / wpm;
    if (word.length > 7) base *= 1.15;
    if (/[,;:]$/.test(word)) base *= 1.4;
    if (/[.!?]$/.test(word)) base *= 1.9;
    if (/(?:[–—]|--)$/.test(word) || word === '-') base *= 1.7;
    return base;
  }

  function tick() {
    if (index >= words.length) {
      pause();
      return;
    }
    shownIndex = index;
    renderWord(words[index]);
    updateStats();
    const delay = msPerWord(words[index]);
    index++;
    timer = setTimeout(tick, delay);
  }

  function play() {
    if (!words.length) return;
    if (index >= words.length) index = 0;
    if (index === 0) {
      beginWithCountdown();
    } else {
      playing = true;
      els.play.textContent = 'Pause';
      tick();
    }
  }

  function beginWithCountdown() {
    playing = true;
    els.play.disabled = true;
    els.play.textContent = 'Starting…';
    timer = setTimeout(() => {
      if (!shadowHost) return; // overlay was closed mid-pause
      els.play.disabled = false;
      els.play.textContent = 'Pause';
      tick();
    }, 900);
  }

  function pause() {
    playing = false;
    els.play.disabled = false;
    els.play.textContent = 'Start';
    if (timer) clearTimeout(timer);
  }

  function restart() {
    pause();
    index = 0;
    shownIndex = 0;
    renderWord(null);
    updateStats();
  }

  function closeOverlay() {
    pause();
    if (keyHandler) {
      document.removeEventListener('keydown', keyHandler, true);
      keyHandler = null;
    }
    if (shadowHost) {
      shadowHost.remove();
      shadowHost = null;
      shadowRoot = null;
    }
    document.body.style.overflow = '';
  }

  function buildOverlay() {
    shadowHost = document.createElement('div');
    shadowHost.id = 'sr-shadow-host';
    document.documentElement.appendChild(shadowHost);
    shadowRoot = shadowHost.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = OVERLAY_CSS;
    shadowRoot.appendChild(style);

    const backdrop = document.createElement('div');
    backdrop.className = 'sr-backdrop';
    backdrop.innerHTML = `
      <div class="sr-card">
        <button class="sr-close" aria-label="Close">&times;</button>
        <div class="sr-reader">
          <div class="sr-guide top"></div>
          <div class="sr-guide bottom"></div>
          <div class="sr-word"><span class="sr-placeholder">Loading…</span></div>
          <div class="sr-skip-badge" aria-live="polite"></div>
        </div>
        <div class="sr-progress-hit" role="slider" tabindex="0" aria-label="Reading position" aria-valuemin="0">
          <div class="sr-progress-track"><div class="sr-progress-fill"></div></div>
        </div>
        <div class="sr-controls">
          <div class="sr-row">
            <button class="sr-btn sr-btn-primary" id="srPlay">Start</button>
            <button class="sr-btn sr-btn-secondary" id="srRestart">Restart</button>
            <span class="sr-stats"><span id="srWordsLeft">0</span> words left · <span id="srTimeLeft">0:00</span></span>
          </div>
          <div class="sr-row">
            <label for="srWpm">Speed</label>
            <button class="sr-btn sr-btn-secondary sr-step" id="srSlower" aria-label="Slower">−</button>
            <input type="range" id="srWpm" min="150" max="900" step="5" value="350">
            <button class="sr-btn sr-btn-secondary sr-step" id="srFaster" aria-label="Faster">+</button>
            <span class="sr-wpm-value"><span id="srWpmValue">350</span> wpm</span>
          </div>
          <div class="sr-row">
            <label>Size</label>
            <div class="sr-sizes" role="group" aria-label="Reader size">
              <button data-size="s" aria-pressed="false">S</button>
              <button data-size="m" aria-pressed="false">M</button>
              <button data-size="l" aria-pressed="false">L</button>
              <button data-size="full" aria-pressed="false">Full</button>
            </div>
          </div>
        </div>
        <p class="sr-hint">Space play/pause · ← → skip · − + speed · F full · Esc close</p>
        <div class="sr-resize" title="Drag to resize · double-click to reset"></div>
      </div>
    `;
    shadowRoot.appendChild(backdrop);

    els = {
      backdrop,
      card: shadowRoot.querySelector('.sr-card'),
      reader: shadowRoot.querySelector('.sr-reader'),
      sizeButtons: shadowRoot.querySelectorAll('.sr-sizes button'),
      resize: shadowRoot.querySelector('.sr-resize'),
      word: shadowRoot.querySelector('.sr-word'),
      progressHit: shadowRoot.querySelector('.sr-progress-hit'),
      progressTrack: shadowRoot.querySelector('.sr-progress-track'),
      progressFill: shadowRoot.querySelector('.sr-progress-fill'),
      play: shadowRoot.getElementById('srPlay'),
      restart: shadowRoot.getElementById('srRestart'),
      wordsLeft: shadowRoot.getElementById('srWordsLeft'),
      timeLeft: shadowRoot.getElementById('srTimeLeft'),
      wpmSlider: shadowRoot.getElementById('srWpm'),
      wpmValue: shadowRoot.getElementById('srWpmValue'),
      slower: shadowRoot.getElementById('srSlower'),
      faster: shadowRoot.getElementById('srFaster'),
      skipBadge: shadowRoot.querySelector('.sr-skip-badge'),
      close: shadowRoot.querySelector('.sr-close')
    };

    els.play.addEventListener('click', () => (playing ? pause() : play()));
    els.restart.addEventListener('click', restart);
    els.close.addEventListener('click', closeOverlay);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeOverlay();
    });
    wireProgressSeek();
    wireResize();
    els.sizeButtons.forEach((btn) => {
      btn.addEventListener('click', () => setSize(btn.dataset.size));
    });
    els.wpmSlider.addEventListener('input', () => setWpm(parseInt(els.wpmSlider.value, 10)));
    els.slower.addEventListener('click', () => setWpm(wpm - WPM_STEP));
    els.faster.addEventListener('click', () => setWpm(wpm + WPM_STEP));

    keyHandler = function (e) {
      const modified = e.metaKey || e.ctrlKey || e.altKey;
      if (e.code === 'Space') {
        e.preventDefault();
        playing ? pause() : play();
      } else if ((e.code === 'ArrowLeft' || e.code === 'ArrowRight') && !modified) {
        e.preventDefault();
        skipByTime(e.code === 'ArrowLeft' ? -1 : 1);
      } else if ((e.code === 'Minus' || e.code === 'NumpadSubtract') && !modified) {
        e.preventDefault();
        setWpm(wpm - WPM_STEP);
      } else if ((e.code === 'Equal' || e.code === 'NumpadAdd') && !modified) {
        e.preventDefault();
        setWpm(wpm + WPM_STEP);
      } else if (e.code === 'KeyF' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setSize(readerSize === 'full' ? lastWindowedSize : 'full');
      } else if (e.code === 'Escape') {
        closeOverlay();
      }
    };
    document.addEventListener('keydown', keyHandler, true);
    document.body.style.overflow = 'hidden';
  }

  function wireProgressSeek() {
    const hit = els.progressHit;
    let wasPlaying = false;

    const ratioFromEvent = (e) => {
      const rect = els.progressTrack.getBoundingClientRect();
      return (e.clientX - rect.left) / rect.width;
    };

    hit.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      wasPlaying = playing;
      pause();
      hit.setPointerCapture(e.pointerId);
      hit.classList.add('dragging');
      seekTo(ratioFromEvent(e));
    });
    hit.addEventListener('pointermove', (e) => {
      if (!hit.hasPointerCapture(e.pointerId)) return;
      seekTo(ratioFromEvent(e));
    });
    const endDrag = (e) => {
      if (!hit.hasPointerCapture(e.pointerId)) return;
      e.stopPropagation();
      hit.releasePointerCapture(e.pointerId);
      hit.classList.remove('dragging');
      if (wasPlaying) play();
    };
    hit.addEventListener('pointerup', endDrag);
    hit.addEventListener('pointercancel', endDrag);
    hit.addEventListener('click', (e) => e.stopPropagation());
    hit.addEventListener('keydown', (e) => {
      if (e.code === 'Home') {
        e.preventDefault();
        seekTo(0);
      } else if (e.code === 'End') {
        e.preventDefault();
        seekTo(1);
      }
    });
  }

  function applySize(size, custom) {
    readerSize = size;
    if (size !== 'full') lastWindowedSize = size;
    if (custom) readerCustom = custom;
    els.backdrop.dataset.size = size;
    const style = els.card.style;
    if (size === 'custom') {
      style.setProperty('--sr-card-w', `${readerCustom.width}px`);
      style.setProperty('--sr-reader-h', `${readerCustom.height}px`);
      style.setProperty('--sr-word-size', `${wordSizeFor(readerCustom)}px`);
    } else {
      style.removeProperty('--sr-card-w');
      style.removeProperty('--sr-reader-h');
      style.removeProperty('--sr-word-size');
    }
    els.sizeButtons.forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.size === size));
    });
  }

  function setSize(size, custom) {
    applySize(size, custom);
    chrome.storage.sync.set({ readerSize, readerCustom });
  }

  // Height also caps it so the word still fits a short, wide reader.
  function wordSizeFor({ width, height }) {
    return Math.round(Math.min(Math.max(Math.min(width * 0.062, height * 0.3), 28), 120));
  }

  // The card is flex-centered, so both edges move: a 10px drag grows it by 20px.
  function wireResize() {
    const handle = els.resize;
    let start = null;

    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const cardRect = els.card.getBoundingClientRect();
      const readerRect = els.reader.getBoundingClientRect();
      start = {
        x: e.clientX,
        y: e.clientY,
        width: cardRect.width,
        readerH: readerRect.height,
        chromeH: cardRect.height - readerRect.height
      };
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', (e) => {
      if (!start || !handle.hasPointerCapture(e.pointerId)) return;
      const maxW = window.innerWidth - 32;
      const maxH = window.innerHeight - 32 - start.chromeH;
      const width = Math.min(Math.max(start.width + 2 * (e.clientX - start.x), MIN_CARD_W), maxW);
      const height = Math.min(Math.max(start.readerH + 2 * (e.clientY - start.y), MIN_READER_H), maxH);
      applySize('custom', { width: Math.round(width), height: Math.round(height) });
    });
    const endDrag = (e) => {
      if (!start || !handle.hasPointerCapture(e.pointerId)) return;
      handle.releasePointerCapture(e.pointerId);
      start = null;
      if (readerSize === 'custom') setSize('custom', readerCustom);
    };
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
    handle.addEventListener('click', (e) => e.stopPropagation());
    handle.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      setSize('m');
    });
  }

  function startReading(mode, autoplay) {
    chrome.storage.sync.get({ wpm: 350, readerSize: 'm', readerCustom: null }, (data) => {
      wpm = data.wpm || 350;
      const text = getSourceText(mode);
      words = text.trim().split(/\s+/)
        .flatMap((w) => w.split(/(?<=[–—]|--)(?=\S)/))
        .filter(Boolean);

      if (!shadowHost) buildOverlay();
      const savedSize = data.readerSize;
      const validSize = SIZE_PRESETS.includes(savedSize) || (savedSize === 'custom' && data.readerCustom);
      applySize(validSize ? savedSize : 'm', data.readerCustom);
      els.wpmSlider.value = wpm;
      els.wpmValue.textContent = wpm;
      index = 0;
      shownIndex = 0;
      playing = false;
      els.play.textContent = 'Start';
      renderWord(null);
      updateStats();

      if (autoplay && words.length) play();
    });
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.action === 'start') {
      startReading(msg.mode || 'page');
    }
  });

  // Double-tap Shift to speed read the current selection.
  // Any other keydown between the two taps cancels it, so typing
  // capital letters (Shift+letter) never counts as the first tap.
  let lastShiftTime = 0;
  const DOUBLE_TAP_MS = 400;

  document.addEventListener(
    'keydown',
    (e) => {
      // A copy orphaned by an extension reload must defer to the freshly injected one.
      if (!chrome.runtime?.id) return;
      if (e.key === 'Shift') {
        if (e.repeat) return;
        const now = Date.now();
        if (now - lastShiftTime < DOUBLE_TAP_MS) {
          lastShiftTime = 0;
          const sel = window.getSelection().toString();
          if (sel && sel.trim().length > 0) {
            startReading('selection', true);
          }
        } else {
          lastShiftTime = now;
        }
      } else {
        lastShiftTime = 0;
      }
    },
    true
  );
})();
