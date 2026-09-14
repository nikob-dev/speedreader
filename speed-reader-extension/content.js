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
    .sr-card {
      width: min(680px, 92vw);
      background: #1b1d27;
      border: 1px solid #2a2d3b;
      border-radius: 16px;
      position: relative;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }
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
      height: 220px;
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
      font-size: 42px;
      line-height: 1;
    }
    .sr-word .before { text-align: right; min-width: 150px; color: #ece9e2; }
    .sr-word .pivot { color: #ff5d3a; text-align: center; padding: 0 1px; }
    .sr-word .after { text-align: left; min-width: 150px; color: #ece9e2; }
    .sr-placeholder { font-family: inherit; font-size: 15px; color: #7d8095; }
    .sr-progress-track { height: 3px; background: #2a2d3b; }
    .sr-progress-fill { height: 100%; width: 0%; background: #4fd1a5; transition: width 0.08s linear; }
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
    .sr-wpm-value { font-size: 13px; color: #ece9e2; font-weight: 600; min-width: 60px; text-align: right; }
    .sr-hint { font-size: 11px; color: #565968; text-align: center; margin: 0; padding-bottom: 16px; }
  `;

  let shadowHost = null;
  let shadowRoot = null;
  let els = {};
  let words = [];
  let index = 0;
  let playing = false;
  let timer = null;
  let wpm = 350;
  let keyHandler = null;

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
  }

  function msPerWord(word) {
    let base = 60000 / wpm;
    if (word.length > 7) base *= 1.15;
    if (/[,;:]$/.test(word)) base *= 1.4;
    if (/[.!?]$/.test(word)) base *= 1.9;
    return base;
  }

  function tick() {
    if (index >= words.length) {
      pause();
      return;
    }
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
        </div>
        <div class="sr-progress-track"><div class="sr-progress-fill"></div></div>
        <div class="sr-controls">
          <div class="sr-row">
            <button class="sr-btn sr-btn-primary" id="srPlay">Start</button>
            <button class="sr-btn sr-btn-secondary" id="srRestart">Restart</button>
            <span class="sr-stats"><span id="srWordsLeft">0</span> words left · <span id="srTimeLeft">0:00</span></span>
          </div>
          <div class="sr-row">
            <label for="srWpm">Speed</label>
            <input type="range" id="srWpm" min="150" max="900" step="25" value="350">
            <span class="sr-wpm-value"><span id="srWpmValue">350</span> wpm</span>
          </div>
        </div>
        <p class="sr-hint">Space play/pause · ← → speed · Esc close</p>
      </div>
    `;
    shadowRoot.appendChild(backdrop);

    els = {
      word: shadowRoot.querySelector('.sr-word'),
      progressFill: shadowRoot.querySelector('.sr-progress-fill'),
      play: shadowRoot.getElementById('srPlay'),
      restart: shadowRoot.getElementById('srRestart'),
      wordsLeft: shadowRoot.getElementById('srWordsLeft'),
      timeLeft: shadowRoot.getElementById('srTimeLeft'),
      wpmSlider: shadowRoot.getElementById('srWpm'),
      wpmValue: shadowRoot.getElementById('srWpmValue'),
      close: shadowRoot.querySelector('.sr-close')
    };

    els.play.addEventListener('click', () => (playing ? pause() : play()));
    els.restart.addEventListener('click', restart);
    els.close.addEventListener('click', closeOverlay);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeOverlay();
    });
    els.wpmSlider.addEventListener('input', () => {
      wpm = parseInt(els.wpmSlider.value, 10);
      els.wpmValue.textContent = wpm;
      updateStats();
      chrome.storage.sync.set({ wpm });
    });

    keyHandler = function (e) {
      if (e.code === 'Space') {
        e.preventDefault();
        playing ? pause() : play();
      } else if (e.code === 'ArrowRight') {
        wpm = Math.min(900, wpm + 25);
        els.wpmSlider.value = wpm;
        els.wpmValue.textContent = wpm;
        updateStats();
        chrome.storage.sync.set({ wpm });
      } else if (e.code === 'ArrowLeft') {
        wpm = Math.max(150, wpm - 25);
        els.wpmSlider.value = wpm;
        els.wpmValue.textContent = wpm;
        updateStats();
        chrome.storage.sync.set({ wpm });
      } else if (e.code === 'Escape') {
        closeOverlay();
      }
    };
    document.addEventListener('keydown', keyHandler, true);
    document.body.style.overflow = 'hidden';
  }

  function startReading(mode, autoplay) {
    chrome.storage.sync.get({ wpm: 350 }, (data) => {
      wpm = data.wpm || 350;
      const text = getSourceText(mode);
      words = text.trim().split(/\s+/).filter(Boolean);

      if (!shadowHost) buildOverlay();
      els.wpmSlider.value = wpm;
      els.wpmValue.textContent = wpm;
      index = 0;
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
