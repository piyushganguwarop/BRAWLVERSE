# BRAWLVERSE: 12-screen UI specifications

## Global design rules
- Brand spelling is BRAWLVERSE everywhere. Never show Brawl Wars in visible UI.
- Deep navy/charcoal surfaces, electric cyan primary accent, magenta for opponent/defeat, violet for training, gold only for rewards.
- Clean angular panels, restrained glow, strong spacing and readable typography.
- Avoid generic dashboard cards, excessive rounded rectangles, random gradients, oversized text blocks and unnecessary scrollbars.
- Use the existing Three.js fighters for live previews. Static artwork must not replace playable 3D models.
- Responsive targets: 1920x1080, 1366x768 and 844x390 landscape.
- All controls must call real game actions. Do not invent features or rewards.

## 01 Main Menu
BRAWLVERSE logo, player level/coins, large Atlas 3D showcase, concise tagline, clear Play/Fighters/Training/Collection/Settings navigation. Keep the composition balanced and uncluttered.

## 02 Mode Select
Arcade, Local Versus, Training and Online. Distinct but consistent mode tiles. Clearly label unavailable or beta features honestly.

## 03 Fighter Select
Atlas, Volt, Rook and Myst. Large live 3D preview, fighter name, archetype, readable stat bars, special move, owned/locked state and confirm/back controls.

## 04 Arena Select
Large Neon District preview, short description, arena carousel, accurate lock states and confirm control. Do not expose unimplemented arenas as playable.

## 05 Fight HUD
Both fighter names/portraits, health, energy, timer, round indicator and combo/damage feedback. Keep the arena center unobstructed and maintain contrast.

## 06 Pause Menu
Compact centered overlay over a darkened match. Resume, Restart, Controls, Settings and Quit to Main Menu. Confirm destructive actions. Avoid unnecessary nested scrolling.

## 07 Victory / Results
Victory title, winning fighter, round score, match statistics, actual XP/coin rewards, Rematch and Main Menu.

## 08 Defeat
Defeat title, fighter pose, score/stat summary, Retry and Main Menu. Do not show victory rewards.

## 09 Fighter Workshop / Creator
Large live 3D preview on left, organized customization tabs/options on right, save/reset controls. Preview must match the fighter model used in matches.

## 10 Profile
Player identity, level, XP, coins, fighter usage, wins/losses/win rate and recent matches. Handle empty history.

## 11 Collection
Fighters, Skins, Arenas and Achievements tabs. Clear owned/locked state, unlock requirements and preview. Do not invent items.

## 12 Settings
Audio, Graphics, Controls, Display and Accessibility. Sliders/toggles must affect real settings and persist.

## Acceptance checks per screen
1. Real browser screenshots at desktop and mobile landscape.
2. All buttons and navigation verified.
3. No overflow, clipped labels or hidden controls.
4. Keyboard, pointer and touch usability.
5. Existing game state and progression preserved.
6. No console errors.
7. Regression tests and production build pass.
8. Manual visual review recorded separately from automated tests.
