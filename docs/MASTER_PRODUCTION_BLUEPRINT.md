# BRAWL WARS
## Complete Game Reconstruction and Production Blueprint

**Document type:** Master Game Design and Technical Production Plan  
**Version:** 1.0  
**Status:** Planning  
**Development status:** No reconstruction work started

---

# 1. PROJECT VISION

## 1.1 Game concept

Brawl Wars is an anime-inspired 3D fighting game for desktop browsers and mobile browsers.

Players select fighters, enter detailed 3D arenas, learn combat mechanics, defeat opponents, unlock content and improve their fighters.

The game should combine:

- Responsive 3D fighting.
- Distinctive anime-inspired characters.
- Detailed and memorable environments.
- Skill-based combat.
- Satisfying attacks and visual effects.
- Character progression and unlocks.
- Single-player and local multiplayer.
- Online multiplayer in a later production phase.

## 1.2 Quality objective

Brawl Wars must look and feel like a finished indie game, not a prototype assembled from primitive shapes.

The production standard includes:

- Purpose-built character models.
- Consistent art direction.
- Rigged and animated characters.
- Designed environments with recognizable layouts.
- Proper materials, lighting and shadows.
- Consistent UI design.
- Clean animations and transitions.
- Optimized assets and rendering.
- Reliable gameplay systems.

## 1.3 Target experience

A new player should be able to:

1. Open the game.
2. Reach the main menu quickly.
3. Select a fighter.
4. Choose a game mode.
5. Enter a visually complete arena.
6. Understand the controls.
7. Fight without confusing input or camera behavior.
8. Receive a match result.
9. Earn progression rewards.
10. Return to the menu and continue playing.

The experience must remain understandable on a small touchscreen.

---

# 2. PRODUCT DECISIONS

| Decision | Locked direction |
|---|---|
| Art style | Anime-inspired 3D |
| Camera | Third-person angled arena camera |
| Movement | Full 3D movement |
| Initial fighters | Four complete fighters |
| Platforms | Desktop and mobile browsers |
| Initial online scope | Deferred |
| Initial focus | Offline gameplay quality |
| Renderer | Three.js is the current preferred candidate |
| Existing game | Audit and selective reuse |
| Production approach | Rebuild in tested phases |

These decisions define the current scope. New features must not silently expand it.

---

# 3. CORE GAME PILLARS

## 3.1 Visual identity

Every character and arena must have a recognizable identity.

The game should use a consistent anime-inspired visual language across:

- Characters.
- Environments.
- Materials.
- Lighting.
- Effects.
- Menus.
- Icons.
- Typography.
- Transitions.

Avoid unrelated assets that look like they came from different games.

## 3.2 Combat quality

Combat must feel responsive and predictable.

Players should understand:

- Which attack they performed.
- Whether the attack connected.
- Why they took damage.
- When they can attack again.
- When they can block or dodge.
- How to continue a combo.

## 3.3 Progression

Players need meaningful reasons to continue.

Progression will include:

- Player level.
- XP.
- Coins.
- Fighter unlocks.
- Cosmetic unlocks.
- Achievements.
- Match records.
- Daily challenges, if they improve retention without creating excessive grind.

## 3.4 Accessibility

Desktop and mobile users must receive properly designed controls.

Mobile must not be a desktop layout squeezed onto a smaller screen.

## 3.5 Performance

The game must maintain stable performance across supported devices.

Optimization is part of architecture and asset creation, not a final cleanup task.

---

# 4. GAME MODE DESIGN

## 4.1 Main menu

The main menu is the central navigation screen.

Required elements:

- Game logo.
- Animated 3D background.
- Play.
- Fighters.
- Collection.
- Profile.
- Settings.
- News or announcements, if needed.
- Loading and connection indicators.

The background should use a real environment or character scene, not a collection of decorative boxes.

## 4.2 Arcade

The initial single-player progression mode.

Flow:

1. Select a fighter.
2. Select difficulty.
3. Enter the first match.
4. Defeat opponents.
5. Progress through the opponent sequence.
6. Encounter a final boss.
7. Receive completion rewards.
8. Return to the arcade screen.

Requirements:

- Configurable opponent sequence.
- Multiple difficulty levels.
- Match-specific objectives.
- Boss introduction.
- Victory and defeat screens.
- Reward calculations.
- Save progression.

