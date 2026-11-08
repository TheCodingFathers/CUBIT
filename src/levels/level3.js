// LEVEL 3: TURN THE WORLD
// Purpose (from the concept document): introduce ROTATE. The player rotates structures to align platforms.
//
//   Stage 1: a 4-cube gap. A tall wall standing on the edge of the start platform turns 90 degrees
//            and lies across the gap as a bridge.
//   Stage 2: another 4-cube gap, this time to the west. A bar lying beside the middle platform
//            swings 90 degrees around its pivot and lines up with the goal platform.
//
// Coordinates are grid cells [x, y, z]. One cube = 1 unit. The first part goes north (toward -z).

export default {
  name: 'Turn the World',
  objective: 'Use ROTATE to align a path to the Core Fragment',
  start: [0, 1.5, 2],

  boxes: [
    { from: [-2, 0, 0], to: [2, 0, 4] }, // start platform
    { from: [-2, 0, -7], to: [2, 0, -5] }, // middle platform (beyond the first gap, z = -4 to -1)
    { from: [-9, 0, -7], to: [-7, 0, -5] }, // goal platform (beyond the second gap, x = -6 to -3)
  ],

  // The tall wall stands in the middle of the start platform's north edge
  holes: [[0, 0, 0]],

  blocks: [],

  structures: [
    // Stage 1: wall of 5 cubes. Turns around its bottom cube. At -90 degrees it lies across the first gap.
    {
      pivot: [0, 0, 0],
      axis: 'x',
      offsets: [
        [0, 0, 0],
        [0, 1, 0],
        [0, 2, 0],
        [0, 3, 0],
        [0, 4, 0],
      ],
      angles: [0, -90],
    },
    // Stage 2: bar of 4 cubes beside the middle platform. Swings around its first cube
    // (the pivot) and at -90 degrees it lies across the second gap.
    {
      pivot: [-3, 0, -6],
      axis: 'y',
      offsets: [
        [0, 0, 0],
        [0, 0, 1],
        [0, 0, 2],
        [0, 0, 3],
      ],
      angles: [0, -90],
    },
  ],

  fragments: [[-8, 0, -6]], // floats above the middle of the goal platform
};