// LEVEL 11: RECONNECT
// Purpose: a first prototype of CORE CIRCUIT. Energy beams, mirrors and receivers.
// A source shoots a beam along the floor. A mirror bends it 90 degrees. When the beam reaches a
// receiver, the door linked to that receiver opens. ROTATE (R) flips a mirror. SHIFT (Q) moves blocks.
//
//   Stage 1: the beam hits the mirror and turns the wrong way (south). ROTATE the mirror and the beam
//            turns north into the receiver beside the first door.
//   Stage 2: a block stands in the beam and stops it. SHIFT the block out of the way, then ROTATE the
//            second mirror, and the beam reaches the receiver beside the second door.
//
// Doors are 2 cubes tall, so they cannot be jumped over.
// Coordinates are grid cells [x, y, z]. One cube = 1 unit. The path goes north (toward -z).

export default {
  name: 'Reconnect',
  objective: 'Redirect the energy beam to open the doors',
  start: [0, 1.5, 2],

  boxes: [
    { from: [-4, 0, -8], to: [4, 0, 4] }, // room 1
    { from: [-1, 0, -14], to: [1, 0, -9] }, // corridor 1 (door 1 across it at z = -10)
    { from: [-4, 0, -24], to: [4, 0, -15] }, // room 2
    { from: [-1, 0, -30], to: [1, 0, -25] }, // corridor 2 (door 2 across it at z = -27)
    { from: [-2, 0, -34], to: [2, 0, -31] }, // goal platform
  ],

  blocks: [
    // The block that stops the beam in room 2. SHIFT slides it out of the beam's line.
    {
      positions: [
        [0, 1, -18],
        [0, 1, -16],
      ],
    },
  ],
  structures: [],

  circuit: {
    sources: [
      { cell: [-4, 1, -4], dir: [1, 0] }, // room 1, shoots east
      { cell: [-4, 1, -18], dir: [1, 0] }, // room 2, shoots east
    ],
    reflectors: [
      { cell: [3, 1, -4], state: 0 }, // beam turns south (wrong way) until it is rotated
      { cell: [3, 1, -18], state: 0 },
    ],
    receivers: [
      { cell: [3, 1, -8], door: 0 }, // beside corridor 1
      { cell: [3, 1, -24], door: 1 }, // beside corridor 2
    ],
  },

  doors: [
    { cells: [-1, 0, 1].flatMap((x) => [1, 2].map((y) => [x, y, -10])) },
    { cells: [-1, 0, 1].flatMap((x) => [1, 2].map((y) => [x, y, -27])) },
  ],

  fragments: [[0, 0, -33]], // floats above the middle of the goal platform
};
