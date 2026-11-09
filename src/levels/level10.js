// LEVEL 10: THE WHOLE MACHINE
// Purpose: all four abilities in one chain. A plate on top of a tower holds the exit door open, but the
// plate is far from the door, so only an Echo can hold it.
//
//   The way to the plate:
//     ROTATE (R)  swings the hanging bar over the 4-cube gap.
//     GRAVITY (G) lets CUBIT fall up onto the underside of the bar and walk across it upside down.
//                 Above the far platform press X to drop back to the floor.
//     SHIFT (Q)   slides the block against the 3-cube tower so it becomes a step.
//     Then climb the step and the tower and stand on the plate: the door beyond opens.
//
//   The way through the door:
//     CUBIT cannot stand on the plate and walk through the door. So CORE ECHO (E) records the whole trip
//     from the start platform. Prepare the route first (rotate, cross, SHIFT, come back), then record the
//     walk. The Echo repeats it and holds the plate while the original CUBIT walks to the door.
//     A recording lasts at most 10 seconds in this level, so do the preparing first.
//
// Coordinates are grid cells [x, y, z]. One cube = 1 unit. The path goes north (toward -z).

export default {
  name: 'The Whole Machine',
  objective: 'Use every ability: your Echo must hold the plate you cannot reach twice',
  start: [0, 1.5, 2],
  echo: true,
  echoSeconds: 10, // longer than the usual 8: a perfect run needs 5.8 s, a person needs room
  gravity: true,

  boxes: [
    { from: [-2, 0, 0], to: [2, 0, 4] }, // start platform
    // gap: 4 cubes wide (z = -1 to -4)
    { from: [-3, 0, -12], to: [3, 0, -5] }, // middle platform
    { from: [1, 0, -12], to: [3, 2, -10] }, // tower on the middle platform, 3 cubes tall, plate on top
    { from: [-1, 0, -20], to: [1, 0, -13] }, // exit corridor (the door stands across it at z = -18, far from the tower)
    { from: [-2, 0, -24], to: [2, 0, -21] }, // goal platform
  ],

  blocks: [
    // The step block: SHIFT slides it against the tower
    {
      positions: [
        [-1, 1, -11],
        [0, 1, -11],
      ],
    },
  ],

  structures: [
    // The ceiling bar, 11 long and 3 wide, 3 cubes above the floor. It turns around its first cube.
    // At 0 degrees it points west. At -90 degrees it points north, over the gap and the start of the middle platform.
    {
      pivot: [0, 3, 3],
      axis: 'y',
      offsets: Array.from({ length: 11 }, (_, k) => [[-k, 0, -1], [-k, 0, 0], [-k, 0, 1]]).flat(),
      angles: [0, -90],
    },
  ],

  plates: [{ cell: [2, 2, -11], door: 0 }], // on top of the tower

  doors: [
    {
      cells: [
        [-1, 1, -18],
        [0, 1, -18],
        [1, 1, -18],
        [-1, 2, -18],
        [0, 2, -18],
        [1, 2, -18],
      ],
    },
  ],

  fragments: [[0, 0, -23]], // floats above the middle of the goal platform
};
