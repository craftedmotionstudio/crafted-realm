#!/usr/bin/env python
"""hunyuan_shape.py — Crafted Realms prop pipeline, mesh step.

Sends a sprite image to the Hunyuan3D-2 Hugging Face Space (shape-only,
with built-in background removal) and saves the returned .glb.

Usage:
    python tools/hunyuan_shape.py <input_sprite.png> <output.glb>

Requires: pip install gradio_client
Exits non-zero on any failure (e.g. ZeroGPU quota) so the batch driver
can stop cleanly when we run out of quota.
"""
import os
import shutil
import sys

from gradio_client import Client, handle_file

SPACE = "tencent/Hunyuan3D-2"


def main():
    if len(sys.argv) < 3:
        print("Usage: python tools/hunyuan_shape.py <input.png> <output.glb>", file=sys.stderr)
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
        api_name="/shape_generation",
    )

    mesh = res[0]
    path = mesh["value"] if isinstance(mesh, dict) else mesh
    stats = res[2] if len(res) > 2 and isinstance(res[2], dict) else {}

    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    shutil.copy(path, out)
    print(f"OK  {out}  {os.path.getsize(out)} bytes  faces={stats.get('number_of_faces', '?')}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001 — surface quota/errors to the driver
        print(f"HUNYUAN FAIL: {type(e).__name__}: {str(e)[:400]}", file=sys.stderr)
        sys.exit(2)
