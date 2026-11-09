import './style.css';
import * as THREE from 'three';
import { COLORS } from './constants.js';
import { input } from './input.js';
import { Player } from './player.js';
import { LevelManager } from './levelManager.js';
import { CoreEcho, ECHO_MAX_SECONDS } from './echo.js';
import { BlobShadow } from './blobShadow.js';
import { audio } from './audio.js';
import { LEVELS } from './levels/index.js';

// ---------------------------------------------------------------
// Settings you can tweak. Lower PIXEL_RATIO_CAP = faster on weak GPUs.
// ---------------------------------------------------------------
const PIXEL_RATIO_CAP = 1.5;

// Where the camera sits relative to CUBIT (x, height, distance)
const CAMERA_OFFSET = new THREE.Vector3(6, 7, 8);
const CAMERA_FOLLOW_SPEED = 5; // higher = camera catches up faster

// REVIEW TOOL: a level picker in the pause menu, so we can look back at any level.
// It is NOT a game feature (a player must finish a level to unlock the next one).
// Set this to false before release and the picker disappears completely.
const REVIEW_LEVEL_SELECT = true;

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
const shadow = new BlobShadow(scene); // soft shadow under CUBIT: makes jumps and edges easier to judge

// SOUND: browsers keep audio locked until the first key press or click
for (const type of ['keydown', 'pointerdown']) window.addEventListener(type, audio.unlock);
player.onJump = () => audio.jump();
player.onLand = () => audio.land();
const levels = new LevelManager(scene, player, LEVELS);
levels.load(0);

// CORE ECHO: record a run, then a holographic copy replays it (E to record, C to cancel)
const echo = new CoreEcho(scene, player);
echo.onNotice = (text) => showNotice(text);
echo.limit = () => levels.data.echoSeconds ?? ECHO_MAX_SECONDS; // a level can set echoSeconds

// "Up the screen" on the ground = the direction the camera looks, flattened.
// W/A/S/D move relative to this, so W always walks away from the camera.
const forward = new THREE.Vector3(-CAMERA_OFFSET.x, 0, -CAMERA_OFFSET.z).normalize();

const desiredCameraPosition = new THREE.Vector3();
const lookTarget = new THREE.Vector3();

// Put the camera right behind CUBIT instantly (used when a level loads)
// The camera sits behind CUBIT as seen from the surface it stands on (GRAVITY FLIP turns it around)
const turnedOffset = new THREE.Vector3();
function cameraOffset() {
  return turnedOffset.copy(CAMERA_OFFSET).applyQuaternion(player.upQuat);
}