The first release should use a small, polished opponent sequence instead of a large amount of repetitive content.

## 4.3 Training

A practice environment for learning the combat system.

Required features:

- Stationary dummy.
- Guarding dummy.
- Moving dummy.
- Reset position.
- Reset health.
- Infinite health option.
- Damage display.
- Combo counter.
- Frame and timing information where practical.
- Hitbox visualization for development.
- Attack practice instructions.

Training should use the same combat engine as normal matches.

## 4.4 Local Versus

Two players fight on one device.

Required features:

- Two fighter selections.
- Separate control schemes.
- Shared arena.
- Independent player health.
- Round system.
- Match timer.
- Winner display.
- Rematch.
- Return to menu.

Mobile support for two players on one touchscreen requires separate control testing. It should not be assumed to work well by default.

## 4.5 Online

Online multiplayer is deferred until the offline combat system is stable.

Future requirements:

- Private rooms.
- Room codes.
- Player identity.
- Ready states.
- Fighter selection synchronization.
- Match synchronization.
- Disconnect handling.
- Reconnection.
- Server-authoritative combat.
- Server-owned match results.
- Server-side progression validation.
- Abuse prevention.

The existing input-relay prototype must not be advertised as secure competitive multiplayer.

## 4.6 Fighter Creator

The initial version should focus on practical customization.

Possible customization categories:

- Preset fighter body.
- Hair.
- Hair color.
- Outfit.
- Outfit color.
- Accessories.
- Aura or cosmetic effects.
- Name and profile presentation.

The creator must use the same character model and animation foundation as the actual fight.

Customization must not create unfair combat advantages.

---

# 5. FIGHTER DESIGN

## 5.1 Initial roster

The first release will contain four complete fighters.

Each fighter must have:

- Distinctive silhouette.
- Character biography.
- Unique color palette.
- Distinct combat identity.
- Balanced attributes.
- Unique special ability.
- Complete animation set.
- Selection-screen presentation.
- Victory animation.
- Defeat animation.
- Portrait and promotional artwork.

## 5.2 Fighter production template

Every fighter follows the same production checklist.

### Visual assets

- High-quality 3D model.
- Consistent anime-inspired proportions.
- Proper topology.
- UV mapping.
- Textures and materials.
- Hair and clothing.
- Accessories.
- LOD versions where appropriate.
- Optimized export.

### Technical assets

- Rigged skeleton.
- Animation clips.
- Animation naming convention.
- Character configuration.
- Combat configuration.
- Hitbox configuration.
- Cosmetic configuration.
- Model metadata.

### Required animations

1. Idle.
2. Walk.
3. Run.
4. Forward movement.
5. Backward movement.
6. Side movement.
7. Jump start.
8. Jump loop.
9. Landing.
10. Crouch.
11. Block.
12. Perfect block.
13. Dodge.
14. Punch.
15. Kick.
16. Heavy attack.
17. Grab.
18. Special attack.
19. Hit reaction.
20. Knockdown.
21. Get-up.
22. Victory.
23. Defeat.

Some animations can share a common base where the fighter's design allows it. Unique signature moves should remain distinctive.

## 5.3 Fighter balance

Each fighter should have configurable attributes:

- Health.
- Movement speed.
- Jump strength.
- Attack power.
- Defense.
- Attack range.
- Special ability cooldown.
- Recovery characteristics.

Attributes must be data-driven.

Do not hardcode different fighter behavior throughout the combat engine.

## 5.4 Roster production rule

Complete one fighter from model creation through combat integration before producing the other three.

The first fighter becomes the quality reference for all future fighters.

---

# 6. ARENA AND ENVIRONMENT DESIGN

## 6.1 Initial environment scope

The first production target is one fully finished arena.

Additional arenas should be added after the first arena passes visual and performance testing.

## 6.2 Arena design requirements

Each arena needs:

- Recognizable layout.
- Distinct visual theme.
- Proper ground geometry.
- Terrain or floor detail.
- Background architecture.
- Foreground objects.
- Props.
- Lighting.
- Shadows.
- Atmosphere.
- Collision boundaries.
- Spawn locations.
- Camera constraints.
- Optimized materials and geometry.

## 6.3 Proposed arena concepts

### Arena 01: Neon District

A futuristic city fighting platform.

Visual elements:

