# Arrival floor clicks and checkpoints - 2026-09-12

The preceding turn was progress: explicit storey routes and the Blender staircase changed authoritative source and passed pointer route checks. This pass advances the same full island goal with floor-pointer selection and a storey-aware checkpoint.

Changed tools/studio_holm_house_walk.js to raycast visible house geometry. The closest wall/prop blocks a click behind it; only GroundFloor, UpperFloor and StairFlight meshes become route destinations. A click retains its surface ID and maps to a validated tile-centre node. Drag gestures over5px remain camera orbit operations. Walking still uses cardinal routes and the explicit stair surface.

New HolmArrivalCheckpoint is a pure data helper. It validates schema, revision, exact coordinates, tile-centre identity and unique graph membership. All110 nodes roundtrip, including same-X/Z ground/upper fixtures. Tests reject stale revisions, missing nodes, altered floors/heights and nonfinite values without mutating inputs. Two small boot assertions run on load.

Studio now offers Save preview position after reaching a destination with doors open. It writes only crafted-realms:studio-house-walk:<qaProfile>. A SHA256 of layout, collision envelopes and graph binds this preview checkpoint to those inputs. It is not yet bound to the GLB file bytes. Reload validates the record, prepares open doors and waits for the house before applying the exact saved stance and floor cutaway. Mid-edge saves are refused, not silently rounded. This is not integrated with live adventurer storage.

In-app pointer evidence: house18 floor click(874,709) reached ground:65,97 at3.0. House19/floor-save-20260912 visible upper floor click(847,585) routed from porch through stairs to upper:65,98 at5.8. The Save preview position button reported the same ID. Full page reload reported Restored upper:65,98 at5.8; directly inspected upper-room screenshot and empty error console. Evidence: scratchpad/holm_guide_house_overhaul_v1/floor_click_restored_upper.png.

Validation: navigation/checkpoint/chunk tests passed; browser ES module syntax checked using node --input-type=module --check via stdin (plain node --check treats this project .js as CommonJS and was the wrong checker invocation).

Visual review: destination click and upper restoration readable, furniture/well silhouettes unchanged, player standing on upper floor at expected scale. Remaining art defects persist: sparse rooms, plain gables/flue, no shutters or planting, barren surroundings, incomplete building-family consistency. No final9/10 comparison acceptance. Character remains an existing animation fixture, not new accepted character art.

Remaining: live provider/movement/save integration, terrain approach connection, GLB binding and full collision sweeps, mid-edge persistence policy, animated door collision, arbitrary ray/floor edge cases, chunk ownership, complete art/NPC/tutorial production, Safe Publish and performance acceptance. Goal remains active.

Foreground live smoke holm-house19-gate-20260912: FAIL12FPS vs45min. Structural105/105, boot4571ms, walk5332ms, stream6boundaries25tiles/exact save-load, worst114ms,131draws34282tris,ticks4,console0errors,total38605ms. Old live provider; draft navigation not loaded there. Performance issue remains unresolved.
