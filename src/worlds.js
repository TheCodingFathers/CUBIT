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
    ambient: { color: 0xffffff, intensity: 0.6 },
    sun: { color: 0xffffff, intensity: 1.2, position: [4, 8, 3] },
    levels: playable,
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
