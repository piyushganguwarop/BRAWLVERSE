# Brawl Wars (Phaser 3 + Three.js)

A browser-based 3D fighting game prototype. Build a fighter, master combos and battle through Arcade, Training and Local Versus modes. The online room feature is currently a lobby and input-relay prototype, not secure competitive multiplayer.

The project supports desktop and mobile browsers. Phaser owns the game loop, input, combat state, HUD and scene flow. Three.js renders procedural 3D fighters and the arena behind the Phaser HUD.

## Requirements
- Node.js 20 LTS recommended (Node 18.18+ may work)
- npm

## Run
```bash
npm install
npm run dev
```
Open the local URL printed by Vite. Build with `npm run build`.

## Controls
- A / D or Left / Right: move
- W / Up / Space: jump
- S / Down: crouch
- J: punch
- K: kick
- L: special (uses energy)
- Hold Shift: block
- R: restart round

On touch devices, use the on-screen controls. Landscape orientation is recommended, but the layout remains usable in portrait.

## Character select and roster
- The game now opens on a responsive character-select screen with eight original placeholder fighters.
- `src/characters/roster.js` is the single source of truth for names, colors, visual style, special name and stat values.
- Select a fighter and press Start Fight. The game picks a different CPU rival.
- Character power affects outgoing damage, guard affects blocked damage, and the fast/tank styles adjust movement speed.
- Use the MENU button during a fight to return to character select.

## Architecture
- `src/scenes/FightScene.js`: Phaser scene, round loop and HUD.
- `src/three/ThreeStage.js`: Three.js renderer, camera, arena and fighter visuals.
- `src/characters/Fighter.js`: fighter state, movement model and character stat modifiers.
- `src/characters/roster.js`: editable character roster and lookup helpers.
- `src/scenes/SelectScene.js`: responsive character-select scene.
- `src/combat/CombatSystem.js`: hit validation, damage, block and cooldowns.
- `src/input/InputController.js`: keyboard and touch input.
- `src/config/gameConfig.js`: tunable game settings.

## Notes
This is a playable starter prototype, not a production fighting engine. It uses original procedural placeholder characters made from geometric meshes. Replace these with licensed GLB/GLTF models and authored animations for production. Multiplayer, rollback networking, proper animation blending, sound, accessibility options and save data are not included yet.


## Combat update
- Added grab attack (G on keyboard, GRAB on touch controls).
- Added short combo chaining for consecutive punches and kicks. Combo hits gain up to 35% bonus damage.
- Added hit stun and stronger knockback.
- CPU can now attempt grabs at close range.
- Grabs break guarding.

Keyboard: A/D move, W or Space jump, S crouch, J punch, K kick, G grab, Shift block, L special.

## Procedural fighter animation update

The Three.js fighter rig now includes procedural poses for locomotion, jumping,
guarding, punches, kicks, grabs, specials, hit reactions, knockouts and victory.
These are generated from the rig's articulated groups and do not require external
animation files. Imported GLB skeletal animation support remains a future upgrade.

At the end of a round, the winner enters a victory pose and the defeated fighter
enters a knockout pose. A draw leaves both fighters neutral.


## Online room foundation

This update adds a Socket.IO room server and a browser room panel. Start the game client with `npm run dev` and the room server in a second terminal with `npm run server`. By default the server listens on port 3001. Set `VITE_GAME_SERVER=http://localhost:3001` in a `.env` file when the Vite client runs on port 5173. For deployment, host the Socket.IO server on a public HTTPS endpoint and set that URL in `VITE_GAME_SERVER`.

Players can create/join four-character rooms, see both player names and selected fighters, and ready up. When both are ready, the server emits `room:start`. This is a lobby foundation, not yet synchronized live combat. Do not expose this server publicly without adding rate limits, origin restrictions, room expiry, input validation and authoritative match simulation.


## Online input relay (new)

The room server now relays a sanitized, allow-listed set of player inputs to the other room member using `match:remote-input`. The server limits each socket to 40 input packets per second and only relays inputs after both room members are ready. `OnlineRoom.sendInput(input)` sends the local input state. The receiver can subscribe with `onlineRoom.on('match:remote-input', handler)`.

This is a networking transport foundation, not finished online combat. The current fight scene still runs its local CPU match. Before public release, move combat simulation and damage authority to the server, add state snapshots/reconciliation, validate match phases and add reconnect handling. Do not treat client-reported positions, attacks or health as trusted.


## Online match update

