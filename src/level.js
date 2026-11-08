import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { COLORS } from './constants.js';

// Every cube sits on a whole-number grid cell: (x, y, z).
// One cube = 1 unit. A cube at (0, 0, 0) fills the space from -0.5 to +0.5 on each axis.
// "solid" remembers which cells block CUBIT. Static cubes are drawn by the Level;
// moving things (ShiftableBlock, RotatableStructure) draw themselves and only register collision here.

const cellKey = (x, y, z) => `${x},${y},${z}`;

// Made in Blender, live in public/models/
const FLOOR_TILE_URL = '/models/platform_tile_v2_concept.glb'; // the TOP cube of every stack = the floor
const BASE_BLOCK_URL = '/models/base_block.glb'; // every cube BELOW the top one

// Each model is loaded once and reused by every level
const modelPromises = new Map();
function loadModel(url) {
  if (!modelPromises.has(url)) {
    const promise = new Promise((resolve, reject) => {
      new GLTFLoader().load(url, (gltf) => resolve(gltf.scene), undefined, reject);
    });
    promise.catch(() => modelPromises.delete(url)); // if it failed, the next level may try again
    modelPromises.set(url, promise);
  }
  return modelPromises.get(url);
}

export class Level {
  constructor(scene) {
    this.scene = scene;
    this.cells = []; // static cubes drawn by the Level: list of [x, y, z]
    this.staticKeys = new Set(); // the same static cubes as "x,y,z" (used to find the top of each stack)
    this.solid = new Set(); // every solid cell as "x,y,z" for fast collision checks
    this.meshes = []; // the instanced meshes that draw the static cubes
  }

  // A normal fixed cube: drawn AND solid
  addCube(x, y, z) {
    if (this.isSolid(x, y, z)) return; // already a cube here
    this.addCollision(x, y, z);
    this.cells.push([x, y, z]);
    this.staticKeys.add(cellKey(x, y, z));
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

  // Is there another fixed cube directly on top of this one?
  // (Moving blocks and structures do not count: the floor under them is still floor.)
  hasCubeAbove(x, y, z) {
    return this.staticKeys.has(cellKey(x, y + 1, z));
  }

  // Draws ALL static cubes with InstancedMesh (one draw call per material, not per cube).
  // This is the main trick that keeps the game fast on a weak GPU.
  // It starts with plain blue cubes, then swaps in the real models when they have loaded:
  //   - the top cube of each stack gets the floor tile
  //   - the cubes below it get the plain base block
  // If loading fails, the plain cubes stay.
  build() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: COLORS.blue });
    const placeholder = this.makeInstanced(geometry, material, 0.96, this.cells); // 0.96 leaves a thin gap
    this.meshes = [placeholder];
    this.scene.add(placeholder);

    Promise.all([loadModel(FLOOR_TILE_URL), loadModel(BASE_BLOCK_URL)])
      .then(([floorTile, baseBlock]) => {
        // The level may have been unloaded while the models were loading
        if (!this.scene.parent) return;

        // Split the cubes: top of a stack = floor, everything below = base
        const floorCells = [];
        const baseCells = [];
        for (const cell of this.cells) {
          (this.hasCubeAbove(...cell) ? baseCells : floorCells).push(cell);
        }

        const modelMeshes = [
          ...this.makeModelInstances(floorTile, floorCells),
          ...this.makeModelInstances(baseBlock, baseCells),
        ];
        if (modelMeshes.length === 0) return;

        // Remove the plain cubes and free their memory
        this.scene.remove(placeholder);
        placeholder.dispose();
        geometry.dispose();
        material.dispose();

        for (const mesh of modelMeshes) this.scene.add(mesh);
        this.meshes = modelMeshes;
      })
      .catch((error) => {
        console.warn('Could not load the floor models, keeping the plain cubes.', error);
      });
  }

  // One instanced mesh per material of a model (for the floor tile: blue, navy, cyan, orange)
  makeModelInstances(model, cells) {
    if (cells.length === 0) return [];
    model.updateMatrixWorld(true);

    const meshes = [];
    model.traverse((object) => {
      if (!object.isMesh) return;
      // Models are drawn at full size (scale 1) so the cyan lines of neighbouring tiles join up
      meshes.push(this.makeInstanced(object.geometry, object.material, 1, cells, object.matrixWorld));
    });
    return meshes;
  }

  // One InstancedMesh with an instance for each cell in the list.
  // 'offset' is the position of the mesh inside its model file (usually "no offset").
  makeInstanced(geometry, material, scale, cells, offset = null) {
    const mesh = new THREE.InstancedMesh(geometry, material, cells.length);
    const dummy = new THREE.Object3D();
    const matrix = new THREE.Matrix4();
    cells.forEach(([x, y, z], index) => {
      dummy.position.set(x, y, z);
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      matrix.copy(dummy.matrix);
      if (offset) matrix.multiply(offset);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
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