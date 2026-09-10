#!/usr/bin/env bash
# build_props_textured.sh — TEXTURED prop pipeline driver.
# Gemini sprite -> Hunyuan3D-2 /generation_all (shape+paint) -> gentle decimate.
# Resumable: completed props are recorded in assets/models/.textured_done and
# skipped on the next run, so we can pick up after a ZeroGPU quota wave.
#
# Usage:  bash tools/build_props_textured.sh
# Needs GEMINI_API_KEY and HF_TOKEN (both pulled from the Windows USER registry).

cd "$(dirname "$0")/.." || exit 1
reg() { powershell.exe -NoProfile -Command "[Environment]::GetEnvironmentVariable('$1','User')" 2>/dev/null | tr -d '\r'; }
export GEMINI_API_KEY=$(reg GEMINI_API_KEY)
export HF_TOKEN=$(reg HF_TOKEN)

if [ -z "$HF_TOKEN" ]; then
  echo "WARNING: HF_TOKEN not set — textured gen will use the small anonymous quota and likely fail."
  echo "Create a free token at https://huggingface.co/settings/tokens, then run (in your terminal):"
  echo '   setx HF_TOKEN "hf_xxx"'
  echo "and open a NEW shell so it takes effect."
fi

prompt_base() {
  echo "$1, centered, filling most of the frame. Low-poly faceted 3D game asset in the style of Old School RuneScape, with a subtle cozy 8-bit pixel-art quality, as if from a curated asset pack. Three-quarter view, even soft studio lighting, no ground shadow. Plain solid pale neutral-grey background, no checkerboard, no other objects."
}

DONE_FILE="assets/models/.textured_done"
touch "$DONE_FILE"

# name | sprite-prompt-subject  (or REUSE to keep the existing sprite)
PROPS=(
  "barrel|REUSE"
  "bucket|a wooden bucket with a dark iron rim and curved iron handle and pale honey-stained timber staves"
  "crate|a wooden crate of honey-stained timber planks with dark iron corner brackets and nail heads"
  "sack|a bulging burlap grain sack tied at the neck with brown rope, natural beige cloth"
  "carrot|REUSE"
  "onion|REUSE"
  "potato|REUSE"
  "wheat|REUSE"
  "cabbage|REUSE"
)

done_list=()
for entry in "${PROPS[@]}"; do
  name="${entry%%|*}"; subject="${entry#*|}"
  if grep -qx "$name" "$DONE_FILE"; then echo "skip $name (already textured)"; continue; fi
  sprite="assets/sprites/$name.png"
  raw="assets/models/${name}_tex_raw.glb"
  out="assets/models/$name.glb"
  echo ""
  echo "================ $name ================"

  if [ "$subject" != "REUSE" ]; then
    echo "[1/3] sprite (material-explicit)…"
    node tools/gemini_image.js "$(prompt_base "A single $subject")" "$sprite" || { echo ">> SPRITE FAILED for $name — stopping."; break; }
  else
    echo "[1/3] sprite: reusing $sprite"
  fi

  echo "[2/3] textured mesh (InstantMesh, vertex colours)…"
  python tools/instantmesh.py "$sprite" "$raw" || { echo ">> MESH FAILED for $name (quota?) — stopping. Re-run later to resume."; break; }

  echo "[3/3] decimate (keep vertex colours)…"
  npx --yes @gltf-transform/cli optimize "$raw" "$out" \
      --compress false \
      --simplify true --simplify-ratio 0.15 --simplify-error 0.004 \
      >/dev/null 2>&1 || { echo ">> DECIMATE FAILED for $name — stopping."; break; }

  echo "$name" >> "$DONE_FILE"
  size=$(stat -c%s "$out" 2>/dev/null || echo "?")
  echo ">> DONE $name ($size bytes)"
  done_list+=("$name")
done

echo ""
echo "================ SUMMARY ================"
echo "Textured this run (${#done_list[@]}): ${done_list[*]:-none}"
echo "All textured so far: $(tr '\n' ' ' < "$DONE_FILE")"
