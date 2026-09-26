"""Map steep (.5-1 tile per tile, orange) and cliff (>1, red) tiles of a Holm grid.  Study figure.
   python holm_cliffs.py _holm_v1_grid.json fig_cliffs_v1.png"""
import json, sys
import numpy as np
import matplotlib; matplotlib.use("Agg"); import matplotlib.pyplot as plt
g = json.load(open(sys.argv[1])); H = np.array(g["h"]); Wt = np.array(g["water"]); dry = Wt == 0
sx = np.zeros(H.shape); sz = np.zeros(H.shape)
sx[:, :-1] = np.where(dry[:, :-1] & dry[:, 1:], np.abs(np.diff(H, axis=1)), 0)
sz[:-1, :] = np.where(dry[:-1, :] & dry[1:, :], np.abs(np.diff(H, axis=0)), 0)
s = np.maximum(sx, sz); img = np.zeros(H.shape + (3,)); img[dry] = [.8, .9, .7]; img[~dry] = [.6, .7, .9]
img[(s >= .5) & (s < 1)] = [.9, .7, .2]; img[s >= 1] = [.8, .1, .1]
plt.figure(figsize=(7, 6.3)); plt.imshow(img, extent=(0, 144, 128, 0))
plt.title("%s: orange steep .5-1, red cliff >1 (cliff share %.3f)" % (sys.argv[1], (s[dry] >= 1).mean()), fontsize=8)
plt.savefig(sys.argv[2], dpi=90); print("wrote", sys.argv[2])
