// LEVEL 4: CONNECTED
// Purpose (from the concept document): combine SHIFT and ROTATE. The player must use both abilities to reach the objective.
//
//   Stage 1: a 4-cube gap. A tall wall on the start platform turns 90 degrees and becomes a bridge (ROTATE).
//            The middle platform is 2 cubes higher than the bridge, so it cannot be jumped.
//            A block slides onto the end of the bridge and becomes a step (SHIFT).
//   Stage 2: on top of the middle platform, a 4-cube gap to the west. A bar swings across it (ROTATE).
//            The goal tower is 2 cubes higher than the bar. A second block slides onto the end
//            of the bar and becomes a step (SHIFT).
//
// Coordinates are grid cells [x, y, z]. One cube = 1 unit. The first part goes north (toward -z).

export default {
  name: 'Connected',
  objective: 'Combine SHIFT and ROTATE to reach the Core Fragment',
  start: [0, 1.5, 2],

  boxes: [
    { from: [-2, 0, 0], to: [2, 0, 4] }, // start platform
    { from: [-2, 0, -7], to: [2, 2, -5] }, // middle platform (3 cubes tall, beyond the first gap, z = -4 to -1)
    { from: [-9, 2, -7], to: [-7, 4, -5] }, // goal tower (beyond the second gap, x = -6 to -3), 2 cubes above the bar
  ],

  // The tall wall stands in the middle of the start platform's north edge
  holes: [[0, 0, 0]],

  blocks: [
    // Block A: floats beside the end of the future bridge; SHIFT slides it onto the bridge's last cube
    {
      positions: [
        [1, 2, -4], // parked out of reach: it only becomes a step after SHIFT
        [0, 1, -4],
      ],
    },
    // Block B: floats beside the end of the future bar; SHIFT slides it onto the bar's last cube
    {
      positions: [
        [-6, 4, -5], // parked out of reach: it only becomes a step after SHIFT
        [-6, 3, -6],
      ],
    },
  ],

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
    // Stage 2: bar of 4 cubes beside the middle platform's top. Swings around its first cube
    // (the pivot) and at -90 degrees it lies across the second gap.
    {
      pivot: [-3, 2, -6],
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

  fragments: [[-8, 4, -6]], // floats above the middle of the goal tower
};