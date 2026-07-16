#!/usr/bin/env python3
"""Recipe-driven scale-first asset production for Crafted Realm.

The recipe is the technical source of truth. It generates the ordinary asset
manifest, runs the existing Blender/GLB gate, rebuilds proof artifacts, validates
concept score and human-scale measurements, and emits a concise factory report.

Usage:
  python tools/asset_factory.py brief assets/recipes/cellar_ladder_hatch_v1.json
  python tools/asset_factory.py check assets/recipes/cellar_quiet_corner_v1.json
  python tools/asset_factory.py run assets/recipes/cellar_quiet_corner_v1.json
  python tools/asset_factory.py run assets/recipes/cellar_quiet_corner_v1.json --no-build
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

import asset_pipeline


ROOT = Path(__file__).resolve().parents[1]


class FactoryError(RuntimeError):
    pass


def root_path(value):
    path = (ROOT / value).resolve()
    if ROOT not in path.parents and path != ROOT:
        raise FactoryError(f"recipe path escapes workspace: {value}")
    return path


def load_recipe(value):
    path = root_path(value)
    try:
        recipe = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise FactoryError(f"recipe is missing: {value}") from error
    required = ("schemaVersion", "assetId", "status", "manifestPath", "manifest",
                "concept", "scale", "proof", "integration")
    missing = [key for key in required if key not in recipe]
    if missing:
        raise FactoryError("recipe is missing fields: " + ", ".join(missing))
    if recipe["schemaVersion"] not in (2, 3):
        raise FactoryError("Asset Factory recipe schemaVersion must be 2 or 3")
    if recipe["schemaVersion"] >= 3:
        cardinal = recipe.get("proof", {}).get("cardinalTurnaround")
        if not isinstance(cardinal, dict):
            raise FactoryError("schemaVersion 3 requires proof.cardinalTurnaround")
        required_cardinal = ("north", "south", "east", "west", "sheet", "review")
        missing_cardinal = [key for key in required_cardinal if not cardinal.get(key)]
        if missing_cardinal:
            raise FactoryError("cardinal turnaround is missing: " + ", ".join(missing_cardinal))
    if recipe["assetId"] != recipe["manifest"].get("assetId"):
        raise FactoryError("recipe and generated manifest assetId differ")
    return path, recipe


def generated_manifest(recipe):
    manifest = dict(recipe["manifest"])
    manifest["scaleContract"] = {
        "referenceHeightTiles": recipe["scale"]["referenceHeightTiles"],
        "checks": recipe["scale"]["checks"],
    }
    return manifest


def json_text(value):
    return json.dumps(value, indent=2, ensure_ascii=False) + "\n"


def check_manifest_sync(recipe):
    path = root_path(recipe["manifestPath"])
    if not path.is_file():
        raise FactoryError(f"generated manifest is missing: {recipe['manifestPath']}")
    actual = json.loads(path.read_text(encoding="utf-8"))
    expected = generated_manifest(recipe)
    if actual != expected:
        raise FactoryError(
            "manifest drift: run `python tools/asset_factory.py sync <recipe>` "
            f"or update {recipe['manifestPath']} from its recipe"
        )
    return actual


def sync_manifest(recipe):
    path = root_path(recipe["manifestPath"])
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json_text(generated_manifest(recipe)), encoding="utf-8")
    print(f"[FACTORY] synced {path.relative_to(ROOT)}")


def run_command(command):
    if not isinstance(command, list) or not command:
        raise FactoryError("automation commands must be non-empty arrays")
    executable, *arguments = command
    if executable == "python":
        resolved = [sys.executable, *arguments]
    elif executable == "blender":
        resolved = [str(asset_pipeline.locate_blender()), *arguments]
    else:
        raise FactoryError(f"unsupported automation executable: {executable}")
    subprocess.run(resolved, cwd=ROOT, check=True)


def nested_value(document, dotted_path):
    value = document
    for key in dotted_path.split("."):
        if not isinstance(value, dict) or key not in value:
            raise FactoryError(f"missing recipe/report value: {dotted_path}")
        value = value[key]
    return value


def validate_recipe_outputs(recipe, manifest, pipeline_result):
    errors, checks = [], []

    for label, value in (("concept image", recipe["concept"]["image"]),
                         ("concept prompt", recipe["concept"]["prompt"]),
                         ("catalog", recipe["catalogPath"])):
        passed = root_path(value).is_file()
        checks.append({"label": label, "passed": passed, "path": value})
        if not passed:
            errors.append(f"missing {label}: {value}")

    comparison_path = root_path(recipe["proof"]["comparisonConfig"])
    if comparison_path.is_file():
        comparison = json.loads(comparison_path.read_text(encoding="utf-8"))
        score = comparison.get("codex")
        minimum = recipe["proof"].get("minimumCodexScore", 9.0)
        passed = isinstance(score, (int, float)) and score >= minimum
        checks.append({"label": "concept comparison score", "value": score,
                       "minimum": minimum, "passed": passed})
        if not passed:
            errors.append(f"concept comparison score {score} is below {minimum}")
    else:
        errors.append(f"missing comparison config: {recipe['proof']['comparisonConfig']}")

    authoring = json.loads(root_path(manifest["authoringReport"]).read_text(encoding="utf-8"))
    for check in recipe["scale"]["checks"]:
        label = check["label"]
        try:
            value = nested_value(authoring, check["reportPath"])
            passed = isinstance(value, (int, float)) and not isinstance(value, bool)
            passed = passed and (check.get("min") is None or value >= check["min"])
            passed = passed and (check.get("max") is None or value <= check["max"])
            checks.append({"label": label, "value": value, "min": check.get("min"),
                           "max": check.get("max"), "passed": passed})
            if not passed:
                errors.append(f"{label} {value} is outside {check.get('min')}..{check.get('max')}")
        except FactoryError as error:
            checks.append({"label": label, "passed": False, "error": str(error)})
            errors.append(str(error))

    catalog = json.loads(root_path(recipe["catalogPath"]).read_text(encoding="utf-8"))
    catalog_contract = {
        "assetId": recipe["assetId"],
        "source": manifest["source"],
        "runtime": manifest["model"],
    }
    for key, expected in catalog_contract.items():
        actual = catalog.get(key)
        passed = actual == expected
        checks.append({"label": f"catalog {key}", "value": actual,
                       "expected": expected, "passed": passed})
        if not passed:
            errors.append(f"catalog {key} differs from recipe")

    for required in recipe["integration"].get("requiredProof", []):
        passed = root_path(required).is_file()
        checks.append({"label": "integration proof", "path": required, "passed": passed})
        if not passed:
            errors.append(f"missing integration proof: {required}")

    cardinal = recipe["proof"].get("cardinalTurnaround")
    if cardinal:
        for direction in ("north", "south", "east", "west"):
            path = cardinal[direction]
            passed = root_path(path).is_file()
            checks.append({"label": f"cardinal proof from {direction}", "path": path,
                           "passed": passed})
            if not passed:
                errors.append(f"missing cardinal proof from {direction}: {path}")
        for label in ("sheet", "review"):
            path = cardinal[label]
            passed = root_path(path).is_file()
            checks.append({"label": f"cardinal {label}", "path": path, "passed": passed})
            if not passed:
                errors.append(f"missing cardinal {label}: {path}")
        review_path = root_path(cardinal["review"])
        if review_path.is_file():
            review = json.loads(review_path.read_text(encoding="utf-8"))
            view_keys = set(review.get("views", {}))
            passed = review.get("verdict") == "PASS" and view_keys == {"north", "south", "east", "west"}
            checks.append({"label": "cardinal contact audit verdict", "value": review.get("verdict"),
                           "passed": passed})
            if not passed:
                errors.append("cardinal contact audit must PASS all four named views")

    return checks, errors


def brief_text(recipe):
    lines = [
        f"# {recipe['displayName']} — Asset Factory v2 brief",
        "",
        f"- Asset ID: `{recipe['assetId']}`",
        f"- Status: `{recipe['status']}`",
        f"- Gameplay role: {recipe['gameplayRole']}",
        f"- Canonical scale fixture: {recipe['scale']['referenceHeightTiles']}-tile player, one-tile grid, gameplay camera",
        "",
        "## Scale must pass before detail",
        "",
        "| Measurement | Minimum | Maximum |",
        "|---|---:|---:|",
    ]
    for check in recipe["scale"]["checks"]:
        lines.append(f"| {check['label']} | {check.get('min', '—')} | {check.get('max', '—')} |")
    lines.extend(["", "## Required semantic parts", ""])
    lines.extend(f"- `{node}`" for node in recipe["manifest"].get("requiredNodes", []))
    lines.extend(["", "## Proof order", ""])
    lines.extend(f"{index}. {step}" for index, step in enumerate(recipe["proof"]["order"], 1))
    cardinal = recipe["proof"].get("cardinalTurnaround")
    if cardinal:
        lines.extend(["", "## Cardinal installed-contact proof", "",
                      "- Render and inspect the installed object from north, south, east, and west.",
                      f"- Bank the contact sheet at `{cardinal['sheet']}`.",
                      f"- Record the collision audit at `{cardinal['review']}`."])
    lines.extend(["", "## Integration contract", ""])
    for key, value in recipe["integration"].items():
        if key != "requiredProof":
            lines.append(f"- {key}: {value}")
    return "\n".join(lines) + "\n"


def write_brief(recipe):
    path = root_path(recipe["briefPath"])
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(brief_text(recipe), encoding="utf-8")
    print(f"[FACTORY] brief {path.relative_to(ROOT)}")


def run_factory(recipe, no_build=False, no_library=False):
    manifest = check_manifest_sync(recipe)
    if not no_build:
        asset_pipeline.build(manifest)
    for command in recipe.get("automation", {}).get("proof", []):
        run_command(command)
    pipeline_result = asset_pipeline.validate(manifest)
    checks, errors = validate_recipe_outputs(recipe, manifest, pipeline_result)
    if errors:
        raise FactoryError("; ".join(errors))
    if not no_library:
        for command in recipe.get("automation", {}).get("library", []):
            run_command(command)
    write_brief(recipe)
    result = {
        "schemaVersion": 2,
        "assetId": recipe["assetId"],
        "passed": True,
        "pipeline": pipeline_result,
        "factoryChecks": checks,
        "nextStage": recipe.get("nextStage"),
    }
    output = root_path(recipe["factoryResult"])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json_text(result), encoding="utf-8")
    metrics = pipeline_result["metrics"]
    print(f"[FACTORY] PASS {recipe['assetId']} | {metrics['triangles']} tris | "
          f"human scale locked | concept {recipe['proof']['minimumCodexScore']:.1f}+ | "
          f"next: {recipe.get('nextStage', 'owner review')}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("brief", "check", "run", "sync"))
    parser.add_argument("recipe")
    parser.add_argument("--no-build", action="store_true")
    parser.add_argument("--no-library", action="store_true")
    args = parser.parse_args()
    _, recipe = load_recipe(args.recipe)
    if args.action == "brief":
        write_brief(recipe)
    elif args.action == "sync":
        sync_manifest(recipe)
    elif args.action == "check":
        manifest = check_manifest_sync(recipe)
        pipeline_result = asset_pipeline.validate(manifest)
        checks, errors = validate_recipe_outputs(recipe, manifest, pipeline_result)
        if errors:
            raise FactoryError("; ".join(errors))
        print(f"[FACTORY] CHECK PASS {recipe['assetId']} | {len(checks)} recipe locks")
    else:
        run_factory(recipe, no_build=args.no_build, no_library=args.no_library)


if __name__ == "__main__":
    try:
        main()
    except (FactoryError, asset_pipeline.PipelineError, subprocess.CalledProcessError,
            KeyError, json.JSONDecodeError) as error:
        print(f"[FACTORY] FAIL {error}", file=sys.stderr)
        raise SystemExit(1)
