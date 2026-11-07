import './style.css';
import * as THREE from 'three';
import { COLORS } from './constants.js';
import { input } from './input.js';
import { createTestRoom } from './level.js';
import { Player } from './player.js';
import { ShiftableBlock } from './shiftableBlock.js';
import { RotatableStructure } from './rotatableStructure.js';
import { PuzzleManager } from './puzzleManager.js';
import { CoreFragment, FragmentManager } from './coreFragment.js';

// ---------------------------------------------------------------
// Settings you can tweak. Lower PIXEL_RATIO_CAP = faster on weak GPUs.
// ---------------------------------------------------------------
const PIXEL_RATIO_CAP = 1.5;

// Where the camera sits relative to CUBIT (x, height, distance)
const CAMERA_OFFSET = new THREE.Vector3(6, 7, 8);
const CAMERA_FOLLOW_SPEED = 5; // higher = camera catches up faster

// ---------------------------------------------------------------
// Renderer: draws the 3D world into a <canvas> inside #app
// ---------------------------------------------------------------
const container = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, PIXEL_RATIO_CAP));
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

// ---------------------------------------------------------------
// Scene, camera and lights (no shadows yet: keeps things fast)
// ---------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.navy);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(4, 8, 3);
scene.add(sun);

// ---------------------------------------------------------------
// The world: test room, puzzle pieces, and CUBIT
// ---------------------------------------------------------------
const { level, blocks, structures, fragments: fragmentCells } = createTestRoom(scene);

const puzzles = new PuzzleManager();
for (const data of blocks) {
  puzzles.add(new ShiftableBlock(scene, level, data.positions));
}
for (const data of structures) {
  puzzles.add(new RotatableStructure(scene, level, data));
}

const fragments = new FragmentManager();
for (const cell of fragmentCells) {
  fragments.add(new CoreFragment(scene, cell));
}

const player = new Player(scene, level);

// "Up the screen" on the ground = the direction the camera looks, flattened.
// W/A/S/D move relative to this, so W always walks away from the camera.
const forward = new THREE.Vector3(-CAMERA_OFFSET.x, 0, -CAMERA_OFFSET.z).normalize();

// Start the camera already in position so it doesn't swoop in
camera.position.copy(player.position).add(CAMERA_OFFSET);

const desiredCameraPosition = new THREE.Vector3();
const lookTarget = new THREE.Vector3();

// ---------------------------------------------------------------
// Keep the view correct when the window is resized
// ---------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------
// Game loop: runs once per frame
// ---------------------------------------------------------------
const clock = new THREE.Clock();
const fpsLabel = document.getElementById('fps');
const promptLabel = document.getElementById('prompt');
const fragmentCountLabel = document.getElementById('fragment-count');
const completeScreen = document.getElementById('complete');
let frames = 0;
let fpsTimer = 0;

// Shows "collected / total" and the level-complete message
function updateHud() {
  fragmentCountLabel.textContent = `${fragments.collectedCount} / ${fragments.total}`;
  completeScreen.classList.toggle('visible', fragments.allCollected);
}
updateHud();

// Builds the prompt text for the abilities that are in range right now
function updatePrompt() {
  const parts = [];
  let anyAvailable = false;

  const shift = puzzles.findTarget(player, 'shift');
  if (shift) {
    parts.push(shift.canActivate ? 'Q  SHIFT' : 'Q  SHIFT (blocked)');
    anyAvailable = anyAvailable || shift.canActivate;
  }

  const rotate = puzzles.findTarget(player, 'rotate');
  if (rotate) {
    parts.push(rotate.canActivate ? 'R  ROTATE' : 'R  ROTATE (blocked)');
    anyAvailable = anyAvailable || rotate.canActivate;
  }

  if (parts.length === 0) {
    promptLabel.classList.remove('visible');
    return;
  }
  promptLabel.textContent = parts.join('     ');
  promptLabel.classList.add('visible');
  promptLabel.classList.toggle('blocked', !anyAvailable);
}

function animate() {
  requestAnimationFrame(animate);

  const rawDelta = clock.getDelta(); // seconds since the last frame
  const delta = Math.min(rawDelta, 1 / 30); // cap it so a lag spike can't break collision
  const elapsed = clock.elapsedTime;

  // Abilities: SHIFT (Q), ROTATE (R), and reset (Backspace)
  if (input.wasPressed('KeyQ')) puzzles.tryActivate(player, 'shift');
  if (input.wasPressed('KeyR')) puzzles.tryActivate(player, 'rotate');
  if (input.wasPressed('Backspace')) {
    puzzles.resetAll();
    fragments.reset();
    player.reset();
    updateHud();
  }

  player.update(delta, elapsed, forward);
  puzzles.update(delta);
  if (fragments.update(delta, elapsed, player)) updateHud();
  updatePrompt();

  // Smooth camera follow
  desiredCameraPosition.copy(player.position).add(CAMERA_OFFSET);
  camera.position.lerp(desiredCameraPosition, 1 - Math.exp(-CAMERA_FOLLOW_SPEED * delta));
  lookTarget.copy(player.position);
  lookTarget.y += 0.3;
  camera.lookAt(lookTarget);

  renderer.render(scene, camera);
  input.endFrame(); // forget "just pressed" keys

  // Update the FPS label twice per second
  frames++;
  fpsTimer += rawDelta;
  if (fpsTimer >= 0.5) {
    fpsLabel.textContent = `FPS: ${Math.round(frames / fpsTimer)}`;
    frames = 0;
    fpsTimer = 0;
  }
}

animate();