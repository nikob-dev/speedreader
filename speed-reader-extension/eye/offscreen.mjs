// Runs in an MV3 offscreen document so the camera belongs to the extension's
// origin, not whichever site the reader is open on. Frames never leave this page;
// only coarse attention states are messaged out.
import { FaceLandmarker, FilesetResolver } from '../vendor/mediapipe/vision_bundle.mjs';
import { classifyFrame, createAttentionTracker, createBaseline, signalsFromResult } from './attention.mjs';

const FRAME_INTERVAL_MS = 80;
const STATS_INTERVAL_MS = 5000;

const video = document.getElementById('cam');
const baseline = createBaseline();
const tracker = createAttentionTracker();
let lastSentState = null;

function send(message) {
  chrome.runtime.sendMessage(message).catch((err) => {
    console.error('Speed Reader attention: message to background failed', err);
  });
}

async function createLandmarker() {
  const fileset = await FilesetResolver.forVisionTasks(chrome.runtime.getURL('vendor/mediapipe/wasm'));
  const options = (delegate) => ({
    baseOptions: { modelAssetPath: chrome.runtime.getURL('vendor/mediapipe/face_landmarker.task'), delegate },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true
  });
  try {
    return await FaceLandmarker.createFromOptions(fileset, options('GPU'));
  } catch (gpuErr) {
    console.warn('Speed Reader attention: GPU delegate failed, falling back to CPU', gpuErr);
    return FaceLandmarker.createFromOptions(fileset, options('CPU'));
  }
}

function processFrame(landmarker) {
  if (video.readyState < 2) return;
  const now = Date.now();
  const signals = signalsFromResult(landmarker.detectForVideo(video, performance.now()));
  baseline.add(signals);
  // Until the head-pose baseline fills (~2s of open-eyed frames), only a missing face counts.
  const raw = baseline.ready || !signals.faceFound ? classifyFrame(signals, baseline.value) : 'focused';
  const { state, since } = tracker.update(raw, now);
  if (state !== lastSentState) {
    lastSentState = state;
    send({ type: 'eye:state', state, since });
  }
}

async function start() {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' } });
  } catch (err) {
    send({ type: 'eye:error', name: err.name, message: err.message });
    return;
  }
  video.srcObject = stream;
  await video.play();

  let landmarker;
  try {
    landmarker = await createLandmarker();
  } catch (err) {
    console.error('Speed Reader attention: face model failed to load', err);
    stream.getTracks().forEach((track) => track.stop());
    send({ type: 'eye:error', name: 'ModelLoadError', message: err.message });
    return;
  }

  send({ type: 'eye:ready' });
  setInterval(() => processFrame(landmarker), FRAME_INTERVAL_MS);
  setInterval(() => send({ type: 'eye:stats', ...tracker.blinkStats(Date.now()) }), STATS_INTERVAL_MS);
}

start();
