// LEVEL 2: A PLACE TO STAND
// Purpose (from the concept document): introduce SHIFT. The player moves cubic blocks to create a pathway.
//
//   Stage 1: a tall platform (2 cubes high) is too high to jump onto.
//            Block A slides next to its wall and becomes a step.
//   Stage 2: a 3-cube gap, and the goal platform is one cube higher, so it cannot be jumped.
//            Block B slides into the middle of the gap and becomes a stepping stone.
//
// Coordinates are grid cells [x, y, z]. One cube = 1 unit. The path goes north (toward -z).

export default {
  name: 'A Place to Stand',
  objective: 'Use SHIFT to build a path to the Core Fragment',
  start: [0, 1.5, 2],

  boxes: [
    { from: [-2, 0, 0], to: [2, 0, 4] }, // start platform
    { from: [-2, 0, -3], to: [2, 2, -1] }, // tall platform (2 cubes above the start platform)
    // gap: 3 cubes wide (z = -4, -5, -6), at the height of the tall platform's top
    { from: [-2, 3, -9], to: [2, 3, -7] }, // goal platform, one cube higher than the tall platform
  ],

  blocks: [
    // Block A: parked at the side of the start platform; SHIFT slides it next to the tall platform's wall
    {
      positions: [
        [2, 1, 0],
        [0, 1, 0],
      ],
    },
    // Block B: parked beside the gap; SHIFT slides it into the middle of the gap
    {
      positions: [
        [2, 2, -5],
        [0, 2, -5],
      ],
    },
  ],

  structures: [],

  fragments: [[0, 3, -8]], // floats above the middle of the goal platform
};