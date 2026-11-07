import * as THREE from 'three';
import { buildLevel } from './level.js';
import { ShiftableBlock } from './shiftableBlock.js';
import { RotatableStructure } from './rotatableStructure.js';
import { CoreFragment, FragmentManager } from './coreFragment.js';
import { PuzzleManager } from './puzzleManager.js';

// Loads, restarts and unloads levels.
// Everything a level creates goes into ONE group, so unloading is simple:
// free the memory of everything in the group, then remove the group from the scene.
export class LevelManager {
  constructor(scene, player, levels) {
    this.scene = scene;
    this.player = player;
    this.levels = levels; // list of level data objects
    this.index = -1;

    this.group = null;
    this.level = null;
    this.puzzles = null;
    this.fragments = null;
  }

  get data() {
    return this.levels[this.index];
  }

  get hasNext() {
    return this.index + 1 < this.levels.length;
  }

  get complete() {
    return this.fragments !== null && this.fragments.allCollected;
  }

  load(index) {
    this.unload();
    this.index = index;
    const data = this.data;

    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Static cubes
    this.level = buildLevel(this.group, data);

    // Things CUBIT can change
    this.puzzles = new PuzzleManager();
    for (const block of data.blocks ?? []) {
      this.puzzles.add(new ShiftableBlock(this.group, this.level, block.positions));
    }
    for (const structure of data.structures ?? []) {
      this.puzzles.add(new RotatableStructure(this.group, this.level, structure));
    }

    // Collectibles
    this.fragments = new FragmentManager();
    for (const cell of data.fragments ?? []) {
      this.fragments.add(new CoreFragment(this.group, cell));
    }

    // Put CUBIT in the new level
    this.player.setLevel(this.level, data.start);
    this.player.reset();
  }

  restart() {
    this.load(this.index);
  }

  next() {
    if (this.hasNext) this.load(this.index + 1);
  }

  // Free the memory used by the current level
  unload() {
    if (!this.group) return;

    this.group.traverse((object) => {
      if (object.isInstancedMesh) object.dispose();
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });

    this.scene.remove(this.group);
    this.group = null;
    this.level = null;
    this.puzzles = null;
    this.fragments = null;
  }

  // Returns true if CUBIT collected a fragment this frame
  update(delta, elapsed) {
    this.puzzles.update(delta);
    return this.fragments.update(delta, elapsed, this.player);
  }
}