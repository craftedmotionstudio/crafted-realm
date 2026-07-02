#!/usr/bin/env python
"""partpacker.py - Crafted Realms image-to-3D via NVIDIA PartPacker HF Space.

PartPacker generates a 3D mesh whose semantic PARTS are SEPARATE, complete sub-meshes from a
single image (dual volume packing). For a character that means torso / legs / arms / hair as
distinct objects -> razor-sharp region boundaries by construction (no painting a fused mesh) AND
the modular pieces we need for swappable clothing. Untextured -> we colour the parts in Blender.

Space flow (from spaces/nvidia/PartPacker/app.py):
  /process_image(image_path) -> recentered 518x518 RGBA
  /process_3d(input_image, num_steps=50, cfg_scale=7, grid_res=384, seed=42,
              simplify_mesh=False, target_num_faces=100000) -> output GLB path

Usage:
    python tools/partpacker.py <input.png> <output.glb> [seed] [grid_res] [steps]

Needs HF_TOKEN in env (raises ZeroGPU quota; never printed). Exits non-zero on failure.
"""
import os
import shutil
import sys

from gradio_client import Client, handle_file

SPACE = os.environ.get("PARTPACKER_SPACE", "nvidia/PartPacker")


def main():
    if len(sys.argv) < 3:
        print("Usage: python tools/partpacker.py <input.png> <output.glb> [seed] [grid_res] [steps]", file=sys.stderr)
        sys.exit(1)
    img, out = sys.argv[1], sys.argv[2]
    seed = int(sys.argv[3]) if len(sys.argv) > 3 else 42
    grid_res = int(sys.argv[4]) if len(sys.argv) > 4 else 384
    steps = int(sys.argv[5]) if len(sys.argv) > 5 else 50

    if not os.path.exists(img):
        print(f"PARTPACKER FAIL: input not found: {img}", file=sys.stderr)
        sys.exit(1)

    token = os.environ.get("HF_TOKEN") or None  # raises ZeroGPU quota; never printed
    client = Client(SPACE, token=token, verbose=False)  # download_files=True -> get local paths back

    print("[1/2] process_image (recenter + bg) ...", flush=True)
    seg = client.predict(handle_file(img), api_name="/process_image")
    print("  -> seg:", str(seg)[:160], flush=True)

    print(f"[2/2] process_3d (seed={seed} grid={grid_res} steps={steps}) ...", flush=True)
    # seg is a local filepath to the recentered RGBA image; feed it back as the Image input
    seg_in = handle_file(seg) if isinstance(seg, str) and os.path.exists(seg) else seg
    glb = client.predict(
        seg_in, steps, 7, grid_res, seed, False, 100000,
        api_name="/process_3d",
    )
    print("  -> glb:", str(glb)[:200], flush=True)

    # resolve the returned GLB (gradio_client downloads it -> local path, or a dict/url)
    path = glb
    if isinstance(glb, dict):
        path = glb.get("path") or glb.get("value") or glb.get("url")
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    if isinstance(path, str) and os.path.exists(path):
        shutil.copy(path, out)
    elif isinstance(path, str) and path.startswith("http"):
        import httpx
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        r = httpx.get(path, headers=headers, timeout=300, follow_redirects=True)
        r.raise_for_status()
        with open(out, "wb") as f:
            f.write(r.content)
    else:
        print("PARTPACKER FAIL: could not resolve GLB:", str(path)[:200], file=sys.stderr)
        sys.exit(3)
    print(f"OK  {out}  {os.path.getsize(out)} bytes")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001
        print(f"PARTPACKER FAIL: {type(e).__name__}: {str(e)[:600]}", file=sys.stderr)
        sys.exit(2)
