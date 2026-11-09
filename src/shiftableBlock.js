import * as THREE from 'three';
import { COLORS } from './constants.js';
import { loadModel } from './level.js';

const BLOCK_MODEL_URL = '/models/shiftable_block.glb'; // made in Blender, lives in public/models/

const SHIFT_DURATION = 0.35; // seconds the slide takes

// GRAVITY FLIP: a block marked "gravity: true" in the level data also falls when gravity changes.
const MAX_FALL_CELLS = 12; // it only falls if something solid is within this many cells
const FALL_BASE_TIME = 0.12; // seconds for a one-cell fall
const FALL_TIME_PER_CELL = 0.07; // extra seconds for each further cell
const FALL_MAX_TIME = 0.8;

// A block CUBIT can SHIFT between predefined grid cells.
// positions = list of [x, y, z] cells, e.g. [[-3, 1, 2], [1, 1, -3]].
// Each SHIFT sends the block to the next position in the list (and wraps around).
//
// options.gravity = true makes it a gravity block: whenever gravity changes (and after each SHIFT)
// it falls in the gravity direction, one straight line, until a solid cube (or CUBIT) is in the way.
// If nothing is within reach it stays where it is, so a gravity block can never be lost.
// A gravity block with only one position cannot be SHIFTed: it only reacts to gravity.
export class ShiftableBlock {
  constructor(scene, level, positions, startIndex = 0, options = {}) {
    this.level = level;
    this.positions = positions;
    this.startIndex = startIndex;
    this.index = startIndex;
    this.currentCell = positions[startIndex]; // where the block really is (a fall can leave the list)

    this.gravityBound = !!options.gravity;
    this.kind = this.gravityBound && positions.length < 2 ? 'gravity' : 'shift';
    this.gravityDir = [0, -1, 0]; // the gravity this block last heard about
    this.pendingGravity = false; // gravity changed while the block was busy
    this.lastMove = 'shift';
    this.player = null;

    this.moving = false;
    this.t = 0;
    this.duration = SHIFT_DURATION;
    this.ease = 'smooth';
    this.from = new THREE.Vector3();
    this.to = new THREE.Vector3();
    this.oldCell = null;

    const geometry = new THREE.BoxGeometry(0.96, 0.96, 0.96);

    // Interactive blocks get a faint cyan glow and cyan edges,
    // so they look different from the plain decorative cubes.
    this.mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: COLORS.blue,
        emissive: COLORS.cyan,
        emissiveIntensity: 0.25,
      })
    );
    this.edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({ color: COLORS.cyan })
    );
    this.mesh.add(this.edges);

    // Gravity blocks wear a thin cyan cage a little bigger than the block
    if (this.gravityBound) {
      this.mesh.add(
        new THREE.LineSegments(
          new THREE.EdgesGeometry(new THREE.BoxGeometry(1.12, 1.12, 1.12)),
          new THREE.LineBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.85 })
        )
      );
    }
    this.mesh.position.set(...this.cell);
    scene.add(this.mesh);

    // Swap the plain cube for the real block model once it has loaded.
    // If loading fails, the plain cube stays.
    loadModel(BLOCK_MODEL_URL)
      .then((model) => {
        this.mesh.material.visible = false; // hide the plain cube...
        this.mesh.remove(this.edges); // ...and its edge lines
        this.mesh.add(model.clone(true));
      })
      .catch((error) => {
        console.warn('Could not load the shiftable block model, keeping the plain cube.', error);
      });

    // Ghost outline: shows the cell this block will move to next
    this.ghost = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(0.96, 0.96, 0.96)),
      new THREE.LineBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.6 })
    );
    // A faint cyan fill makes the destination easier to see
    this.ghost.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.96, 0.96, 0.96),
        new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.08, depthWrite: false })
      )
    );
    scene.add(this.ghost);
    this.ghost.visible = this.kind === 'shift'; // a gravity-only block has no "next" cell
    this.updateGhost();

    // The block is solid, so CUBIT can stand on it and bump into it
    level.addCollision(...this.cell);
  }

  get cell() {
    return this.currentCell;
  }

  get nextCell() {
    return this.positions[(this.index + 1) % this.positions.length];
  }

  updateGhost() {
    this.ghost.position.set(...this.nextCell);
  }

  distanceTo(point) {
    return this.mesh.position.distanceTo(point);
  }

  // Can this block move right now?
  canActivate(player) {
    if (this.moving) return false;
    if (this.level.isSolid(...this.nextCell)) return false; // something is in the way
    if (player.overlapsCell(...this.nextCell)) return false; // CUBIT is in the way
    if (player.overlapsCell(...this.cell, 0.05)) return false; // CUBIT is standing on it
    return true;
  }

  // Slides (or drops) the block from one cell to another
  beginMove(fromCell, toCell, duration, ease) {
    this.from.set(...fromCell);
    this.to.set(...toCell);
    this.t = 0;
    this.duration = duration;
    this.ease = ease;
    this.moving = true;

    // The new cell becomes solid right away; the old one is freed when the move ends
    this.level.addCollision(...toCell);
  }

  activate() {
    this.oldCell = this.cell;
    this.index = (this.index + 1) % this.positions.length;
    this.currentCell = this.positions[this.index];
    this.lastMove = 'shift';
    this.beginMove(this.oldCell, this.currentCell, SHIFT_DURATION, 'smooth');
    this.updateGhost();
  }

  // GRAVITY FLIP: called when gravity changes. gravity = the new direction as a vector.
  applyGravity(gravity, player) {
    if (!this.gravityBound) return;
    this.gravityDir = [Math.round(gravity.x), Math.round(gravity.y), Math.round(gravity.z)];
    this.player = player;
    if (this.moving) {
      this.pendingGravity = true; // settle when the current move is over
      return;
    }
    this.settle();
  }

  // Falls in the gravity direction until the next cell is solid (or CUBIT is in it).
  // If nothing is found within MAX_FALL_CELLS, the block stays where it is.
  settle() {
    const [dx, dy, dz] = this.gravityDir;
    const [cx, cy, cz] = this.currentCell;

    for (let steps = 0; steps < MAX_FALL_CELLS; steps++) {
      const x = cx + dx * (steps + 1);
      const y = cy + dy * (steps + 1);
      const z = cz + dz * (steps + 1);
      const blocked = this.level.isSolid(x, y, z) || (this.player && this.player.overlapsCell(x, y, z));
      if (!blocked) continue;

      // Found support after 'steps' free cells
      if (steps === 0) return;
      this.oldCell = this.currentCell;
      this.currentCell = [cx + dx * steps, cy + dy * steps, cz + dz * steps];
      this.lastMove = 'fall';
      const time = Math.min(FALL_MAX_TIME, FALL_BASE_TIME + FALL_TIME_PER_CELL * steps);
      this.beginMove(this.oldCell, this.currentCell, time, 'fall');
      return;
    }
  }

  update(delta) {
    if (!this.moving) return;

    this.t = Math.min(1, this.t + delta / this.duration);
    const eased = this.ease === 'fall' ? this.t * this.t : this.t * this.t * (3 - 2 * this.t); // falls speed up
    this.mesh.position.lerpVectors(this.from, this.to, eased);

    if (this.t >= 1) {
      this.level.removeCollision(...this.oldCell);
      this.moving = false;

      // A gravity block settles again after a SHIFT, or if gravity changed while it was moving
      if (this.gravityBound && (this.pendingGravity || this.lastMove === 'shift')) {
        this.pendingGravity = false;
        this.settle();
      }
    }
  }

  // Put the block back in its starting cell instantly
  reset() {
    this.level.removeCollision(...this.cell);
    if (this.moving) this.level.removeCollision(...this.oldCell);
    this.moving = false;
    this.index = this.startIndex;
    this.currentCell = this.positions[this.startIndex];
    this.gravityDir = [0, -1, 0];
    this.pendingGravity = false;
    this.mesh.position.set(...this.cell);
    this.level.addCollision(...this.cell);
    this.updateGhost();
  }
}
