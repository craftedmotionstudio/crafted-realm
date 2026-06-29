#!/usr/bin/env python
"""hunyuan_textured.py — Crafted Realms prop pipeline, TEXTURED mesh step.

Like hunyuan_shape.py but calls /generation_all so Hunyuan3D-2 also paints a
texture (multiview-consistent, sampled from the input sprite's colours).
Runs on the HF Space GPU, so no local VRAM needed.

Usage:
    python tools/hunyuan_textured.py <input_sprite.png> <output.glb>

Exits non-zero on failure (e.g. quota) for the batch driver.
"""
import os
import shutil
import sys

from gradio_client import Client, handle_file

SPACE = "tencent/Hunyuan3D-2"


def fpath(x):
    return x["value"] if isinstance(x, dict) else x


def main():
    if len(sys.argv) < 3:
        print("Usage: python tools/hunyuan_textured.py <input.png> <output.glb>", file=sys.stderr)
        sys.exit(1)
    img, out = sys.argv[1], sys.argv[2]

    token = os.environ.get("HF_TOKEN") or None  # raises ZeroGPU quota; never printed
    client = Client(SPACE, token=token, verbose=False)
    res = client.predict(
        caption=None,
        image=handle_file(img),
        steps=30,
        guidance_scale=5.0,
        seed=1234,
        octree_resolution=256,
        check_box_rembg=True,
        num_chunks=8000,
        randomize_seed=False,
        api_name="/generation_all",
    )

    # generation_all -> (file, file, output, mesh_stats, seed)
    # index 0 = white shape mesh, index 1 = textured mesh
    white = fpath(res[0])
    textured = fpath(res[1]) if len(res) > 1 and res[1] else None
    chosen = textured or white

    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    shutil.copy(chosen, out)
    wsz = os.path.getsize(white) if white and os.path.exists(white) else 0
    tsz = os.path.getsize(textured) if textured and os.path.exists(textured) else 0
    print(f"OK  {out}  {os.path.getsize(out)} bytes  (white={wsz} textured={tsz})")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001
        print(f"HUNYUAN FAIL: {type(e).__name__}: {str(e)[:400]}", file=sys.stderr)
        sys.exit(2)
