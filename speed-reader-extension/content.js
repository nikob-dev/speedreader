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
    .sr-wpm-value { font-size: 13px; color: #ece9e2; font-weight: 600; min-width: 60px; text-align: right; }
    .sr-attn { display: inline-flex; align-items: center; gap: 7px; margin-left: auto; }
    .sr-attn[aria-pressed="true"] { border-color: #4a4e66; }
    .sr-dot { width: 8px; height: 8px; border-radius: 50%; background: #565968; }
    .sr-attn[data-state="focused"] .sr-dot { background: #4fd1a5; }
    .sr-attn[data-state="away"] .sr-dot,
    .sr-attn[data-state="eyes-closed"] .sr-dot,
    .sr-attn[data-state="no-face"] .sr-dot { background: #f5b84a; }
    .sr-attn[data-state="starting"] .sr-dot,
    .sr-attn[data-state="needs-permission"] .sr-dot { background: #7d8095; animation: sr-pulse 1s ease-in-out infinite; }
    .sr-attn[data-state="error"] .sr-dot { background: #ff5d3a; }
    @keyframes sr-pulse { 50% { opacity: 0.3; } }
    .sr-wpm-adjust { color: #7d8095; font-weight: 400; }
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

  // Attention tracking: the camera runs in an offscreen document (see eye/),
  // this side only reacts to coarse states relayed by the background worker.
  const ATTENTION_PAUSE_STATES = ['away', 'eyes-closed', 'no-face'];
  const REWIND_BEFORE_LAPSE_MS = 150;
  const WPM_ADJUST_MIN = -100;
  const WPM_ADJUST_MAX = 50;
  const WPM_ADJUST_STEP = 25;
  const FOCUS_SPEEDUP_MS = 45000;
  const FATIGUE_BLINKS_PER_MIN = 25;
  const FATIGUE_MIN_SAMPLE_MS = 30000;
  const FATIGUE_COOLDOWN_MS = 60000;
  let eyeTracking = false;
  let attentionState = 'off';
  let pausedByAttention = false;
  let wpmAdjust = 0;
  let focusedPlayMs = 0;
  let lastFatigueSlowdown = 0;
  let shownLog = [];

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
    const secondsLeft = (remaining / effectiveWpm()) * 60;
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
    renderWord(words[index]);
    updateStats();
  }

  function msPerWord(word) {
    let base = 60000 / effectiveWpm();
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
    renderWord(words[index]);
    updateStats();
    const delay = msPerWord(words[index]);
    shownLog.push({ index, at: Date.now() });
    if (shownLog.length > 40) shownLog.shift();
    trackFocusedReading(delay);
    index++;
    timer = setTimeout(tick, delay);
  }

  function play() {
    if (!words.length) return;
    pausedByAttention = false;
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
    pausedByAttention = false;
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
    if (eyeTracking) stopAttention();
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
        <div class="sr-progress-hit" role="slider" tabindex="0" aria-label="Reading position" aria-valuemin="0">
          <div class="sr-progress-track"><div class="sr-progress-fill"></div></div>
        </div>
        <div class="sr-controls">
          <div class="sr-row">
            <button class="sr-btn sr-btn-primary" id="srPlay">Start</button>
            <button class="sr-btn sr-btn-secondary" id="srRestart">Restart</button>
            <span class="sr-stats"><span id="srWordsLeft">0</span> words left · <span id="srTimeLeft">0:00</span></span>
            <button class="sr-btn sr-btn-secondary sr-attn" id="srAttn" aria-pressed="false" data-state="off" title="Pause when you look away and tune speed to your focus. Uses the webcam on-device."><span class="sr-dot"></span>Attention</button>
          </div>
          <div class="sr-row">
            <label for="srWpm">Speed</label>
            <input type="range" id="srWpm" min="150" max="900" step="25" value="350">
            <span class="sr-wpm-value"><span id="srWpmValue">350</span> wpm <span class="sr-wpm-adjust" id="srWpmAdjust"></span></span>
          </div>
        </div>
        <p class="sr-hint">Space play/pause · ← → speed · Esc close</p>
      </div>
    `;
    shadowRoot.appendChild(backdrop);

    els = {
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
      wpmAdjust: shadowRoot.getElementById('srWpmAdjust'),
      attn: shadowRoot.getElementById('srAttn'),
      close: shadowRoot.querySelector('.sr-close')
    };

    els.play.addEventListener('click', () => (playing ? pause() : play()));
    els.restart.addEventListener('click', restart);
    els.attn.addEventListener('click', () => setEyeTracking(!eyeTracking));
    els.close.addEventListener('click', closeOverlay);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeOverlay();
    });
    wireProgressSeek();
    els.wpmSlider.addEventListener('input', () => {
      wpm = parseInt(els.wpmSlider.value, 10);
      els.wpmValue.textContent = wpm;
      setWpmAdjust(0);
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
        setWpmAdjust(0);
        chrome.storage.sync.set({ wpm });
      } else if (e.code === 'ArrowLeft') {
        wpm = Math.max(150, wpm - 25);
        els.wpmSlider.value = wpm;
        els.wpmValue.textContent = wpm;
        setWpmAdjust(0);
        chrome.storage.sync.set({ wpm });
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

  function effectiveWpm() {
    return Math.max(wpm + wpmAdjust, 50);
  }

  function setWpmAdjust(value) {
    wpmAdjust = Math.min(Math.max(value, WPM_ADJUST_MIN), WPM_ADJUST_MAX);
    focusedPlayMs = 0;
    const sign = wpmAdjust > 0 ? '+' : '−';
    els.wpmAdjust.textContent = wpmAdjust === 0 ? '' : `(${sign}${Math.abs(wpmAdjust)} adaptive)`;
    updateStats();
  }

  function trackFocusedReading(delay) {
    if (!eyeTracking || attentionState !== 'focused') return;
    focusedPlayMs += delay;
    if (focusedPlayMs >= FOCUS_SPEEDUP_MS) setWpmAdjust(wpmAdjust + WPM_ADJUST_STEP);
  }

  function setAttentionState(state) {
    attentionState = state;
    if (els.attn) els.attn.dataset.state = state;
  }

  function setEyeTracking(enabled) {
    eyeTracking = enabled;
    chrome.storage.sync.set({ eyeTracking });
    els.attn.setAttribute('aria-pressed', String(enabled));
    enabled ? startAttention() : stopAttention();
  }

  function startAttention() {
    setAttentionState('starting');
    chrome.runtime.sendMessage({ type: 'eye:start' }).catch((err) => {
      console.error('Speed Reader: could not start attention tracking', err);
      setAttentionState('error');
    });
  }

  function stopAttention() {
    setAttentionState('off');
    if (pausedByAttention) pausedByAttention = false;
    setWpmAdjust(0);
    chrome.runtime.sendMessage({ type: 'eye:stop' }).catch((err) => {
      console.error('Speed Reader: could not stop attention tracking', err);
    });
  }

  // `since` is when the lapse actually began, before debouncing confirmed it,
  // so rewind to the word that was showing then rather than the current one.
  function handleAttentionLapse(since) {
    const lapsedAt = since - REWIND_BEFORE_LAPSE_MS;
    const missed = shownLog.find((entry) => entry.at >= lapsedAt);
    pause();
    pausedByAttention = true;
    if (missed) {
      index = missed.index;
      renderWord(words[index]);
    }
    setWpmAdjust(wpmAdjust - WPM_ADJUST_STEP);
  }

  function handleAttentionMessage(msg) {
    if (!eyeTracking || !shadowHost) return;
    if (msg.type === 'eye:status') {
      setAttentionState(msg.status === 'ready' ? 'focused' : msg.status);
    } else if (msg.type === 'eye:state') {
      const wasLapsed = ATTENTION_PAUSE_STATES.includes(attentionState);
      setAttentionState(msg.state);
      if (ATTENTION_PAUSE_STATES.includes(msg.state) && playing) {
        handleAttentionLapse(msg.since);
      } else if (msg.state === 'focused' && wasLapsed && pausedByAttention) {
        play();
      }
    } else if (msg.type === 'eye:stats') {
      const now = Date.now();
      const fatigued = msg.sampleMs >= FATIGUE_MIN_SAMPLE_MS && msg.blinksPerMin > FATIGUE_BLINKS_PER_MIN;
      if (fatigued && playing && now - lastFatigueSlowdown > FATIGUE_COOLDOWN_MS) {
        lastFatigueSlowdown = now;
        setWpmAdjust(wpmAdjust - WPM_ADJUST_STEP);
      }
    }
  }

  function startReading(mode, autoplay) {
    chrome.storage.sync.get({ wpm: 350, eyeTracking: false }, (data) => {
      wpm = data.wpm || 350;
      const text = getSourceText(mode);
      words = text.trim().split(/\s+/)
        .flatMap((w) => w.split(/(?<=[–—]|--)(?=\S)/))
        .filter(Boolean);

      const freshOverlay = !shadowHost;
      if (freshOverlay) buildOverlay();
      shownLog = [];
      setWpmAdjust(0);
      if (freshOverlay && data.eyeTracking) setEyeTracking(true);
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
    } else if (msg?.type?.startsWith('eye:')) {
      handleAttentionMessage(msg);
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