When both room members press Ready, both clients now enter the online fight scene. Each client controls their own fighter, receives the other player's input stream, and renders the remote fighter using the same local combat simulation. This is an early peer-input relay prototype, not server-authoritative combat. For public deployment, add server-side hit validation, authoritative health/state snapshots, reconnect tokens, room expiry, origin restrictions, and abuse protection before treating matches as cheat-resistant.

## Multiplayer reliability update

- Room players receive private reconnect tokens. Tokens are stored in the browser's `sessionStorage` and are never included in public room-player lists.
- If a player loses connection, the room reserves their seat for 30 seconds. They can reconnect in the same browser tab/session and reclaim the seat.
- If the grace period expires, the disconnected player is removed and the remaining player is notified.
- Room readiness is reset on disconnect. A match starts only when both players are connected and ready.
- The server exposes `GET /health` for deployment health checks.
- Set `ALLOWED_ORIGIN` to a comma-separated list of trusted website origins in production. The development default permits all origins.

This is a reconnection and room-lifecycle improvement. It does not yet make combat server-authoritative. Do not treat client-simulated damage as secure for public competitive play.


## Combat engine milestone

The combat foundation now uses timed active frames for attacks, per-action hit registration, directional guarding, a short perfect-block window, guard-breaking grabs, hit stun, knockback, combo scaling, energy costs and character stat modifiers. Fighter movement includes jump gravity, limited air control, arena bounds and knockback decay.

Run the automated combat tests with `npm test`. These tests cover movement bounds, single-hit attack registration, special energy costs, directional guard behavior and guard-breaking grabs.

This milestone is a single-player combat foundation. Online combat is still a prototype and is not yet server-authoritative. Browser gameplay, multiplayer synchronization and full visual regression testing remain outstanding.


## 3D character model pipeline

The renderer now supports optional GLB fighter models through Three.js `GLTFLoader` and `AnimationMixer`. The existing procedural fighters remain as a fallback, so no external model downloads are required to run the project.

To add a licensed model:
1. Put the `.glb` file in `public/assets/characters/`.
2. Set that fighter's `model` property in `src/characters/roster.js`, for example `/assets/characters/atlas.glb`.
3. Include animation clips named `Idle`, `Walk`, `Jump`, `Crouch`, `Block`, `Punch`, `Kick`, `Grab`, `Special`, `Hit`, `KO`, and `Victory`. The loader also recognizes common aliases such as `Run`, `Jab`, `Hurt`, and `Death`.
4. Keep the model facing +Z and use a humanoid scale. The loader normalizes its height automatically.

No third-party GLB assets are bundled. The roster still uses procedural models until you add properly licensed GLB files.

## Fighter Creator update

The main selection screen now includes a Fighter Creator. It supports a fighter name, body build, hair style, outfit type, fighting style, outfit/accent/skin/hair colors, and randomize. The preview updates as controls change. Saved customization is stored in browser localStorage and is used as the player's fighter in offline CPU matches. The 3D procedural model applies the selected colors and appearance options.

Online room metadata still uses the existing fixed roster IDs. Custom fighter appearance synchronization for online matches is a later multiplayer task. The preview is a lightweight CSS mannequin; the in-match fighter is the procedural Three.js model. This update does not include bespoke GLB assets.

## Advanced Fighter Creator

The Fighter Creator now supports three local character slots, face shape, eyebrow style, facial hair, upper/lower outfit pieces, gloves, shoes, accessories, and body proportion sliders. Appearance settings are sanitized before saving and are passed into the procedural Three.js fighter model. Fighting style remains a separate gameplay choice.

Saved characters are stored in browser localStorage on the current device. They are not yet linked to user accounts or synchronized to online rooms.

## Interactive 3D Fighter Creator

The fighter workshop now uses a dedicated Three.js preview instead of the previous CSS mannequin. Players can drag the model to rotate it, use the rotate buttons, zoom with the slider or mouse wheel, and click visible model parts to identify them. Appearance controls update the 3D preview live, including body proportions, face shape, hair, facial hair, outfit colors, gloves, shoes and accessories. The existing three local character slots continue to save and load presets.

The preview is a procedural 3D model built from Three.js geometry. It is not a production-ready rigged GLB character, and the outfit choices currently adjust the procedural model rather than load separate garment meshes.


## Character Creator P1 completion update

The creator now has an interactive Three.js procedural preview with drag rotation, zoom controls, click-to-identify body parts, and a subtle idle pose. Appearance controls include body build and proportions, face shape, brows, facial hair, hair styles (including generated curls and spikes), upper garments, lower garments, gloves, shoes, accessories, eye color, and separate outfit/accent/skin/hair/bottom colors. Garment details are generated as separate preview meshes, including jacket panels, hoodie hood/pocket/cords, vest trim, shorts, jogger stripes, boot cuffs, combat armor, glasses, headband, chain, and mask.

