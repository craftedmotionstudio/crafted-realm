# Blender door export review

Working candidate, not live gameplay acceptance. Both oak leaves have separate hinge pivots, fitted planks, brace, metal straps and latch. Blender actions `DoorNorthOpen` and `DoorSouthOpen` export as two quaternion animation tracks. The Studio button samples those exported clips forward and backward; it does not create a substitute procedural door rotation.

The first authoring sweep failed because latch depth extended behind the wall face. Hinge projection was increased from 0.25 to 0.30 tiles. Actual transformed mesh vertices at 25 poses now clear the outer masonry plane. This proves that sampled plane-clearance condition only, not full installed collision or hinge mounting quality.

In-app `house7` preview: pointer Open doors visibly swings the south leaf outward and clears the entrance; Close doors returns it to the closed pose. Screenshot `scratchpad/holm_guide_house_overhaul_v1/doors_open.png`. No console errors. The north animation is exported and included in the geometry sweep, but a separate north-camera visual audit remains required. Hinge mounting/frame detail remains unfinished.

GLB: 22,806 triangles, 32 primitives, 12 materials, 1,166,628 bytes; recipe node and animation names present. These pass the declared geometry budgets. Factory manifest synced; full factory visual/scale/contact/gameplay gates have not passed. No source or model installed in the live provider.

The house and whole island remain incomplete: fireplace, porch, planting, roof/gable finish, shutters, NPCs, live doors/collision/upstairs traversal and final reference proofs are still required.
