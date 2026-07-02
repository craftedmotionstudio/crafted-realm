#!/usr/bin/env python
"""trellis.py — Crafted Realms character pipeline, TEXTURED mesh step (TRELLIS).

Microsoft TRELLIS image->3D via the `trellis-community/TRELLIS` HF Space (the official
JeffreyXiang/TRELLIS Space is currently CONFIG_ERROR). Runs on the Space GPU — no local
VRAM/CUDA toolkit needed (our portable ComfyUI is py3.13 / torch2.11 / 8GB, which can't
build TRELLIS's custom CUDA extensions locally). Outputs a UV-textured .glb.

Flow: start_session -> preprocess_image (bg-removed) -> get_seed -> generate_and_extract_glb.

Usage:
    python tools/trellis.py <input.png> <output.glb> [mesh_simplify] [texture_size]

Exits non-zero on failure (quota / space error) for the batch driver.
"""
import os
import shutil
import sys

from gradio_client import Client, handle_file

SPACE = "trellis-community/TRELLIS"


def fpath(x):
    if isinstance(x, dict):
        return x.get("value") or x.get("path") or x.get("url")
    return x


def main():
    if len(sys.argv) < 3:
        print("Usage: python tools/trellis.py <input.png> <output.glb> [mesh_simplify] [texture_size]", file=sys.stderr)
        sys.exit(1)
    img, out = sys.argv[1], sys.argv[2]
    mesh_simplify = float(sys.argv[3]) if len(sys.argv) > 3 else 0.9
    texture_size = int(sys.argv[4]) if len(sys.argv) > 4 else 1024

    token = os.environ.get("HF_TOKEN") or None  # ZeroGPU quota; never printed
    client = Client(SPACE, token=token, verbose=False)

    try:
        client.predict(api_name="/start_session")
    except Exception:
        pass  # some deployments don't require it

    client.predict(handle_file(img), api_name="/preprocess_image")
    seed = client.predict(False, 1234, api_name="/get_seed")
    seed = seed if isinstance(seed, (int, float)) else 1234

    res = client.predict(
        float(seed),   # seed
        7.5,           # ss_guidance_strength
        12,            # ss_sampling_steps
        3.0,           # slat_guidance_strength
        12,            # slat_sampling_steps
        "stochastic",  # multiimage_algo
        mesh_simplify, # mesh_simplify
        texture_size,  # texture_size
        api_name="/generate_and_extract_glb",
    )

    # returns (video, glb_model, download_glb). Pick the first .glb path.
    glb = None
    candidates = res if isinstance(res, (list, tuple)) else [res]
    for item in candidates:
        p = fpath(item)
        if isinstance(p, str) and p.lower().endswith(".glb"):
            glb = p
            break
    if not glb:
        raise RuntimeError(f"no .glb in result: {candidates}")

    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    shutil.copy(glb, out)
    print(f"OK  {out}  {os.path.getsize(out)} bytes  (simplify={mesh_simplify} tex={texture_size})")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001
        print(f"TRELLIS FAIL: {type(e).__name__}: {str(e)[:400]}", file=sys.stderr)
        sys.exit(2)
