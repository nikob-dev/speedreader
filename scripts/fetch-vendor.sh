#!/usr/bin/env bash
# Re-downloads the pinned MediaPipe runtime + face model into the extension.
# MV3 forbids remotely hosted code, so these files ship inside the extension.
set -euo pipefail

TASKS_VISION_VERSION="0.10.14"
MODEL_URL="https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/speed-reader-extension/vendor/mediapipe"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

(cd "$WORK" && npm pack "@mediapipe/tasks-vision@$TASKS_VISION_VERSION" --silent >/dev/null && tar -xzf ./*.tgz)

rm -rf "$DEST"
mkdir -p "$DEST/wasm"
cp "$WORK/package/vision_bundle.mjs" "$DEST/"
cp "$WORK/package/wasm/vision_wasm_internal.js" "$WORK/package/wasm/vision_wasm_internal.wasm" "$DEST/wasm/"
cp "$WORK/package/LICENSE" "$DEST/" 2>/dev/null || true
curl -fsSL "$MODEL_URL" -o "$DEST/face_landmarker.task"

echo "Vendored @mediapipe/tasks-vision@$TASKS_VISION_VERSION into $DEST"
