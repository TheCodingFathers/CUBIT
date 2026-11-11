# Development Log

## Overview

This note records the development progress of CUBIT: Core of the Cosmos.

Use it to track completed work, important changes, testing results, and future development milestones.

## Project Information

- **Project:** CUBIT: Core of the Cosmos
    
- **Engine:** Three.js
    
- **Build Tool:** Vite
    
- **Language:** JavaScript
    
- **Version Control:** Git
    

## Development Entries

### November 12, 2026

#### Completed

New on November 12:

- World 01 concept art received (floating islands, central monolith, atmosphere)
    
- Backdrop stage 1: sky dome with a soft gradient and 70 slowly drifting specks, drawn behind the level
    
- Backdrop stage 2: the dormant monolith model placed in the sky; its two rings turn and its orange crystal pulses
    
- Backdrop stage 3: two floating slab islands (ruined arch) and four small inverted clusters placed around the monolith, plus 34 loose cubes, all instanced
    

Done on November 11 and not itemized in the entry below:

- Receiver rebuilt from the concept sheet (octagonal base, glass core, cage of rings and bars, orange front slit); flicker fix applied to the cap
    
- Mirror now turns another 90 degrees to the right on every ROTATE press
    
- Automated playtests for Levels 1-5 plus shortcut attempts; the parked SHIFT blocks in Levels 2, 4 and 5 were moved out of reach so SHIFT is really required
    
- Worlds as data, saved progress, title screen, world and level select
    
- `CUBIT_HANDOFF.md` written; vault notes corrected (design document status note, World Overview, Pressure Plate)
    

#### Changes Made

- New: `src/background.js`, `public/models/w01_monolith.glb`, `assets/blender/world01_backdrop.blend` (plus a preview PNG), `tools/playtest/backdrop_test.mjs`
    
- Stage 3 new: `public/models/w01_island_slab.glb`, `public/models/w01_island_cluster.glb`, `assets/blender/world01_islands.blend` (plus two preview PNGs)
    
- Stage 3 edited: `src/background.js` (islands and loose cubes), `src/worlds.js` (`islands` section), `tools/playtest/backdrop_test.mjs` (36 checks now)
    
- New earlier: `src/worlds.js`, `src/progress.js`, `src/menus.js`
    
- Edited: `src/worlds.js` (backdrop settings per world), `src/main.js` (draws the backdrop first, then the level)
    
- Backups of edited files are in `assets/backups_tuning/`
    

#### Testing

- Production build passes
    
- Gameplay playtests: 36 scenarios pass (Levels 1-11 solved, shortcut attempts blocked)
    
- Menu tests: 36 checks pass
    
- Backdrop tests: 36 checks pass (stage 3 added islands, loose cubes, placement on screen, no orange, dim seams); earlier notes said 26, the count was off by one
    
- All of the above are automated. Nothing from this entry has been checked in a real browser yet.
    

#### Issues

- Unconfirmed in the browser: backdrop look, brightness and position; FPS on Level 11 and the Test Room; the backdrop in gravity levels 7, 9 and 10; receiver flicker; mirror turning; title screen, saving and level select; the new hover spots of the parked blocks in Levels 2, 4 and 5
    
- Possible readability concerns: the orange monolith crystal looking like a Core Fragment; the sky glow against blue platforms
    

#### Next Steps

- Browser check of the items above
    
- Backdrop stage 3 check in the browser: slab and cluster look, readability, FPS; light pass after that
    
- World 01 light pass
    
- Redesign the Energy Source
    
- Release cleanup (remove the FPS counter, set `REVIEW_LEVEL_SELECT` to false)
    

### November 11, 2026

#### Current Progress

- Implemented Levels 1–11.
    
- Implemented the core gameplay mechanics:
    
    - SHIFT
        
    - ROTATE
        
    - CORE ECHO
        
    - GRAVITY FLIP
        
    - CORE CIRCUIT
        
- Created and integrated multiple 3D assets.
    
- Established automated playtesting tools.
    
- Organized project documentation in Obsidian.
    

#### Testing

- Headless gameplay scenarios reported passing.
    
- Menu tests reported passing.
    
- Latest browser performance and visual verification remain ongoing.
    

#### Next Development Priorities

- Continue World 01 visual development.
    
- Redesign the Energy Source asset.
    
- Verify the Receiver in-browser.
    
- Verify Mirror horizontal rotation in-game.
    
- Continue improving gameplay feedback and visual clarity.
    

## Entry Template

### YYYY-MM-DD

#### Completed

#### Changes Made

#### Testing

#### Issues

#### Next Steps

## Related Notes

- [[Technical Architecture]]
    
- [[Tasks and Bugs]]
    
- [[Asset Catalog]]
    
- [[Level Index]]
    
- [[CUBIT Core of the Cosmos]]