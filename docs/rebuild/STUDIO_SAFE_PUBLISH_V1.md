# Studio Safe Publish v1

Date: 2026-07-17  
Status: accepted foundation

## Outcome

Crafted Realm now has an original transactional boundary between Studio authoring and checked-in world data.
Studio work is isolated by default. A draft does not become live because it was saved, downloaded, or staged;
publishing is a separate, validated action with a dry run, backup, receipt, and exact rollback.

This is a clean-room implementation inspired only by the useful architectural idea of an isolated world editor.
No code, assets, content, naming, or file formats from Open RSC Spoiled Milk are incorporated.

## Files and responsibilities

- `tools/studio.html` — connects to a local workspace, stages the current validated building document and its
  compiled runtime bundle into the isolated `working/` tree, loads the checked-in pair, or downloads a candidate.
- `tools/studio_workspace.js` — dependency-free transaction engine: containment, validation, hashing, export,
  dry-run planning, lock, backup, install, receipts, rebase, and rollback.
- `tools/studio_workspace_cli.js` — small command surface for the transaction engine.
- `tools/test_studio_workspace.js` — destructive-path tests in a disposable temporary project.
- `assets/world/authoring/studio-building-preview.json` — first checked-in Studio authoring source.
- `assets/world/authoring/studio-building-preview.bundle.json` — deterministic chunk, interaction, building-
  contract, collision, room, and resource output compiled from that source and the shared building definition.
- `assets/world/authoring/studio-survival-workyard.json` and `.bundle.json` — the equivalent matched Workyard
  pair, including all 25 rich interactions and its complete multi-asset dependency list.
- `.studio-workspaces/` — ignored local source snapshots, working copies, exports, backups, and receipts.

## First-use workflow

From the Crafted Realm project folder:

```powershell
node tools/studio_workspace_cli.js init guide-hall-bundle assets/world/authoring/studio-building-preview.json assets/world/authoring/studio-building-preview.bundle.json
```

The workspace is then available at `.studio-workspaces/guide-hall-bundle`.

For the Survival Workyard, initialize the corresponding profile instead:

```powershell
node tools/studio_workspace_cli.js init survival-workyard-bundle assets/world/authoring/studio-survival-workyard.json assets/world/authoring/studio-survival-workyard.bundle.json
```

Select the intended building in Studio before connecting its matching workspace. Switching buildings disconnects
the previous workspace so a Guide Hall draft cannot be staged into the Workyard pair or vice versa.

1. Open `http://127.0.0.1:8777/tools/studio.html` in Chrome or Edge.
2. Build or move the complete building and let the Studio contract gate remain green.
3. Under **Safe publish**, choose **Connect workspace** and select
   `.studio-workspaces/guide-hall-bundle`.
4. Choose **Stage draft**. This compiles and writes the matched source/bundle pair only to the isolated working copy.
5. Review status, create a deterministic export, and inspect the dry run:

```powershell
node tools/studio_workspace_cli.js status guide-hall-bundle
node tools/studio_workspace_cli.js export guide-hall-bundle
node tools/studio_workspace_cli.js plan guide-hall-bundle
```

6. Publish only when the plan reports `ok: true`:

```powershell
node tools/studio_workspace_cli.js apply guide-hall-bundle
```

7. If the accepted publish must be reverted and no one has edited the installed files afterward:

```powershell
node tools/studio_workspace_cli.js rollback guide-hall-bundle
```

## Safety laws

1. Every target path is registered at workspace creation and must remain inside the project root.
2. Studio writes only beneath the selected workspace's `working/` directory.
3. JSON is parsed before staging or export. World V2 authoring documents receive schema, provider, placement,
   identity, revision, asset, and finite-transform checks. A registered runtime bundle must name its registered
   source and match every placement identity and transform; either file drifting makes the whole export fail.
4. Exports are content-addressed from a stable manifest. Re-exporting unchanged bytes returns the same export id.
5. A publish refuses any live target whose hash differs from its recorded base hash.
6. One exclusive `.studio-publish.lock` prevents simultaneous apply or rollback operations.
7. Every backup is written and verified before the first target is replaced. The installed bytes are verified
   afterward, and a mid-copy error restores every target already touched.
8. Rollback refuses to overwrite later work: current live hashes must still equal the installed receipt.
9. Deletion is intentionally unsupported in v1. Removing a live file deserves a future explicit tombstone design.

## Crash recovery journal

Large district transactions now create a durable `publish-journal.json` after every backup is verified and before
the first live file is replaced. Journal and receipt writes use a temporary file, filesystem flush, and atomic rename.
Installed files are flushed and hash-verified individually. A successful commit rebases the workspace, marks the
journal committed, and then removes it.

If the process or computer stops during installation, `status` reports `pendingRecovery` and both apply and rollback
fail closed. Recover with:

```powershell
node tools/studio_workspace_cli.js recover <workspace-id>
```

Recovery accepts only bytes named by the journal. It restores the verified pre-publish files, restores the workspace
base snapshot without deleting the staged draft, retires any receipt written by the interrupted commit, archives the
journal, and becomes a safe no-op when repeated. If the journal was already marked committed, recovery finishes
cleanup without undoing the accepted publish. Unknown live bytes are never overwritten.

## Verification

`node tools/test_studio_workspace.js` passes fourteen checks:

- isolated source and working snapshots;
- staging cannot change the live file;
- deterministic content-addressed export;
- successful hash-verified dry run;
- apply plus receipt;
- clean rebase after apply;
- refusal to overwrite an edit made after publish;
- exact byte restoration on rollback;
- stale live target detection;
- fail-closed apply on conflicts;
- path traversal rejection;
- invalid World V2 authoring rejection;
- mismatched source/bundle pair rejection;
- matched two-file bundle export.

The expanded gate now passes 23 checks. The additional locks cover four-file district validation and transform drift,
pending-recovery status, publish blocking, exact crash restoration, staged-draft preservation, interrupted-receipt
retirement, journal archival and idempotence, divergent-live-byte refusal, and committed-journal cleanup without
rollback.

`node tools/test_world_v2.js` remains fully green. In the real r160 Studio, the checked-in Guide Hall authoring
document loaded through **Load published**, every building/authoring contract remained green, and the browser
reported no warnings or errors. Direct visual review found the new controls readable, grouped with the existing
round-trip tools, and clearly separated by the gold transaction boundary. The panel does not obstruct the asset
viewport and retains the existing compact Studio hierarchy. Final foreground game smoke passes 100/100 at
60 FPS, 21 ms worst frame, 166 draw calls, 32,932 triangles, exact streamed save restoration, and zero errors.

## Guide Hall bundle expansion

The Guide Hall proving slice now uses one shared definition to compile the placement, runtime chunk object,
six semantic interactions, room/door/support contracts, collider count, and resource dependencies. The live
Holm provider consumes those compiled interaction rows instead of maintaining a second handwritten copy.
The Workyard extends that contract to furnishings, inspection-only metadata, animated services, 25 interactions,
and 16 resource dependencies. Full proof is recorded in `docs/rebuild/STUDIO_WORLD_BUNDLE_V1.md` and
`docs/rebuild/STUDIO_WORKYARD_BUNDLE_V1.md`.
