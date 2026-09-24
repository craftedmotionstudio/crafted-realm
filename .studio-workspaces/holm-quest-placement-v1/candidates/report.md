# Lodge terrain measurement

augmented-foundation-sampled-fit-awaiting-visual-and-navigation

```json
{
  "world": {
    "x": 35,
    "y": 5.02,
    "z": 51
  },
  "supports": [
    {
      "x": 35,
      "y": 5.02,
      "z": 51,
      "min": 4.999904,
      "max": 5.000144,
      "spread": 0.00024,
      "exposedUnderside": 0,
      "buriedFloor": 0,
      "fitsSampledSlab": true,
      "fitsZeroThicknessBay": false,
      "id": "full-footprint-slab-envelope-only",
      "samples": 1862,
      "localBounds": [
        -5.000999927520752,
        -4.000999927520752,
        6.349999904632568,
        4.000999927520752
      ],
      "floorBottom": -0.18000000715255737,
      "floorTop": 0.0
    },
    {
      "id": "reading-bay-single-surface",
      "samples": 63,
      "min": 5.0,
      "max": 5.0,
      "floorBottom": 0,
      "floorTop": 0,
      "exposedUnderside": 0.02,
      "fits": false
    }
  ],
  "entranceWorld": {
    "x": 35.5,
    "y": 5.02,
    "z": 53,
    "terrainHeight": 5.0,
    "step": 0.02
  },
  "boundedSearch": {
    "spacing": 0.5,
    "radiusPerAxis": 2,
    "tested": 81,
    "bestSpread": 0.0,
    "fittingExistingFoundation": 6,
    "origin35At51": {
      "x": 35,
      "y": 5.000144,
      "z": 51,
      "min": 4.999904,
      "max": 5.000144,
      "spread": 0.00024,
      "exposedUnderside": 0,
      "buriedFloor": 0,
      "fitsSampledSlab": true,
      "fitsZeroThicknessBay": false
    }
  }
}
```

- Finite 0.2-tile sampling plus exact floor vertices; not exhaustive continuous footprint extrema.
- No navigation, door sweep, water, adjacent vegetation or visual acceptance proved.
- Existing concept path passes through lodge footprint; lane routing requires review.
- Original bay has no thickness: raised placement requires the hashed separate foundation. Support is sampled; actual silhouette, wall bases and circulation still need main-session visual review.
