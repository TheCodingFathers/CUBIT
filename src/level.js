import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Every cube sits on a whole-number grid cell: (x, y, z).
// One cube = 1 unit. A cube at (0, 0, 0) fills the space from -0.5 to +0.5 on each axis.
// "solid" remembers which cells block CUBIT. Static cubes are drawn by the Level;
// moving things (ShiftableBlock, RotatableStructure) draw themselves and only register collision here.

const cellKey = (x, y, z) => `${x},${y},${z}`;

// Made in Blender, live in public/models/
const FLOOR_TILES_URL = '/models/floor_tiles_slate.glb'; // the TOP cube of every stack = the floor (7 tile variants in one file)
const BASE_BLOCK_URL = '/models/base_block.glb'; // every cube BELOW the top one
const CORE_PLATFORM_URL = '/models/core_fragment_platform.glb'; // the cube under each Core Fragment

// FLOOR LOOK ------------------------------------------------------------------------------
// The slate color of the floor, the base blocks and the Core Fragment platform. A world sets it in worlds.js
// (floorColor); main.js passes it in with setFloorColor. SHIFT blocks keep their own blue on purpose.
const DEFAULT_FLOOR_COLOR = 0x303744; // cool graphite slate
let floorColor = DEFAULT_FLOOR_COLOR;
const liveLevels = new Set(); // levels whose floor color can still change (the ones that are on screen)

export function setFloorColor(hex) {
  floorColor = hex ?? DEFAULT_FLOOR_COLOR;
  for (const level of [...liveLevels]) {
    if (!level.scene.parent) liveLevels.delete(level); // a level that was unloaded
    else level.applyFloorColor();
  }
}

// Every floor tile is one of the variants in floor_tiles_slate.glb. Which one is decided by the tile's position
// only, so a tile never changes or flickers. Tiles at the open side of a platform get a cyan lip.
const SHADE = 0.06; // every slate tile is up to 6% lighter or darker than the floor color
// Inside a platform: [variant, share] as a running total. Plain is the most common.
const INTERIOR = [['Plain', 0.46], ['Worn', 0.61], ['Strips', 0.77], ['Chevron', 0.88], ['Panel', 1]];
const CYAN_VARIANTS = new Set(['Strips', 'Chevron', 'Panel']); // two of these never touch
const SIDES = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // north (-z), east (+x), south (+z), west (-x)
// The Edge tile has its cyan lip on its north side; the Corner tile on its north and east sides.
// Turning a tile by this angle (around Y) puts the lip on side 0, 1, 2 or 3 (and the Corner on sides i and i+1).
const LIP_YAW = [0, -Math.PI / 2, Math.PI, Math.PI / 2];

