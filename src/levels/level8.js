// LEVEL 8: HOLD AND MOVE
// Purpose: combine CORE ECHO (E) and SHIFT (Q). The Echo holds a plate while CUBIT is somewhere else
// SHIFTing the world into shape.
//
//   Stage 1: an energy door blocks the corridor and its plate is on the start platform.
//            Record yourself standing on the plate, walk through the door while the Echo holds it.
//            Beyond the door is a 3-cube gap. A block floats beside it: SHIFT slides it into the
//            middle of the gap and it becomes a stepping stone (a 1-cube hop on each side).
//   Stage 2: the exit is closed by a second door. Its plate is on top of a 3-cube tower, too high to reach.
//            SHIFT the block next to the tower so it becomes a step. Then record the climb:
//            up the step, up the tower, onto the plate. While your Echo repeats the climb and holds
//            the plate, walk through the second door.
//
// Doors are 2 cubes tall, so they cannot be jumped over.
// Coordinates are grid cells [x, y, z]. One cube = 1 unit. The path goes north (toward -z).

export default {
  name: 'Hold and Move',
  objective: 'Let your Echo hold the doors while you SHIFT the way forward',
  start: [0, 1.5, 2],
  echo: true,

  boxes: [
    { from: [-2, 0, 0], to: [2, 0, 4] }, // start platform
    { from: [-1, 0, -8], to: [1, 0, -1] }, // corridor (door 1 stands across it at z = -3)
    // gap: 3 cubes wide (z = -9, -10, -11)
    { from: [-3, 0, -20], to: [3, 0, -12] }, // big room
    { from: [4, 0, -18], to: [6, 2, -16] }, // tower beside the room, 3 cubes tall, with a plate on top
    { from: [-1, 0, -26], to: [1, 0, -21] }, // exit corridor (door 2 stands across it at z = -22)
    { from: [-2, 0, -30], to: [2, 0, -27] }, // goal platform
  ],

  blocks: [
    // Block A: floats beside the gap; SHIFT slides it into the middle of the gap
    {
      positions: [
        [2, 0, -10],
        [0, 0, -10],
      ],
    },
    // Block B: sits in the middle of the room; SHIFT slides it against the tower as a step
    {
      positions: [
        [0, 1, -17],
        [3, 1, -17],
      ],
    },
  ],

  structures: [],

  plates: [
    { cell: [-1, 0, 2], door: 0 }, // on the start platform
    { cell: [5, 2, -17], door: 1 }, // on top of the tower
  ],

  doors: [
    {
      cells: [
        [-1, 1, -3],
        [0, 1, -3],
        [1, 1, -3],
        [-1, 2, -3],
        [0, 2, -3],
        [1, 2, -3],
      ],
    },
    {
      cells: [
        [-1, 1, -22],
        [0, 1, -22],
        [1, 1, -22],
        [-1, 2, -22],
        [0, 2, -22],
        [1, 2, -22],
      ],
    },
  ],

  fragments: [[0, 0, -29]], // floats above the middle of the goal platform
};