- Tall buildings.
- Rooftop structures.
- Neon advertisements.
- Distant city skyline.
- Rooftop equipment.
- Atmospheric lighting.
- Detailed floor materials.

### Arena 02: Ancient Temple

A traditional fantasy fighting location.

Visual elements:

- Stone flooring.
- Temple structures.
- Statues.
- Pillars.
- Decorative architecture.
- Vegetation.
- Environmental particles.

### Arena 03: Underground Colosseum

A large underground fighting venue.

Visual elements:

- Arena seating.
- Industrial architecture.
- Lighting rigs.
- Metal structures.
- Large arena floor.
- Background spectators or crowd silhouettes.

These are proposed future environments, not commitments to build all three in the first release.

## 6.4 Arena interaction

The first release should use controlled arena boundaries.

Future environmental interaction may include:

- Breakable objects.
- Interactive hazards.
- Environmental attacks.
- Destructible decorations.

These features must not compromise competitive combat readability.

---

# 7. CAMERA AND MOVEMENT

## 7.1 Camera direction

Use a third-person angled camera.

The camera should show both fighters and enough of the environment to communicate arena depth.

It should not behave like a fixed 2D side-scrolling camera.

## 7.2 Camera requirements

- Track the fight.
- Keep both fighters visible.
- Adjust framing based on fighter distance.
- Respect arena boundaries.
- Smoothly follow movement.
- Avoid sudden camera snapping.
- Avoid clipping through scenery.
- Support desktop and mobile aspect ratios.
- Maintain readable combat framing.

Camera motion must not make aiming or movement unpredictable.

## 7.3 Movement system

Fighters move across the arena using three-dimensional world positions.

Required movement:

- Forward.
- Backward.
- Left.
- Right.
- Diagonal movement.
- Jump.
- Crouch.
- Dash.
- Dodge.

The game must distinguish movement relative to the arena from movement relative to the camera.

The selected movement convention must remain consistent across keyboard, controller and touchscreen inputs.

## 7.4 Collision and boundaries

The system needs:

- Arena movement limits.
- Fighter collision.
- Ground detection.
- Jump landing.
- Wall collision.
- Knockback boundaries.
- Spawn positions.

Fighters must not pass through each other in unintended situations.

---

# 8. COMBAT SYSTEM

## 8.1 Combat architecture

Separate the combat engine from the 3D renderer.

The combat engine determines:

- Movement.
- Attack state.
- Attack timing.
- Hit detection.
- Damage.
- Blocking.
- Stun.
- Knockback.
- Combos.
- Match outcomes.

The renderer displays the resulting character positions, animations and effects.

## 8.2 Attack categories

- Light attack.
- Heavy attack.
- Punch.
- Kick.
- Grab.
- Special attack.
- Aerial attack.
- Counterattack.

The exact button mapping will be finalized after desktop and mobile control testing.

## 8.3 Attack timing

Each attack should define:

- Startup frames or time.
- Active frames or time.
- Recovery frames or time.
- Damage.
- Range.
- Hitbox.
- Hit reaction.
- Knockback.
- Stun.
- Combo eligibility.
- Cancellation rules.

All timing values must be configurable.

## 8.4 Hit detection

Use dedicated hitbox and hurtbox definitions.

The system must support:

- Depth-aware attacks.
- Vertical separation.
- Ground and aerial attacks.
- Multiple hitbox shapes.
- Block detection.
- Invulnerability windows.
- Friendly-fire rules where relevant.

Distance between character centers alone must not determine every hit.

## 8.5 Defense

Required mechanics:

- Standard block.
- Perfect block.
- Dodge.
- Counter opportunity.
- Hit stun.
- Knockdown.
- Recovery.

The player must receive clear feedback for each defensive action.

## 8.6 Combo system

The combo system must support:

- Light attack chains.
- Heavy attack follow-ups.
- Launchers.
- Air combos.
- Special attack follow-ups.
- Combo scaling.
- Combo limits.
- Recovery and escape opportunities.

Combos should reward timing without creating unavoidable sequences.

## 8.7 Combat feedback

Every important action needs visual or audio feedback.

Examples:

- Hit sparks.
- Impact effects.
- Block effects.
- Perfect block effects.
- Camera shake.
- Hit-stop.
- Damage indicators.
- Combo counter.
- Special ability effects.
- Knockdown effects.

Effects must remain readable and must not obscure the fighters.

---

# 9. AI SYSTEM

