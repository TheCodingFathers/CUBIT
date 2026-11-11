// Scripted solutions, one per level (level number = position in the list, starting at 1).
// Steps: { goto: [x, y, z] } (null = ignore that axis), { tap: 'KeyQ' }, { wait: seconds },
//        { ground: true } (wait to land), { check: (sim) => true/false, msg }
const E = 'KeyE', Q = 'KeyQ', R = 'KeyR', G = 'KeyG', X = 'KeyX';

const SCENARIOS_EXPORT = {
  // ---- existing levels, used to prove the harness plays the game correctly ----
  6: [
    // Stage 1: record standing on the plate, then walk through the door
    { goto: [-1, null, 2], opts: { tol: 0.12 } },
    { tap: E }, { wait: 1.0 }, { tap: E },
    { wait: 0.8 },
    { goto: [0, null, -7] },
    // Stage 2: record the run to the far plate, then wait at the second door
    { goto: [0, null, -10] },
    { tap: E },
    { goto: [3, null, -12] }, { goto: [6, null, -12], opts: { tol: 0.12 } }, { wait: 0.3 },
    { tap: E },
    { goto: [0, null, -13.5] },
    { wait: 5 },
    { goto: [0, null, -17] },
  ],
  7: [
    { tap: G }, { ground: true },
    { goto: [0, null, -8], opts: { tol: 0.25 } },
    { tap: X }, { ground: true },
    { goto: [-3, null, -8] },
    { tap: 'ArrowUp' }, { ground: true },
    { goto: [-10, null, null] },
    { tap: X }, { ground: true },
    { wait: 1.0 },
    { goto: [-10, null, -8] },
    { goto: [-13, null, -8] },
  ],
};

export const NEW = {
  8: [
    // Stage 1: Echo holds door 1 while CUBIT walks through, then SHIFT block A into the gap
    { goto: [-1, null, 2], opts: { tol: 0.12 } },
    { tap: E }, { wait: 1.0 }, { tap: E }, { wait: 0.8 },
    { goto: [0, null, -7] },
    { goto: [1, null, -8], opts: { tol: 0.12 } },
    { tap: Q }, { wait: 0.6 },
    { goto: [0, null, -10], opts: { tol: 0.15 } },
    { goto: [0, null, -13] },
    // Stage 2: SHIFT block B against the tower, record the climb, then walk through door 2
    { goto: [0, null, -14.5] },
    { tap: Q }, { wait: 0.6 },
    { goto: [1, null, -17] },
    { tap: E },
    { goto: [3, null, -17] },
    { goto: [5, null, -17], opts: { tol: 0.12 } }, { wait: 0.3 },
    { tap: E },
    { check: (s) => s.echo.active ? true : 'no echo was created' },
    { goto: [0, null, -19] },
    { wait: 6 },
    { goto: [0, null, -27] },
    { goto: [0, null, -29] },
  ],
  9: [
    // Stage 1: ROTATE the bar, fall up onto it, cross, drop
    { tap: R }, { wait: 0.8 },
    { tap: G }, { ground: true },
    { check: (s) => s.p.y > 1.5 ? true : 'did not fall up onto the bar' },
    { goto: [0, null, -8], opts: { tol: 0.25 } },
    { tap: X }, { ground: true },
    // Stage 2: ROTATE the barrier away, then walk along the wall face
    { goto: [-4, null, -8] },
    { tap: R }, { wait: 0.8 },
    { goto: [-3, null, -8] },
    { tap: 'ArrowUp' }, { ground: true },
    { goto: [-10, null, null] },
    { tap: X }, { ground: true },
    { wait: 1.0 },
    // Stage 3: the gravity block is now the step
    { goto: [-10, null, -9] },
    { goto: [-11, null, -9], opts: { tol: 0.2 } },
    { goto: [-13, null, -9], opts: { tol: 0.2 } },
    { goto: [-13, null, -8] },
  ],
  10: [
    // Record the whole trip from the start platform
    { goto: [0, null, 2] },
    { tap: E },
    { tap: R }, { wait: 0.7 },
    { tap: G }, { ground: true },
    { goto: [0, null, -6], opts: { tol: 0.25 } },
    { tap: X }, { ground: true },
    { goto: [-1, null, -9], opts: { tol: 0.12 } },
    { tap: Q }, { wait: 0.6 },
    { goto: [-1.7, null, -9.5], opts: { tol: 0.2 } },
    { goto: [-1.7, null, -11], opts: { tol: 0.15 } },
    { goto: [2, null, -11], opts: { tol: 0.12 } }, { wait: 0.3 },
    { check: (s) => { console.log('    Level 10 recording length: ' + s.echo.recordTime.toFixed(1) + ' s of ' + s.echo.limit() + ' s'); return s.echo.recording ? true : 'recording already ended (too long?)'; } },
    { tap: E },
    { check: (s) => s.echo.active ? true : 'no echo was created' },
    // CUBIT walks to the door; the Echo repeats the trip and holds the plate
    { goto: [0, null, -13] },
    { goto: [0, null, -16.5] },
    { wait: 9 },
    { goto: [0, null, -20] },
    { goto: [0, null, -23] },
  ],
};
Object.assign(SCENARIOS_EXPORT, NEW);

