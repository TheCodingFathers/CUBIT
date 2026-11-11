// LEVEL 5: THE FIRST FRAGMENT
// Purpose (from the concept document): final introductory puzzle. The player solves a multi-step puzzle
// to recover the first Core Fragment.
//
//   Stage 1: a 4-cube gap. The tall wall turns into a bridge (ROTATE), but block A starts inside the
//            bridge's path, so ROTATE is refused until the player SHIFTs A away. SHIFT A again and it
//            becomes a step on the bridge end, because the middle platform is 2 cubes higher than the bridge.
//   Stage 2: on top of the middle platform, a 4-cube gap to the west. Block B starts inside the bar's
//            sweep. One SHIFT clears the sweep AND builds the step above the bar's far end.
//            Then ROTATE swings the bar across, and the player climbs onto the goal tower.
//
// Coordinates are grid cells [x, y, z]. One cube = 1 unit. The first part goes north (toward -z).

export default {
  name: 'The First Fragment',
  objective: 'Clear the way, then rearrange the world',
  start: [0, 1.5, 2],

  boxes: [
    { from: [-2, 0, 0], to: [2, 0, 4] }, // start platform
    { from: [-2, 0, -7], to: [2, 2, -5] }, // middle platform (3 cubes tall, beyond the first gap, z = -4 to -1)
    { from: [-9, 2, -7], to: [-7, 4, -5] }, // goal tower (beyond the second gap, x = -6 to -3), 2 cubes above the bar
  ],

  // The tall wall stands in the middle of the start platform's north edge
  holes: [[0, 0, 0]],

  blocks: [
    // Block A, 3 cells: 1) blocks the bridge path, 2) parked beside the bridge end, 3) step on the bridge end
    {
      positions: [
        [0, 0, -2],
        [1, 1, -4],
        [0, 1, -4],
      ],
    },
    // Block B, 2 cells: 1) blocks the bar's sweep, 2) step above the bar's far end
    {
      positions: [
        [-4, 2, -6],
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