## 9.1 Initial AI requirements

The arcade opponent needs multiple behavior states.

- Idle.
- Approach.
- Maintain distance.
- Attack.
- Block.
- Dodge.
- Recover.
- Use special ability.
- Respond to player actions.

## 9.2 Difficulty

Difficulty should change behavior and decision quality.

It should not simply multiply damage or give the CPU unfair health.

Suggested levels:

- Easy.
- Normal.
- Hard.

## 9.3 Training dummy

Training behavior must be independent from arcade AI.

The dummy should support configurable movement and defensive behavior.

---

# 10. PROGRESSION AND ECONOMY

## 10.1 Player profile

The profile should contain:

- Player ID.
- Display name.
- Level.
- XP.
- Coins.
- Unlocked fighters.
- Unlocked cosmetics.
- Achievements.
- Match history.
- Settings.

## 10.2 Rewards

Players may earn:

- XP from matches.
- Coins from match completion.
- Arcade completion rewards.
- Achievement rewards.
- First-time completion rewards.

Rewards must be calculated by trusted game logic.

When accounts and online progression are introduced, the server must own progression decisions.

## 10.3 Unlocks

Potential unlock categories:

- Fighters.
- Fighter outfits.
- Color variations.
- Accessories.
- Victory poses.
- Cosmetic effects.
- Profile cosmetics.

Combat balance must not depend on paid or grind-exclusive advantages.

---

# 11. UI AND USER EXPERIENCE

## 11.1 Design direction

The UI should look like a cohesive anime fighting game interface.

It should use:

- Strong typography.
- Clear visual hierarchy.
- Consistent colors.
- Intentional spacing.
- High-quality fighter artwork.
- Clear icons.
- Consistent buttons.
- Smooth transitions.
- Responsive layouts.

Avoid random gradients, excessive borders, generic cards and unnecessary decorative elements.

## 11.2 Required screens

1. Loading screen.
2. Main menu.
3. Mode selection.
4. Fighter selection.
5. Arena selection.
6. Difficulty selection.
7. Fight HUD.
8. Pause menu.
9. Victory screen.
10. Defeat screen.
11. Training configuration.
12. Fighter creator.
13. Collection.
14. Player profile.
15. Settings.
16. Future online lobby.
17. Future matchmaking screen.

## 11.3 Fight HUD

The HUD should contain:

- Player health.
- Opponent health.
- Fighter names.
- Timer.
- Round score.
- Combo counter.
- Special ability status.
- Match notifications.

The HUD must not cover important character movement.

## 11.4 Fighter selection

The selection screen should show:

- Fighter roster.
- Large fighter preview.
- Name and description.
- Stats.
- Combat style.
- Special ability.
- Selection confirmation.

It must not have overlapping panels or unnecessary nested scrollbars.

## 11.5 Responsive behavior

Desktop, tablet and mobile layouts must be designed separately where necessary.

Required testing viewports:

- 1920 × 1080.
- 1366 × 768.
- 1280 × 720.
- 1024 × 768.
- 768 × 1024.
- 390 × 844.
- 844 × 390.

---

# 12. DESKTOP AND MOBILE INPUT

## 12.1 Desktop

Initial support:

- Keyboard.
- Mouse.
- Optional gamepad support.

Input actions should be abstracted so the combat engine does not depend directly on keyboard events.

## 12.2 Mobile

Required controls:

- Virtual movement stick or directional control.
- Jump.
- Light attack.
- Heavy attack.
- Block.
- Dodge.
- Special.

The interface must support:

- Multi-touch.
- Touch cancellation.
- Responsive button sizing.
- Clear pressed states.
- Safe screen-area spacing.
- Landscape orientation for gameplay.

The game must pause or safely handle focus loss and browser interruptions.

## 12.3 Input architecture

All input devices should produce the same logical game actions.

Example:

Keyboard input → Logical action → Fighter controller → Combat engine.

Touch input → Logical action → Fighter controller → Combat engine.

Gamepad input → Logical action → Fighter controller → Combat engine.

---

# 13. TECHNICAL ARCHITECTURE

## 13.1 Architecture principle

The project must use clear boundaries between systems.

Recommended high-level structure:

### Application layer

- Startup.
- Loading.
- Scene lifecycle.
- Navigation.
- Global settings.

### Rendering layer

