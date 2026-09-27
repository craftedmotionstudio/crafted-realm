"""Run the M4.4 interior pass (build_holm_m44_interior.py, never edited) on another candidate folder (Holm v2 land,
2026-09-26: the cove haven gets the same furnishing pass as holm-haven-v2). Swaps its input and output folders only.
Run: blender -b --python tools/blender/run_holm_m44_interior_on.py -- <id> <in workspace> <out workspace>"""
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'tools/blender/build_holm_m44_interior.py'
a = sys.argv[sys.argv.index('--') + 1:]; bid, ws_in, ws_out = a[0], a[1], a[2]
src = SRC.read_text(encoding='utf-8')
old = "BASE=ROOT/f'.studio-workspaces/holm-{bid}-v1/candidates';OUT=ROOT/f'.studio-workspaces/holm-{bid}-v{ver}/candidates'"
assert old in src
src = src.replace(old, "BASE=ROOT/'.studio-workspaces/%s/candidates';OUT=ROOT/'.studio-workspaces/%s/candidates'" % (ws_in, ws_out))
old2 = "bid,ver=sys.argv[sys.argv.index('--')+1],int(sys.argv[sys.argv.index('--')+2])"
assert old2 in src
src = src.replace(old2, "bid,ver=%r,0" % bid)
exec(compile(src, str(SRC), 'exec'), {'__name__': '__main__', '__file__': str(SRC)})