// A number from 0 to 1 that only depends on the cell and a salt (so it is the same on every load)
function hash3(x, y, z, salt) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 1274126177) + Math.imul(salt, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = Math.imul(h ^ (h >>> 16), 2246822519);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

// Chooses the tile variant and the turn (yaw) of every floor cell.
// floorCells: list of [x, y, z]. staticKeys: the Set of all fixed cubes as "x,y,z".
// Returns a Map "x,y,z" -> { variant, yaw }.
export function chooseFloorTiles(floorCells, staticKeys) {
  const sorted = [...floorCells].sort((a, b) => a[1] - b[1] || a[0] - b[0] || a[2] - b[2]);
  const chosen = new Map();
  for (const [x, y, z] of sorted) {
    const open = SIDES.map(([dx, dz]) => !staticKeys.has(cellKey(x + dx, y, z + dz)));
    let tile = null;
    for (let i = 0; i < 4 && !tile; i++) {
      if (open[i] && open[(i + 1) % 4]) tile = { variant: 'Corner', yaw: LIP_YAW[i] }; // two sides next to each other are open
    }
    if (!tile && open.includes(true)) tile = { variant: 'Edge', yaw: LIP_YAW[open.indexOf(true)] };
    if (!tile) {
      // inside the platform: a variant by position, never two cyan ones side by side
      const roll = hash3(x, y, z, 1);
      let variant = INTERIOR.find(([, upTo]) => roll < upTo)[0];
      const touchesCyan = SIDES.some(([dx, dz]) => CYAN_VARIANTS.has(chosen.get(cellKey(x + dx, y, z + dz))?.variant));
      if (CYAN_VARIANTS.has(variant) && touchesCyan) variant = 'Plain';
      tile = { variant, yaw: Math.floor(hash3(x, y, z, 2) * 4) * (Math.PI / 2) };
    }
    chosen.set(cellKey(x, y, z), tile);
  }
  return chosen;
}

// Each model is loaded once and reused by every level
const modelPromises = new Map();
export function loadModel(url) {
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
  // 'loader' loads a model file; the tests pass in their own
  constructor(scene, loader = loadModel) {
    this.scene = scene;
    this.loader = loader;
    this.cells = []; // static cubes drawn by the Level: list of [x, y, z]
    this.staticKeys = new Set(); // the same static cubes as "x,y,z" (used to find the top of each stack)
    this.solid = new Set(); // every solid cell as "x,y,z" for fast collision checks
    this.meshes = []; // the instanced meshes that draw the static cubes
    this.coreKeys = new Set(); // static cubes under a Core Fragment (drawn with the special platform model)
    this.floorTiles = new Map(); // "x,y,z" -> { variant, yaw } for every floor tile (filled when the models have loaded)
    this.tinted = new Map(); // original model material -> this level's slate copy (so the floor color can change live)
    this.placeholderMaterial = null;
    this.ready = null; // a promise that is done when the real models are in (the tests wait for it)
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

  // Marks a static cube as the platform under a Core Fragment: it gets its own model
  markCore(x, y, z) {
    const key = cellKey(x, y, z);
    if (this.staticKeys.has(key)) this.coreKeys.add(key);
  }

  // The slate copy of a model material (made once per level). Its color follows the floor color.
  slateMaterial(source) {
    let material = this.tinted.get(source);
    if (!material) {
      material = source.clone();
      material.color.set(floorColor);
      this.tinted.set(source, material);
    }
    return material;
  }

  // Called when the floor color changes (the K review tool, or a new world)
  applyFloorColor() {
    for (const material of this.tinted.values()) material.color.set(floorColor);
    this.placeholderMaterial?.color.set(floorColor);
  }

  // Draws ALL static cubes with InstancedMesh (one draw call per material, not per cube).
  // This is the main trick that keeps the game fast on a weak GPU.
  // It starts with plain slate cubes, then swaps in the real models when they have loaded:
  //   - the top cube of each stack gets a floor tile (one of 7 variants, see chooseFloorTiles)
  //   - the cubes below it get the plain base block
  // If loading fails, the plain cubes stay.
  build() {
    for (const level of [...liveLevels]) if (!level.scene.parent) liveLevels.delete(level);
    liveLevels.add(this);

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: floorColor });
    this.placeholderMaterial = material;
    const placeholder = this.makeInstanced(geometry, material, 0.96, this.cells); // 0.96 leaves a thin gap
    this.meshes = [placeholder];
    this.scene.add(placeholder);

    this.ready = Promise.all([
      this.loader(FLOOR_TILES_URL),
      this.loader(BASE_BLOCK_URL),
      this.loader(CORE_PLATFORM_URL).catch(() => null), // optional: without it the fragment sits on a normal floor tile
    ])
      .then(([floorTiles, baseBlock, corePlatform]) => {
        // The level may have been unloaded while the models were loading
        if (!this.scene.parent) return;

        // Split the cubes: top of a stack = floor, everything below = base
        const floorCells = [];
        const baseCells = [];
        const coreCells = [];
        for (const cell of this.cells) {
          if (corePlatform && this.coreKeys.has(cellKey(...cell))) coreCells.push(cell);
          else (this.hasCubeAbove(...cell) ? baseCells : floorCells).push(cell);
        }

        // A Core platform also counts as "a cube is here" for the open sides of the tiles next to it (staticKeys has it)
        this.floorTiles = chooseFloorTiles(floorCells, this.staticKeys);

        const modelMeshes = [
          ...this.makeFloorInstances(floorTiles, floorCells),
          ...this.makeModelInstances(baseBlock, baseCells),
          ...(corePlatform ? this.makeModelInstances(corePlatform, coreCells) : []),
        ];
        if (modelMeshes.length === 0) return;

        // Remove the plain cubes and free their memory
        this.scene.remove(placeholder);
        placeholder.dispose();
        geometry.dispose();
        material.dispose();
        this.placeholderMaterial = null;

        for (const mesh of modelMeshes) this.scene.add(mesh);
        this.meshes = modelMeshes;
      })
      .catch((error) => {
        console.warn('Could not load the floor models, keeping the plain cubes.', error);
      });
  }

  // The floor: for every variant, one instanced mesh per material, each tile turned by its own yaw
  makeFloorInstances(model, floorCells) {
    if (floorCells.length === 0) return [];
    model.updateMatrixWorld(true);

    const byVariant = new Map();
    for (const cell of floorCells) {
      const tile = this.floorTiles.get(cellKey(...cell));
      const group = model.getObjectByName(`Tile_${tile.variant}`) ?? model.getObjectByName('Tile_Plain');
      if (!group) continue; // the file has no such variant: that tile stays empty rather than showing a wrong one
      if (!byVariant.has(group)) byVariant.set(group, []);
      byVariant.get(group).push({ cell, yaw: tile.yaw });
    }

    const meshes = [];
    const dummy = new THREE.Object3D();
    const matrix = new THREE.Matrix4();
    const shade = new THREE.Color();
    for (const [group, entries] of byVariant) {
      group.traverse((object) => {
        if (!object.isMesh) return;
        const isSlate = object.material.name === 'TILE_Slate';
        const mesh = new THREE.InstancedMesh(object.geometry, isSlate ? this.slateMaterial(object.material) : object.material, entries.length);
        entries.forEach(({ cell, yaw }, index) => {
          dummy.position.set(cell[0], cell[1], cell[2]);
          dummy.rotation.set(0, yaw, 0);
          dummy.scale.setScalar(1); // full size, so the cyan lips of neighbouring tiles join up
          dummy.updateMatrix();
          matrix.copy(dummy.matrix).multiply(object.matrixWorld);
          mesh.setMatrixAt(index, matrix);
          if (isSlate) mesh.setColorAt(index, shade.setScalar(1 + (hash3(cell[0], cell[1], cell[2], 3) * 2 - 1) * SHADE));
        });
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        meshes.push(mesh);
      });
    }
    return meshes;
  }

  // One instanced mesh per material of a model (base block, Core platform). Their blue part becomes the floor slate.
  makeModelInstances(model, cells) {
    if (cells.length === 0) return [];
    model.updateMatrixWorld(true);

    const meshes = [];
    model.traverse((object) => {
      if (!object.isMesh) return;
      const material = object.material.name === 'TILE_Blue' ? this.slateMaterial(object.material) : object.material;
      // Models are drawn at full size (scale 1) so the cyan lines of neighbouring tiles join up
      meshes.push(this.makeInstanced(object.geometry, material, 1, cells, object.matrixWorld));
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
export function buildLevel(parent, data, loader = loadModel) {
  const level = new Level(parent, loader);
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

  // The cube under each Core Fragment gets the special Core Fragment platform
  for (const [x, y, z] of data.fragments ?? []) level.markCore(x, y, z);

  level.build();
  return level;
}
