// LEVEL 1: FIRST STEPS
// Purpose (from the concept document): introduce movement and jumping.
// No SHIFT and no ROTATE here. Just a path of cubic platforms:
//   start platform -> 1-cube gap -> 2-cube gap -> step up -> step up -> Core Fragment
// Coordinates are grid cells [x, y, z]. One cube = 1 unit.

export default {
  name: 'First Steps',
  objective: 'Reach the Core Fragment',
  start: [0, 1.5, 2],

  boxes: [
    { from: [-2, 0, 0], to: [2, 0, 4] }, // A: start platform (5x5)
    // gap: 1 cube wide (z = -1)
    { from: [-1, 0, -4], to: [1, 0, -2] }, // B: first landing
    // gap: 2 cubes wide (z = -5 and -6)
    { from: [-1, 0, -9], to: [1, 0, -7] }, // C: second landing, the path turns left here
    { from: [-4, 1, -9], to: [-2, 1, -7] }, // E: one cube higher (jump up a step)
    { from: [-7, 2, -9], to: [-5, 2, -7] }, // F: one more step up, the goal platform
  ],

  blocks: [],
  structures: [],

  fragments: [[-6, 2, -8]], // floats above the middle of platform F
};