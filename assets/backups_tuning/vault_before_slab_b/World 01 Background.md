# World 01 Background

## Overview

The World 01 Background defines the visual atmosphere behind the levels of World 01 — The Awakening.

## Visual Direction

- Mysterious cubic sci-fi atmosphere
    
- Floating environment elements
    
- Navy-dominant background
    
- Blue and cyan accents
    
- Subtle orange focal details
    
- Clean composition with minimal clutter
    

## Concept Art

Concept art for World 01 was supplied on 2026-11-12 (a sheet with the scene, the monolith from front, side and back, a floating island from front, side and top, and an in-game mood view). The image file is not stored in this vault. It shows:

- A central dormant monolith: a tall tower of stacked blocks on a stepped island, thin cyan seams, one orange diamond in the middle and two broken rings of blocks around it
    
- Large floating slab islands with a stepped underside, a cyan seam along the top and ruined archways
    
- Small floating clusters of cubes and loose debris cubes
    
- A dark navy sky that gets lighter toward the bottom, with tiny specks
    

## Design Principles

- Keep gameplay platforms readable
    
- Avoid visual distractions
    
- Maintain consistent lighting and palette
    
- Prioritize performance on low-end hardware
    

## Build Plan

|Stage|Content|Status|
|---|---|---|
|1|Sky dome with gradient, drifting specks, backdrop drawn behind the level|Built and tested, browser check pending|
|2|Monolith model with turning rings and pulsing crystal|Built and tested, browser check pending|
|3|Floating islands (large slab with arch, small inverted cluster) and loose cubes|Built and tested, browser check pending|
|4|Tuning and light pass|Not started|

## Current Implementation

- **How it is drawn:** the backdrop lives in its own scene (`src/background.js`) and is drawn first; then the depth buffer is cleared and the level is drawn on top. The backdrop therefore cannot cut into platforms, has no collision, and needs no scene fog. It has its own two lights and a camera that copies the game camera's view (it shifts only 12 percent as much, so it feels far away).
    
- **Sky:** a low-poly dome colored from three shades: top `#0a1230` (horizon and above), mid `#0c1f5c`, haze `#16379a` (far below). The game camera looks down at the level, so the screen is darkest at the top and glows toward the bottom.
    
- **Specks:** 70 tiny cyan points, one draw call, a very slow drift.
    
- **Monolith:** `public/models/w01_monolith.glb` (988 triangles, 58 KB). Blender source: `assets/blender/world01_backdrop.blend` (a preview render is saved next to it). Parts: `Monolith_Body`, `Monolith_Lights`, `Monolith_Crystal`, `Monolith_RingA`, `Monolith_RingB`. Materials: `Monolith_Navy`, `Monolith_Blue`, `Monolith_Cyan`, `Monolith_Orange`. The code looks the parts up by name, so keep the names.
    
- **Placement:** far away and below the level, along the direction the game camera looks (heading, distance, elevation, scale and yaw are in `src/worlds.js`). A test with the game's real camera angle puts it centered left to right and filling the upper part of the view.
    
- **Motion:** the two rings turn in opposite directions, and the crystal glow pulses gently.
    
- **Islands:** two models, `public/models/w01_island_slab.glb` (a large floating slab with a ruined arch, about 14 wide, 468 triangles) and `public/models/w01_island_cluster.glb` (a small inverted cluster of cubes, about 5 wide, 396 triangles). Blender source: `assets/blender/world01_islands.blend` (two preview renders next to it). Each model has three parts by material: navy, blue and a cyan seams part. World 01 places 2 slabs (far left and far right of the monolith) and 4 clusters, plus 34 loose cubes. Every copy is an instanced mesh, so extra copies cost no extra draw calls. The cyan seams are drawn dimmer than gameplay cyan, and there is no orange on any island.
    
- **Safety:** if the model fails to load, the game shows the sky without it and does not crash. Worlds without backdrop data keep their flat background color.
    

## Tuning Knobs

- Brightness of the monolith: `BACKDROP_AMBIENT` and `BACKDROP_SUN` at the top of `src/background.js`
    
- Sky colors and number of specks: the `backdrop` section of World 01 in `src/worlds.js`
    
- Monolith position and size: `elevation`, `distance`, `scale` and `yaw` in the same section
    
- Islands: the `islands` section of World 01 in `src/worlds.js` (each item has `model`, `azimuth` = degrees right or left of the monolith, `elevation`, `distance`, `scale`, `yaw`; `debris` sets the number and size of the loose cubes). Seam brightness: `ISLAND_SEAM_DIM` in `src/background.js`
    

## Status

- Stages 1-3 built; automated tests pass (36 backdrop checks, production build, gameplay playtests)
    
- Browser verification pending: look, brightness, position, readability, FPS on Level 11 and the Test Room, behavior in gravity levels 7, 9 and 10
    
- Stage 4 (tuning and light pass) not started
    
- Readability risks to watch: the orange crystal looking like a Core Fragment (orange marks objectives); archways on the islands looking like the Core Lock Door; the sky glow against blue platforms
    

## Related Notes

- [[World Overview]]
    
- [[Level Index]]
    
- [[Visual Direction]]
    
- [[Color Palette]]
    
- [[Asset Catalog]]
    
- [[Environment Design]]
    
- [[Technical Architecture]]
    
- [[Development Log]]
    
- [[Tasks and Bugs]]
    
- [[CUBIT Core of the Cosmos]]
    