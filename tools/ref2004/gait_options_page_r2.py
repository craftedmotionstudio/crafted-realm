"""Round 2 of the owner's PRIVATE gait / mesh comparison page (review 5, 2026-09-28): round-2 walk / run options D, E, F,
the mesh options a, b, c, and round 1 kept below for reference.

    python tools/ref2004/gait_options_page_r2.py [--genders m,f]

Reads the captures (characters/2004/<g>, ours_cur, ours_r2D/E/F, ours_mA/B/C), the option notes and skeleton numbers
(.studio-workspaces/holm-gait-options-v1/candidates/manifest.json), the equipment fit results (fit/<set>) and the mesh
option manifests. Writes ONLY to C:/Users/iQwaZ/ref2004_captures/review/ (gait_options.html + gait_options/*); the round-1
page is kept as gait_options_round1.html and embedded at the bottom. Holds 2004 imagery: never committed or published.
"""
import html
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import analyze as A  # noqa: E402
import facet_metrics as FM  # noqa: E402
import gait_options_page as P1  # noqa: E402

E = html.escape
CH = P1.CH
WS = os.path.join(A.REPO, '.studio-workspaces')
R2 = ['r2D', 'r2E', 'r2F']
MESH = ['mA', 'mB', 'mC']
MESH_NOTE = {
    'mA': ('Mesh a -- flat shading', 'The shipped mesh drawn with one normal per triangle (the renderer\'s flat shading on the player '
                                     'only): every facet shows. No new model; ?kitmesh=a.'),
    'mB': ('Mesh b -- squarer body, one-piece boots', 'A squarer torso (a boxier cross-section with flat front, side and back '
                                                      'planes; the corners kept where they were so armour still fits), fuller '
                                                      'thigh caps blending into the waist, the plain trousers tucked into boots '
                                                      'that rise to mid-shin as one piece, and a crease wherever the surface turns '
                                                      'more than 30 deg. ?kitmesh=b.'),
    'mC': ('Mesh c -- creased panels', 'The shipped model with a crease wherever the surface turns more than 36 deg (was 80): the '
                                       'broad smooth panels break into flat planes, between the shipped look and mesh a. ?kitmesh=c.'),
}
GAIT_KEYS = [('head bob', 'head_bob_pct', '%.1f %%'), ('lean (spine)', 'spine_lean_deg', '%.0f deg'), ('face down', 'face_down_deg', '%.0f deg')]
KNEE_KEYS = [('knee at heel strike', 'knee_flex_at_contact_deg'), ('knee at mid-stance', 'knee_flex_mid_stance_deg'),
             ('knee at toe-off', 'knee_flex_at_toe_off_deg'), ('knee just before landing (straightest)', 'knee_flex_swing_end_min_deg'),
             ('thigh drive (knee lift)', 'thigh_drive_max_deg'), ('both feet off the ground', 'flight_share')]


def arg(k, d):
    return sys.argv[sys.argv.index('--' + k) + 1] if '--' + k in sys.argv else d


def fit_line(key):
    """equipment fit at idle / walk / run: tests, clipping-through failures (worn / held item inside the body, hair through
    a cape, legs crossing) and gap failures (kit surface under an item whose outward probe misses it, > 2 vertices)"""
    p = os.path.join(P1.FIT, key, 'fit_check_gait%s.json' % key)
    if not os.path.exists(p):
        return None
    d = json.load(open(p))
    tests = through = gaps = 0
    kinds = {}
    for kind, rows in d['rows'].items():
        rows = [r for r in rows if r.get('clip', 'idle') in ('idle', 'walk', 'run')]
        tests += len(rows)
        for r in rows:
            t_ = bool(r.get('through') or r.get('through_body') or r.get('hair_through') or r.get('lr_cross'))
            g_ = r.get('exposed', 0) > 2
            through += t_
            gaps += (g_ and not t_)
            if t_ or g_:
                kinds[kind] = kinds.get(kind, 0) + 1
    return {'tests': tests, 'through': through, 'gaps': gaps, 'kinds': kinds}


def fit_html(key, label):
    f, b = fit_line(key), fit_line('base')
    if not f:
        return ''
    ref = (' (shipped: %d / %d)' % (b['through'], b['gaps'])) if b else ''
    return ('<br>equipment fit, %s: <b>%d</b> clipping through, <b>%d</b> small gaps of %d tests%s%s' % (
        label, f['through'], f['gaps'], f['tests'], ref, (' -- ' + ', '.join('%s %d' % kv for kv in sorted(f['kinds'].items()))) if f['kinds'] else ''))


