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

// Test room with two puzzles:
//  1) SHIFT: a raised platform that is too high to jump onto. A block can be slid next to it as a step.
//  2) ROTATE: a gap too wide to jump. A tall wall on the edge can be turned 90 degrees to become a bridge.
export function createTestRoom(scene) {
  const level = new Level(scene);

  // Floor (9x9). The cell (-4, 0, 0) is left out: the rotatable wall stands there.
  for (let x = -4; x <= 4; x++) {
    for (let z = -4; z <= 4; z++) {
      if (x === -4 && z === 0) continue;
      level.addCube(x, 0, z);
    }
  }

  // SHIFT puzzle: raised 3x3 platform, two cubes tall (CUBIT can only jump one cube high)
  for (let x = 2; x <= 4; x++) {
    for (let y = 1; y <= 2; y++) {
      for (let z = -4; z <= -2; z++) {
        level.addCube(x, y, z);
      }
    }
  }

  // ROTATE puzzle: far platform on the other side of a 4-cube-wide gap (x from -8 to -5)
  for (let x = -11; x <= -9; x++) {
    for (let z = -1; z <= 1; z++) {
      level.addCube(x, 0, z);
    }
  }

  level.build();

  // Shiftable blocks: each one lists the cells it can move between.
  const blocks = [
    {
      positions: [
        [-3, 1, 2],
        [1, 1, -3],
      ],
    },
  ];

  // Rotatable structures: a wall of 5 cubes standing on the edge of the floor.
  // It turns around its bottom cube (the pivot). At 90 degrees it lies across the gap as a bridge.
  const structures = [
    {
      pivot: [-4, 0, 0],
      axis: 'z',
      offsets: [
        [0, 0, 0],
        [0, 1, 0],
        [0, 2, 0],
        [0, 3, 0],
        [0, 4, 0],
      ],
      angles: [0, 90],
    },
  ];

  // Core Fragments: each one floats above the cube listed here.
  // One is on the raised platform (needs SHIFT), one on the far platform (needs ROTATE).
  const fragments = [
    [3, 2, -3],
    [-10, 0, 0],
  ];

  return { level, blocks, structures, fragments };
}