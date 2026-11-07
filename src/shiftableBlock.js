import * as THREE from 'three';
import { COLORS } from './constants.js';

const SHIFT_DURATION = 0.35; // seconds the slide takes

// A block CUBIT can SHIFT between predefined grid cells.
// positions = list of [x, y, z] cells, e.g. [[-3, 1, 2], [1, 1, -3]].
// Each SHIFT sends the block to the next position in the list (and wraps around).
export class ShiftableBlock {
  constructor(scene, level, positions, startIndex = 0) {
    this.kind = 'shift';
    this.level = level;
    this.positions = positions;
    this.startIndex = startIndex;
    this.index = startIndex;

    this.moving = false;
    this.t = 0;
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
    this.mesh.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({ color: COLORS.cyan })
      )
    );
    this.mesh.position.set(...this.cell);
    scene.add(this.mesh);

    // Ghost outline: shows the cell this block will move to next
    this.ghost = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(0.96, 0.96, 0.96)),
      new THREE.LineBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.4 })
    );
    scene.add(this.ghost);
    this.updateGhost();

    // The block is solid, so CUBIT can stand on it and bump into it
    level.addCollision(...this.cell);
  }

  get cell() {
    return this.positions[this.index];
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

  activate() {
    this.oldCell = this.cell;
    this.index = (this.index + 1) % this.positions.length;

    this.from.set(...this.oldCell);
    this.to.set(...this.cell);
    this.t = 0;
    this.moving = true;

    // The new cell becomes solid right away; the old one is freed when the slide ends
    this.level.addCollision(...this.cell);
    this.updateGhost();
  }

  update(delta) {
    if (!this.moving) return;

    this.t = Math.min(1, this.t + delta / SHIFT_DURATION);
    const eased = this.t * this.t * (3 - 2 * this.t); // smooth start and stop
    this.mesh.position.lerpVectors(this.from, this.to, eased);

    if (this.t >= 1) {
      this.level.removeCollision(...this.oldCell);
      this.moving = false;
    }
  }

  // Put the block back in its starting cell instantly
  reset() {
    this.level.removeCollision(...this.cell);
    if (this.moving) this.level.removeCollision(...this.oldCell);
    this.moving = false;
    this.index = this.startIndex;
    this.mesh.position.set(...this.cell);
    this.level.addCollision(...this.cell);
    this.updateGhost();
  }
}