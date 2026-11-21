# External 3D Cricket Player Assets (`/public/models/`)

No permissively licensed (CC0/MIT) rigged cricket player `.glb` assets with full cricket kit (helmet, pads, batting/keeping gloves, team uniforms, willow bat) and cricket motion-capture clips are bundled from public CDNs.

To replace the built-in articulated fallback players with external rigged 3D cricket player models:

1. Place your `.glb` / `.gltf` files (Draco-compressed or uncompressed) in this folder (`/public/models/`):
   - `batter.glb` (or `all.glb`)
   - `bowler.glb`
   - `keeper.glb`
   - `fielder.glb`
   - `umpire.glb`
   - Optional shared animation clip library: `cricket_animations.glb`

2. Update `/public/models/manifest.json` with their paths (e.g. `"/models/batter.glb"`), or upload per-role `.glb` files live in the Owner Admin Console.

## Compatible Rig & Clip Conventions
- **Skeleton Naming**: Standard humanoid bone names (Mixamo `mixamorig:*`, Ready Player Me `Hips`/`Spine`/`Spine2`/`Neck`/`Head`/`LeftArm`/`LeftForeArm`/`LeftHand`, Blender `Armature` `UpperArm.L`/`LowerLeg.R`, plus finger bones `Index1..3`, `Middle1..3`, `Ring1..3`, `Pinky1..3`, `Thumb1..3`).
- **Hand Bone Bat Socket**: Bats attach directly to the character's right hand bone (`RightHand` / `Hand.R`).
- **Animation Clips**: Clip names matching `idle`, `walk`, `run`, `bat_stance`, `bat_swing`, `bowl_runup`, `bowl_delivery`, `keeper_crouch`, `keeper_catch`, `field_dive`, `field_throw`, `celebrate` are automatically played per player via independent `THREE.AnimationMixer` instances with smooth crossfading and velocity-matched stride speed.
