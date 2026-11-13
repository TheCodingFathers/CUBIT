import { LEVELS } from './levels/index.js';

// WORLDS as data, like levels. Each world has its own look (background and lights) and a list of levels.
// 'levels' holds positions in the LEVELS list (see levels/index.js). The Test Room is not part of any world.
// Worlds 2 to 4 are placeholders for now: they show up as "coming soon" and use the palettes from the plan.

const playable = LEVELS.map((level, index) => index).filter((index) => !/test/i.test(LEVELS[index].name ?? ''));

export const WORLDS = [
  {
    id: 1,
    name: 'The Awakening',
    background: 0x0a1230, // deep navy
    // FLOOR: the slate of the floor tiles, base blocks and Core platform (concept B, Muted Steel Gray, chosen 2026-11-13).
    // Worlds without a floorColor use the same default (DEFAULT_FLOOR_COLOR in src/level.js).
    floorColor: 0x414653,
    // LIGHTS: the "Moody" look, chosen from the light pass presets on 2026-11-13 (cool dim ambient, strong sun from the upper left)
    ambient: { color: 0x93b0ff, intensity: 0.4 },
    sun: { color: 0xcfe0ff, intensity: 1.35, position: [-6, 7, 2] },
    levels: playable,
    // BACKDROP (see background.js): the sky behind the levels. A world without one keeps its flat background color.
    backdrop: {
      sky: { top: 0x0a1230, mid: 0x0c1f5c, haze: 0x16379a }, // dark at the horizon, a soft blue glow far below
      specks: 70, // tiny far-away lights
      speckColor: 0x7fdcff,
      // The dormant monolith, far away and below the level. heading = the direction the game camera looks along the
      // ground (CAMERA_OFFSET in main.js), elevation = degrees below the horizon, scale = size of the model (about 10 tall).
      monolith: { model: '/models/w01_monolith.glb', heading: [-6, -8], distance: 130, elevation: -24, scale: 3.6, yaw: 0.35 },
      // Floating islands and loose cubes (scenery only). azimuth = degrees to the right (+) or left (-) of the heading,
      // elevation = degrees below the horizon, distance and scale like the monolith. slab is about 14 wide, slabB 16, cluster 5.
      islands: {
        heading: [-6, -8],
        models: {
          slab: '/models/w01_island_slab.glb', // ruined broken arch, left of the monolith
          slabB: '/models/w01_island_slab_b.glb', // complete gate and a tall block stack, right of the monolith
          cluster: '/models/w01_island_cluster.glb', // compact pile of cubes hanging down
          clusterB: '/models/w01_island_cluster_b.glb', // wide flat stack of plates with a pillar and broken-off pieces (smaller scale: the model is wider)
        },
        items: [
          { model: 'slab', azimuth: -34, elevation: -33, distance: 100, scale: 2.3, yaw: 0.5 },
          { model: 'slabB', azimuth: 36, elevation: -30, distance: 105, scale: 2.05, yaw: -0.5 },
          { model: 'cluster', azimuth: -14, elevation: -38, distance: 95, scale: 2.2, yaw: 0.3 },
          { model: 'clusterB', azimuth: 17, elevation: -43, distance: 90, scale: 1.45, yaw: -0.4 },
          { model: 'clusterB', azimuth: -26, elevation: -17, distance: 125, scale: 1.45, yaw: 0.8 },
          { model: 'cluster', azimuth: 27, elevation: -15, distance: 130, scale: 2.2, yaw: -0.7 },
        ],
        debris: { count: 34, seed: 7, minSize: 0.8, maxSize: 3.2 }, // loose cubes, one draw call
      },
    },
  },
  {
    id: 2,
    name: 'The Fracture',
    background: 0x2a0d08, // dark red-brown
    ambient: { color: 0xffd9c2, intensity: 0.6 },
    sun: { color: 0xff9a5a, intensity: 1.2, position: [4, 8, 3] },
    levels: [],
  },
  {
    id: 3,
    name: 'The Void',
    background: 0x120a2a, // dark purple-navy
    ambient: { color: 0xd9c8ff, intensity: 0.55 },
    sun: { color: 0xb48cff, intensity: 1.1, position: [4, 8, 3] },
    levels: [],
  },
  {
    id: 4,
    name: 'The Core',
    background: 0x0b1a2e, // navy with a gold and white light
    ambient: { color: 0xfff4d6, intensity: 0.65 },
    sun: { color: 0xffe08a, intensity: 1.2, position: [4, 8, 3] },
    levels: [],
  },
];
