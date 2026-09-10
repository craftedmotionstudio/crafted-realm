"""Build and validate a Crafted Realm Blender-to-browser asset manifest.

One command owns deterministic Blender generation, preview existence, authoring
contracts, semantic glTF nodes, and browser-facing size/render budgets.  It is
generic across buildings, props, worn gear, and later animated characters.
"""
from __future__ import annotations

import argparse
import json
import os
import struct
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BLENDER = Path("C:/Program Files/Blender Foundation/Blender 4.5/blender.exe")


class PipelineError(RuntimeError):
    pass


def root_path(value):
    path = (ROOT / value).resolve()
    if ROOT not in path.parents and path != ROOT:
        raise PipelineError(f"manifest path escapes workspace: {value}")
    return path


def read_glb(path):
    data = path.read_bytes()
    if len(data) < 20:
        raise PipelineError("GLB is truncated")
    magic, version, total = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF" or version != 2 or total != len(data):
        raise PipelineError("GLB header is invalid")
    offset, document = 12, None
    while offset + 8 <= len(data):
        length, kind = struct.unpack_from("<II", data, offset)
        payload = data[offset + 8:offset + 8 + length]
        if kind == 0x4E4F534A:
            document = json.loads(payload.rstrip(b" \x00").decode("utf-8"))
            break
        offset += 8 + length
    if document is None:
        raise PipelineError("GLB has no JSON document")
    return data, document


def glb_metrics(path):
    data, doc = read_glb(path)
    accessors = doc.get("accessors", [])
    primitives = [primitive for mesh in doc.get("meshes", []) for primitive in mesh.get("primitives", [])]
    triangles = 0
    for primitive in primitives:
        mode = primitive.get("mode", 4)
        if mode != 4:
            continue
        if "indices" in primitive:
            triangles += accessors[primitive["indices"]].get("count", 0) // 3
        else:
            position = primitive.get("attributes", {}).get("POSITION")
            if position is not None:
                triangles += accessors[position].get("count", 0) // 3
    nodes = {node.get("name") for node in doc.get("nodes", []) if node.get("name")}
    root_extras = {}
    for node in doc.get("nodes", []):
        if node.get("extras", {}).get("assetId"):
            root_extras = node["extras"]
            break
    return {
        "fileBytes": len(data),
        "triangles": triangles,
        "primitives": len(primitives),
        "materials": len(doc.get("materials", [])),
        "nodes": sorted(nodes),
        "animations": sorted(animation.get("name", "") for animation in doc.get("animations", [])
                             if animation.get("name")),
        "rootExtras": root_extras,
    }


def nested_value(document, dotted_path):
    value = document
    for key in dotted_path.split("."):
        if not isinstance(value, dict) or key not in value:
            raise PipelineError(f"authoring report is missing scale value: {dotted_path}")
        value = value[key]
    return value


def validate_scale_contract(authoring, contract):
    results, errors = [], []
    for check in contract.get("checks", []):
        label = check.get("label", check.get("reportPath", "unnamed scale check"))
        try:
            value = nested_value(authoring, check["reportPath"])
            if not isinstance(value, (int, float)) or isinstance(value, bool):
                raise PipelineError(f"{label} is not numeric")
            minimum, maximum = check.get("min"), check.get("max")
            passed = (minimum is None or value >= minimum) and (maximum is None or value <= maximum)
            results.append({"label": label, "value": value, "min": minimum,
                            "max": maximum, "passed": passed})
            if not passed:
                errors.append(f"{label} {value} is outside {minimum}..{maximum}")
        except (PipelineError, KeyError) as error:
            results.append({"label": label, "passed": False, "error": str(error)})
            errors.append(str(error))
    return results, errors


def locate_blender():
    override = os.environ.get("BLENDER_EXE")
    if override and Path(override).is_file():
        return Path(override)
    if DEFAULT_BLENDER.is_file():
        return DEFAULT_BLENDER
    raise PipelineError("Blender 4.5 LTS was not found; set BLENDER_EXE to its executable")


def build(manifest):
    blender = locate_blender()
    builder = root_path(manifest["builder"])
    if not builder.is_file():
        raise PipelineError(f"builder is missing: {builder}")
    print(f"[ASSET] Building {manifest['assetId']} with Blender 4.5 LTS")
    subprocess.run([str(blender), "--background", "--python", str(builder)],
                   cwd=ROOT, check=True)


