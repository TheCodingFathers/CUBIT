// LEVEL 7: FLIP SIDE
// Purpose: introduce GRAVITY FLIP. Arrow keys turn gravity toward that side, G reverses it,
// X puts it back to normal. Walls and ceilings become floors. A gravity block falls with gravity.
//
//   Stage 1: a 6-cube gap. A narrow ceiling strip hangs over the whole path.
//            Press G: gravity reverses, CUBIT falls UP onto the underside of the strip and walks
//            across it upside down. Above the far platform press X (or G) to drop back to the floor.
//   Stage 2: a 4-cube gap to the west, with a tall wall behind the platforms.
//            Stand on the west half of the platform and press the UP arrow: gravity turns toward the wall,
//            CUBIT falls onto its face and walks along it (W goes west). Above the far platform, press X.
//   Stage 3: the goal ledge is 2 cubes higher. A gravity block (it has a cyan cage) floats above the far
//            platform. It falls when gravity returns to the floor and ends up as the step.
//
// Coordinates are grid cells [x, y, z]. One cube = 1 unit. The path goes north (toward -z), then west.

export default {
  name: 'Flip Side',
  objective: 'Flip gravity to reach the Core Fragment',
  start: [0, 1.5, 2],
  gravity: true,

  boxes: [
    { from: [-2, 0, 0], to: [2, 0, 4] }, // start platform
    { from: [-4, 0, -9], to: [2, 0, -7] }, // middle platform (beyond the first gap, z = -6 to -1)
    { from: [-1, 4, -9], to: [1, 4, 4] }, // ceiling strip: CUBIT walks on its underside (3 cubes wide)
    { from: [-12, 0, -10], to: [-3, 3, -10] }, // tall wall behind the platforms: CUBIT walks on its face
    { from: [-11, 0, -9], to: [-9, 0, -7] }, // far platform (beyond the second gap, x = -8 to -5)
    { from: [-14, 2, -9], to: [-12, 2, -7] }, // goal ledge, 2 cubes above the far platform
  ],

  blocks: [
    // Gravity block, one position: it cannot be SHIFTed, it only falls.
    // Starts above the far platform. It lands on the platform when gravity returns to the floor,
    // then slides against the wall the next time gravity turns toward it. It ends up beside the goal ledge.
    { positions: [[-11, 3, -9]], gravity: true },
  ],

  structures: [],

  fragments: [[-13, 2, -8]], // floats above the middle of the goal ledge
};