function snapCamera() {
  camera.up.set(0, 1, 0).applyQuaternion(player.upQuat);
  camera.position.copy(player.position).add(cameraOffset());
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
const echoIndicator = document.getElementById('ability-echo');
const echoStatus = document.getElementById('echo-status');
const pauseMenu = document.getElementById('pause');
const resumeButton = document.getElementById('resume-button');
const restartButton = document.getElementById('restart-button');
let frames = 0;
let fpsTimer = 0;

let lastCollected = 0; // how many fragments were collected the last time the HUD refreshed

// Refreshes everything the HUD shows about the current level
function refreshHud() {
  const data = levels.data;
  const fragments = levels.fragments;

  objectiveText.textContent = data.objective ?? '';
  fragmentCountLabel.textContent = `${fragments.collectedCount} / ${fragments.total}`;
  completeHint.textContent = levels.hasNext ? 'Enter for the next level' : 'Backspace to play again';
  completeScreen.classList.toggle('visible', levels.complete);

  // Only show the abilities this level uses
  shiftIndicator.classList.toggle(
    'hidden',
    (data.blocks ?? []).filter((block) => !(block.gravity && block.positions.length < 2)).length === 0
  );
  rotateIndicator.classList.toggle('hidden', (data.structures ?? []).length + (data.circuit?.reflectors ?? []).length === 0);
  echoIndicator.classList.toggle('hidden', !data.echo);
  lastCollected = fragments.collectedCount;
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

// Shows what CORE ECHO is doing right now (recording, replaying or holding)
function updateEchoHud() {
  const status = echo.status;
  echoIndicator.classList.toggle('active', status !== null);
  if (!levels.data.echo || status === null) {
    echoStatus.classList.remove('visible', 'recording');
    return;
  }
  if (status.kind === 'recording') {
    echoStatus.textContent = `REC  ${status.time.toFixed(1)} / ${status.max.toFixed(0)} s     E finish   C cancel`;
  } else {
    const word = status.kind === 'holding' ? 'holding' : 'replaying';
    echoStatus.textContent = `ECHO  ${word}     E new recording   C dismiss`;
  }
  echoStatus.classList.add('visible');
  echoStatus.classList.toggle('recording', status.kind === 'recording');
}

// ---------------------------------------------------------------
// GRAVITY FLIP: the gravity panel, and what the gravity keys call
// ---------------------------------------------------------------
const GRAVITY_NAMES = {
  '0,-1,0': '\u25BC DOWN',
  '0,1,0': '\u25B2 UP',
  '-1,0,0': '\u25C0 WEST',
  '1,0,0': '\u25B6 EAST',
  '0,0,-1': 'NORTH',
  '0,0,1': 'SOUTH',
};

const gravityPanel = document.createElement('div');
gravityPanel.id = 'gravity-panel';
gravityPanel.style.cssText = [
  'position: fixed',
  'left: 24px',
  'top: 50%',
  'transform: translateY(-50%)',
  'padding: 10px 14px',
  'background: rgba(10, 18, 48, 0.72)',
  'border: 1px solid rgba(45, 226, 255, 0.7)',
  'color: #2de2ff',
  'line-height: 1.4',
  'pointer-events: none',
  'z-index: 5',
  'display: none',
].join(';');
document.body.appendChild(gravityPanel);
let gravityPanelName = '';

function gravityName(g) {
  return GRAVITY_NAMES[`${g.x},${g.y},${g.z}`] ?? '?';
}

// Shows the panel only in levels that use gravity, and the current direction in it
function updateGravityHud() {
  const on = !!levels.data.gravity;
  gravityPanel.style.display = on ? 'block' : 'none';
  if (!on) return;
  const name = gravityName(player.gravity);
  if (name === gravityPanelName) return;
  gravityPanelName = name;
  gravityPanel.innerHTML =
    '<div style="font-size:11px;letter-spacing:0.25em;opacity:0.7">GRAVITY</div>' +
    '<div style="font-size:22px;margin:4px 0">' + name + '</div>' +
    '<div style="font-size:11px;opacity:0.7">ARROWS turn<br>G reverse<br>X floor</div>';
}

// how = 'forward' | 'back' | 'left' | 'right' | 'reverse' | 'floor'
function turnGravity(how) {
  const direction = player.gravityTarget(how);
  if (player.setGravity(direction)) {
    levels.puzzles.applyGravity(player.gravity, player); // gravity blocks fall too
    audio.gravity();
    showNotice(`Gravity ${gravityName(player.gravity)}`);
  }
}

function setPaused(value) {
  paused = value;
  pauseMenu.classList.toggle('visible', paused);
  if (paused) {
    refreshLevelButtons();
    audio.hum(false); // the beam hum stops while the game is paused
  }
}

// Small message under the objective, shown for a moment (created here, styled in style.css)
const notice = document.createElement('div');
notice.id = 'notice';
document.body.appendChild(notice);
let noticeTimer = 0;

function showNotice(text) {
  notice.textContent = text;
  notice.classList.add('visible');
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => notice.classList.remove('visible'), 1500);
}

// ---------------------------------------------------------------
// First-time hints: one short line the first time a level uses a mechanic (once per page load)
// ---------------------------------------------------------------
const HINTS = [
  {
    id: 'echo',
    when: (data) => !!data.echo,
    text: 'Pressure plates open doors while something stands on them. Press E to record yourself, E again to finish: your copy repeats the run and can hold a plate for you.',
  },
  {
    id: 'gravity',
    when: (data) => !!data.gravity,
    text: 'The arrow keys turn gravity toward that side. G reverses it, X puts it back to normal.',
  },
  {
    id: 'circuit',
    when: (data) => (data.circuit?.sources ?? []).length > 0,
    text: 'The beam is energy. Mirrors bend it: stand near one and press R to turn it. A powered receiver opens its door.',
  },
];
const hintsSeen = new Set();

const hintBox = document.createElement('div');
hintBox.id = 'hint';
document.body.appendChild(hintBox);
let hintTimer = 0;

// Call right after a new level loads. Shows the hints of mechanics the player has not met yet.
function showLevelHint() {
  const lines = HINTS.filter((hint) => !hintsSeen.has(hint.id) && hint.when(levels.data)).map((hint) => {
    hintsSeen.add(hint.id);
    return hint.text;
  });
  clearTimeout(hintTimer);
  if (lines.length === 0) {
    hintBox.classList.remove('visible');
    return;
  }
  hintBox.textContent = lines.join('\n');
  hintBox.classList.add('visible');
  hintTimer = setTimeout(() => hintBox.classList.remove('visible'), 10000);
}

// ---------------------------------------------------------------
// SOUND for things that change by themselves: doors, plates, receivers, the beam and CORE ECHO.
// It remembers last frame's state and plays a sound when something just changed.
// ---------------------------------------------------------------
const soundState = { group: null, doors: [], plates: [], receivers: [], echo: null };

function watchSounds() {
  // A new level just loaded: start from its current state without playing anything
  if (soundState.group !== levels.group) {
    soundState.group = levels.group;
    soundState.doors = [];
    soundState.plates = [];
    soundState.receivers = [];
    soundState.echo = null;
  }

  const mech = levels.mechanisms;
  const circuit = levels.circuit;

  mech?.doors.forEach((door, i) => {
    const before = soundState.doors[i];
    if (before !== undefined && before !== door.open) door.open ? audio.doorOpen() : audio.doorClose();
    soundState.doors[i] = door.open;
  });
  mech?.plates.forEach(({ plate }, i) => {
    const before = soundState.plates[i];
    if (before !== undefined && before !== plate.pressed) plate.pressed ? audio.plateOn() : audio.plateOff();
    soundState.plates[i] = plate.pressed;
  });
  circuit?.receivers.forEach((receiver, i) => {
    if (soundState.receivers[i] === false && receiver.powered) audio.receiverOn();
    soundState.receivers[i] = receiver.powered;
  });
  audio.hum((circuit?.sources.length ?? 0) > 0);

  const kind = echo.status?.kind ?? null;
  if (kind !== soundState.echo) {
    if (kind === 'recording') audio.echoStart();
    else if (soundState.echo === 'recording' && kind) audio.echoStop();
    else if (kind === null && soundState.echo) audio.echoOff();
    soundState.echo = kind;
  }
}

// Uses SHIFT or ROTATE. CUBIT plays the Interact animation only when the ability really works.
// If something is in range but cannot move right now, a message says so.
function useAbility(kind) {
  const target = levels.puzzles.findTarget(player, kind);
  if (target && target.canActivate) {
    player.play('Interact');
    if (kind === 'shift') audio.shift();
    else audio.rotate();
  } else if (target) {
    showNotice('Something is in the way');
    audio.blocked();
  }
  levels.puzzles.tryActivate(player, kind);
}

function restartLevel() {
  player.celebrate(false);
  echo.reset();
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
// REVIEW TOOL: level picker in the pause menu (see REVIEW_LEVEL_SELECT at the top)
// ---------------------------------------------------------------
const levelButtons = [];

// "1", "2", ... "11", and "T" for the Test Room
function levelLabel(index) {
  return /test/i.test(LEVELS[index].name ?? '') ? 'T' : String(index + 1);
}

function levelTitle(index) {
  const name = LEVELS[index].name ?? '';
  return levelLabel(index) === 'T' ? name : `Level ${levelLabel(index)}: ${name}`;
}

function goToLevel(index) {
  player.celebrate(false);
  echo.reset();
  levels.load(index);
  snapCamera();
  refreshHud();
  showLevelHint();
  setPaused(false);
  showNotice(levelTitle(index));
}

// Marks the level you are in right now
function refreshLevelButtons() {
  levelButtons.forEach((button, index) => button.classList.toggle('current', index === levels.index));
}

function buildLevelSelect() {
  const section = document.createElement('div');
  section.id = 'level-select';

  const title = document.createElement('div');
  title.className = 'level-select-title';
  title.textContent = 'LEVEL SELECT (review)';

  const grid = document.createElement('div');
  grid.className = 'level-grid';

  const nameLabel = document.createElement('div');
  nameLabel.className = 'level-select-name';
  nameLabel.textContent = '\u00a0';

  LEVELS.forEach((level, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'level-button';
    button.textContent = levelLabel(index);
    button.title = levelTitle(index);
    const showName = () => (nameLabel.textContent = levelTitle(index));
    button.addEventListener('mouseenter', showName);
    button.addEventListener('focus', showName);
    button.addEventListener('click', () => {
      button.blur(); // so Space or Enter in the game never presses it again
      goToLevel(index);
    });
    grid.appendChild(button);
    levelButtons.push(button);
  });
  grid.addEventListener('mouseleave', () => (nameLabel.textContent = '\u00a0'));

  section.append(title, grid, nameLabel);
  pauseMenu.querySelector('.pause-hint').before(section);
}

if (REVIEW_LEVEL_SELECT) buildLevelSelect();

// ---------------------------------------------------------------
// Game loop: runs once per frame
// ---------------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);

  const rawDelta = clock.getDelta(); // seconds since the last frame
  const delta = Math.min(rawDelta, 1 / 30); // cap it so a lag spike can't break collision
  const elapsed = clock.elapsedTime;

  if (input.wasPressed('Escape')) setPaused(!paused);
  if (input.wasPressed('KeyM')) showNotice(audio.toggleMute() ? 'Sound off' : 'Sound on');

  if (!paused) {
    // Abilities: SHIFT (Q) and ROTATE (R)
    if (input.wasPressed('KeyQ')) useAbility('shift');
    if (input.wasPressed('KeyR')) useAbility('rotate');

    // GRAVITY FLIP (levels with gravity: true): the arrow keys turn gravity toward that side as
    // CUBIT sees it, G reverses it, X puts it back to normal
    if (levels.data.gravity) {
      if (input.wasPressed('ArrowUp')) turnGravity('forward');
      if (input.wasPressed('ArrowDown')) turnGravity('back');
      if (input.wasPressed('ArrowLeft')) turnGravity('left');
      if (input.wasPressed('ArrowRight')) turnGravity('right');
      if (input.wasPressed('KeyG')) turnGravity('reverse');
      if (input.wasPressed('KeyX')) turnGravity('floor');
    }
    if (levels.data.echo) {
      if (input.wasPressed('KeyE')) echo.toggle();
      if (input.wasPressed('KeyC')) echo.cancel();
    }

    // Restart the level (Backspace), or go on to the next one when finished (Enter)
    if (input.wasPressed('Backspace')) restartLevel();
    if (input.wasPressed('Enter') && levels.complete && levels.hasNext) {
      player.celebrate(false);
      echo.reset();
      levels.next();
      snapCamera();
      refreshHud();
      showLevelHint();
    }

    player.update(delta, elapsed, forward);
    shadow.update(player, levels.level);
    echo.update(delta, elapsed); // after CUBIT has moved, so it records the new position
    if (levels.update(delta, elapsed, echo.actors)) {
      // A fragment was collected and/or the level was completed
      if (levels.fragments.collectedCount > lastCollected) player.play('Collect');
      if (levels.complete) {
        player.celebrate(true);
        audio.complete();
      } else if (levels.fragments.collectedCount > lastCollected) {
        audio.collect();
      }
      refreshHud();
    }
    updatePrompt();
    updateEchoHud();
    updateGravityHud();
    watchSounds();
  }

  // Smooth camera follow (the view turns with gravity)
  desiredCameraPosition.copy(player.position).add(cameraOffset());
  camera.position.lerp(desiredCameraPosition, 1 - Math.exp(-CAMERA_FOLLOW_SPEED * delta));
  camera.up.set(0, 1, 0).applyQuaternion(player.upQuat);
  lookTarget.copy(player.position).addScaledVector(camera.up, 0.3);
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