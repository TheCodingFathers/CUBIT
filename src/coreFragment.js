import * as THREE from 'three';
import { COLORS } from './constants.js';

const COLLECT_DISTANCE = 0.8; // how close CUBIT must get to pick one up
const POP_DURATION = 0.25; // seconds of the little "pop" when collected

// A Core Fragment floats above a supporting cube.
// supportCell = the [x, y, z] cube it floats above. CUBIT collects it by touching it.
export class CoreFragment {
  constructor(scene, supportCell) {
    const [x, y, z] = supportCell;
    // Cube surface is at y + 0.5. The fragment hovers 0.6 above that,
    // which is right at CUBIT's height when it stands on the cube.
    this.base = new THREE.Vector3(x, y + 1.1, z);

    this.collected = false;
    this.popping = false;
    this.popTime = 0;

    this.group = new THREE.Group();
    this.group.position.copy(this.base);

    // Bright orange core (orange = core energy and objectives)
    this.core = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.35, 0.35),
      new THREE.MeshStandardMaterial({
        color: COLORS.orange,
        emissive: COLORS.orange,
        emissiveIntensity: 1.2,
      })
    );

    // Soft see-through halo: a cheap glow without any post-processing
    this.halo = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.55, 0.55),
      new THREE.MeshBasicMaterial({
        color: COLORS.orange,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      })
    );

    this.group.add(this.core, this.halo);
    scene.add(this.group);
  }

  update(delta, elapsed) {
    if (this.collected && !this.popping) return;

    // Spin and gently bob
    this.group.rotation.y = elapsed * 1.5;
    this.group.rotation.x = elapsed * 0.7;
    this.group.position.y = this.base.y + Math.sin(elapsed * 2) * 0.1;

    if (this.popping) {
      this.popTime += delta;
      const t = Math.min(1, this.popTime / POP_DURATION);
      this.group.scale.setScalar(1 + t * 0.8); // grow...
      this.halo.material.opacity = 0.25 * (1 - t); // ...and fade out
      if (t >= 1) {
        this.popping = false;
        this.group.visible = false;
      }
    } else {
      this.halo.material.opacity = 0.2 + Math.sin(elapsed * 3) * 0.08; // soft pulse
    }
  }

  // Returns true on the frame CUBIT picks it up
  tryCollect(player) {
    if (this.collected) return false;
    if (player.position.distanceTo(this.group.position) > COLLECT_DISTANCE) return false;

    this.collected = true;
    this.popping = true;
    this.popTime = 0;
    return true;
  }

  // Put it back, uncollected (used by the reset key while we are testing)
  reset() {
    this.collected = false;
    this.popping = false;
    this.group.visible = true;
    this.group.scale.setScalar(1);
    this.group.position.copy(this.base);
    this.halo.material.opacity = 0.25;
  }
}

// Keeps track of all fragments in the level and how many CUBIT has collected
export class FragmentManager {
  constructor() {
    this.items = [];
  }

  add(fragment) {
    this.items.push(fragment);
  }

  get total() {
    return this.items.length;
  }

  get collectedCount() {
    return this.items.filter((f) => f.collected).length;
  }

  get allCollected() {
    return this.total > 0 && this.collectedCount === this.total;
  }

  // Returns true if CUBIT collected something this frame
  update(delta, elapsed, player) {
    let gained = false;
    for (const fragment of this.items) {
      fragment.update(delta, elapsed);
      if (fragment.tryCollect(player)) gained = true;
    }
    return gained;
  }

  reset() {
    for (const fragment of this.items) fragment.reset();
  }
}