const STAGE1_L8 = [
  { goto: [-1, null, 2], opts: { tol: 0.12 } },
  { tap: E }, { wait: 1.0 }, { tap: E }, { wait: 0.8 },
  { goto: [0, null, -7] },
];
const CROSS_L9 = [
  { tap: R }, { wait: 0.8 }, { tap: G }, { ground: true },
  { goto: [0, null, -8], opts: { tol: 0.25 } }, { tap: X }, { ground: true },
];
const CROSS_L10 = [
  { tap: R }, { wait: 0.8 }, { tap: G }, { ground: true },
  { goto: [0, null, -6], opts: { tol: 0.25 } }, { tap: X }, { ground: true },
];
const T = { timeout: 5 };
Object.assign(SCENARIOS_EXPORT, {
  // Exploit attempts: PASS means the shortcut is blocked
  '8x1': [...STAGE1_L8, { goto: [0, null, -8], opts: { tol: 0.1 } }, { goto: [0, null, -13], opts: T }],            // jump the 3-cube gap without SHIFT
  '8x2': [...STAGE1_L8, { goto: [1, null, -8], opts: { tol: 0.12 } }, { tap: Q }, { wait: 0.6 }, { goto: [0, null, -10], opts: { tol: 0.15 } }, { goto: [0, null, -13] },
          { goto: [3, null, -17], opts: T }, { goto: [5, null, -17], opts: T }],                                       // climb the tower without the step
  '9x1': [{ tap: G }, { wait: 2.5 }, { check: (s) => Math.hypot(s.p.x, s.p.z - 2) < 0.3 ? 'fell out of the world and respawned: nothing to land on' : true }],                                                                  // flip gravity without the bar
  '9x2': [...CROSS_L9, { goto: [-3, null, -8] }, { tap: 'ArrowUp' }, { ground: true }, { goto: [-10, null, null], opts: T }, { tap: X }, { ground: true }, { goto: [-13, null, -8], opts: T }], // wall route without clearing the barrier
  '9x3': [...CROSS_L9, { goto: [-4, null, -8] }, { goto: [-10, null, -8], opts: T }],                                 // jump the 4-cube gap
  '10x1': [{ goto: [0, null, 0.2] }, { goto: [0, null, -6], opts: T }],                                               // jump the 4-cube gap
  '10x2': [...CROSS_L10, { goto: [0, null, -9] }, { goto: [2, null, -11], opts: T }],                                 // climb the tower without SHIFT
  '10x3': [...CROSS_L10, { goto: [-1, null, -9], opts: { tol: 0.12 } }, { tap: Q }, { wait: 0.6 }, { goto: [-1.7, null, -9.5], opts: { tol: 0.2 } }, { goto: [-1.7, null, -11], opts: { tol: 0.15 } },
           { goto: [2, null, -11], opts: { tol: 0.12 } }, { wait: 0.5 }, { goto: [0, null, -16.5] }, { goto: [0, null, -23], opts: T }], // reach the goal without an Echo
});


