import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STATES,
  classifyFrame,
  createAttentionTracker,
  createBaseline,
  headPoseFromMatrix,
  signalsFromResult
} from '../speed-reader-extension/eye/attention.mjs';

const focused = { faceFound: true, blink: 0.05, gaze: 0.1, yaw: 0, pitch: 0 };

// Feeds `state` every `stepMs` for `durationMs`, starting at `start`; returns the last result and end time.
function hold(tracker, state, start, durationMs, stepMs = 33) {
  let result;
  let t = start;
  for (; t <= start + durationMs; t += stepMs) result = tracker.update(state, t);
  return { result, t };
}

test('test_attention_classify_focused_face_returns_focused', () => {
  assert.equal(classifyFrame(focused), STATES.FOCUSED);
});

test('test_attention_classify_missing_face_returns_no_face', () => {
  assert.equal(classifyFrame({ faceFound: false }), STATES.NO_FACE);
});

test('test_attention_classify_closed_eyes_returns_eyes_closed', () => {
  assert.equal(classifyFrame({ ...focused, blink: 0.8 }), STATES.EYES_CLOSED);
});

test('test_attention_classify_head_turn_past_threshold_returns_away', () => {
  assert.equal(classifyFrame({ ...focused, yaw: 30 }), STATES.AWAY);
  assert.equal(classifyFrame({ ...focused, pitch: -25 }), STATES.AWAY);
  assert.equal(classifyFrame({ ...focused, yaw: 20 }), STATES.FOCUSED);
});

test('test_attention_classify_side_gaze_returns_away', () => {
  assert.equal(classifyFrame({ ...focused, gaze: 0.7 }), STATES.AWAY);
});

test('test_attention_classify_uses_baseline_for_head_pose', () => {
  const tilted = { ...focused, pitch: -15 };
  assert.equal(classifyFrame(tilted, { yaw: 0, pitch: -15 }), STATES.FOCUSED);
  assert.equal(classifyFrame({ ...focused, pitch: 10 }, { yaw: 0, pitch: -15 }), STATES.AWAY);
});

test('test_attention_baseline_averages_open_eye_samples', () => {
  const baseline = createBaseline(2);
  baseline.add({ ...focused, yaw: 4, pitch: -10 });
  baseline.add({ ...focused, blink: 0.9, yaw: 90, pitch: 90 });
  baseline.add({ faceFound: false });
  assert.equal(baseline.ready, false);
  baseline.add({ ...focused, yaw: 6, pitch: -12 });
  assert.equal(baseline.ready, true);
  assert.deepEqual(baseline.value, { yaw: 5, pitch: -11 });
});

test('test_attention_tracker_short_blink_stays_focused_and_counts', () => {
  const tracker = createAttentionTracker();
  let { t } = hold(tracker, STATES.FOCUSED, 0, 1000);
  ({ t } = hold(tracker, STATES.EYES_CLOSED, t, 150));
  const { result } = hold(tracker, STATES.FOCUSED, t, 500);
  assert.equal(result.state, STATES.FOCUSED);
  assert.ok(tracker.blinkStats(t + 500).blinksPerMin > 0);
});

test('test_attention_tracker_long_eye_closure_confirms_eyes_closed', () => {
  const tracker = createAttentionTracker();
  const { t } = hold(tracker, STATES.FOCUSED, 0, 500);
  const { result } = hold(tracker, STATES.EYES_CLOSED, t, 1000);
  assert.equal(result.state, STATES.EYES_CLOSED);
  assert.equal(tracker.blinkStats(t + 1000).blinksPerMin, 0);
});

test('test_attention_tracker_away_confirms_after_400ms_with_start_time', () => {
  const tracker = createAttentionTracker();
  const { t } = hold(tracker, STATES.FOCUSED, 0, 500, 100);
  const awayStart = t;
  assert.equal(tracker.update(STATES.AWAY, awayStart).state, STATES.FOCUSED);
  assert.equal(tracker.update(STATES.AWAY, awayStart + 300).state, STATES.FOCUSED);
  const confirmed = tracker.update(STATES.AWAY, awayStart + 400);
  assert.equal(confirmed.state, STATES.AWAY);
  assert.equal(confirmed.since, awayStart);
});

test('test_attention_tracker_brief_glance_never_confirms_away', () => {
  const tracker = createAttentionTracker();
  let { t } = hold(tracker, STATES.FOCUSED, 0, 500);
  ({ t } = hold(tracker, STATES.AWAY, t, 200));
  const { result } = hold(tracker, STATES.FOCUSED, t, 300);
  assert.equal(result.state, STATES.FOCUSED);
});

test('test_attention_blink_stats_rate_over_window', () => {
  const tracker = createAttentionTracker();
  let t = 0;
  for (let i = 0; i < 15; i++) {
    ({ t } = hold(tracker, STATES.FOCUSED, t, 1850, 50));
    ({ t } = hold(tracker, STATES.EYES_CLOSED, t, 100, 50));
  }
  ({ t } = hold(tracker, STATES.FOCUSED, t, 100, 50));
  const { blinksPerMin, sampleMs } = tracker.blinkStats(t);
  assert.ok(sampleMs >= 30_000);
  assert.ok(blinksPerMin > 25 && blinksPerMin < 35, `got ${blinksPerMin}`);
});

test('test_attention_head_pose_from_identity_matrix_is_neutral', () => {
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const { yaw, pitch } = headPoseFromMatrix(identity);
  assert.ok(Math.abs(yaw) < 0.5 && Math.abs(pitch) < 0.5, `got yaw=${yaw} pitch=${pitch}`);
});

test('test_attention_signals_from_empty_result_reports_no_face', () => {
  assert.deepEqual(signalsFromResult({ faceBlendshapes: [], facialTransformationMatrixes: [] }), { faceFound: false });
});
