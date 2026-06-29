#!/usr/bin/env python
"""instantmesh.py — Crafted Realms prop pipeline, TEXTURED mesh via InstantMesh.

Flow: preprocess (bg removal) -> generate multiviews -> make3d -> textured .glb.

Usage:
    python tools/instantmesh.py <input_sprite.png> <output.glb>

Exits non-zero on failure (e.g. quota) for the batch driver.
"""
import os
import shutil
import sys

from gradio_client import Client, handle_file

SPACE = "TencentARC/InstantMesh"


def fpath(x):
    return x["value"] if isinstance(x, dict) else x


def main():
    if len(sys.argv) < 3:
        print("Usage: python tools/instantmesh.py <input.png> <output.glb>", file=sys.stderr)
        sys.exit(1)
    img, out = sys.argv[1], sys.argv[2]

    token = os.environ.get("HF_TOKEN") or None  # raises ZeroGPU quota; never printed
    client = Client(SPACE, token=token, verbose=False)

    # 1) preprocess (with background removal). Arity varies by Space version.
    try:
        proc = client.predict(handle_file(img), True, api_name="/preprocess")
    except TypeError:
        proc = client.predict(handle_file(img), api_name="/preprocess")
    proc_path = fpath(proc)

    # 2) multiview diffusion
    client.predict(handle_file(proc_path), 75, 42, api_name="/generate_mvs")

    # 3) reconstruct -> (obj, glb)
    res = client.predict(api_name="/make3d")
    glb = fpath(res[1] if len(res) > 1 else res[0])

    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    shutil.copy(glb, out)
    print(f"OK  {out}  {os.path.getsize(out)} bytes")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001
        print(f"INSTANTMESH FAIL: {type(e).__name__}: {str(e)[:400]}", file=sys.stderr)
        sys.exit(2)
