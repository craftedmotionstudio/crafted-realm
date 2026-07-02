#!/usr/bin/env python
"""triposg.py — Crafted Realms character pipeline, TEXTURED mesh step (TripoSG).

VAST-AI TripoSG image->3D + texture via the `VAST-AI/TripoSG` HF Space. Stateless API
(image passed directly), runs on the Space GPU. Used as the textured-gen backend because
the Hunyuan-2 textured endpoint (NameError) and the only live TRELLIS Space's generate
step (AppError) are both broken, and local TRELLIS won't build on our py3.13/8GB/no-nvcc box.

Flow: start_session -> image_to_3d -> run_texture.

Usage:
    python tools/triposg.py <input.png> <output.glb> [target_face_num]
"""
import os
import shutil
import sys

from gradio_client import Client, handle_file

SPACE = "VAST-AI/TripoSG"


def fpath(x):
    if isinstance(x, dict):
        return x.get("value") or x.get("path") or x.get("url")
    return x


def main():
    if len(sys.argv) < 3:
        print("Usage: python tools/triposg.py <input.png> <output.glb> [target_face_num]", file=sys.stderr)
        sys.exit(1)
    img, out = sys.argv[1], sys.argv[2]
    target_faces = int(sys.argv[3]) if len(sys.argv) > 3 else 60000

    token = os.environ.get("HF_TOKEN") or None
    client = Client(SPACE, token=token, verbose=False)
    try:
        client.predict(api_name="/start_session")
    except Exception:
        pass

    mesh = client.predict(
        handle_file(img),  # image
        0,                 # seed
        50,                # num_inference_steps
        7.0,               # guidance_scale
        True,              # simplify
        target_faces,      # target_face_num
        api_name="/image_to_3d",
    )
    mesh_path = fpath(mesh)
    print(f"  shape done -> {mesh_path}", file=sys.stderr)

    textured = client.predict(
        handle_file(img),            # image
        handle_file(mesh_path),      # mesh_path
        0,                           # seed
        api_name="/run_texture",
    )
    tex_path = fpath(textured)
    if not (isinstance(tex_path, str) and tex_path.lower().endswith(".glb")):
        raise RuntimeError(f"no textured .glb: {textured}")

    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    shutil.copy(tex_path, out)
    print(f"OK  {out}  {os.path.getsize(out)} bytes  (faces<= {target_faces})")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001
        print(f"TRIPOSG FAIL: {type(e).__name__}: {str(e)[:400]}", file=sys.stderr)
        sys.exit(2)
