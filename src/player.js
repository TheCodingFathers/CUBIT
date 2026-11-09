import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { COLORS } from './constants.js';
import { input } from './input.js';

// ---- Tuning values: change these to adjust how CUBIT feels ----
const SPEED = 4; // walking speed (units per second)
const JUMP_SPEED = 7.5; // speed away from the ground at the start of a jump
const GRAVITY = 22; // how fast CUBIT falls
const MAX_FALL_SPEED = 15;
const TURN_SPEED = 12; // how fast CUBIT turns to face its movement
const GRAVITY_TURN_SPEED = 8; // how fast the view and CUBIT's body swing around when gravity changes
const WORLD_LIMIT = { below: -12, above: 30, side: 40 }; // farther than this from the level, CUBIT respawns
const START = new THREE.Vector3(0, 1.5, 0);
const MODEL_URL = '/models/cubit.glb'; // made in Blender, lives in public/models/
const BLEND_TIME = 0.2; // seconds to blend between animations
const LAND_MIN_SPEED = 5; // falling faster than this when touching ground plays the Land squash

// CUBIT's collision box is 0.7 x 0.8 x 0.7. The 0.8 side is its height, so it follows gravity.
const HALF_HEIGHT = 0.4;
const HALF_WIDTH = 0.35;
const EPS = 0.0001;

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const DOWN = new THREE.Vector3(0, -1, 0);
const DEFAULT_FORWARD = new THREE.Vector3(-0.6, 0, -0.8).normalize();

// GRAVITY FLIP: gravity can point along any of the six world axes (down, up and four walls).
// Everything CUBIT sees and every control is turned with it (see computeUpQuat), so on screen
// CUBIT is always upright and W always walks "forward", whatever surface it stands on.

