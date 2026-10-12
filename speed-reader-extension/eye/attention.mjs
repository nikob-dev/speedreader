// Pure attention logic: turns per-frame face signals into debounced reader states.
// No DOM or chrome.* access here so it runs under `node --test`.

export const STATES = Object.freeze({
  FOCUSED: 'focused',
  AWAY: 'away',
  EYES_CLOSED: 'eyes-closed',
  NO_FACE: 'no-face'
});

export const THRESHOLDS = Object.freeze({
  blinkScore: 0.5,
  maxYawDeg: 25,
  maxPitchDeg: 20,
  maxGazeScore: 0.6
});

// How long a raw state must hold before it is reported. Blinks last ~100–300ms,
// so eyes-closed waits well past that; returning to focus is near-instant.
export const CONFIRM_MS = Object.freeze({
  [STATES.FOCUSED]: 150,
  [STATES.AWAY]: 400,
  [STATES.EYES_CLOSED]: 700,
  [STATES.NO_FACE]: 400
});

export const BLINK_MIN_MS = 40;
export const BLINK_MAX_MS = 300;
export const BLINK_WINDOW_MS = 60_000;

const RAD_TO_DEG = 180 / Math.PI;

// MediaPipe's facialTransformationMatrixes are 4x4 column-major.
export function headPoseFromMatrix(m) {
  const r = (row, col) => m[col * 4 + row];
  const pitch = Math.atan2(r(2, 1), r(2, 2)) * RAD_TO_DEG;
  const yaw = Math.asin(Math.max(-1, Math.min(1, -r(2, 0)))) * RAD_TO_DEG;
  return { yaw, pitch };
}

export function signalsFromResult(result) {
  const shapes = result.faceBlendshapes?.[0]?.categories;
  const matrix = result.facialTransformationMatrixes?.[0]?.data;
  if (!shapes || !matrix) return { faceFound: false };

  const score = Object.fromEntries(shapes.map((c) => [c.categoryName, c.score]));
  const { yaw, pitch } = headPoseFromMatrix(matrix);
  return {
    faceFound: true,
    blink: Math.min(score.eyeBlinkLeft ?? 0, score.eyeBlinkRight ?? 0),
    // Eyes looking sideways or up off the screen. Downward gaze is left out:
    // a laptop camera sits above the screen, so reading already reads as "down".
    gaze: Math.max(
      score.eyeLookOutLeft ?? 0,
      score.eyeLookOutRight ?? 0,
      score.eyeLookInLeft ?? 0,
      score.eyeLookInRight ?? 0,
      score.eyeLookUpLeft ?? 0,
      score.eyeLookUpRight ?? 0
    ),
    yaw,
    pitch
  };
}

// Head pose is judged relative to a baseline captured while the user reads,
// since camera placement makes "straight ahead" differ per setup.
export function classifyFrame(signals, baseline = { yaw: 0, pitch: 0 }, t = THRESHOLDS) {
  if (!signals.faceFound) return STATES.NO_FACE;
  if (signals.blink >= t.blinkScore) return STATES.EYES_CLOSED;
  const yawOff = Math.abs(signals.yaw - baseline.yaw) > t.maxYawDeg;
  const pitchOff = Math.abs(signals.pitch - baseline.pitch) > t.maxPitchDeg;
  if (yawOff || pitchOff || signals.gaze >= t.maxGazeScore) return STATES.AWAY;
  return STATES.FOCUSED;
}

export function createBaseline(sampleCount = 20) {
  const samples = [];
  return {
    add(signals) {
      if (samples.length >= sampleCount || !signals.faceFound) return;
      if (signals.blink >= THRESHOLDS.blinkScore) return;
      samples.push({ yaw: signals.yaw, pitch: signals.pitch });
    },
    get ready() {
      return samples.length >= sampleCount;
    },
    get value() {
      if (!samples.length) return { yaw: 0, pitch: 0 };
      const avg = (key) => samples.reduce((sum, s) => sum + s[key], 0) / samples.length;
      return { yaw: avg('yaw'), pitch: avg('pitch') };
    }
  };
}

// Debounces raw per-frame states into confirmed ones and counts blinks.
// `update` returns the confirmed state plus `since`, when the raw state began,
// so the reader can rewind to the word that was on screen at that moment.
export function createAttentionTracker(confirmMs = CONFIRM_MS) {
  let confirmed = STATES.FOCUSED;
  let confirmedSince = 0;
  let pending = STATES.FOCUSED;
  let pendingSince = 0;
  let closedSince = null;
  const blinks = [];
  let firstUpdateAt = null;

  return {
    update(raw, now) {
      if (firstUpdateAt === null) {
        firstUpdateAt = now;
        confirmedSince = now;
        pendingSince = now;
      }

      if (raw === STATES.EYES_CLOSED && closedSince === null) closedSince = now;
      if (raw !== STATES.EYES_CLOSED && closedSince !== null) {
        const closedFor = now - closedSince;
        if (closedFor >= BLINK_MIN_MS && closedFor <= BLINK_MAX_MS) blinks.push(now);
        closedSince = null;
      }

      if (raw !== pending) {
        pending = raw;
        pendingSince = now;
      }
      if (pending !== confirmed && now - pendingSince >= confirmMs[pending]) {
        confirmed = pending;
        confirmedSince = pendingSince;
      }
      return { state: confirmed, since: confirmedSince };
    },

    blinkStats(now) {
      while (blinks.length && now - blinks[0] > BLINK_WINDOW_MS) blinks.shift();
      const sampleMs = firstUpdateAt === null ? 0 : Math.min(now - firstUpdateAt, BLINK_WINDOW_MS);
      const blinksPerMin = sampleMs > 0 ? (blinks.length / sampleMs) * 60_000 : 0;
      return { blinksPerMin, sampleMs };
    }
  };
}
