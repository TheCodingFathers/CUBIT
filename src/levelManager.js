import * as THREE from 'three';
import { buildLevel } from './level.js';
import { ShiftableBlock } from './shiftableBlock.js';
import { RotatableStructure } from './rotatableStructure.js';
import { CoreFragment, FragmentManager } from './coreFragment.js';
import { PuzzleManager } from './puzzleManager.js';
import { MechanismManager } from './mechanisms.js';
import { CircuitManager } from './circuit.js';
import { TeleportArch } from './teleportArch.js';

// Loads, restarts and unloads levels.
// Everything a level creates goes into ONE group, so unloading is simple:
// free the memory of everything in the group, then remove the group from the scene.
export class LevelManager {
  // arches = optional teleport arches by level name (see ARCHES in worlds.js)
  constructor(scene, player, levels, arches = {}) {
    this.scene = scene;
    this.player = player;
    this.levels = levels; // list of level data objects
    this.arches = arches;
    this.index = -1;

    this.group = null;
    this.level = null;
    this.puzzles = null;
    this.fragments = null;
    this.mechanisms = null;
    this.circuit = null;
    this.arch = null;
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
      this.puzzles.add(new ShiftableBlock(this.group, this.level, block.positions, 0, { gravity: !!block.gravity }));
    }
    for (const structure of data.structures ?? []) {
      this.puzzles.add(new RotatableStructure(this.group, this.level, structure));
    }

    // CORE CIRCUIT: energy sources, mirrors (turned with ROTATE) and receivers
    this.circuit = new CircuitManager(this.group, this.level, data);
    for (const reflector of this.circuit.reflectors) this.puzzles.add(reflector);

    // Pressure plates and energy doors
    this.mechanisms = new MechanismManager(this.group, this.level, data);

    // Collectibles
    this.fragments = new FragmentManager();
    for (const cell of data.fragments ?? []) {
      this.fragments.add(new CoreFragment(this.group, cell));
    }

    // A teleport arch, if this level has one (it comes out when CUBIT goes near it)
    const archSpec = this.arches[data.name];
    this.arch = archSpec ? new TeleportArch(this.group, this.level, archSpec) : null;

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
    this.mechanisms = null;
    this.circuit = null;
    this.arch = null;
  }

  // Returns true if CUBIT collected a fragment this frame
  // extraActors = other things that can press plates (the Echo)
  update(delta, elapsed, extraActors = []) {
    this.puzzles.update(delta);
    const receivers = this.circuit.update(delta, elapsed);
    this.mechanisms.update(delta, elapsed, [this.player, ...extraActors], receivers);
    const gained = this.fragments.update(delta, elapsed, this.player);
    this.arch?.update(delta, elapsed, this.player, this.complete); // after the fragments, so 'complete' is up to date
    return gained;
  }
}