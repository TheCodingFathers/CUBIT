import * as THREE from 'three';
import { COLORS } from './constants.js';

const ROTATE_DURATION = 0.5; // seconds the turn takes
const AXES = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };

const keyOf = (c) => `${c[0]},${c[1]},${c[2]}`;

// A structure CUBIT can ROTATE around a pivot.
//   pivot   = the grid cell [x, y, z] the structure turns around
//   axis    = 'x', 'y' or 'z' (the line it turns around, through the pivot cell)
//   offsets = the cubes of the structure, as [dx, dy, dz] steps away from the pivot ([0,0,0] is the pivot itself)
//   angles  = the predefined angles in degrees. Each ROTATE moves to the next one (and wraps around).
// A positive angle turns counter-clockwise when you look at the axis from its positive end.
export class RotatableStructure {
  constructor(scene, level, { pivot, axis = 'z', offsets, angles = [0, 90], startIndex = 0 }) {
    this.kind = 'rotate';
    this.level = level;
    this.pivot = pivot;
    this.axis = axis;
    this.offsets = offsets;
    this.angles = angles;
    this.startIndex = startIndex;
    this.index = startIndex;

    this.moving = false;
    this.t = 0;
    this.fromAngle = 0;
    this.toAngle = 0;
    this.oldCells = [];

    // ---- Visuals ----
    const geometry = new THREE.BoxGeometry(0.96, 0.96, 0.96);
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: COLORS.cyan });
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.blue,
      emissive: COLORS.cyan,
      emissiveIntensity: 0.25,
    });
    // The pivot cube glows brighter so the hinge is easy to spot
    const pivotMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.blue,
      emissive: COLORS.cyan,
      emissiveIntensity: 0.7,
    });

    // Everything is a child of one group placed at the pivot, so turning the group turns the structure
    this.group = new THREE.Group();
    this.group.position.set(...pivot);
    for (const offset of offsets) {
      const isPivot = offset[0] === 0 && offset[1] === 0 && offset[2] === 0;
      const cube = new THREE.Mesh(geometry, isPivot ? pivotMaterial : bodyMaterial);
      cube.position.set(...offset);
      cube.add(new THREE.LineSegments(edgesGeometry, edgeMaterial));
      this.group.add(cube);
    }
    scene.add(this.group);

    // Ghost outline: shows where the structure will be after the next ROTATE
    this.ghost = new THREE.Group();
    this.ghost.position.set(...pivot);
    const ghostMaterial = new THREE.LineBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.4 });
    for (const offset of offsets) {
      const outline = new THREE.LineSegments(edgesGeometry, ghostMaterial);
      outline.position.set(...offset);
      this.ghost.add(outline);
    }
    scene.add(this.ghost);

    this.applyAngle(this.angles[this.index]);
    this.updateGhost();

    // Every cube of the structure is solid
    for (const cell of this.cellsAt(this.angles[this.index])) level.addCollision(...cell);
  }

  get nextIndex() {
    return (this.index + 1) % this.angles.length;
  }

  // Which grid cells does the structure fill at a given angle?
  cellsAt(angleDegrees) {
    const radians = THREE.MathUtils.degToRad(angleDegrees);
    return this.offsets.map((offset) => {
      const v = new THREE.Vector3(...offset).applyAxisAngle(AXES[this.axis], radians);
      return [
        this.pivot[0] + Math.round(v.x),
        this.pivot[1] + Math.round(v.y),
        this.pivot[2] + Math.round(v.z),
      ];
    });
  }

  currentCells() {
    return this.cellsAt(this.angles[this.index]);
  }

  applyAngle(angleDegrees) {
    const radians = THREE.MathUtils.degToRad(angleDegrees);
    this.group.rotation.set(0, 0, 0);
    this.group.rotation[this.axis] = radians;
  }

  updateGhost() {
    this.ghost.rotation.set(0, 0, 0);
    this.ghost.rotation[this.axis] = THREE.MathUtils.degToRad(this.angles[this.nextIndex]);
  }

  // Closest distance from a point to any cube of the structure
  distanceTo(point) {
    let best = Infinity;
    const cell = new THREE.Vector3();
    for (const c of this.currentCells()) {
      best = Math.min(best, cell.set(...c).distanceTo(point));
    }
    return best;
  }

  canActivate(player) {
    if (this.moving) return false;

    const own = new Set(this.currentCells().map(keyOf));
    for (const cell of this.cellsAt(this.angles[this.nextIndex])) {
      if (this.level.isSolid(...cell) && !own.has(keyOf(cell))) return false; // something is in the way
      if (player.overlapsCell(...cell)) return false; // CUBIT is in the way
    }
    for (const cell of this.currentCells()) {
      if (player.overlapsCell(...cell, 0.05)) return false; // CUBIT is standing on it
    }
    return true;
  }

  activate() {
    this.oldCells = this.currentCells();
    this.fromAngle = this.angles[this.index];
    this.index = this.nextIndex;
    this.toAngle = this.angles[this.index];
    this.t = 0;
    this.moving = true;

    // New cells become solid right away; old ones are freed when the turn ends
    for (const cell of this.currentCells()) this.level.addCollision(...cell);
    this.updateGhost();
  }

  update(delta) {
    if (!this.moving) return;

    this.t = Math.min(1, this.t + delta / ROTATE_DURATION);
    const eased = this.t * this.t * (3 - 2 * this.t); // smooth start and stop
    this.applyAngle(THREE.MathUtils.lerp(this.fromAngle, this.toAngle, eased));

    if (this.t >= 1) {
      const keep = new Set(this.currentCells().map(keyOf));
      for (const cell of this.oldCells) {
        if (!keep.has(keyOf(cell))) this.level.removeCollision(...cell);
      }
      this.moving = false;
    }
  }

  // Put the structure back in its starting position instantly
  reset() {
    for (const cell of this.currentCells()) this.level.removeCollision(...cell);
    if (this.moving) {
      for (const cell of this.oldCells) this.level.removeCollision(...cell);
    }
    this.moving = false;
    this.index = this.startIndex;
    this.applyAngle(this.angles[this.index]);
    this.updateGhost();
    for (const cell of this.currentCells()) this.level.addCollision(...cell);
  }
}