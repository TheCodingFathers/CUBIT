import './style.css';
import * as THREE from 'three';
import { COLORS } from './constants.js';
import { input } from './input.js';
import { Player } from './player.js';
import { LevelManager } from './levelManager.js';
import { LEVELS } from './levels/index.js';

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
// CUBIT and the levels
// ---------------------------------------------------------------
const player = new Player(scene);
const levels = new LevelManager(scene, player, LEVELS);
levels.load(0);

// "Up the screen" on the ground = the direction the camera looks, flattened.
// W/A/S/D move relative to this, so W always walks away from the camera.
const forward = new THREE.Vector3(-CAMERA_OFFSET.x, 0, -CAMERA_OFFSET.z).normalize();

const desiredCameraPosition = new THREE.Vector3();
const lookTarget = new THREE.Vector3();

// Put the camera right behind CUBIT instantly (used when a level loads)
function snapCamera() {
  camera.position.copy(player.position).add(CAMERA_OFFSET);
}
snapCamera();

// ---------------------------------------------------------------
// Keep the view correct when the window is resized
// ---------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------
// HUD elements
// ---------------------------------------------------------------
const clock = new THREE.Clock();
const fpsLabel = document.getElementById('fps');
const promptLabel = document.getElementById('prompt');
const objectiveText = document.getElementById('objective-text');
const fragmentCountLabel = document.getElementById('fragment-count');
const completeScreen = document.getElementById('complete');
const completeHint = document.getElementById('complete-hint');
const shiftIndicator = document.getElementById('ability-shift');
const rotateIndicator = document.getElementById('ability-rotate');
const pauseMenu = document.getElementById('pause');
const resumeButton = document.getElementById('resume-button');
const restartButton = document.getElementById('restart-button');
let frames = 0;
let fpsTimer = 0;

// Refreshes everything the HUD shows about the current level
function refreshHud() {
  const data = levels.data;
  const fragments = levels.fragments;

  objectiveText.textContent = data.objective ?? '';
  fragmentCountLabel.textContent = `${fragments.collectedCount} / ${fragments.total}`;
  completeHint.textContent = levels.hasNext ? 'Enter for the next level' : 'Backspace to play again';
  completeScreen.classList.toggle('visible', levels.complete);

  // Only show the abilities this level uses
  shiftIndicator.classList.toggle('hidden', (data.blocks ?? []).length === 0);
  rotateIndicator.classList.toggle('hidden', (data.structures ?? []).length === 0);
}
refreshHud();

// Shows the prompt for abilities in range, and lights up the ability indicators
function updatePrompt() {
  const parts = [];
  let anyAvailable = false;

  const shift = levels.puzzles.findTarget(player, 'shift');
  if (shift) {
    parts.push(shift.canActivate ? 'Q  SHIFT' : 'Q  SHIFT (blocked)');
    anyAvailable = anyAvailable || shift.canActivate;
  }
  shiftIndicator.classList.toggle('ready', !!shift && shift.canActivate);

  const rotate = levels.puzzles.findTarget(player, 'rotate');
  if (rotate) {
    parts.push(rotate.canActivate ? 'R  ROTATE' : 'R  ROTATE (blocked)');
    anyAvailable = anyAvailable || rotate.canActivate;
  }
  rotateIndicator.classList.toggle('ready', !!rotate && rotate.canActivate);

  if (parts.length === 0) {
    promptLabel.classList.remove('visible');
    return;
  }
  promptLabel.textContent = parts.join('     ');
  promptLabel.classList.add('visible');
  promptLabel.classList.toggle('blocked', !anyAvailable);
}

// ---------------------------------------------------------------
// Pause menu: Esc toggles it. While paused the game stops updating.
// ---------------------------------------------------------------
let paused = false;

function setPaused(value) {
  paused = value;
  pauseMenu.classList.toggle('visible', paused);
}

function restartLevel() {
  levels.restart();
  snapCamera();
  refreshHud();
}

resumeButton.addEventListener('click', () => setPaused(false));
restartButton.addEventListener('click', () => {
  restartLevel();
  setPaused(false);
});

// ---------------------------------------------------------------
// Game loop: runs once per frame
// ---------------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);

  const rawDelta = clock.getDelta(); // seconds since the last frame
  const delta = Math.min(rawDelta, 1 / 30); // cap it so a lag spike can't break collision
  const elapsed = clock.elapsedTime;

  if (input.wasPressed('Escape')) setPaused(!paused);

  if (!paused) {
    // Abilities: SHIFT (Q) and ROTATE (R)
    if (input.wasPressed('KeyQ')) levels.puzzles.tryActivate(player, 'shift');
    if (input.wasPressed('KeyR')) levels.puzzles.tryActivate(player, 'rotate');

    // Restart the level (Backspace), or go on to the next one when finished (Enter)
    if (input.wasPressed('Backspace')) restartLevel();
    if (input.wasPressed('Enter') && levels.complete && levels.hasNext) {
      levels.next();
      snapCamera();
      refreshHud();
    }

    player.update(delta, elapsed, forward);
    if (levels.update(delta, elapsed)) refreshHud();
    updatePrompt();
  }

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