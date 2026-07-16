#!/usr/bin/env python3
"""Fast deterministic acceptance locks for Asset Factory v2."""
from __future__ import annotations

import copy
import json
from pathlib import Path

import asset_factory
import asset_pipeline


ROOT = Path(__file__).resolve().parents[1]
RECIPE_PATH = "assets/recipes/cellar_quiet_corner_v1.json"


def main():
    _, recipe = asset_factory.load_recipe(RECIPE_PATH)
    manifest = asset_factory.generated_manifest(recipe)
    actual_manifest = json.loads((ROOT / recipe["manifestPath"]).read_text(encoding="utf-8"))
    assert actual_manifest == manifest, "recipe-generated manifest drifted"

    report = json.loads((ROOT / manifest["authoringReport"]).read_text(encoding="utf-8"))
    results, errors = asset_pipeline.validate_scale_contract(report, manifest["scaleContract"])
    assert not errors and results and all(row["passed"] for row in results), "approved human scale must pass"

    giant = copy.deepcopy(report)
    giant["humanScaleContract"]["tallChairHeight"] = 2.54
    giant_results, giant_errors = asset_pipeline.validate_scale_contract(giant, manifest["scaleContract"])
    assert giant_errors, "the rejected giant chair must fail the scale contract"
    assert any(row["label"] == "tall chair height" and not row["passed"] for row in giant_results)

    missing = copy.deepcopy(report)
    del missing["humanScaleContract"]["lowSeatHeight"]
    _, missing_errors = asset_pipeline.validate_scale_contract(missing, manifest["scaleContract"])
    assert missing_errors, "missing scale measurements must fail closed"

    brief = asset_factory.brief_text(recipe)
    assert "Scale must pass before detail" in brief and "tall chair height" in brief
    assert recipe["integration"]["collision"] in brief
    print("[ASSET_FACTORY] 5/5 acceptance locks pass; giant-chair regression rejected")


if __name__ == "__main__":
    main()
