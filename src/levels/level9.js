// LEVEL 9: OVER YOUR HEAD
// Purpose: combine ROTATE (R) and GRAVITY FLIP (G, arrows, X). Gravity turns walls and ceilings into floors,
// but only when ROTATE has put something there to stand on or has cleared the way.
//
//   Stage 1: a 6-cube gap. A wide bar hangs over the start platform, pointing west where it is no use.
//            ROTATE swings it 90 degrees so it stretches over the whole gap, like a ceiling.
//            Press G: CUBIT falls UP onto the underside of the bar and walks across it upside down.
//            Above the middle platform press X to drop back to the floor.
//   Stage 2: a 4-cube gap to the west with a tall wall behind it. A thick barrier stands in front of the
//            wall and blocks the way along it. ROTATE it down out of the way, then turn gravity toward the
//            wall (UP arrow) and walk along its face. Above the far platform press X.
//   Stage 3: the goal ledge is 2 cubes higher. A gravity block (it has a cyan cage) floats above the far
//            platform. It falls when gravity returns to the floor and ends up as the step.
//
// Coordinates are grid cells [x, y, z]. One cube = 1 unit. The path goes north (toward -z), then west.

export default {
  name: 'Over Your Head',
  objective: 'ROTATE the world into place, then flip gravity to cross it',
  start: [0, 1.5, 2],
  gravity: true,

  boxes: [
    { from: [-2, 0, 0], to: [2, 0, 4] }, // start platform
    { from: [-4, 0, -9], to: [2, 0, -7] }, // middle platform (beyond the first gap, z = -6 to -1)
    { from: [-12, 0, -10], to: [-3, 3, -10] }, // tall wall behind the platforms: CUBIT walks on its face
    { from: [-11, 0, -9], to: [-9, 0, -7] }, // far platform (beyond the second gap, x = -8 to -5)
    { from: [-14, 2, -9], to: [-12, 2, -7] }, // goal ledge, 2 cubes above the far platform
  ],

  blocks: [
    // Gravity block, one position: it cannot be SHIFTed, it only falls.
    { positions: [[-11, 3, -9]], gravity: true },
  ],

  structures: [
    // Stage 1: the ceiling bar, 14 long and 3 wide, 3 cubes above the floor. It turns around its first cube.
    // At 0 degrees it points west. At -90 degrees it points north, over the gap and the middle platform.
    {
      pivot: [0, 3, 4],
      axis: 'y',
      offsets: Array.from({ length: 14 }, (_, k) => [[-k, 0, -1], [-k, 0, 0], [-k, 0, 1]]).flat(),
      angles: [0, -90],
    },
    // Stage 2: a barrier 4 cubes tall and 2 deep in front of the wall. It turns around its bottom cube.
    // At 90 degrees it lies flat in the gap (below the walking line), and the way along the wall is clear.
    {
      pivot: [-6, 0, -9],
      axis: 'x',
      offsets: [0, 1, 2, 3].flatMap((y) => [[0, y, 0], [0, y, 1]]),
      angles: [0, 90],
    },
  ],

  fragments: [[-13, 2, -8]], // floats above the middle of the goal ledge
};