// The way a person would actually play Level 10: prepare first (nothing is recorded), come back,
// then record only the trip to the plate. Shows how much of the 8 seconds the recording really needs.
Object.assign(SCENARIOS_EXPORT, {
  '10p': [
    // prepare: rotate the bar, cross upside down, SHIFT the block against the tower
    { tap: R }, { wait: 0.7 },
    { tap: G }, { ground: true },
    { goto: [0, null, -6], opts: { tol: 0.25 } },
    { tap: X }, { ground: true },
    { goto: [-1, null, -9], opts: { tol: 0.12 } },
    { tap: Q }, { wait: 0.6 },
    // come back over the bar
    { goto: [0, null, -6], opts: { tol: 0.2 } },
    { tap: G }, { ground: true },
    { goto: [0, null, 1], opts: { tol: 0.25 } },
    { tap: X }, { ground: true },
    { goto: [0, null, 2] },
    // record only the trip: cross, climb the step and the tower, stand on the plate
    { tap: E },
    { tap: G }, { ground: true },
    { goto: [0, null, -6], opts: { tol: 0.25 } },
    { tap: X }, { ground: true },
    { goto: [-1.7, null, -9.5], opts: { tol: 0.2 } },
    { goto: [-1.7, null, -11], opts: { tol: 0.15 } },
    { goto: [2, null, -11], opts: { tol: 0.12 } }, { wait: 0.3 },
    { check: (s) => { console.log('    Level 10 (prepared first) recording length: ' + s.echo.recordTime.toFixed(1) + ' s of ' + s.echo.limit() + ' s'); return s.echo.recording ? true : 'recording already ended (too long?)'; } },
    { tap: E },
    { check: (s) => s.echo.active ? true : 'no echo was created' },
    { goto: [0, null, -13] },
    { goto: [0, null, -16.5] },
    { wait: 9 },
    { goto: [0, null, -20] },
    { goto: [0, null, -23] },
  ],
});

// ---- Level 11: CORE CIRCUIT prototype ----
const STAGE1_L11 = [
  { goto: [2, null, -2] },
  { check: (s) => s.levels.mechanisms.doors[0].open ? 'door 1 was open before the mirror was turned' : true },
  { tap: R }, { wait: 0.8 },
  { check: (s) => s.levels.mechanisms.doors[0].open ? true : 'door 1 did not open' },
  { goto: [0, null, -8] }, { goto: [0, null, -13] },
];
Object.assign(SCENARIOS_EXPORT, {
  11: [
    ...STAGE1_L11,
    // Stage 2: SHIFT the block out of the beam, then rotate the second mirror
    { goto: [1, null, -17] },
    { tap: Q }, { wait: 0.6 },
    { goto: [2, null, -17] },
    { tap: R }, { wait: 0.8 },
    { check: (s) => s.levels.mechanisms.doors[1].open ? true : 'door 2 did not open' },
    { goto: [0, null, -24] }, { goto: [0, null, -29] }, { goto: [0, null, -33] },
  ],
  // Exploit attempts: PASS means the shortcut is blocked
  '11x1': [{ goto: [0, null, -8] }, { goto: [0, null, -9.2] }, { goto: [0, null, -13], opts: T }],                                                  // through door 1 without turning the mirror
  '11x2': [...STAGE1_L11, { goto: [2, null, -17] }, { tap: R }, { wait: 0.8 }, { goto: [0, null, -29], opts: T }],                                   // second mirror turned, but the block still stops the beam
  '11x3': [...STAGE1_L11, { goto: [1, null, -17] }, { tap: Q }, { wait: 0.6 }, { goto: [0, null, -29], opts: T }],                                   // block moved, but the second mirror never turned
});