- Three.js renderer.
- Camera controller.
- Lighting.
- Environment.
- Fighter visuals.
- Animation controller.
- Visual effects.

### Gameplay layer

- Fighter state.
- Movement.
- Combat.
- Collision.
- AI.
- Match rules.
- Game modes.

### Interface layer

- Menus.
- HUD.
- Controls.
- Notifications.
- Settings.

### Data layer

- Character definitions.
- Arena definitions.
- Combat configuration.
- Progression.
- Inventory.
- Save system.

### Network layer

Deferred until offline gameplay is stable.

It will later contain:

- Authentication.
- Rooms.
- Match synchronization.
- Server-authoritative combat.
- Reconnection.
- Validation.
- Moderation.

## 13.2 Existing technology review

The current project uses Phaser and Three.js.

The reconstruction should evaluate whether to:

- Retain Phaser for application and UI scene management.
- Use Three.js for all 3D rendering.
- Move to a different architecture if the existing coupling creates unnecessary complexity.

Do not replace a technology simply because it is old or unfamiliar.

Make the decision using a working technical prototype and measurable results.

## 13.3 Suggested project structure

```text
brawl-wars/
  public/
    assets/
      characters/
      arenas/
      animations/
      textures/
      audio/
      effects/
      ui/

  src/
    app/
    core/
    scenes/
    rendering/
      camera/
      lighting/
      environment/
      characters/
      animation/
      effects/

    gameplay/
      fighters/
      movement/
      combat/
      collision/
      abilities/
      match/
      ai/

    input/
      keyboard/
      touch/
      gamepad/

    ui/
      screens/
      components/
      hud/
      transitions/

    data/
      fighters/
      arenas/
      attacks/
      progression/

    systems/
      audio/
      loading/
      settings/
      saving/

  server/
    future-online/

  tests/
    unit/
    integration/
    gameplay/
    performance/

  docs/
    GAME_DESIGN.md
    TECHNICAL_ARCHITECTURE.md
    ART_GUIDELINES.md
    ASSET_PIPELINE.md
    TEST_PLAN.md
    PRODUCTION_TRACKER.md
```

The final folder structure may change after the architecture prototype.

---

# 14. ASSET PRODUCTION PIPELINE

## 14.1 3D models

Every model must have:

- Approved concept.
- Correct proportions.
- Clean topology.
- UVs.
- Materials.
- Textures.
- Rig.
- Animation compatibility.
- Optimized export.

## 14.2 Animation pipeline

Animation files must use consistent naming and compatible skeletons.

A shared animation foundation may reduce production effort, but signature attacks must reflect each fighter's identity.

## 14.3 Environment assets

Create reusable environment components.

Examples:

- Pillars.
- Walls.
- Floors.
- Railings.
- Lamps.
- Signs.
- Rocks.
- Vegetation.
- Background structures.
- Decorative props.

Reusable assets must use consistent scale, materials and texture standards.

## 14.4 Asset formats

Evaluate:

- GLB/GLTF for 3D models.
- Compressed textures.
- Efficient audio formats.
- Sprite sheets or texture atlases for UI and effects.

The pipeline should support asset validation and optimization before assets enter production.

## 14.5 Asset licensing

Use original, properly licensed or explicitly permitted assets.

Maintain a record of:

- Asset name.
- Creator.
- Source.
- License.
- Modification rights.
- Attribution requirements.

Do not ship assets with unclear licensing.

---

# 15. PERFORMANCE ENGINEERING

## 15.1 Performance targets

Initial targets:

| Category | Target |
|---|---|
| Desktop | Stable 60 FPS on agreed reference hardware |
| Mobile | Stable 30 FPS minimum target, with 60 FPS on capable devices |
| Loading | Measured and displayed progress |
| Memory | No sustained growth between repeated matches |
| Rendering | Controlled draw calls and shader complexity |
| Network | Deferred until offline gameplay is reliable |

Targets must be tested on named reference devices before release.

## 15.2 Optimization requirements

- Model polygon budgets.
- Texture size budgets.
- Texture compression.
- Level of detail.
- Frustum culling.
- Instancing where useful.
- Material reuse.
- Geometry reuse.
- Animation optimization.
- Efficient shadow settings.
- Particle limits.
- Asset loading and unloading.
- Renderer lifecycle management.

## 15.3 Performance profiling

Measure:

