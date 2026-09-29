"""The private look v4 review page: 2004 next to the current look (v3) and options 4a / 4b / 4c on the same scenes, at
the same lens, with the numbers under each frame (tools/ref2004/look_metrics.py).

    python tools/ref2004/look_options_page.py

Reads C:/Users/iQwaZ/ref2004_captures/look_options/<option>/ (tools/ref2004/capture_look_options.js) and metrics.json,
and the 2004 frames already on disk (scenery/2004, tutorial/2004, characters/2004). Writes
C:/Users/iQwaZ/ref2004_captures/review/look_options.html + review/look_options/ (images). IP rule: the page holds 2004
imagery, so it is written outside the repo only (refused inside it) and is never published.
"""
import html
import json
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))
import look_metrics as M  # noqa: E402

CAP = M.CAP
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ROOT = os.path.join(CAP, 'look_options')
REVIEW = os.path.join(CAP, 'review')
IMG = os.path.join(REVIEW, 'look_options')
OPTS = ['3', '4a', '4b', '4c']
NAMES = {'2004': '2004 (reference)', '3': 'Current (look v3)', '4a': '4a Slight pixels', '4b': '4b 2004 pixels and colours', '4c': '4c Planey and plain'}
ONE_LINE = {
    '3': 'Today\'s default: full-resolution, anti-aliased, smooth colours; the 2004 light (luminance band) already matches.',
    '4a': 'Only the pixels: the world drawn at the 2004 window\'s full height (503 lines, 2-pixel blocks at 1006 px), hard edges; colours, textures and shading as today.',
    '4b': '2004\'s own pixel size (334 lines, 3-pixel blocks) and 2004\'s colour range (banded gradients, ~1,000 colours a view), chunky texels; characters shaded a little flatter, to 2004\'s measure.',
    '4c': '4b plus flat faces on every model and character, wood / plaster / roofs / bark in plain colour, and bolder stone, cobbles, leaves and water.',
}
# each page scene: the 2004 frame that plays the same part (same lens, pitch 128), and ours
SCENES = [
    ('Arrival dock', 'A landing by water (2004: the river by the bridge)', ('scenery/2004/water_river_p128_y0.png', '2004'), 'scenes/dock_y512.png'),
    ('Guide House front', 'A stone building\'s door (2004: the castle courtyard door)', ('scenery/2004/town_courtyard_p128_y512.png', '2004'), 'scenes/guide_front.png'),
    ('A field', 'Grass and trees (2004: the field with trees)', ('scenery/2004/field_trees_p128_y0.png', '2004'), 'scenes/field_y1280.png'),
    ('Water', 'A river / creek bank (2004: the river)', ('scenery/2004/water_river_p128_y1536.png', '2004'), 'scenes/water_y512.png'),
    ('Building interior', 'Inside a house, the roof lifted (2004: the tutorial kitchen)', ('tutorial/2004/chef_building.png', '2004'), 'scenes/interior_y0.png'),
    ('Town paths', 'Paths between buildings (2004: the castle courtyard)', ('scenery/2004/town_courtyard_p128_y0.png', '2004'), 'scenery/town_holm_p128_y256.png'),
]
CHAR = [('characters/2004/m/close_rel0.png', 'character/close_rel0.png', 'front'), ('characters/2004/m/close_rel256.png', 'character/close_rel256.png', '3/4 front')]


def guard(d):
    if os.path.abspath(d).lower().startswith(REPO.lower()):
        raise SystemExit('refusing to write 2004 imagery inside the repo: ' + d)
    os.makedirs(d, exist_ok=True)
    return d


def view_image(path, kind):
    """The 3D view as it fills a 1530 x 1006 window: 2004's viewport x3 with hard pixels, ours as captured."""
    im = Image.open(path).convert('RGB')
    if kind == '2004':
        return im.crop(M.VIEW2004).resize((1536, 1002), Image.NEAREST)
    return im


def save_jpg(im, name):
    p = os.path.join(IMG, name)
    im.save(p, quality=90)
    return 'look_options/' + name


def save_png(im, name):
    p = os.path.join(IMG, name)
    im.save(p, optimize=True)
    return 'look_options/' + name


