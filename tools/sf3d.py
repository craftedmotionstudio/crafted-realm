#!/usr/bin/env python
"""sf3d.py — Crafted Realms prop pipeline, TEXTURED mesh via Stable-Fast-3D.

One HF Space call does background removal + mesh + remesh-to-target + texture
atlas, returning a game-ready textured .glb (no separate decimation needed).

Usage:
    python tools/sf3d.py <input_sprite.png> <output.glb> [vertex_count] [texture_size]

Exits non-zero on failure (e.g. quota) for the batch driver.
"""
import os
import shutil
import sys

from gradio_client import Client, handle_file

SPACE = "stabilityai/stable-fast-3d"


def fpath(x):
    return x["value"] if isinstance(x, dict) else x


def main():
    if len(sys.argv) < 3:
        print("Usage: python tools/sf3d.py <input.png> <output.glb> [vtx] [texsize]", file=sys.stderr)
        sys.exit(1)
    img, out = sys.argv[1], sys.argv[2]
    vtx = float(sys.argv[3]) if len(sys.argv) > 3 else 6000
    texsize = float(sys.argv[4]) if len(sys.argv) > 4 else 1024

    token = os.environ.get("HF_TOKEN") or None  # raises ZeroGPU quota; never printed
    client = Client(SPACE, token=token, verbose=False)
    res = client.predict(
        handle_file(img),  # input_image
        0.85,              # foreground_ratio
        "Triangle",        # remesh_option
        vtx,               # target vertex count
        texsize,           # texture size
        api_name="/run_button",
    )

    glb = fpath(res[1])  # (preview_image, 3d_model)
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    shutil.copy(glb, out)
    print(f"OK  {out}  {os.path.getsize(out)} bytes")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001
        print(f"SF3D FAIL: {type(e).__name__}: {str(e)[:400]}", file=sys.stderr)
        sys.exit(2)