- Frame time.
- CPU time.
- GPU time where available.
- Draw calls.
- Triangles.
- Texture memory.
- JavaScript heap.
- Loading time.
- Long-running match performance.

Do not call the game optimized based on one desktop test.

---

# 16. AUDIO AND PRESENTATION

Required audio categories:

- Menu music.
- Arena music.
- Fighter movement.
- Punch and kick impacts.
- Blocking.
- Special abilities.
- Hit reactions.
- Knockdowns.
- Victory.
- Defeat.
- UI interaction.

Audio settings must actually control playback.

Required settings:

- Master volume.
- Music volume.
- Sound effects volume.
- Mute.
- Optional reduced effects mode.

Presentation features:

- Loading transitions.
- Match introductions.
- Round announcements.
- Victory presentation.
- Defeat presentation.
- Fighter selection animations.
- Arena introduction.

---

# 17. SAVE SYSTEM

## 17.1 Initial offline save

The offline version may use local persistence.

It must support:

- Profile creation.
- Settings.
- XP.
- Coins.
- Unlocks.
- Match progression.

Save data needs versioning and validation.

## 17.2 Future online save

Online progression must be server-owned.

The client must never be trusted to submit arbitrary XP, currency, unlocks or match results.

---

# 18. ONLINE AND SECURITY PLAN

Online is not part of the initial offline milestone.

Before public online release, implement:

- Real player identity.
- Server-side room ownership.
- Server-authoritative match simulation.
- Server-side hit and damage validation.
- Server-owned rewards.
- Rate limits.
- Reconnection.
- Disconnect handling.
- Input validation.
- Anti-abuse monitoring.
- Reporting and moderation foundations.

Client-side checks and CORS configuration alone are not security controls.

Ranked matchmaking must not launch while clients can determine their own match results or rewards.

---

# 19. PRODUCTION ROADMAP

## Phase 0: Planning and discovery

Deliverables:

- Complete game design document.
- Technical architecture document.
- Art direction guide.
- UI screen map.
- Fighter design specifications.
- Arena specifications.
- Input specification.
- Performance plan.
- Risk register.
- Production tracker.

Exit criteria:

All major game systems and visual direction have an approved specification.

## Phase 1: Foundation prototype

Deliverables:

- Clean application structure.
- Renderer prototype.
- Camera controller.
- Input abstraction.
- 3D movement prototype.
- Asset loading pipeline.
- Performance instrumentation.

Exit criteria:

A test fighter can move in a 3D test arena with stable camera and input behavior.

## Phase 2: First arena

Deliverables:

- Complete arena model.
- Materials.
- Lighting.
- Collision.
- Camera boundaries.
- Optimization.
- Loading integration.

Exit criteria:

The arena looks finished, supports gameplay and meets performance targets.

## Phase 3: First fighter

Deliverables:

- Production-quality fighter model.
- Rig.
- Animation set.
- Character configuration.
- Selection preview.
- Fight integration.

Exit criteria:

The fighter can perform the full required movement and combat animation set.

## Phase 4: Combat foundation

Deliverables:

- Movement.
- Camera tracking.
- Collision.
- Hitboxes.
- Hurtboxes.
- Attacks.
- Defense.
- Combos.
- Knockback.
- Match rules.

Exit criteria:

Two fighters can complete a full match without combat-state or collision failures.

## Phase 5: Offline game modes

Deliverables:

- Arcade.
- Training.
- Local Versus.
- Match results.
- Rematch.
- Pause and resume.

Exit criteria:

All offline modes work with the same combat foundation.

## Phase 6: Remaining three fighters

Deliverables:

- Three additional fighter models.
- Complete animations.
- Signature attacks.
- Selection integration.
- Balance testing.

Exit criteria:

All four fighters meet the same production and technical standards.

## Phase 7: UI and progression

Deliverables:

- Final main menu.
- Fighter selection.
- Mode selection.
- HUD.
- Results.
- Collection.
- Profile.
- Progression.
- Saving.
- Settings.

Exit criteria:

The complete offline game can be navigated and played without placeholder screens or broken flows.

## Phase 8: Mobile and desktop optimization

Deliverables:

- Touch controls.
- Responsive UI.
- Landscape gameplay.
- Browser compatibility.
- Device performance testing.
- Memory testing.
- Loading optimization.

Exit criteria:

The game meets its documented requirements on the agreed desktop and mobile test devices.