Three saved character slots persist in browser localStorage. The active slot is remembered separately. Saving a fighter selects it for the next offline CPU match. The "Use this fighter in my next match" checkbox controls whether the selected custom slot or the roster fighter is used. The same sanitized appearance configuration is passed into the Three.js fight model. Online custom-fighter synchronization remains part of the later multiplayer milestone.

Run `npm test` for the automated combat and custom-fighter tests. Run `npm run dev` to launch the browser client. A dependency installation and production build were not completed in the authoring environment, so perform `npm install` and `npm run build` locally before deployment.

## P2 Main Game UI

P2 adds a responsive main-menu shell with Arcade, Online, Local Versus, Training, Fighter Creator, Profile and Settings navigation. Arcade/Training/Local Versus route through the existing fighter and stage selection flow; the underlying combat implementation remains the current CPU fight prototype unless a multiplayer room is used.

The in-match interface includes the existing live health/energy/timer/round HUD, a pause overlay with resume/restart/controls/quit actions, and a match-results overlay with rematch/change-fighter/main-menu actions. Local profile name, saved-fighter count, last selected mode, match record, and settings preferences use browser localStorage.

### Run

```bash
npm install
npm run dev
```

The P2 screens are responsive for desktop and mobile browsers. Online room navigation still requires the Socket.IO server described above. Local Versus is currently a navigable mode entry, not yet a fully implemented two-human local control mode. Audio settings are persisted preferences; live audio mixing is not yet connected.

## P2 UI polish update

This build adds a live Three.js roster preview on fighter selection for desktop layouts, a stage-specific visual preview, and a persistent recent-match history panel in the local profile. Match results now append the selected fighters, score, mode, stage, and date to a local history list (latest 20 retained). The selection preview is disposed when the scene shuts down.

Validation: `npm test` passes 16 tests. JavaScript syntax checks pass. A Vite production build and live browser/device testing still need to be run after installing dependencies.

## P2.3 Settings and pause-menu integration

The Settings screen now exposes persistent master/music/effects volume preferences, reduce-screen-shake, graphics quality (Low/Medium/High), and browser fullscreen. The pause menu opens an in-match settings panel without unpausing the fight. Changes save immediately; graphics quality updates the active Three.js renderer's pixel ratio and shadow setting. The screen-shake preference controls the small combat feedback shake. Volume values are stored for the future audio mixer, but this build does not yet include music or effects playback/mixing.

The controls panel now lists the implemented keyboard bindings: A/D or arrows to move, W/Up/Space to jump, S/Down to crouch, J punch, K kick, G grab, Shift block, and L special. Fullscreen depends on browser support and may be unavailable in embedded browsers.

Validation for this update: `npm test` passes 20 tests, all JavaScript files pass `node --check`, and `index.html` parses successfully. Dependencies were not installed in the authoring environment, so run `npm install` and `npm run build` locally before deployment.


## P2.4 Responsive UI update

This update adds responsive layouts for narrow phones, portrait mobile, and short landscape screens. It includes safe-area spacing, larger touch targets, scrollable modal panels, and compact creator/settings layouts. Desktop layout remains the default. Run `npm test` for the automated checks. A real-device browser pass is still recommended before locking P2.

## P3.4 Training Mode

Training now runs without a round timer or match knockout flow. The Training Lab lets you switch the dummy between stationary, always-guarding, and CPU attack-back behavior. You can enable infinite player health, infinite dummy health, and infinite energy independently. The panel tracks total damage, hit count, highest combo, and last-hit damage. Use `T` or the Reset Positions button to restore both fighters, health, energy, action state, and cooldowns. Clear Stats resets the training counters. On touch devices, the panel sits below the match HUD so it does not cover the movement and attack controls.


## Local Versus (P3.5)

Choose **LOCAL VERSUS** from the main menu. Select Player 1 from the fighter cards, then use the Player 2 arrows to choose a different roster fighter.

Desktop controls:
- Player 1: A/D move, W jump, J punch, K kick, G grab, Shift block, L special.
- Player 2: Left/Right arrows move, Up arrow jump, Numpad 1 punch, Numpad 2 kick, Numpad 3 grab, Numpad 0 block, Numpad 5 special.

On touch devices, Local Versus displays a second touch pad on the right side for Player 2. Both players share the same arena, round timer, health bars, and best-of-three match flow.