// ---- Levels 1 to 5: the foundation levels. These tests make sure engine changes never silently break them. ----
const L2_STAGE1 = [
  { goto: [1, null, 1] }, { tap: Q }, { wait: 0.6 },                       // SHIFT block A against the tall platform
  { goto: [0, null, -2] },                                                  // up the step, onto the tall platform
];
const L3_BRIDGE = [
  { goto: [1, null, 1] }, { tap: R }, { wait: 0.8 },                       // the wall turns into a bridge
  { goto: [0, null, 1] }, { goto: [0, null, -6] },
];
const L4_STAGE1 = [
  { goto: [1, null, 1] }, { tap: R }, { wait: 0.8 },                       // wall -> bridge
  { goto: [0, null, 1] }, { goto: [0, null, -3] },
  { tap: Q }, { wait: 0.6 },                                                // block A becomes the step on the bridge end
  { goto: [0, null, -6] },
];
const L5_STAGE1 = [
  { goto: [1, null, 0] }, { tap: Q }, { wait: 0.6 },                       // block A out of the bridge's way
  { tap: R }, { wait: 0.8 },                                                // wall -> bridge
  { goto: [0, null, 0.5] }, { goto: [0, null, -3] },
  { tap: Q }, { wait: 0.6 },                                                // block A again: now it is the step
  { goto: [0, null, -6] },
];
Object.assign(SCENARIOS_EXPORT, {
  1: [{ goto: [0, null, -3] }, { goto: [0, null, -8] }, { goto: [-3, null, -8] }, { goto: [-6, null, -8] }],
  2: [
    ...L2_STAGE1,
    { goto: [1, null, -3] }, { tap: Q }, { wait: 0.6 },                    // SHIFT block B into the gap
    { goto: [0, null, -3] }, { goto: [0, null, -8] },
  ],
  3: [
    ...L3_BRIDGE,
    { goto: [-1, null, -6] }, { tap: R }, { wait: 0.8 },                   // the bar swings across the second gap
    { goto: [-8, null, -6] },
  ],
  4: [
    ...L4_STAGE1,
    { goto: [-1, null, -6] }, { tap: R }, { wait: 0.8 },                   // bar swings across
    { goto: [-5, null, -6] }, { tap: Q }, { wait: 0.6 },                   // block B becomes the step at the bar's end
    { goto: [-8, null, -6] },
  ],
  5: [
    ...L5_STAGE1,
    { goto: [-2, null, -6] }, { tap: Q }, { wait: 0.6 },                   // block B out of the bar's sweep (and onto its end)
    { tap: R }, { wait: 0.8 },
    { goto: [-8, null, -6] },
  ],
  // Exploit attempts: PASS means the shortcut is blocked
  '1x1': [{ goto: [-6, null, -8], opts: T }],                                                                         // straight to the goal, ignoring the path
  '2x1': [{ goto: [0, null, -2], opts: T }],                                                                          // climb the 2-high wall without the step
  '2x2': [...L2_STAGE1, { goto: [0, null, -8], opts: T }],                                                            // cross the 3-wide gap without block B
  '3x1': [{ goto: [0, null, -6], opts: T }],                                                                          // cross the 4-wide gap without turning the wall
  '3x2': [...L3_BRIDGE, { goto: [-8, null, -6], opts: T }],                                                           // second gap without the bar
  '4x1': [{ goto: [1, null, 1] }, { tap: R }, { wait: 0.8 }, { goto: [0, null, 1] }, { goto: [0, null, -3] }, { goto: [0, null, -6], opts: T }],   // climb the 2-high platform without block A
  '4x2': [...L4_STAGE1, { goto: [-1, null, -6] }, { tap: R }, { wait: 0.8 }, { goto: [-8, null, -6], opts: T }],       // climb the tower without block B
  '5x1': [{ tap: R }, { wait: 0.8 },
          { check: (s) => (s.levels.puzzles.items.some((i) => i.kind === 'rotate' && i.index !== 0) ? 'the wall turned although block A was in the way' : true) },
          { goto: [0, null, -6], opts: T }],                                                                          // rotate before moving block A
  '5x2': [{ goto: [1, null, 0] }, { tap: Q }, { wait: 0.6 }, { tap: R }, { wait: 0.8 }, { goto: [0, null, 0.5] }, { goto: [0, null, -3] }, { goto: [0, null, -6], opts: T }], // skip block A's second move (the step)
  // Smarter shortcuts: use a block where it is parked, without ever pressing SHIFT
  '2x3': [{ goto: [2, null, 0] }, { goto: [2, null, -2], opts: T }],                                                  // block A as a step, right where it is parked
  '2x4': [...L2_STAGE1, { goto: [2, null, -3] }, { goto: [2, null, -5], opts: T }, { goto: [0, null, -8], opts: T }],   // block B as a stepping stone, right where it is parked
  '4x3': [...L4_STAGE1, { goto: [-1, null, -6] }, { tap: R }, { wait: 0.8 }, { goto: [-5, null, -6] }, { goto: [-6, null, -5], opts: T }, { goto: [-8, null, -5], opts: T }], // block B as a step, where it is parked
  '5x3': [...L5_STAGE1, { goto: [-2, null, -6] }, { tap: R }, { wait: 0.8 }, { goto: [-8, null, -6], opts: T }],        // rotate the bar while block B still blocks it
});

export default SCENARIOS_EXPORT;