## Phase 9: Release preparation

Deliverables:

- Complete regression testing.
- Bug fixes.
- Asset license review.
- Deployment configuration.
- Error reporting.
- User-facing documentation.
- Release candidate.

Exit criteria:

No unresolved critical issues. All release acceptance tests pass.

## Phase 10: Online development

Deliverables:

- Authentication.
- Private rooms.
- Match synchronization.
- Server-authoritative combat.
- Server-owned progression.
- Reconnection.
- Security validation.
- Moderation.

Exit criteria:

Online matches pass disconnect, abuse, synchronization and security testing.

---

# 20. TESTING AND QUALITY ASSURANCE

Every phase must have tests.

## Functional testing

- Menu navigation.
- Fighter selection.
- Arena loading.
- Movement.
- Jumping.
- Attacks.
- Blocking.
- Combos.
- Match completion.
- Rematch.
- Saving.
- Settings.

## Visual testing

- Character model quality.
- Animation transitions.
- Camera framing.
- Lighting.
- Shadows.
- Environment detail.
- UI spacing.
- Mobile layout.

## Performance testing

- Idle menu.
- Arena loading.
- Full match.
- Multiple effects.
- Long sessions.
- Repeated match restarts.
- Mobile thermal and performance behavior.

## Regression testing

Every change must be checked against previously working systems.

A phase cannot be considered complete because a single test passed.

---

# 21. ACCEPTANCE STANDARDS

A production feature is complete only when all applicable conditions pass:

1. It works as specified.
2. It integrates with existing systems.
3. It has no known critical defects.
4. It handles errors and cleanup.
5. It works at supported screen sizes.
6. It meets performance requirements.
7. It has automated tests where practical.
8. It has been tested in the actual browser.
9. Its documentation is updated.
10. Its acceptance checklist passes.

Placeholder models, temporary UI and fake loading progress must be labeled as temporary.

---

# 22. PROJECT MANAGEMENT RULES

## Rule 1: Plan before coding

No large feature begins without a written specification.

## Rule 2: Build vertical slices

Complete one playable feature from UI through gameplay and presentation before expanding its scope.

## Rule 3: No placeholder completion

A primitive placeholder is useful during prototyping. It is not a finished character or arena.

## Rule 4: Measure performance

Do not assume a feature is optimized.

## Rule 5: Avoid unnecessary rewrites

Keep existing systems only when they meet the new architecture and quality requirements.

## Rule 6: Keep documentation current

Every completed phase updates the design, technical and testing documents.

## Rule 7: Protect the main branch

Use development branches and tested integration points.

## Rule 8: No online competitive release without server authority

Client-controlled combat and rewards are unacceptable for ranked play.

## Rule 9: Preserve playable milestones

Keep known-good builds so a failed reconstruction step does not destroy the last working version.

## Rule 10: Approve scope changes

New features must be reviewed for cost, performance and schedule impact.

---

# 23. INITIAL RELEASE SCOPE

## Included

- Anime-inspired 3D presentation.
- Four complete fighters.
- One fully finished arena.
- Third-person angled camera.
- Free 3D movement.
- Complete core combat.
- Arcade mode.
- Training mode.
- Local Versus.
- Fighter selection.
- Basic fighter customization.
- XP and coins.
- Initial unlock progression.
- Desktop and mobile browser support.
- Audio and settings.
- Local profile saving.

## Deferred

- Public ranked matchmaking.
- Competitive online seasons.
- Large fighter roster.
- Multiple fully interactive arenas.
- Complex environmental destruction.
- Large social systems.
- Advanced account and moderation platform.
- Large-scale live-service features.

---

# 24. FINAL PRODUCTION PRIORITIES

The project should follow this order:

1. Lock the game design.
2. Lock the technical architecture.
3. Approve the visual direction.
4. Prove the 3D movement and camera.
5. Complete one arena.
6. Complete one fighter.
7. Complete the combat engine.
8. Build the first playable offline game.
9. Expand to four fighters.
10. Complete the UI and progression.
11. Optimize desktop and mobile.
12. Release the offline version.
13. Build online multiplayer.

The first production milestone is not a large amount of content.

It is one small but complete section of Brawl Wars that proves the art style, movement, camera, combat and performance work together.

**The standard for Brawl Wars is a cohesive, polished and playable game. Every new system must meet that standard before it becomes part of the release.**
