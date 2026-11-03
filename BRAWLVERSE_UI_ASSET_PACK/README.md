# BRAWLVERSE UI Asset Pack

Approved visual direction: clean neon cyber-anime fighting game UI.
Correct brand spelling: **BRAWLVERSE**.

## Contents
- `00_REFERENCE/`: approved 12-screen concept board.
- `01_BRAND/`: editable BRAWLVERSE SVG logo.
- `02_VECTORS/icons/`: reusable SVG navigation/action icons.
- `02_VECTORS/components/`: SVG panel, buttons, health/energy bars and section header.
- `03_DESIGN_SYSTEM/`: JSON design tokens and CSS theme.
- `04_SCREEN_SPECS/`: requirements for all 12 screens.
- `05_IMPLEMENTATION/`: ready-to-paste Gemini implementation prompt.

## Use with Gemini
1. Upload this ZIP.
2. Give Gemini access to the GitHub repository.
3. Paste `GEMINI_IMPLEMENTATION_PROMPT.txt`.
4. Require it to work only on `v2-reconstruction`.
5. Make it implement the Main Menu first and show a real browser screenshot before proceeding.

## Asset limitations
- The concept board is a reference, not 12 individually sliced production screenshots.
- SVG files are editable vector building blocks.
- Use the actual 3D fighter models already in the project.
- Font binaries are not bundled. CSS references Orbitron, Rajdhani and Inter with fallbacks. Use locally licensed fonts or an approved font provider.
- Fighter portraits and arena photography are not separately included. Render them from project assets or create original artwork after review.
- Do not slice the concept board into fake production screen backgrounds.

## Roadmap
This package supports Phase 7 UI/progression/audio/polish. Phase 8 is performance optimization.
