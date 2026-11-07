import * as THREE from 'three';
import { COLORS } from './constants.js';

// Every cube sits on a whole-number grid cell: (x, y, z).
// One cube = 1 unit. A cube at (0, 0, 0) fills the space from -0.5 to +0.5 on each axis.
// "solid" remembers which cells block CUBIT. Static cubes are drawn by the Level;
// moving things (ShiftableBlock, RotatableStructure) draw themselves and only register collision here.

const cellKey = (x, y, z) => `${x},${y},${z}`;

export class Level {
  constructor(scene) {
    this.scene = scene;
    this.cells = []; // static cubes drawn by the Level: list of [x, y, z]
    this.solid = new Set(); // every solid cell as "x,y,z" for fast collision checks
  }

  // A normal fixed cube: drawn AND solid
  addCube(x, y, z) {
    if (this.isSolid(x, y, z)) return; // already a cube here
    this.addCollision(x, y, z);
    this.cells.push([x, y, z]);
  }

  addCollision(x, y, z) {
    this.solid.add(cellKey(x, y, z));
  }

  removeCollision(x, y, z) {
    this.solid.delete(cellKey(x, y, z));
  }

  isSolid(x, y, z) {
    return this.solid.has(cellKey(x, y, z));
  }

  // Draws ALL static cubes with a single InstancedMesh = one draw call.
  // This is the main trick that keeps the game fast on a weak GPU.
  build() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: COLORS.blue });
    const mesh = new THREE.InstancedMesh(geometry, material, this.cells.length);

    const dummy = new THREE.Object3D();
    this.cells.forEach(([x, y, z], index) => {
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(0.96); // slightly smaller: leaves a thin dark gap between cubes
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;

    this.scene.add(mesh);
    this.mesh = mesh;
  }
}

// Builds the static cubes of a level from its data (see levels/testRoom.js).
// 'parent' is the group the cubes are added to.
export function buildLevel(parent, data) {
  const level = new Level(parent);
  const holes = new Set((data.holes ?? []).map((cell) => cell.join(',')));

  for (const { from, to } of data.boxes) {
    for (let x = from[0]; x <= to[0]; x++) {
      for (let y = from[1]; y <= to[1]; y++) {
        for (let z = from[2]; z <= to[2]; z++) {
          if (holes.has(`${x},${y},${z}`)) continue;
          level.addCube(x, y, z);
        }
      }
    }
  }

  level.build();
  return level;
}