## Combat Polish (P3.6)

Combat feedback now includes brief hit-stop on clean hits, camera shake, animated impact rings and sparks, floating damage text, combo banners, and stronger procedural hit-reaction poses. Perfect blocks and regular blocks use a blue feedback color. Special attacks use gold impact effects. Screen shake still respects the Reduce Screen Shake setting.


## Advanced Movement (P3.7)

- Forward dash: E. Backdash: Q.
- Local Versus Player 2: Numpad 6 forward dash, Numpad 4 backdash.
- Dashes have a short burst, brief evade window, and cooldown.
- Grounded attacks use the normal move data. Attacks started while airborne gain extra reach and knockback with slightly reduced damage. Punches and kicks started while crouching gain a small damage bonus with reduced reach.
- Movement animation uses a forward-leaning dash pose.


## Advanced Combat (P3.8)

- Punch and kick can cancel into each other during their defined cancel windows.
- A third-hit grounded kick becomes a launcher and sends the opponent airborne.
- Airborne opponents can be hit again for juggle combos.
- Repeated juggle hits scale damage down to a configured minimum.
- Launcher feedback displays `LAUNCH!`.
- Combo timing, launcher height, launch velocity, and damage scaling live in `src/config/gameConfig.js`.


## P3.7 Progression and Rewards

- Local persistent XP, levels, coins, win/loss records.
- Match rewards: arcade win +100 XP/+60 coins, other-mode win +60 XP/+35 coins, loss +25 XP/+10 coins.
- Full arcade clear bonus: +250 XP/+150 coins.
- Fighter unlock shop: Myst, Blaze, Nova, Cipher and Onyx.
- Arena unlock shop: Ancient Temple and City Rooftop.
- Starter fighters: Atlas, Volt and Rook. Starter arena: Neon District.
- Unlocks persist in `fighter.progression.v1` on the current browser/device.
- Profile displays level, XP progress, coin wallet and unlock counts.

## P3.8 Final Integration and Release

P3.8 is the final milestone. It includes the complete P1/P2/P3.1-P3.7 feature set, regression tests, syntax validation, and a production build check when dependencies are installed.

### Run locally

1. Install Node.js 18 or newer.
2. Run `npm install`.
3. Run `npm test`.
4. Run `npm run build`.
5. Run `npm run dev` and open the local URL printed by Vite.

Progression is stored locally in the browser. It does not sync across devices or online accounts. Training mode does not award match rewards.


## Brawl Wars release shell
- Branded startup screen and title metadata.
- Startup/runtime error notice with a reload action.
- Online room server validates player names, fighter IDs, room codes and input payloads.
- Online room server applies per-event rate limits, room capacity limits, origin allow-listing and idle-room cleanup.
- Production server must set `ALLOWED_ORIGIN` to the exact deployed website origin. Example: `https://your-game.netlify.app`. Do not use `*`.

## Production build and local verification
```bash
npm install
npm test
npm run build
npm run preview
```
Open the preview URL printed by Vite. Test the preview build, not only the development server.

## Deploy the website to Netlify
1. Push the project folder to a GitHub repository. `package.json` must be at the repository root.
2. Import the repository in Netlify.
3. Set build command to `npm run build` and publish directory to `dist`.
4. Add `VITE_GAME_SERVER` with the public HTTPS URL of the room server.
5. Deploy and copy the Netlify site origin.

## Deploy the room server to Render
1. Create a Render Web Service from the same repository.
2. Render can use the included `render.yaml` blueprint, or configure the service manually.
3. Set build command to `npm install` and start command to `npm run server`.
4. Set `NODE_ENV=production`.
5. Set `ALLOWED_ORIGIN` to the exact Netlify origin, with no trailing slash.
6. Set health check path to `/health`.
7. Deploy and test `https://YOUR-SERVICE.onrender.com/health`.
8. Confirm the Netlify `VITE_GAME_SERVER` value points to this Render URL, then redeploy the website.

## Online mode security status
The room service validates lobby events and relayed input shape. It does not run the authoritative combat simulation. Clients still simulate combat locally, so health, hit results, match outcomes and progression are not secure against modified clients. Do not launch public ranked play, paid items or valuable account rewards until combat and progression are server-authoritative and authenticated. The current profile/progression data is stored in local browser storage and is not an account system.

## Production limitations
This remains an early-access prototype. Character models are procedural placeholders unless you add licensed GLB assets. The current settings UI stores volume preferences but does not yet provide a complete audio mixer. Real-device browser testing and the final hosted deployment must be performed before public release.
