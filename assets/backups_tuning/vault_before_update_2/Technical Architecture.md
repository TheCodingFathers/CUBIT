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
│   │   └── core_lock_pillar.glb
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
|Menus|`src/menus.js`|
|Audio|`src/audio.js`|
|Progression|`src/progress.js`|
|Constants|`src/constants.js`|
|Styling|`src/style.css`|

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