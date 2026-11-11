# CUBIT: Core of the Cosmos — handoff for the next AI agent

Written 2026-11-11. Read this first. It replaces the older handoff. It is context, not documentation: what the game is, what exists, what is verified, what is NOT verified, and what comes next (World 01).

## What it is
A 3D puzzle-platformer for the browser. CUBIT is a small floating cubic robot who rearranges cubic worlds to recover Core Fragments.
Stack: Three.js (0.187), plain JavaScript, HTML/CSS, Vite 8, Blender 5.2 (GLB export), VS Code. Git repo exists; the working tree was clean at 652ad60.
Project folder: `C:\Users\cabal\Downloads\cubit`. The laptop is weak (Ryzen 3 7320U, Radeon 610M, 8 GB RAM): performance comes first.
The user measured 60 FPS in a real browser on Level 11 earlier today (before the receiver remodel).
The concept doc `CUBIT_Core_of_the_Cosmos.md` is NOT in the project folder (checked). It is the stated source of truth for story, mechanics, palette and scope. Do not redesign any of those. Ask the user to attach it if you need it.
Palette: navy `#0a1230`, blue `#2563eb`, cyan `#2de2ff`, orange `#ff8a1f` (`src/constants.js`).

## How to work with the user
- Beginner "vibecoder", blunt "bro" style, ALL CAPS messages. Short replies, copy-paste commands, minimal theory.
- Previous AI agents kept running out of tokens mid-job. Work in finished steps, and verify before saying "done".
- For art: the user sends concept art, you plan (design match, triangle budget, files touched), build in Blender, show a screenshot, then export. The user may say "go and approve", which covers building and exporting. Compare against the NEWEST concept sheet and say what differs. Once the model was called a match after being compared to the wrong sheet.
- Back up before overwriting (backups live in `assets\backups_tuning\` and `assets\`).
- No .md files unless the user asks. The user commits themselves: `git add -A` then `git commit -m "..."`. Remind them after finishing a piece of work.
- Write access to the project folder is through the Blender MCP only (see Tools).
- Free Claude plan: no browser control, no scheduled tasks.

## Controls
WASD move, Space jump, Q SHIFT, R ROTATE, E / C CORE ECHO (record / cancel), arrow keys / G / X GRAVITY FLIP (only in gravity levels), M sound, Backspace restart, Enter next level, Esc pause (or back out of level select).

## Mechanics (all working, verified by headless playtests)
- SHIFT: blocks cycle through preset cells (`blocks[].positions`). ROTATE: structures turn around a pivot to preset angles. Both are refused ("Something is in the way") if blocked or CUBIT stands on the part. Range is 3 units (`puzzleManager.js`).
- CORE ECHO (`echo.js`): record a run, a hologram replays it and can hold pressure plates.
- GRAVITY FLIP (`player.js`, gravity blocks).
- CORE CIRCUIT (`circuit.js`, `mechanisms.js`): energy sources shoot a beam along the floor grid, mirrors bend it 90 degrees, receivers open linked doors. Pressure plates also open doors.
- Mirror: each ROTATE press turns it another 90 degrees to the right (cumulative `spin`), so four presses make a full turn. The beam only cares about parity (`state = (startState + spin) % 2`), so puzzle logic is unchanged. To turn left instead, change `-` to `+` in `Reflector.targetAngle()`. UNTESTED in the browser.
- Jump clears gaps up to 3 wide and 1 high. Levels use 4-wide gaps or 2-high walls to force abilities.

## Levels (`src/levels/`, plain data, order in `index.js`)
1 First Steps, 2 A Place to Stand (SHIFT), 3 Turn the World (ROTATE), 4 Connected (both), 5 The First Fragment (order puzzle), 6 Echoes, 7 Flip Side (gravity), 8 Hold and Move, 9 Over Your Head, 10 The Whole Machine, 11 Reconnect (CORE CIRCUIT), plus a Test Room (two fragments, not part of any world).
Level data fields: `name, objective, start, boxes[{from,to}], holes, blocks[{positions,gravity?}], structures[{pivot,axis,offsets,angles}], fragments, circuit{sources,reflectors,receivers}, plates, doors, echo, echoSeconds, gravity`. Receivers accept an optional `facing: [dx, dz]`. One cube per grid cell, `y` is up, levels run toward -z.
Today the playtests found that Levels 2, 4 and 5 could be finished without SHIFT because parked blocks worked as steps. Fixed in level data only (parked cells moved out of reach; SHIFT still ends in the same final cells). Backups: `assets\backups_tuning\*.before_parked_fix`. UNTESTED by eye: blocks now hover in new parked spots; check Q still reaches them (range 3).

## Code map (`src/`)
- `main.js`: renderer, camera, HUD, game loop, pause menu, hints, sound watching, REVIEW level picker, glue for menus and worlds.
- `levelManager.js`, `level.js` (instanced floor), `puzzleManager.js`, `shiftableBlock.js`, `rotatableStructure.js`, `coreFragment.js`, `mechanisms.js` (plates, doors), `circuit.js` (sources, mirrors, receivers, beam), `echo.js`, `player.js` (CUBIT, animation mixer, gravity), `input.js`, `audio.js` (all sound synthesized with Web Audio, no files), `blobShadow.js`.
- Added today: `worlds.js` (4 worlds as data: id, name, background, ambient, sun, levels). World 1 "The Awakening" holds the 11 real levels. Worlds 2 The Fracture, 3 The Void, 4 The Core are placeholders with empty level lists and planned palettes. `main.js` `applyWorld()` swaps background and lights per level.
- `progress.js`: completed levels saved in localStorage under `cubit.progress.v1`, by level NAME. Also unlock rules: a level opens when the one before it is done; a world opens when all levels of the world before it are done; "Continue" goes to the first unfinished level.
- `menus.js`: title screen (PLAY, or CONTINUE + NEW GAME with a click-twice erase, + LEVELS) and world/level select (locked tiles dimmed, completed glowing, worlds 2-4 "COMING SOON"). Built in code, styled in `style.css`. Pause menu has a Main Menu button.
- `REVIEW_LEVEL_SELECT = true` at the top of `main.js` keeps a review level picker in the pause menu (jumps to any level, including the Test Room). Set false before release.

## Art status (Blender sources in `assets\blender`, exports in `public\models`)
- CUBIT "Evolved Cube": `cubit.glb`, 8 clips (Idle, Walk, Jump, Fall, Interact, Collect, Victory, Land), 4 hidden sockets for future arms (Stage 2) and legs (Stage 3). Must never become humanoid.
- Core Fragment: `core_fragment.glb`, `core_fragment_platform.glb`. Floor: `platform_tile_v2_concept.glb`, `base_block.glb`, `shiftable_block.glb` (check which one `level.js` and `shiftableBlock.js` load).
- Circuit art: `energy_source.glb`, `mirror.glb`, `pressure_plate.glb`, `core_lock_pillar.glb` (door), `receiver.glb`.
- RECEIVER was rebuilt today from the user's concept sheet: low octagonal base with flush chamfered corner blocks, orange front slit, glass core tube with disc rings, caged by 3 rings (middle ring open at the front for the beam) and slim posts with cyan bars, round cap with cyan top ring. About 1,376 triangles. Part and material names must stay: `Receiver_Body`, `Receiver_Core`, `Receiver_Lights`, `Receiver_Rays` (+ `Receiver_RaysMesh`), materials `Receiver_Navy/Blue/Frame/Core/Cyan/Orange`. `circuit.js` looks them up by name. Old versions: `receiver_v1_hex`, `receiver_v2_crystal`, `receiver_v3_cage` in `assets\backups_tuning\`.
- Known simplifications vs the sheet: rings are squared bands, not round tubes; no mesh texture between the bars. The powered halo comes from code (`circuit.js`).
- The user reported flickering pixels on the receiver top (the screenshot they sent still showed the OLD model). Cause was suspected z-fighting on the cap; fixed (blocks at 0.81 vs trim at 0.80, cap strips removed, top ring sunk into collar). NOT confirmed by the user. If dots remain, ask whether they appear waiting, powered or both: the powered ray ticks are driven by `circuit.js`.
- ENERGY SOURCE still looks too much like the old receiver. Proposed: slim emitter tower, orange diamond crystal, round nozzle. Not started. Wait for the user's go.
- STILL MISSING ART: the empty navy background.

## Tools and environment
- Blender MCP (Blender 5.2): load with ToolSearch. `execute_blender_code` runs Python on the user's PC and must set `result = {...}` (a dict). It is also how you read and write project files and run node. Unanswered approval prompts cause timeouts.
- Headless playtests: `node tools\playtest\run.mjs` (all scenarios), or pass ids like `11 11x1`. Scenarios are in `tools\playtest\scenarios.mjs`: levels 1-11 solved, plus exploit attempts ("x" scenarios) where PASS means the shortcut was blocked. All pass.
- `node tools\playtest\menus_test.mjs`: 38 checks for saving, unlocking, worlds and the menu screens, using a fake page and fake storage. All pass.
- Bundle check without touching the project: `node node_modules\vite\bin\vite.js build --outDir <temp dir>`. Node is at `C:\Program Files\nodejs`.
- No jsdom or other DOM library is installed. Package installs are off for this account.

## Blender and GLB pitfalls (learned the hard way)
- The exported default pose comes from the NLA state at frame 1, so leftover clip poses get baked in. Fix: after export, patch the GLB node JSON to remove `scale` and `rotation` and set exact translations (animations stay).
- Set `matrix_parent_inverse` to Identity when parenting; a stale `matrix_world` bakes a tilt.
- After `read_homefile(use_empty=True)` set an active object before exporting. After `open_mainfile` the window can be None in the same call.
- Blender 5 actions have no `.fcurves`. Front of CUBIT faces -Y in Blender (+Z in game). The receiver and source front is +X.
- Decal quads need explicit outward winding. Check normals.
- Faces on the same plane flicker (z-fighting), worst on weak GPUs. Offset them by at least 0.01.
- After rebuilding a mesh with bmesh, call `view_layer.update()` before reading `dimensions`, or you get stale numbers.

## NOT confirmed yet (ask the user)
Everything below was built and passed headless tests, but nobody has looked at it in a real browser:
- Receiver look (and the flicker fix), mirror turning right every press, title screen, CONTINUE and saving, level select, hover spots of the parked blocks in Levels 2, 4 and 5.
- FPS on Level 11 and the Test Room after the receiver remodel (now about 1,376 triangles per receiver).
- How the earlier sounds, blob shadow and hints feel, and the user's playtest notes for levels 6-11.

## What is done so far (short history)
Early: core game, CUBIT, floor, SHIFT, ROTATE, levels 1-5, Core Fragments, HUD. Then: new CUBIT with animations, CORE ECHO, GRAVITY FLIP, levels 6-10. Then: CORE CIRCUIT and level 11, art for door, source, beam, mirror and receiver, sounds, blob shadow, hints, review level picker. Today: receiver remodel, mirror spin, playtests for levels 1-5 and fixes, worlds as data, saved progress, title screen, world and level select.

## What comes next
1. WORLD 01 look (needs the user's concept art; plan first, wait for "go"): background of floating islands, a central dormant monolith, then a light pass. World 1's colors live in `worlds.js` (`background`, `ambient`, `sun`). Keep draw calls and triangles low (instanced or merged), because of the laptop.
2. Energy source redesign (see Art status).
3. Tune from the user's browser feedback (sounds, shadow, hints, receiver glow).
4. Before release: remove the FPS counter, set `REVIEW_LEVEL_SELECT = false`, check the Test Room is not reachable, keep the save versioned (`cubit.progress.v1`).
5. Later, per the concept doc priorities: secret chambers and environmental storytelling, mechanical guardians, worlds 2-4 (palettes are already in `worlds.js`). Freeze new mechanics until the existing ones are polished.