def nums_scene(m):
    f = M.flat_metrics(m)
    return [('pixel', '%d px blocks, %.1f lines/deg' % (f['block_px'], f['lines_per_deg'])), ('colours', '%d (90%%: %d)' % (f['unique'], f['colours_90'])),
            ('gradient', '%.1f colours / patch' % f['ramp_levels'] if f.get('ramp_levels') else '-'),
            ('texture', 'busy %.2f, fine detail %.1f' % (f['busy_share'], f['surface_hf'])),
            ('shading', 'jumps %.2f, gradient %.2f, plain %.2f' % (f['facet_share'], f['ramp_share'], f['flat_share'])),
            ('light', 'lum %.2f, sat %.2f' % (f['lum_mean'], f['mean_sat']))]


def nums_char(c):
    return [('shading', 'jumps %.2f, gradient %.2f, plain %.2f' % (c['char_facet_share'], c['char_ramp_share'], c['char_flat_share'])),
            ('colours', '%d in the body' % c['char_colours'])]


def cell(src, nums, title=None):
    rows = ''.join('<tr><th>%s</th><td>%s</td></tr>' % (html.escape(k), html.escape(v)) for k, v in nums)
    t = '<div class="ct">%s</div>' % html.escape(title) if title else ''
    return '<figure>%s<a href="%s" target="_blank"><img src="%s" loading="lazy" alt=""></a><table class="n">%s</table></figure>' % (t, src, src, rows)


