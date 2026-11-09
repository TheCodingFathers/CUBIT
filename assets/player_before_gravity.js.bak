import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { COLORS } from './constants.js';
import { input } from './input.js';

// ---- Tuning values: change these to adjust how CUBIT feels ----
const SPEED = 4; // walking speed (units per second)
const JUMP_SPEED = 7.5; // upward speed at the start of a jump
const GRAVITY = 22; // how fast CUBIT falls
const MAX_FALL_SPEED = 15;
const TURN_SPEED = 12; // how fast CUBIT turns to face its movement
const FALL_LIMIT = -12; // below this height CUBIT respawns
const START = new THREE.Vector3(0, 1.5, 0);
const MODEL_URL = '/models/cubit.glb'; // made in Blender, lives in public/models/
const BLEND_TIME = 0.2; // seconds to blend between animations
const LAND_MIN_SPEED = 5; // falling faster than this when touching ground plays the Land squash

// CUBIT's collision box is half this size in each direction (so 0.7 x 0.8 x 0.7)
const HALF = { x: 0.35, y: 0.4, z: 0.35 };
const EPS = 0.0001;

export class Player {
  constructor(scene) {
    this.level = null; // set by setLevel() when a level is loaded
    this.start = START.clone(); // where CUBIT respawns in the current level
    this.position = START.clone(); // center of the collision box
    this.velocityY = 0;
    this.onGround = false;

    // Animation (filled in when the Blender model has loaded)
    this.mixer = null;
    this.actions = {}; // clip name -> AnimationAction (Idle, Walk, ...)
    this.state = null; // name of the clip that is playing now
    this.oneShot = null; // name of a one-shot clip (Interact, Collect) that is playing right now
    this.celebrating = false; // true while the level is complete (Victory loops)

    // ---- Placeholder CUBIT model (shown until the Blender model has loaded) ----
    this.group = new THREE.Group();

    this.visual = new THREE.Group(); // bobs up and down so CUBIT looks like it floats
    this.group.add(this.visual);

    // Placeholder box: shown until the Blender model has loaded (and kept if loading fails)
    this.placeholder = new THREE.Group();
    this.visual.add(this.placeholder);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.8, 0.8),
      new THREE.MeshStandardMaterial({ color: COLORS.blue })
    );
    this.placeholder.add(body);

    // Cyan eyes on the front face (the front is the +Z side)
    const eyeGeometry = new THREE.BoxGeometry(0.12, 0.14, 0.04);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: COLORS.cyan });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      eye.position.set(side * 0.17, 0.12, 0.41);
      this.placeholder.add(eye);
    }

    // Small orange energy core on the front
    const core = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.2, 0.06),
      new THREE.MeshStandardMaterial({
        color: COLORS.orange,
        emissive: COLORS.orange,
        emissiveIntensity: 1,
      })
    );
    core.position.set(0, -0.17, 0.41);
    this.placeholder.add(core);

    scene.add(this.group);
    this.group.position.copy(this.position);

    this.loadModel();
  }

  // Loads CUBIT's real model (GLB from Blender) and swaps it in for the placeholder box.
  // The model's front faces +Z, the same as the placeholder, so nothing else needs to change.
  loadModel() {
    new GLTFLoader().load(
      MODEL_URL,
      (gltf) => {
        // Remove the placeholder and free its memory
        this.visual.remove(this.placeholder);
        this.placeholder.traverse((object) => {
          if (object.geometry) object.geometry.dispose();
          if (object.material) object.material.dispose();
        });

        this.visual.add(gltf.scene);

        // Set up the animations that came with the model (Idle, Walk, ...)
        if (gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(gltf.scene);
          for (const clip of gltf.animations) {
            this.actions[clip.name] = this.mixer.clipAction(clip);
          }
          // Jump plays once and holds its last pose until the next animation takes over
          if (this.actions.Jump) {
            this.actions.Jump.setLoop(THREE.LoopOnce, 1);
            this.actions.Jump.clampWhenFinished = true;
          }
          // Interact, Collect and Land play once, then control goes back to Idle / Walk / Jump / Fall
          for (const name of ['Interact', 'Collect', 'Land']) {
            if (this.actions[name]) {
              this.actions[name].setLoop(THREE.LoopOnce, 1);
              this.actions[name].clampWhenFinished = false;
            }
          }
          this.mixer.addEventListener('finished', (event) => {
            if (this.oneShot && event.action === this.actions[this.oneShot]) this.oneShot = null;
          });
          this.setState('Idle');
        }
      },
      undefined,
      (error) => {
        console.warn('Could not load CUBIT model, keeping the placeholder box.', error);
      }
    );
  }

  // Switches to another animation with a short blend. Does nothing if it is already playing
  // or the model has no clip with that name.
  setState(name) {
    if (this.state === name || !this.actions[name]) return;

    const next = this.actions[name];
    const previous = this.actions[this.state];

    next.reset().play();
    if (previous) next.crossFadeFrom(previous, BLEND_TIME, false);
    this.state = name;
  }

  // Plays a one-shot clip (Interact, Collect) on top of the normal animations.
  // Does nothing if the model has no clip with that name.
  play(name) {
    const action = this.actions[name];
    if (!action) return;
    this.oneShot = name;
    if (this.state === name) {
      action.reset().play(); // same clip again: restart it
    } else {
      this.setState(name);
    }
  }

  // Victory loops while the level is complete. celebrate(false) stops it.
  celebrate(on) {
    this.celebrating = on;
    if (!on && this.state === 'Victory') this.setState('Idle');
  }

  // forward = the direction "up the screen" on the ground (comes from the camera)
  update(delta, elapsed, forward) {
    const right = new THREE.Vector3(-forward.z, 0, forward.x);

    // ---- Read the keys ----
    const move = new THREE.Vector3();
    if (input.isDown('KeyW')) move.add(forward);
    if (input.isDown('KeyS')) move.sub(forward);
    if (input.isDown('KeyD')) move.add(right);
    if (input.isDown('KeyA')) move.sub(right);
    if (move.lengthSq() > 0) move.normalize();

    // ---- Jump and gravity ----
    if (input.wasPressed('Space') && this.onGround) {
      this.velocityY = JUMP_SPEED;
    }
    this.velocityY = Math.max(this.velocityY - GRAVITY * delta, -MAX_FALL_SPEED);

    // ---- Move one axis at a time so CUBIT slides along walls ----
    this.moveAxis('x', move.x * SPEED * delta);
    this.moveAxis('z', move.z * SPEED * delta);

    const wasOnGround = this.onGround;
    this.onGround = false;
    const hitY = this.moveAxis('y', this.velocityY * delta);
    if (hitY) {
      if (this.velocityY < 0) {
        this.onGround = true; // landed on something
        // A real landing (not just standing) plays the squash, unless another one-shot is playing
        if (!wasOnGround && this.velocityY < -LAND_MIN_SPEED && !this.oneShot) this.play('Land');
      }
      this.velocityY = 0; // landed, or bumped a ceiling
    }

    // ---- Respawn if CUBIT falls off the world ----
    if (this.position.y < FALL_LIMIT) {
      this.reset();
    }

    // ---- Update the visible model ----
    this.group.position.copy(this.position);

    if (this.mixer) {
      // The Blender model floats by itself (Idle and Walk clips)
      this.visual.position.y = 0.1;
      let wanted;
      if (this.oneShot) wanted = this.oneShot; // Interact or Collect
      else if (!this.onGround) wanted = this.velocityY > 0.5 ? 'Jump' : 'Fall'; // rising or falling
      else if (move.lengthSq() > 0) wanted = 'Walk';
      else wanted = this.celebrating ? 'Victory' : 'Idle';
      this.setState(wanted);
      this.mixer.update(delta);
    } else {
      // Placeholder box: fake the floating in code
      this.visual.position.y = 0.1 + Math.sin(elapsed * 3) * 0.04;
    }

    if (move.lengthSq() > 0) {
      const target = Math.atan2(move.x, move.z);
      const diff =
        THREE.MathUtils.euclideanModulo(target - this.group.rotation.y + Math.PI, Math.PI * 2) -
        Math.PI;
      this.group.rotation.y += diff * Math.min(1, TURN_SPEED * delta);
    }
  }

  // Called by the LevelManager when a new level is loaded
  setLevel(level, startCell) {
    this.level = level;
    this.start.set(...startCell);
  }

  // Put CUBIT back at the start
  reset() {
    this.oneShot = null;
    this.position.copy(this.start);
    this.velocityY = 0;
    this.onGround = false;
  }

  // Is CUBIT's box overlapping the grid cell (x, y, z)?
  // topMargin extends the cell upward, so "standing on top of it" also counts.
  overlapsCell(x, y, z, topMargin = 0) {
    const p = this.position;
    const overlapX = Math.abs(p.x - x) < HALF.x + 0.5 - EPS;
    const overlapZ = Math.abs(p.z - z) < HALF.z + 0.5 - EPS;
    const overlapY =
      p.y + HALF.y > y - 0.5 + EPS && p.y - HALF.y < y + 0.5 + topMargin - EPS;
    return overlapX && overlapZ && overlapY;
  }

  // Moves CUBIT along one axis. If it ends up inside a cube, push it back out.
  // Returns true if it hit something.
  moveAxis(axis, amount) {
    if (amount === 0) return false;

    const p = this.position;
    p[axis] += amount;

    // Which grid cells does CUBIT's box overlap? (cell i covers i-0.5 to i+0.5)
    const x0 = Math.floor(p.x - HALF.x + EPS + 0.5);
    const x1 = Math.floor(p.x + HALF.x - EPS + 0.5);
    const y0 = Math.floor(p.y - HALF.y + EPS + 0.5);
    const y1 = Math.floor(p.y + HALF.y - EPS + 0.5);
    const z0 = Math.floor(p.z - HALF.z + EPS + 0.5);
    const z1 = Math.floor(p.z + HALF.z - EPS + 0.5);

    let hit = false;
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        for (let z = z0; z <= z1; z++) {
          if (!this.level.isSolid(x, y, z)) continue;
          hit = true;
          const cellCenter = { x, y, z }[axis];
          if (amount > 0) {
            p[axis] = Math.min(p[axis], cellCenter - 0.5 - HALF[axis]);
          } else {
            p[axis] = Math.max(p[axis], cellCenter + 0.5 + HALF[axis]);
          }
        }
      }
    }
    return hit;
  }
}