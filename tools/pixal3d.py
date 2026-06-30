#!/usr/bin/env python
"""pixal3d.py - Crafted Realms image-to-3D via the Pixal3D HF Space (TencentARC, SIGGRAPH 2026).

Pixel-aligned MULTI-VIEW generation -> much higher fidelity than single-view SF3D (no smeared
back/underside) + PBR textures. Runs on HF's GPU, so no local VRAM / FlashAttention needed.
Three-stage Space flow: /preprocess -> /generate_3d -> /extract_glb_api.

Usage:
    python tools/pixal3d.py <input.png> <output.glb> [resolution] [seed]

Needs HF_TOKEN in env (raises the ZeroGPU quota; never printed). Exits non-zero on failure.
"""
import json
import os
import shutil
import sys
import uuid

from gradio_client import Client, handle_file

SPACE = "TencentARC/Pixal3D"


def fpath(x):
    if isinstance(x, dict):
        return x.get("value") or x.get("path") or x.get("url") or x
    return x


def main():
    if len(sys.argv) < 3:
        print("Usage: python tools/pixal3d.py <input.png> <output.glb> [resolution] [seed]", file=sys.stderr)
        sys.exit(1)
    img, out = sys.argv[1], sys.argv[2]
    resolution = int(sys.argv[3]) if len(sys.argv) > 3 else 1024
    seed = int(sys.argv[4]) if len(sys.argv) > 4 else 42

    token = os.environ.get("HF_TOKEN") or None  # raises ZeroGPU quota; never printed
    sid = uuid.uuid4().hex
    # download_files=False -> don't auto-fetch the Space's intermediate render files (those 403);
    # we pull only the final GLB ourselves.
    client = Client(SPACE, token=token, verbose=False, download_files=False)

    import httpx
    auth = {"Authorization": f"Bearer {token}"} if token else {}

    def grab(ref, dest):
        """download a Space file ref (dict/url) to a local path."""
        u = ref.get("url") if isinstance(ref, dict) else ref
        r = httpx.get(u, headers=auth, timeout=180, follow_redirects=True)
        r.raise_for_status()
        with open(dest, "wb") as f:
            f.write(r.content)
        return dest

    import tempfile
    tmp = tempfile.gettempdir()

    print("[1/3] preprocess ...", flush=True)
    pre = client.predict(handle_file(img), api_name="/preprocess")
    print("  ->", str(pre)[:160], flush=True)
    local_pre = grab(pre, os.path.join(tmp, "pixal3d_pre.png"))   # pull preprocessed image local

    print("[2/3] generate_3d (multi-view cascade) ...", flush=True)
    state = client.predict(handle_file(local_pre), seed, resolution, api_name="/generate_3d", session_id=sid)
    print("  state type:", type(state).__name__, flush=True)
    state_path = None
    if isinstance(state, dict):
        print("  state keys:", list(state.keys())[:25], flush=True)
        print("  state dump:", json.dumps(state, default=str)[:900], flush=True)
        for k in ("state_path", "model_path", "path", "value", "state", "mesh_path", "glb_path"):
            v = state.get(k)
            if isinstance(v, str) and v:
                state_path = v
                break
    else:
        state_path = str(state)
    print("  -> state_path:", state_path, flush=True)

    print("[3/3] extract_glb ...", flush=True)
    # face budget: keep meshes light enough to rig (UniRig) on an 8GB GPU and run in-engine.
    # 40k chokes UniRig near-OOM; ~12k is plenty for a stylized low-poly character.
    faces = int(os.environ.get("PIXAL3D_FACES", "12000"))
    glb_ref = client.predict(state_path, faces, 1024, api_name="/extract_glb_api", session_id=sid)
    print("  glb_ref:", json.dumps(glb_ref, default=str)[:300], flush=True)
    # resolve the final GLB url/path and download it ourselves (with auth)
    url = None
    if isinstance(glb_ref, dict):
        url = glb_ref.get("url") or glb_ref.get("path") or glb_ref.get("value")
    else:
        url = str(glb_ref)
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    if url and url.startswith("http"):
        import httpx
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        r = httpx.get(url, headers=headers, timeout=120, follow_redirects=True)
        r.raise_for_status()
        with open(out, "wb") as f:
            f.write(r.content)
    elif url and os.path.exists(url):
        shutil.copy(url, out)
    else:
        print("PIXAL3D FAIL: could not resolve GLB url:", url, file=sys.stderr)
        sys.exit(3)
    print(f"OK  {out}  {os.path.getsize(out)} bytes")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:  # noqa: BLE001
        print(f"PIXAL3D FAIL: {type(e).__name__}: {str(e)[:600]}", file=sys.stderr)
        sys.exit(2)