def main():
    guard(IMG)
    met = json.load(open(os.path.join(ROOT, 'metrics.json')))
    ref, opts = met['2004'], met['options']
    parts = []
    # --- scenes
    for si, (title, sub, (p4, k4), ours) in enumerate(SCENES):
        cells = []
        a = os.path.join(CAP, p4)
        cells.append(cell(save_jpg(view_image(a, k4), 's%d_2004.jpg' % si), nums_scene(M.measure(a, k4)), NAMES['2004']))
        for o in OPTS:
            p = os.path.join(ROOT, o, ours)
            if not os.path.exists(p):
                cells.append('<figure><div class="ct">%s</div><div class="miss">not captured</div></figure>' % NAMES[o])
                continue
            cells.append(cell(save_jpg(view_image(p, 'ours'), 's%d_%s.jpg' % (si, o)), nums_scene(M.measure(p, 'ours')), NAMES[o]))
        parts.append('<section><h2>%s</h2><p class="sub">%s. Same lens: 36.1 deg view, 22.5 deg above the ground, 7.7-tile boom.</p><div class="row">%s</div></section>'
                     % (html.escape(title), html.escape(sub), ''.join(cells)))
    # --- the adventurer close up
    for ci, (p4, po, lab) in enumerate(CHAR):
        cells = []
        a = os.path.join(CAP, p4)
        c4 = M.character(a, a.replace('.png', '_plate.png'), '2004')
        cells.append(cell(save_jpg(view_image(a, '2004'), 'c%d_2004.jpg' % ci), nums_char(c4), NAMES['2004']))
        for o in OPTS:
            p = os.path.join(ROOT, o, po)
            if not os.path.exists(p):
                continue
            c = M.character(p, p.replace('.png', '_plate.png'), 'ours')
            cells.append(cell(save_jpg(view_image(p, 'ours'), 'c%d_%s.jpg' % (ci, o)), nums_char(c), NAMES[o]))
        parts.append('<section><h2>The adventurer close up (%s)</h2><p class="sub">Height-matched to the 2004 close-up (same share of the view). Only material shading changes between options; the body, clips and colours are the character kit\'s.</p><div class="row">%s</div></section>'
                     % (lab, ''.join(cells)))
    # --- 100% crops (pixel size): the town frame and the close-up, 480 x 320 screen pixels each
    crops = []
    for (src4, box4, srco, boxo, lab) in [('scenery/2004/town_courtyard_p128_y0.png', (420, 240), 'scenery/town_holm_p128_y256.png', (560, 250), 'Town paths'),
                                          ('characters/2004/m/close_rel256.png', (480, 150), 'character/close_rel256.png', (540, 150), 'The adventurer')]:
        cells = []
        im = view_image(os.path.join(CAP, src4), '2004').crop((box4[0], box4[1], box4[0] + 480, box4[1] + 320))
        cells.append('<figure><div class="ct">%s</div><img class="px" src="%s" alt=""></figure>' % (NAMES['2004'], save_png(im, 'crop_%s_2004.png' % lab.split()[-1].lower())))
        for o in OPTS:
            p = os.path.join(ROOT, o, srco)
            if os.path.exists(p):
                im = view_image(p, 'ours').crop((boxo[0], boxo[1], boxo[0] + 480, boxo[1] + 320))
                cells.append('<figure><div class="ct">%s</div><img class="px" src="%s" alt=""></figure>' % (NAMES[o], save_png(im, 'crop_%s_%s.png' % (lab.split()[-1].lower(), o))))
        crops.append('<h3>%s</h3><div class="row crops">%s</div>' % (lab, ''.join(cells)))
    # --- summary table
    def v(d, k, fmt):
        x = d.get(k)
        return fmt % x if isinstance(x, (int, float)) else '-'
    ROWS = [('Pixels', [('Hard pixel block on screen (px)', 'block_px', '%d'), ('Rendered lines per degree of view', 'lines_per_deg', '%.2f')]),
            ('Colours', [('Distinct colours in the view', 'unique', '%.0f'), ('Colours covering 90% of it', 'colours_90', '%.0f'), ('Colours inside a smooth-gradient patch (banding)', 'ramp_levels', '%.1f')]),
            ('Shading of plain surfaces (share)', [('Hard jumps between faces ("planey")', 'facet_share', '%.3f'), ('Smooth gradients ("round")', 'ramp_share', '%.3f'), ('One flat tone ("plain")', 'flat_share', '%.3f')]),
            ('Texture', [('Share of surface that is busy (textured)', 'busy_share', '%.3f'), ('Fine detail inside surfaces (levels)', 'surface_hf', '%.2f'),
                         ('Stone / grey: busy, detail', ('grey_busy', 'grey_hf'), '%.2f'), ('Grass / leaves: busy, detail', ('green_busy', 'green_hf'), '%.2f'),
                         ('Earth / wood / roofs: busy, detail', ('earth_busy', 'earth_hf'), '%.2f'), ('Water: busy, detail', ('blue_busy', 'blue_hf'), '%.2f')]),
            ('Light', [('Mean luminance (0-1)', 'lum_mean', '%.3f'), ('Mean saturation', 'mean_sat', '%.3f')])]
    head = '<tr><th></th><th>2004</th>' + ''.join('<th>%s</th>' % html.escape(NAMES[o]) for o in OPTS) + '</tr>'
    body = ''
    for grp, rows in ROWS:
        body += '<tr class="g"><td colspan="%d">%s</td></tr>' % (2 + len(OPTS), html.escape(grp))
        for lab, key, fmt in rows:
            def fv(d):
                if isinstance(key, tuple):
                    return ' / '.join(v(d, k, fmt) for k in key)
                return v(d, key, fmt)
            body += '<tr><td>%s</td><td class="ref">%s</td>%s</tr>' % (html.escape(lab), fv(ref['all']), ''.join('<td>%s</td>' % fv(opts[o]['all']) for o in OPTS if o in opts))
    body += '<tr class="g"><td colspan="%d">The adventurer (close-up, inside the body)</td></tr>' % (2 + len(OPTS))
    for lab, key, fmt in [('Hard jumps between faces', 'char_facet_share', '%.3f'), ('Smooth gradients', 'char_ramp_share', '%.3f'), ('One flat tone', 'char_flat_share', '%.3f'), ('Colours in the body', 'char_colours', '%.0f')]:
        body += '<tr><td>%s</td><td class="ref">%s</td>%s</tr>' % (lab, v(ref['character'], key, fmt), ''.join('<td>%s</td>' % v(opts[o].get('character', {}), key, fmt) for o in OPTS if o in opts))
    body += '<tr class="g"><td colspan="%d">Distance to 2004 (0 = the same; lower is closer)</td></tr>' % (2 + len(OPTS))
    for lab, key in [('Scenery', 'distance'), ('Adventurer', 'char_distance'), ('Overall', 'overall')]:
        body += '<tr class="%s"><td>%s</td><td class="ref">0</td>%s</tr>' % ('tot' if key == 'overall' else '', lab, ''.join('<td>%s</td>' % v(opts[o], key, '%.3f') for o in OPTS if o in opts))
    best = min((o for o in OPTS if o in opts and 'overall' in opts[o]), key=lambda o: opts[o]['overall'])
    cards = ''.join('<div class="card%s"><h3>%s</h3><p>%s</p><p class="d">Overall distance to 2004: <b>%s</b></p></div>'
                    % (' best' if o == best else '', html.escape(NAMES[o]), html.escape(ONE_LINE[o]), v(opts[o], 'overall', '%.3f')) for o in OPTS if o in opts)
    rec = open(os.path.join(ROOT, 'recommendation.html')).read() if os.path.exists(os.path.join(ROOT, 'recommendation.html')) else ''
    page = PAGE.replace('{{CARDS}}', cards).replace('{{TABLE}}', '<table class="m">' + head + body + '</table>').replace('{{SCENES}}', ''.join(parts)) \
        .replace('{{CROPS}}', ''.join(crops)).replace('{{REC}}', rec).replace('{{BEST}}', NAMES[best])
    out = os.path.join(REVIEW, 'look_options.html')
    open(out, 'w', encoding='utf-8').write(page)
    print('->', out, '| closest overall:', best)


