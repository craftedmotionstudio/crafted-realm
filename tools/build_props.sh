#!/usr/bin/env bash
# build_props.sh — Crafted Realms prop pipeline driver.
# For each prop: Gemini sprite -> Hunyuan3D-2 mesh -> gltf-transform decimate.
# Stops at the first failure (e.g. HF Space ZeroGPU quota) and prints a summary.
#
# Usage:  bash tools/build_props.sh
# Needs GEMINI_API_KEY (pulled from the Windows USER registry below).

cd "$(dirname "$0")/.." || exit 1
export GEMINI_API_KEY=$(powershell.exe -NoProfile -Command '[Environment]::GetEnvironmentVariable("GEMINI_API_KEY","User")' 2>/dev/null | tr -d '\r')

prompt_for() {
  echo "A single $1, centered, filling most of the frame. Low-poly faceted 3D game asset in the style of Old School RuneScape, with a subtle cozy 8-bit pixel-art quality, as if from a curated asset pack. Three-quarter view, even soft studio lighting, no ground shadow. Plain solid pale neutral-grey background, no checkerboard, no other objects."
}

# name|item-description-for-prompt
PROPS=(
  "potato|a potato"
  "onion|an onion"
  "carrot|a carrot"
  "wheat|a sheaf of golden wheat"
  "bucket|a wooden bucket"
  "crate|a wooden crate box"
  "barrel|a wooden barrel"
  "sack|a bulging grain sack"
)

done_list=()
for entry in "${PROPS[@]}"; do
  name="${entry%%|*}"; item="${entry#*|}"
  sprite="assets/sprites/$name.png"
  raw="assets/models/${name}_raw.glb"
  out="assets/models/$name.glb"
  echo ""
  echo "================ $name ================"

  echo "[1/3] sprite…"
  node tools/gemini_image.js "$(prompt_for "$item")" "$sprite" || { echo ">> SPRITE FAILED for $name — stopping."; break; }

  echo "[2/3] mesh (Hunyuan3D-2)…"
  python tools/hunyuan_shape.py "$sprite" "$raw" || { echo ">> MESH FAILED for $name (quota?) — stopping."; break; }

  echo "[3/3] decimate…"
  npx --yes @gltf-transform/cli optimize "$raw" "$out" \
      --compress false --texture-compress false \
      --simplify true --simplify-ratio 0.01 --simplify-error 0.01 \
      >/dev/null 2>&1 || { echo ">> DECIMATE FAILED for $name — stopping."; break; }

  size=$(stat -c%s "$out" 2>/dev/null || echo "?")
  echo ">> DONE $name ($size bytes)"
  done_list+=("$name")
done

echo ""
echo "================ SUMMARY ================"
echo "Completed (${#done_list[@]}): ${done_list[*]:-none}"
