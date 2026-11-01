# Character GLB assets

Place one `.glb` file per fighter in this folder and set the matching `model` property in `src/characters/roster.js`. Models should face +Z (front) and have their feet at ground level. The loader normalizes model height to about 2.05 world units.

Animation clips are matched by name, case-insensitively. Recommended names: `Idle`, `Walk`, `Jump`, `Crouch`, `Block`, `Punch`, `Kick`, `Grab`, `Special`, `Hit`, `KO`, `Victory`. Missing clips fall back to `Idle`; if a model fails to load, the procedural fighter remains active.

Only use models and animations that you own or have a license to use.