PAGE = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Look v4 options</title>
<style>
:root{--bg:#15130f;--panel:#201d17;--ink:#ece6d6;--mute:#a79f8c;--line:#3a352b;--ref:#e3c26a;--best:#7fbf6a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.45 system-ui,Segoe UI,Arial,sans-serif}
main{max-width:1900px;margin:0 auto;padding:20px 16px 60px}h1{font-size:26px;margin:0 0 4px}h2{font-size:20px;margin:34px 0 2px}h3{margin:18px 0 6px}
.sub{color:var(--mute);margin:0 0 10px}.note{color:var(--mute);max-width:1100px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin:16px 0}
.card{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:10px 14px}.card h3{margin:4px 0}.card p{margin:6px 0}.card .d{color:var(--mute)}
.card.best{border-color:var(--best);box-shadow:0 0 0 1px var(--best) inset}
.row{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
@media (max-width:1100px){.row{grid-template-columns:repeat(2,minmax(0,1fr))}}
figure{margin:0;background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:6px;min-width:0}
figure img{width:100%;display:block;border-radius:3px}.ct{font-weight:600;margin:0 0 5px;font-size:14px}
img.px{image-rendering:pixelated;width:auto;max-width:100%}.crops figure{overflow:auto}
table.n{width:100%;border-collapse:collapse;font-size:12px;margin-top:5px}table.n th{text-align:left;color:var(--mute);font-weight:500;padding:1px 6px 1px 0;white-space:nowrap;vertical-align:top}table.n td{padding:1px 0}
table.m{border-collapse:collapse;margin:10px 0;font-size:14px;width:100%;max-width:1400px}table.m th,table.m td{border-bottom:1px solid var(--line);padding:4px 10px;text-align:right}
table.m td:first-child,table.m th:first-child{text-align:left}table.m td.ref{color:var(--ref)}table.m tr.g td{color:var(--mute);font-weight:600;text-align:left;padding-top:12px}
table.m tr.tot td{font-weight:700}.miss{color:var(--mute);padding:40px 0;text-align:center}
.rec{background:var(--panel);border:1px solid var(--best);border-radius:8px;padding:12px 16px;max-width:1300px}
.wrap{overflow-x:auto}
</style></head><body><main>
<h1>Look v4 options, measured against 2004</h1>
<p class="sub">Private review page (local only, never published). 2004 frames come from the local reference run; every target is a number or our own eyes, nothing of 2004's is in our assets. Switch in game with <code>?look=4a</code>, <code>?look=4b</code>, <code>?look=4c</code> or <code>?look=3</code> (the current look). None of the options is the default.</p>
<div class="cards">{{CARDS}}</div>
<div class="rec">{{REC}}</div>
<h2>The numbers</h2>
<p class="sub">Mean over the harness's matched scenery frames (town, field, water; 2004: 15 frames at pitch 128, ours: 6 frames through the 2004 lens) and the two close-ups. Content numbers are taken at the 2004 pixel scale (our 1530 x 1006 frames averaged 3 x 3 = one 2004 pixel). Closest overall: <b>{{BEST}}</b>.</p>
<div class="wrap">{{TABLE}}</div>
<p class="note">How to read it. <b>Pixels</b>: how big a hard pixel is and how many lines the 3D view is drawn with (2004: 334 lines over its 36 degree view). <b>Colours</b>: 2004 draws with a 16-bit colour range, so a view holds about a thousand colours and gradients step in bands. <b>Shading</b>: the view is cut into small patches; a patch is a hard jump between faces, a smooth gradient, one flat tone, busy (texture) or an object edge. <b>Texture</b>: how much of each surface family is busy, and how strong its fine detail is. <b>Distance</b>: each number's gap to 2004 in plain units, averaged (pixels, colours, shading, texture, light; the adventurer's shading and colours).</p>
{{SCENES}}
<h2>At 100% (the pixel size)</h2>
<p class="sub">480 x 320 screen pixels, unscaled (2004's view scaled x3 to fill the same window). Not the same spot in both games: this row is for the size and hardness of the pixels.</p>
{{CROPS}}
</main></body></html>'''

if __name__ == '__main__':
    main()
