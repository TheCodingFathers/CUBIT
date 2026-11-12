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
    // FLOOR: the slate of the floor tiles, base blocks and Core platform (concept A, Cool Graphite Slate). Worlds without one use this too.
    floorColor: 0x303744,
    // FLOOR COLOR REVIEW (temporary): in review mode press K in the game to cycle through these four colors from the concept sheet.
    // When one is chosen it is copied into floorColor above, and this list is deleted.
    floorPresets: [
      { name: 'A Cool Graphite Slate', color: 0x303744 },
      { name: 'B Muted Steel Gray', color: 0x414653 },
      { name: 'C Desaturated Warm Stone', color: 0x494641 },
      { name: 'D Blue Charcoal', color: 0x252d3b },
    ],
    ambient: { color: 0xffffff, intensity: 0.6 },
    sun: { color: 0xffffff, intensity: 1.2, position: [4, 8, 3] },
    // LIGHT PASS (temporary): presets to compare live. In review mode press L in the game to cycle through them.
    // When one is chosen it is copied into ambient and sun above, and this list is deleted.
    lightPresets: [
      { name: 'Current', ambient: { color: 0xffffff, intensity: 0.6 }, sun: { color: 0xffffff, intensity: 1.2, position: [4, 8, 3] } },
      { name: 'Cool dusk', ambient: { color: 0xb8cfff, intensity: 0.55 }, sun: { color: 0xdfe9ff, intensity: 1.15, position: [-5, 8, 3] } },
      { name: 'Moody', ambient: { color: 0x93b0ff, intensity: 0.4 }, sun: { color: 0xcfe0ff, intensity: 1.35, position: [-6, 7, 2] } },
      { name: 'Cyan wash', ambient: { color: 0xa8e6ff, intensity: 0.5 }, sun: { color: 0xeaf6ff, intensity: 1.2, position: [-4, 9, 5] } },
    ],
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
