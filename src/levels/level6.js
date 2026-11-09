// LEVEL 6: ECHOES
// Purpose: introduce CORE ECHO (E). The player records a run, and a holographic Echo replays it
// while the player carries on. The Echo can hold a pressure plate that CUBIT cannot hold and
// walk through the door at the same time.
//
//   Stage 1: an energy door blocks the corridor. The plate is on the start platform.
//            Record yourself standing on the plate, then walk through the door while the Echo holds it.
//   Stage 2: a bigger room with a second door. Its plate is on a small platform across a 1-cube gap.
//            Record the run to the plate (jump included), then hurry back to the door.
//            The Echo repeats the run and holds the plate when it gets there.
//
// Doors are 2 cubes tall, so they cannot be jumped over.
// Coordinates are grid cells [x, y, z]. One cube = 1 unit. The path goes north (toward -z).

export default {
  name: 'Echoes',
  objective: 'Press E to record, E again to make an Echo that holds a plate',
  start: [0, 1.5, 2],
  echo: true,

  boxes: [
    { from: [-2, 0, 0], to: [2, 0, 4] }, // start platform
    { from: [-1, 0, -8], to: [1, 0, -1] }, // corridor (door 1 stands across it at z = -3)
    { from: [-3, 0, -18], to: [3, 0, -9] }, // big room (door 2 stands across it at z = -15)
    { from: [5, 0, -13], to: [7, 0, -11] }, // plate platform (1-cube gap at x = 4)
  ],

  blocks: [],
  structures: [],

  // A plate is pressed while CUBIT or the Echo stands on it. door = index in the doors list.
  plates: [
    { cell: [-1, 0, 2], door: 0 }, // on the start platform
    { cell: [6, 0, -12], door: 1 }, // on the plate platform
  ],

  // Cells a door fills while it is closed
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
        [-3, 1, -15],
        [-2, 1, -15],
        [-1, 1, -15],
        [0, 1, -15],
        [1, 1, -15],
        [2, 1, -15],
        [3, 1, -15],
        [-3, 2, -15],
        [-2, 2, -15],
        [-1, 2, -15],
        [0, 2, -15],
        [1, 2, -15],
        [2, 2, -15],
        [3, 2, -15],
      ],
    },
  ],

  fragments: [[0, 0, -17]], // floats above the middle of the end of the big room
};
