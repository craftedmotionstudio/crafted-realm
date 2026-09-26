"""Re-run an existing measuring script (navigation extractor, landscape measure) on textured old-school candidates by
swapping workspace folder names in its source text, the way extract_holm_quest_terrain_navigation_v4.py re-runs v1.
The script itself is never edited; its tolerances, probes and outputs stay exactly as written, only the input and
output folders change. Every swap must occur in the source, or the run stops.
Run: blender -b --python tools/blender/relock_with_swapped_paths.py -- <args.json>
  args.json: {"script": "tools/blender/<measuring script>.py", "replace": [["old folder", "new folder"], ...]}"""
import sys, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
args = json.loads(Path(sys.argv[sys.argv.index('--') + 1]).read_text())
script = (ROOT / args['script']).resolve()
src = script.read_text(encoding='utf-8')
for old, new in args['replace']:
    assert old in src, 'swap not found in ' + args['script'] + ': ' + old
    src = src.replace(old, new)
namespace = {'__name__': '__main__', '__file__': str(script)}
exec(compile(src, str(script), 'exec'), namespace)
print('[RELOCK] ran', args['script'], 'with', len(args['replace']), 'folder swaps')
