#!/usr/bin/env bash
# build_props_sf3d.sh — LOCAL textured prop pipeline via Stable-Fast-3D.
# Runs entirely on the RTX 4070 (no HF quota). Gemini sprite -> SF3D -> decimate.
# One model load processes all sprites; outputs are UV-textured GLBs.
#
# Usage:  bash tools/build_props_sf3d.sh
# Needs the local SF3D env at C:\Users\iQwaZ\image3d-local and HF_TOKEN (gated weights).

PROJ="/c/Users/iQwaZ/OneDrive/Desktop/CraftedRealms-Claude"
SF3D="/c/Users/iQwaZ/image3d-local/stable-fast-3d"
PY="/c/Users/iQwaZ/image3d-local/.venv/Scripts/python.exe"
export HF_TOKEN=$(powershell.exe -NoProfile -Command "[Environment]::GetEnvironmentVariable('HF_TOKEN','User')" 2>/dev/null | tr -d '\r')

NAMES=(barrel bucket crate sack cabbage potato onion carrot wheat)

# build sprite path list (absolute)
SPRITES=()
for n in "${NAMES[@]}"; do SPRITES+=("$PROJ/assets/sprites/$n.png"); done

echo "=== SF3D: generating ${#NAMES[@]} props (one model load) ==="
cd "$SF3D" || exit 1
rm -rf out_batch
"$PY" run.py "${SPRITES[@]}" --output-dir out_batch --texture-resolution 1024 2>sf3d_err.txt
if [ $? -ne 0 ]; then echo ">> SF3D run failed; see $SF3D/sf3d_err.txt"; tail -5 sf3d_err.txt | tr -d '\r'; exit 1; fi

echo "=== decimate + install each (keep UV texture) ==="
for i in "${!NAMES[@]}"; do
  name="${NAMES[$i]}"
  src="$SF3D/out_batch/$i/mesh.glb"
  out="$PROJ/assets/models/$name.glb"
  if [ ! -f "$src" ]; then echo "  MISSING $name ($src)"; continue; fi
  npx --yes @gltf-transform/cli optimize "$src" "$out" \
      --compress false --texture-compress false \
      --simplify true --simplify-ratio 0.25 --simplify-error 0.004 \
      >/dev/null 2>&1 && echo "  OK $name -> $(stat -c%s "$out") bytes" || echo "  DECIMATE FAIL $name"
done
echo "=== done ==="