export class Player {
  constructor(scene) {
    this.level = null; // set by setLevel() when a level is loaded
    this.start = START.clone(); // where CUBIT respawns in the current level
    this.position = START.clone(); // center of the collision box
    this.onGround = false;
    this.onJump = null; // optional callbacks, used for sound
    this.onLand = null;

    // ---- Gravity ----
    this.gravity = DOWN.clone(); // direction CUBIT falls (always one of the six world axes)
    this.gAxis = 'y'; // 'x', 'y' or 'z': the axis gravity is along
    this.gSign = -1; // +1 or -1: which way along that axis
    this.fallSpeed = 0; // speed along gravity (negative = moving away from the ground, e.g. a jump)
    this.half = { x: HALF_WIDTH, y: HALF_HEIGHT, z: HALF_WIDTH }; // half size of the box
    this.forwardBase = DEFAULT_FORWARD.clone(); // "up the screen" on a normal floor (set by main.js)
    this.targetQuat = new THREE.Quaternion(); // the view turn that matches the current gravity
    this.upQuat = new THREE.Quaternion(); // the same turn, smoothed: camera and body follow this
    this.yaw = 0; // which way CUBIT faces, around its own up axis
    this.yawQuat = new THREE.Quaternion();

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

  // ---- GRAVITY FLIP ----

  // The turn that takes the normal floor view (up = +Y, forward = forwardBase) to the view for
  // the current gravity (up = away from gravity). The camera, the controls and CUBIT's body all
  // use it, so the world is simply "rolled" until CUBIT's surface is below it again.
  computeUpQuat() {
    const forward = this.forwardBase;
    const up = this.gravity.clone().negate();

    // Forward on the new surface = the old forward, flattened onto it
    const f = forward.clone().addScaledVector(up, -forward.dot(up));
    if (f.lengthSq() < 1e-6) f.copy(forward);
    f.normalize();

    const right = new THREE.Vector3().crossVectors(f, up);
    const standardRight = new THREE.Vector3().crossVectors(forward, WORLD_UP);
    const standard = new THREE.Matrix4().makeBasis(standardRight, WORLD_UP, forward.clone().negate());
    const turned = new THREE.Matrix4().makeBasis(right, up, f.clone().negate());
    return new THREE.Quaternion().setFromRotationMatrix(turned.multiply(standard.invert()));
  }

  // Turns gravity toward a world axis (a vector like (0, 1, 0) or (-1, 0, 0)).
  // snap = true switches instantly with no swing (used on respawn). Returns true if it changed.
  setGravity(direction, snap = false) {
    const g = new THREE.Vector3(Math.round(direction.x), Math.round(direction.y), Math.round(direction.z));
    if (g.lengthSq() !== 1) return false;
    if (!snap && g.equals(this.gravity)) return false;

    this.gravity.copy(g);
    this.gAxis = g.x !== 0 ? 'x' : g.y !== 0 ? 'y' : 'z';
    this.gSign = g[this.gAxis];
    this.half = { x: HALF_WIDTH, y: HALF_WIDTH, z: HALF_WIDTH };
    this.half[this.gAxis] = HALF_HEIGHT;

    this.targetQuat.copy(this.computeUpQuat());
    if (snap) this.upQuat.copy(this.targetQuat);

    this.fallSpeed = 0;
    this.onGround = false;
    this.pushOutOfWalls();
    return true;
  }

  // Which gravity does a key ask for? how = 'forward' | 'back' | 'left' | 'right' | 'reverse' | 'floor'.
  // The four sides are relative to what CUBIT sees: 'forward' is where W leads. They snap to the
  // nearest world axis. Returns a world axis vector.
  gravityTarget(how) {
    const up = this.gravity.clone().negate();
    const f = this.forwardBase.clone().applyQuaternion(this.targetQuat);
    const right = new THREE.Vector3().crossVectors(f, up);

    let v;
    if (how === 'forward') v = f;
    else if (how === 'back') v = f.negate();
    else if (how === 'right') v = right;
    else if (how === 'left') v = right.negate();
    else if (how === 'reverse') v = this.gravity.clone().negate();
    else v = DOWN.clone();

    const ax = Math.abs(v.x);
    const ay = Math.abs(v.y);
    const az = Math.abs(v.z);
    if (ax >= ay && ax >= az) return new THREE.Vector3(Math.sign(v.x), 0, 0);
    if (ay >= az) return new THREE.Vector3(0, Math.sign(v.y), 0);
    return new THREE.Vector3(0, 0, Math.sign(v.z));
  }

  // After the box changed shape, make sure it is not stuck inside a cube
  pushOutOfWalls() {
    if (!this.level || !this.hitsSolid()) return;
    const axis = this.gAxis;
    const start = this.position[axis];
    for (const offset of [0.06, -0.06, 0.12, -0.12]) {
      this.position[axis] = start + offset;
      if (!this.hitsSolid()) return;
    }
    this.position[axis] = start;
  }

  // Is CUBIT's box overlapping any solid cube right now?
  hitsSolid() {
    const p = this.position;
    const h = this.half;
    const x0 = Math.floor(p.x - h.x + EPS + 0.5);
    const x1 = Math.floor(p.x + h.x - EPS + 0.5);
    const y0 = Math.floor(p.y - h.y + EPS + 0.5);
    const y1 = Math.floor(p.y + h.y - EPS + 0.5);
    const z0 = Math.floor(p.z - h.z + EPS + 0.5);
    const z1 = Math.floor(p.z + h.z - EPS + 0.5);
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        for (let z = z0; z <= z1; z++) {
          if (this.level.isSolid(x, y, z)) return true;
        }
      }
    }
    return false;
  }

  // forward = the direction "up the screen" on a normal floor (comes from the camera)
  update(delta, elapsed, forward) {
    // If the camera direction is ever different, rebuild the gravity turn from it
    if (!forward.equals(this.forwardBase)) {
      this.forwardBase.copy(forward);
      this.targetQuat.copy(this.computeUpQuat());
    }

    // The walking directions on the current surface: forward and right, turned with gravity
    const up = this.gravity.clone().negate();
    const walkForward = forward.clone().applyQuaternion(this.targetQuat);
    const walkRight = new THREE.Vector3().crossVectors(walkForward, up);

    // ---- Read the keys ----
    const move = new THREE.Vector3();
    if (input.isDown('KeyW')) move.add(walkForward);
    if (input.isDown('KeyS')) move.sub(walkForward);
    if (input.isDown('KeyD')) move.add(walkRight);
    if (input.isDown('KeyA')) move.sub(walkRight);
    move[this.gAxis] = 0; // never walk into or out of the surface
    if (move.lengthSq() > 0) move.normalize();

    // ---- Jump and gravity ----
    if (input.wasPressed('Space') && this.onGround) {
      this.fallSpeed = -JUMP_SPEED;
      this.onJump?.();
    }
    this.fallSpeed = Math.min(this.fallSpeed + GRAVITY * delta, MAX_FALL_SPEED);

    // ---- Move one axis at a time so CUBIT slides along walls ----
    // The two axes along the surface first, then the gravity axis last.
    for (const axis of ['x', 'y', 'z']) {
      if (axis !== this.gAxis) this.moveAxis(axis, move[axis] * SPEED * delta);
    }

    const wasOnGround = this.onGround;
    this.onGround = false;
    const hitG = this.moveAxis(this.gAxis, this.gSign * this.fallSpeed * delta);
    if (hitG) {
      if (this.fallSpeed > 0) {
        this.onGround = true; // landed on something
        // A real landing (not just standing) plays the squash, unless another one-shot is playing
        if (!wasOnGround && this.fallSpeed > LAND_MIN_SPEED) this.onLand?.();
        if (!wasOnGround && this.fallSpeed > LAND_MIN_SPEED && !this.oneShot) this.play('Land');
      }
      this.fallSpeed = 0; // landed, or bumped something above
    }

    // ---- Respawn if CUBIT falls off the world ----
    const p = this.position;
    if (
      p.y < WORLD_LIMIT.below ||
      p.y > WORLD_LIMIT.above ||
      Math.abs(p.x) > WORLD_LIMIT.side ||
      Math.abs(p.z) > WORLD_LIMIT.side
    ) {
      this.reset();
    }

    // ---- Update the visible model ----
    this.group.position.copy(this.position);

    if (this.mixer) {
      // The Blender model floats by itself (Idle and Walk clips)
      this.visual.position.y = 0.1;
      let wanted;
      if (this.oneShot) wanted = this.oneShot; // Interact or Collect
      else if (!this.onGround) wanted = this.fallSpeed < -0.5 ? 'Jump' : 'Fall'; // rising or falling
      else if (move.lengthSq() > 0) wanted = 'Walk';
      else wanted = this.celebrating ? 'Victory' : 'Idle';
      this.setState(wanted);
      this.mixer.update(delta);
    } else {
      // Placeholder box: fake the floating in code
      this.visual.position.y = 0.1 + Math.sin(elapsed * 3) * 0.04;
    }

    // Turn to face the walking direction (measured on CUBIT's own surface)
    if (move.lengthSq() > 0) {
      const local = move.clone().applyQuaternion(this.targetQuat.clone().invert());
      const target = Math.atan2(local.x, local.z);
      const diff = THREE.MathUtils.euclideanModulo(target - this.yaw + Math.PI, Math.PI * 2) - Math.PI;
      this.yaw += diff * Math.min(1, TURN_SPEED * delta);
    }

    // Swing the body (and the camera, which reads upQuat) toward the current gravity
    this.upQuat.slerp(this.targetQuat, 1 - Math.exp(-GRAVITY_TURN_SPEED * delta));
    this.yawQuat.setFromAxisAngle(WORLD_UP, this.yaw);
    this.group.quaternion.copy(this.upQuat).multiply(this.yawQuat);
  }

  // Called by the LevelManager when a new level is loaded
  setLevel(level, startCell) {
    this.level = level;
    this.start.set(...startCell);
  }

  // Put CUBIT back at the start (and gravity back to normal)
  reset() {
    this.oneShot = null;
    this.position.copy(this.start);
    this.fallSpeed = 0;
    this.onGround = false;
    this.setGravity(DOWN, true);
  }

  // Is CUBIT's box overlapping the grid cell (x, y, z)?
  // topMargin extends the cell upward, so "standing on top of it" also counts.
  overlapsCell(x, y, z, topMargin = 0) {
    const p = this.position;
    const h = this.half;
    const overlapX = Math.abs(p.x - x) < h.x + 0.5 - EPS;
    const overlapZ = Math.abs(p.z - z) < h.z + 0.5 - EPS;
    const overlapY = p.y + h.y > y - 0.5 + EPS && p.y - h.y < y + 0.5 + topMargin - EPS;
    return overlapX && overlapZ && overlapY;
  }

  // Moves CUBIT along one axis. If it ends up inside a cube, push it back out.
  // Returns true if it hit something.
  moveAxis(axis, amount) {
    if (amount === 0) return false;

    const p = this.position;
    const h = this.half;
    p[axis] += amount;

    // Which grid cells does CUBIT's box overlap? (cell i covers i-0.5 to i+0.5)
    const x0 = Math.floor(p.x - h.x + EPS + 0.5);
    const x1 = Math.floor(p.x + h.x - EPS + 0.5);
    const y0 = Math.floor(p.y - h.y + EPS + 0.5);
    const y1 = Math.floor(p.y + h.y - EPS + 0.5);
    const z0 = Math.floor(p.z - h.z + EPS + 0.5);
    const z1 = Math.floor(p.z + h.z - EPS + 0.5);

    let hit = false;
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        for (let z = z0; z <= z1; z++) {
          if (!this.level.isSolid(x, y, z)) continue;
          hit = true;
          const cellCenter = { x, y, z }[axis];
          if (amount > 0) {
            p[axis] = Math.min(p[axis], cellCenter - 0.5 - h[axis]);
          } else {
            p[axis] = Math.max(p[axis], cellCenter + 0.5 + h[axis]);
          }
        }
      }
    }
    return hit;
  }
}