def validate(manifest):
    errors = []
    cardinal_proofs = manifest.get("cardinalProofs", [])
    cardinal_paths = []
    for proof in cardinal_proofs:
        cardinal_paths.extend((proof.get("views") or {}).values())
        cardinal_paths.extend(value for value in (proof.get("sheet"), proof.get("review")) if value)
    required_paths = [manifest["source"], manifest["model"], manifest["authoringReport"],
                      *manifest.get("previews", []), *cardinal_paths]
    for value in required_paths:
        if not root_path(value).is_file():
            errors.append(f"missing output: {value}")
    if errors:
        raise PipelineError("; ".join(errors))

    authoring = json.loads(root_path(manifest["authoringReport"]).read_text(encoding="utf-8"))
    failed_authoring = [name for name, ok in authoring.get("checks", {}).items() if not ok]
    if failed_authoring:
        errors.append("authoring checks failed: " + ", ".join(failed_authoring))
    if authoring.get("pipelineVersion") != manifest["schemaVersion"]:
        errors.append("authoring report pipeline version differs from manifest")
    if authoring.get("unitsPerTile") != manifest["unitsPerTile"]:
        errors.append("asset scale differs from manifest")

    scale_results, scale_errors = validate_scale_contract(authoring, manifest.get("scaleContract", {}))
    errors.extend(scale_errors)

    cardinal_results = []
    for proof in cardinal_proofs:
        label = proof.get("label", "unnamed cardinal proof")
        views = proof.get("views") or {}
        required_directions = {"north", "south", "east", "west"}
        proof_errors = []
        if set(views) != required_directions:
            proof_errors.append("views must be exactly north, south, east, west")
        review_path = proof.get("review")
        if review_path and root_path(review_path).is_file():
            review = json.loads(root_path(review_path).read_text(encoding="utf-8"))
            reviewed_views = review.get("views", {})
            if review.get("verdict") != "PASS":
                proof_errors.append("review verdict is not PASS")
            if set(reviewed_views) != required_directions:
                proof_errors.append("review does not cover all four directions")
            elif any(reviewed_views[name].get("status") != "PASS" for name in required_directions):
                proof_errors.append("one or more directional reviews did not PASS")
        if proof_errors:
            errors.extend(f"{label}: {message}" for message in proof_errors)
        cardinal_results.append({"label": label, "passed": not proof_errors,
                                 "errors": proof_errors})

    metrics = glb_metrics(root_path(manifest["model"]))
    missing_nodes = sorted(set(manifest.get("requiredNodes", [])) - set(metrics["nodes"]))
    if missing_nodes:
        errors.append("semantic nodes missing from GLB: " + ", ".join(missing_nodes))
    missing_animations = sorted(set(manifest.get("requiredAnimations", [])) - set(metrics["animations"]))
    if missing_animations:
        errors.append("animation clips missing from GLB: " + ", ".join(missing_animations))
    extras = metrics["rootExtras"]
    if extras.get("pipelineVersion") != manifest["schemaVersion"]:
        errors.append("GLB root is missing the pipeline version extra")
    if extras.get("assetClass") != manifest["assetClass"]:
        errors.append("GLB root asset class differs from manifest")

    mapping = {
        "maxFileBytes": "fileBytes",
        "maxTriangles": "triangles",
        "maxPrimitives": "primitives",
        "maxMaterials": "materials",
    }
    for budget_name, metric_name in mapping.items():
        limit = manifest["budgets"][budget_name]
        if metrics[metric_name] > limit:
            errors.append(f"{metric_name} {metrics[metric_name]} exceeds {limit}")

    result = {
        "assetId": manifest["assetId"],
        "schemaVersion": manifest["schemaVersion"],
        "passed": not errors,
        "metrics": {key: metrics[key] for key in ("fileBytes", "triangles", "primitives", "materials")},
        "animations": metrics["animations"],
        "authoringChecks": authoring.get("checks", {}),
        "scaleChecks": scale_results,
        "cardinalProofs": cardinal_results,
        "errors": errors,
    }
    output = root_path(manifest["pipelineResult"])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2), encoding="utf-8")
    if errors:
        raise PipelineError("; ".join(errors))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", help="asset manifest relative to the workspace")
    parser.add_argument("--no-build", action="store_true", help="validate the existing outputs only")
    args = parser.parse_args()
    manifest_path = root_path(args.manifest)
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not args.no_build:
        build(manifest)
    result = validate(manifest)
    metrics = result["metrics"]
    print(f"[ASSET] PASS {result['assetId']} | {metrics['triangles']} tris | "
          f"{metrics['primitives']} primitives | {metrics['materials']} materials | "
          f"{metrics['fileBytes']} bytes")


if __name__ == "__main__":
    try:
        main()
    except (PipelineError, subprocess.CalledProcessError, KeyError, json.JSONDecodeError) as error:
        print(f"[ASSET] FAIL {error}", file=sys.stderr)
        raise SystemExit(1)
