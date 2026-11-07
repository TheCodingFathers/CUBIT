import * as THREE from 'three';
import { COLORS } from './constants.js';

// Every cube sits on a whole-number grid cell: (x, y, z).
// One cube = 1 unit. A cube at (0, 0, 0) fills the space from -0.5 to +0.5 on each axis.
// We remember which cells are solid, and the player uses that for collision.

const cellKey = (x, y, z) => `${x},${y},${z}`;

export class Level {
  constructor(scene) {
    this.scene = scene;
    this.cells = []; // list of [x, y, z] for drawing
    this.solid = new Set(); // set of "x,y,z" for fast collision checks
  }

  addCube(x, y, z) {
    const key = cellKey(x, y, z);
    if (this.solid.has(key)) return; // already a cube here
    this.solid.add(key);
    this.cells.push([x, y, z]);
  }

  isSolid(x, y, z) {
    return this.solid.has(cellKey(x, y, z));
  }

  // Draws ALL cubes with a single InstancedMesh = one draw call.
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

// A small test room: a 9x9 floor plus a little staircase to test jumping.
export function createTestRoom(scene) {
  const level = new Level(scene);

  // Floor
  for (let x = -4; x <= 4; x++) {
    for (let z = -4; z <= 4; z++) {
      level.addCube(x, 0, z);
    }
  }

  // Staircase: one cube high, then two cubes high
  level.addCube(2, 1, -3);
  level.addCube(3, 1, -3);
  level.addCube(3, 2, -3);

  level.build();
  return level;
}