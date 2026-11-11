# Technical Architecture

## Overview

CUBIT: Core of the Cosmos is a browser-based 3D puzzle-platformer built using Three.js, JavaScript, HTML, and CSS, with Vite for development and building.

The project uses a modular structure separating gameplay systems, level definitions, 3D models, Blender source files, and playtesting tools.

## Project Structure

```
cubit/
├── assets/
│   ├── blender/
│   ├── backups_level_select/
│   ├── backups_tuning/
│   └── echo_backups/
│
├── public/
│   ├── models/
│   │   ├── cubit.glb
│   │   ├── core_fragment.glb
│   │   ├── platform_tile.glb
│   │   ├── base_block.glb
│   │   ├── shiftable_block.glb
│   │   ├── energy_source.glb
│   │   ├── mirror.glb
│   │   ├── receiver.glb
│   │   ├── pressure_plate.glb
│   │   ├── core_lock_pillar.glb
│   │   ├── w01_island_cluster.glb
│   │   ├── w01_island_slab.glb
│   │   └── w01_monolith.glb
│   ├── favicon.svg
│   └── icons.svg
│
├── src/
│   ├── levels/
│   │   ├── index.js
│   │   ├── level1.js
│   │   ├── level2.js
│   │   ├── level3.js
│   │   ├── level4.js
│   │   ├── level5.js
│   │   ├── level6.js
│   │   ├── level7.js
│   │   ├── level8.js
│   │   ├── level9.js
│   │   ├── level10.js
│   │   ├── level11.js
│   │   └── testRoom.js
│   │
│   ├── audio.js
│   ├── background.js
│   ├── blobShadow.js
│   ├── circuit.js
│   ├── constants.js
│   ├── coreFragment.js
│   ├── echo.js
│   ├── input.js
│   ├── level.js
│   ├── levelManager.js
│   ├── main.js
│   ├── mechanisms.js
│   ├── menus.js
│   ├── player.js
│   ├── progress.js
│   ├── puzzleManager.js
│   ├── rotatableStructure.js
│   ├── shiftableBlock.js
│   ├── style.css
│   └── worlds.js
│
├── tools/
│   └── playtest/
│       ├── backdrop_test.mjs
│       ├── menus_test.mjs
│       ├── run.mjs
│       └── scenarios.mjs
│
├── .gitignore
├── CUBIT_HANDOFF.md
├── index.html
├── package.json
└── package-lock.json
```

_Note: This is a simplified tree showing the main project files. It omits_ `_node_modules_`_, Git internals, and numerous backup or older model versions._

## Main Directories

### `src/`

Contains the game's JavaScript and CSS implementation.

### `src/levels/`

Contains individual level definitions, including Levels 1–11 and the Test Room.

### `public/models/`

Contains the GLB models loaded by the game.

### `assets/blender/`

Contains Blender source files used to create and edit 3D assets.

### `assets/`

Also contains backup folders for previous implementations and tuning changes.

### `tools/playtest/`

Contains scripts for running and testing gameplay scenarios and menu behavior.

## Main Systems

|System|File|
|---|---|
|Main entry point|`src/main.js`|
|Player|`src/player.js`|
|Input|`src/input.js`|
|Level system|`src/level.js`|
|Level manager|`src/levelManager.js`|
|Puzzle manager|`src/puzzleManager.js`|
|SHIFT Block|`src/shiftableBlock.js`|
|ROTATE structures|`src/rotatableStructure.js`|
|Core Circuit|`src/circuit.js`|
|CORE ECHO|`src/echo.js`|
|Mechanisms|`src/mechanisms.js`|
|Core Fragment|`src/coreFragment.js`|
|Worlds|`src/worlds.js`|
|Backdrop (sky, specks, monolith, islands, loose cubes)|`src/background.js`|
|Menus|`src/menus.js`|
|Audio|`src/audio.js`|
|Progression|`src/progress.js`|
|Constants|`src/constants.js`|
|Styling|`src/style.css`|

## Rendering Order

Each frame draws two scenes with one renderer (`renderer.autoClear` is off):

1. The backdrop scene (`src/background.js`): the world's flat color, the sky dome, the specks, the World 01 monolith, the floating islands (instanced) and the loose cubes (one instanced mesh). It has its own camera, which copies the game camera's view, and its own two lights.
    
2. The depth buffer is cleared, then the level scene is drawn on top.
    

Because of this the backdrop can never cut into platforms, has no collision, and is not limited by the game camera's 100-unit range. The level scene has no `scene.background`. Backdrop settings per world live in `src/worlds.js` (`backdrop`).

## Saved Progress

`src/progress.js` stores completed level names in the browser's localStorage under the key `cubit.progress.v1`. Broken or missing storage is ignored. Unlock rules: a level opens when the one before it is done; a world opens when every level of the world before it is done.

## Development Tools

- VS Code — Code editing
    
- Claude Desktop — AI-assisted development
    
- Blender — 3D asset creation
    
- Blender MCP — Blender integration workflow
    
- Vite — Development server and build tooling
    
- Three.js — 3D rendering
    
- Git — Version control
    

## Architecture Principles

- Keep gameplay systems modular.
    
- Separate level definitions from shared gameplay logic.
    
- Reuse assets where possible.
    
- Keep the project optimized for low-end hardware.
    
- Preserve existing mechanics and project structure when adding features.
    
- Back up important files before major changes.
    
- Test changes before considering them complete.
    

## Related Notes

- [[Game Overview]]
    
- [[Core Gameplay]]
    
- [[Level Index]]
    
- [[Asset Catalog]]
    
- [[Development Log]]
    
- [[Tasks and Bugs]]
    
- [[CUBIT Core of the Cosmos]]