def gifs(g, s, game, gdir, rows):
    out_dir = A.out2004('review', 'gait_options')
    met = P1.summarize(FM_capture_gait(gdir), 1.523 if game == '2004' else 1.5)
    Hs = (met.get('walk') or {}).get('H_px')
    cell = {'metrics': met}
    for mode, cam in rows:
        key = '%s_%s_%s_%s' % (g, s, mode, cam)
        if mode == 'idle':
            rel = {'front': 0, 'side': 512, '3/4': 256}[cam]
            cell[(mode, cam)] = P1.idle_still(game, gdir, rel, os.path.join(out_dir, key.replace('/', '') + '.png'))
            continue
        fp = os.path.join(out_dir, key + '.gif')
        fr = P1.one_cycle(game, gdir, mode, cam)
        if cam == 'side':
            cell[(mode, cam)] = P1.make_gif(fr, Hs, fp, game == '2004')
        else:
            hs = [f[2][1] - f[3] for f in fr if f[3] is not None]
            cell[(mode, cam)] = P1.make_gif(fr, sorted(hs)[len(hs) // 2] if hs else None, fp, game == '2004', box_w=0.80, box_up=1.25, box_down=0.18)
    return cell


def FM_capture_gait(gdir):
    import gait_metrics as GM
    return GM.capture(gdir)


def table(L, title, cols, cells, rowdefs, g):
    for mode, cam, heading in rowdefs:
        L.append('<h3>%s</h3><table><tr><th class="row"></th>' % E(heading))
        for s, head, note in cols:
            L.append('<th>%s%s</th>' % (E(head), '<div class="note">%s</div>' % note if note and (cam in ('side', 'front')) else ''))
        L.append('</tr><tr><th class="row">%s</th>' % E(cam))
        for s, head, note in cols:
            c = cells.get((g, s))
            if not c or not c.get((mode, cam)):
                L.append('<td>-</td>')
                continue
            nums = c.get('nums', {}).get((mode, cam), '')
            L.append('<td class="c%s"><img src="gait_options/%s" alt="">%s</td>' % ('2004' if s == '2004' else '', E(c[(mode, cam)]['file']), nums))
        L.append('</tr></table>')


def num_block(d, keys):
    return '<div class="num">' + '<br>'.join('%s: <b>%s</b>' % (E(lab), P1.fmt(d, key, ff)) for lab, key, ff in keys) + '</div>'


def main():
    genders = arg('genders', 'm,f').split(',')
    man = json.load(open(P1.MANIFEST)) if os.path.exists(P1.MANIFEST) else {'options': {}}
    opts = man.get('options', {})
    cells = {}
    # ---- gait (round 2) + mesh captures
    for g in genders:
        for s in ['2004', 'cur'] + R2 + MESH:
            game = '2004' if s == '2004' else 'ours'
            gdir = os.path.join(CH, '2004' if s == '2004' else 'ours_' + s, g)
            if not os.path.isdir(gdir):
                continue
            rows = [('walk', 'side'), ('walk', 'game'), ('run', 'side'), ('run', 'game')] if s in ['2004', 'cur'] + R2 else []
            rows += [('idle', 'front'), ('idle', '3/4'), ('idle', 'side')] if s in ['2004', 'cur'] + MESH else []
            c = gifs(g, s, game, gdir, rows)
            c['facet'] = FM.capture(gdir) if s in ['2004', 'cur'] + MESH else None
            cells[(g, s)] = c
            print('[PAGE2]', g, s)
    # numbers under each cell
    for (g, s), c in cells.items():
        ref = cells.get((g, '2004'))
        c['nums'] = {}
        for mode in ('walk', 'run'):
            d = c['metrics'].get(mode) or {}
            dist = P1.distance(mode, d, (ref['metrics'].get(mode) or {})) if ref and s != '2004' else None
            extra = ''
            if s in R2:
                sk = (opts.get('%s_%s' % (mode, s[-1])) or {})
                ga, skel = sk.get('gait') or {}, sk.get('skeleton') or {}
                extra = '<div class="num">' + '<br>'.join('%s: <b>%s</b>' % (E(lab), ('%.0f%%' % (100 * ga[k])) if k == 'flight_share' else ('%.0f deg' % ga[k]))
                                                          for lab, k in KNEE_KEYS if k in ga) + '<br>' + '<br>'.join(
                    '%s: <b>%s</b>' % (E(lab), ff % skel[k]) for lab, k, ff in GAIT_KEYS if k in skel) + '</div>'
            elif s == 'cur':
                sk = (man.get('current') or {}).get(mode) or {}
                skel = sk.get('skeleton') or {}
                extra = '<div class="num">' + '<br>'.join('%s: <b>%s</b>' % (E(lab), ff % skel[k]) for lab, k, ff in GAIT_KEYS if k in skel) + '</div>'
            c['nums'][(mode, 'side')] = num_block(d, P1.NUM[mode]) + extra + ('<div class="num">distance to 2004: <b>%.2f</b></div>' % dist if dist is not None else '')
        f = c.get('facet') or {}
        if f and not f.get('error'):
            fr = (ref or {}).get('facet') or {}
            c['nums'][('idle', 'front')] = ('<div class="num">flat-plane share: <b>%.2f</b>%s<br>creases per 100 px pairs: <b>%.1f</b>%s<br>facets per 1000 px: <b>%.1f</b>%s</div>' % (
                f['planarity'], '' if s == '2004' else ' (2004 %.2f)' % fr.get('planarity', 0), f['crease_per_100'], '' if s == '2004' else ' (2004 %.1f)' % fr.get('crease_per_100', 0),
                f['facets_per_1k'], '' if s == '2004' else ' (2004 %.1f)' % fr.get('facets_per_1k', 0)))
    # mesh option manifests (triangles, crease angle)
    mesh_man = {}
    for s, tag in (('mB', 'v4mesh-b'), ('mC', 'v4mesh-c')):
        p = os.path.join(WS, 'holm-characters-%s' % tag, 'candidates', 'manifest.json')
        if os.path.exists(p):
            mesh_man[s] = json.load(open(p))
    rec = json.load(open(os.path.join(A.out2004('review'), 'gait_options_recommendation_r2.json'))) if os.path.exists(
        os.path.join(A.out2004('review'), 'gait_options_recommendation_r2.json')) else {}
    json.dump({'distances': {'%s_%s' % k: {m: P1.distance(m, v['metrics'].get(m) or {}, cells[(k[0], '2004')]['metrics'].get(m) or {})
                                           for m in ('walk', 'run')} for k, v in cells.items() if k[1] in ['cur'] + R2 and (k[0], '2004') in cells},
               'facets': {'%s_%s' % k: v.get('facet') for k, v in cells.items() if v.get('facet')}},
              open(os.path.join(A.out2004('review'), 'gait_options_scores_r2.json'), 'w'), indent=1)
    write(cells, genders, opts, mesh_man, rec)


def write(cells, genders, opts, mesh_man, rec):
    page = os.path.join(A.out2004('review'), 'gait_options.html')
    r1 = os.path.join(A.out2004('review'), 'gait_options_round1.html')
    css = open(r1, encoding='utf-8').read().split('<style>')[1].split('</style>')[0] if os.path.exists(r1) else ''
    css += '\nh3{color:#e8c870;font-size:15px;margin:16px 0 4px}.sec{border-top:3px solid #6b5a3a;margin-top:30px;padding-top:6px}\n'
    L = ['<!doctype html><html><head><meta charset="utf-8"><title>Gait options -- private</title><style>%s</style></head><body>' % css,
         '<h1>Walk, run, standing and mesh options vs 2004 &mdash; private review page</h1>',
         '<p class="lead">Owner review 5 (2026-09-28). <b>Round 2</b> is on top (walk / run D, E, F and the mesh options a, b, c); '
         'round 1 is kept at the bottom for reference. Every cell loops one cycle at its real speed, every character at the same '
         'standing height, through the same 2004 lens (36 deg lens, 22.5 deg above), at the 2004 pace. Numbers are fractions of the '
         'standing height H unless marked. <span class="warn">This page holds 2004 frames from the local reference engine: it is '
         'never committed or published.</span></p>',
         '<p class="lead">In the game: <code>?gait=walkD,runE,idleA</code> (add <code>,panel</code> for a live picker; '
         '<code>walkcur</code> = the shipped clip) and <code>&amp;kitmesh=a</code> / <code>b</code> / <code>c</code> for the mesh options. '
         'The shipped clips and mesh stay the default until you pick.</p>']
    if rec:
        L.append('<div class="rec"><b>Recommendation, round 2:</b><ul>')
        for k in ('walk', 'run', 'mesh'):
            if rec.get(k):
                L.append('<li><b>%s: %s</b> &mdash; %s</li>' % (k.title(), E(rec[k]['pick']), E(rec[k]['why'])))
        L.append('</ul></div>')
    L.append('<div class="tabs">' + ''.join('<button data-g="%s"%s>%s</button>' % (g, ' class="on"' if i == 0 else '', {'m': 'Man', 'f': 'Woman'}[g])
                                              for i, g in enumerate(genders)) + '</div>')
    for gi, g in enumerate(genders):
        L.append('<div class="gset" data-g="%s"%s>' % (g, '' if gi == 0 else ' style="display:none"'))
        L.append('<div class="sec"><h2>Round 2 &mdash; walk and run</h2>')
        for kind in ('walk', 'run'):
            cols = [('2004', '2004 (reference)', ''), ('cur', 'Shipped now', '')]
            for s in R2:
                o = opts.get('%s_%s' % (kind, s[-1])) or {}
                cols.append((s, o.get('label', s), E(o.get('note', '')) + fit_html(s[-1], 'idle A + walk %s + run %s' % (s[-1], s[-1]))))
            table(L, kind, cols, cells, [(kind, 'side', '%s -- side view' % kind.title()), (kind, 'game', '%s -- game camera (3/4 from behind)' % kind.title())], g)
        L.append('<p class="lead">Standing: unchanged in round 2 (the round-1 idle options A, B, C are below; A was the closest to 2004).</p></div>')
        L.append('<div class="sec"><h2>Round 2 &mdash; mesh options (the owner: "looks too polished and round")</h2>'
                 '<p class="lead">Flat-plane share = neighbouring pixels inside one colour region that are lit the same (a flat facet) '
                 'rather than a smooth ramp; creases = sharp steps in light between two planes; facets = distinct flat-lit patches. '
                 'Measured on the close-up turnaround (front, 3/4, side) at the 2004 close-up size. Equipment: the fit check probes '
                 'gaps along the surface normals, so a creased mesh reports more small gaps even where the geometry under the armour '
                 'is the shipped one (mesh c); clipping-through counts are the ones to compare.</p>')
        cols = [('2004', '2004 (reference)', ''), ('cur', 'Shipped now', '')]
        for s in MESH:
            t, n = MESH_NOTE[s]
            mm = mesh_man.get(s)
            extra = (' Crease angle %.0f deg; triangles in the default outfit: man %s, woman %s.' % (mm['sharp_deg'], mm['tris_default_outfit'].get('A'), mm['tris_default_outfit'].get('B'))) if mm else ''
            fit = fit_html('mesh' + s[-1].lower(), 'shipped clips') if s != 'mA' else '<br>equipment fit: the shipped model (only the shading differs)'
            cols.append((s, t, E(n + extra) + fit))
        table(L, 'mesh', cols, cells, [('idle', 'front', 'Front'), ('idle', '3/4', 'Three-quarter'), ('idle', 'side', 'Side')], g)
        L.append('</div></div>')
    if os.path.exists(r1):
        body = open(r1, encoding='utf-8').read()
        body = body.split('<body>')[1].split('<script>')[0]
        body = re.sub(r'<div class="tabs">.*?</div>', '', body, count=1, flags=re.S)
        body = body.replace('class="gset"', 'class="gset1"')
        L.append('<div class="sec"><h2>Round 1 (for reference, as reviewed)</h2>' + body + '</div>')
    L.append("""<script>document.querySelectorAll('.tabs button').forEach(function(b){b.onclick=function(){
document.querySelectorAll('.tabs button').forEach(function(x){x.classList.toggle('on',x===b)});
document.querySelectorAll('.gset,.gset1').forEach(function(d){d.style.display=d.getAttribute('data-g')===b.getAttribute('data-g')?'':'none'})}})</script>""")
    L.append('</body></html>')
    with open(page, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(L))
    print('[PAGE2] wrote', page)


if __name__ == '__main__':
    main()
