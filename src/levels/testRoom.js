// Level data: describes a level with plain numbers. No Three.js code in here.
// Coordinates are grid cells [x, y, z]. One cube = 1 unit.
//
//   objective  the text shown in the HUD
//   start      where CUBIT begins
//   boxes      solid areas of cubes, filled from one corner to the opposite corner
//   holes      single cells to leave empty inside a box
//   blocks     shiftable blocks: the cells each one can SHIFT between
//   structures rotatable structures: pivot cell, axis, cubes (offsets from the pivot), and angles
//   fragments  Core Fragments: the cube each one floats above

export default {
  name: 'Test Room',
  objective: 'Recover both Core Fragments',
  start: [0, 1.5, 0],

  boxes: [
    { from: [-4, 0, -4], to: [4, 0, 4] }, // floor (9x9)
    { from: [2, 1, -4], to: [4, 2, -2] }, // raised platform, two cubes tall (SHIFT puzzle)
    { from: [-11, 0, -1], to: [-9, 0, 1] }, // far platform beyond the gap (ROTATE puzzle)
  ],

  // The rotatable wall stands here, so the floor leaves this cell empty
  holes: [[-4, 0, 0]],

  blocks: [
    {
      positions: [
        [-3, 1, 2],
        [1, 1, -3],
      ],
    },
  ],

  // A wall of 5 cubes that turns around its bottom cube (the pivot).
  // At 90 degrees it lies across the 4-cube gap as a bridge.
  structures: [
    {
      pivot: [-4, 0, 0],
      axis: 'z',
      offsets: [
        [0, 0, 0],
        [0, 1, 0],
        [0, 2, 0],
        [0, 3, 0],
        [0, 4, 0],
      ],
      angles: [0, 90],
    },
  ],

  fragments: [
    [3, 2, -3],
    [-10, 0, 0],
  ],
};