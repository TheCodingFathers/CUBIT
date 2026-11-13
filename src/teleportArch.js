import * as THREE from 'three';

// TELEPORT ARCH: a doorway that comes out of the ground when CUBIT goes near it.
// It stays dim and closed until the level is complete. After that, walking into it ends the level and
// takes CUBIT somewhere else (the level named in 'to'). The game (main.js) does the fade and the loading.
//
// The arch is described in worlds.js (ARCHES), not in the level file, so the level files stay as they are:
//   { level: 'Turn the World', cell: [-9, 0, -6], axis: 'x', to: 'Connected' }
//   cell = the floor cube it stands on (the doorway is the cell right above it)
//   axis = the direction CUBIT walks through it: 'x' (east-west) or 'z' (north-south)
//   to   = the name of the level it leads to
//
// Shape (axis 'x', seen from the side): two pillars (each 2 cubes tall) one cube to the left and right of the
// doorway, and a lintel across the top. The pillars and the lintel are solid, the doorway is open.

const REVEAL_DISTANCE = 6; // how close CUBIT must get (flat distance) before the arch comes out
const ENTER_DISTANCE = 0.7; // how close to the middle of the doorway counts as walking in
const RISE_TIME = 0.9; // seconds the arch takes to come out
const VERTICAL_RANGE = 3; // CUBIT must be about at the arch's height to reveal it or walk in

const STONE = 0x414653; // slate, like the floor
const CYAN = 0x2de2ff;

export class TeleportArch {
  // parent = the level's group (so unloading the level removes the arch), level = the Level (for collision)
  constructor(parent, level, spec) {
    this.level = level;
    this.destination = spec.to;
    this.axis = spec.axis === 'z' ? 'z' : 'x';
    const [x, y, z] = spec.cell;
    this.cell = [x, y, z];

    this.revealed = false;
    this.riseTime = 0;
    this.active = false; // open: the level is complete
    this.announced = false; // has the "open" event been given out
    this.entered = false;
    this.walkedIn = false;

    // The doorway's middle: one cube above the floor cube (the floor surface is at y + 0.5)
    this.center = new THREE.Vector3(x, y + 1.5, z);

    // Where the solid cells are (pillars, lintel), as [x, y, z]
    const side = this.axis === 'x' ? [0, 0, 1] : [1, 0, 0];
    this.solidCells = [];
    for (const s of [-1, 1]) {
      for (const h of [1, 2]) this.solidCells.push([x + side[0] * s, y + h, z + side[2] * s]);
    }
    for (const s of [-1, 0, 1]) this.solidCells.push([x + side[0] * s, y + 3, z + side[2] * s]);
    this.solidAdded = false;

    // Everything is built in a group that sits on the floor surface and grows upward when it comes out
    this.group = new THREE.Group();
    this.group.position.set(x, y + 0.5, z);
    this.group.visible = false;
    this.group.scale.y = 0.001;

    const stone = new THREE.MeshStandardMaterial({ color: STONE, roughness: 0.85 });
    this.glowMaterial = new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0 });
    this.portalMaterial = new THREE.MeshBasicMaterial({
      color: CYAN,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    // 'along' = the walking direction, 'across' = the width of the arch
    const box = (across, up, alongSize, acrossSize, upSize, material) => {
      const size = this.axis === 'x' ? [alongSize, upSize, acrossSize] : [acrossSize, upSize, alongSize];
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
      mesh.position.set(...(this.axis === 'x' ? [0, up, across] : [across, up, 0]));
      this.group.add(mesh);
      return mesh;
    };

    // Pillars: 2 cubes tall, a little slimmer than a cube so the arch looks like a frame, not a wall
    box(-1, 1.0, 0.8, 0.8, 2, stone);
    box(1, 1.0, 0.8, 0.8, 2, stone);
    // Lintel across the top
    box(0, 2.55, 0.8, 2.8, 0.9, stone);
    // Cyan lines on the inner faces (the doorway is 1.2 wide and 2 tall)
    box(-0.62, 1.0, 0.5, 0.05, 1.9, this.glowMaterial);
    box(0.62, 1.0, 0.5, 0.05, 1.9, this.glowMaterial);
    box(0, 2.07, 0.5, 1.2, 0.05, this.glowMaterial);
    // A thin cyan base line across the doorway on the floor, so the way in is readable from the camera
    box(0, 0.03, 0.5, 1.2, 0.05, this.glowMaterial);

    // The shimmering surface inside the doorway: only when open
    const portal = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.9), this.portalMaterial);
    portal.position.set(0, 1.0, 0);
    if (this.axis === 'x') portal.rotation.y = Math.PI / 2; // faces the walking direction
    this.group.add(portal);

    parent.add(this.group);
  }

  // Flat distance from the doorway's middle, and whether CUBIT is about at the doorway's height
  measure(player) {
    const dx = player.position.x - this.center.x;
    const dz = player.position.z - this.center.z;
    const dy = Math.abs(player.position.y - this.center.y);
    return { flat: Math.hypot(dx, dz), near: dy <= VERTICAL_RANGE };
  }

  // Call every frame. 'complete' = the level is complete (every fragment collected).
  update(delta, elapsed, player, complete) {
    const { flat, near } = this.measure(player);

    if (!this.revealed && near && flat <= REVEAL_DISTANCE) {
      this.revealed = true; // from now on the arch stays out
      this.group.visible = true;
      for (const [cx, cy, cz] of this.solidCells) this.level.addCollision(cx, cy, cz);
      this.solidAdded = true;
    }
    if (!this.revealed) return;

    // Coming out: grows up from the floor, and the cyan lines fade in
    this.riseTime = Math.min(RISE_TIME, this.riseTime + delta);
    const t = this.riseTime / RISE_TIME;
    const eased = 1 - Math.pow(1 - t, 3);
    this.group.scale.y = Math.max(0.001, eased);

    this.active = !!complete;
    const lineLevel = this.active ? 0.95 : 0.3;
    this.glowMaterial.opacity = eased * (lineLevel + (this.active ? Math.sin(elapsed * 3) * 0.05 : 0));
    this.portalMaterial.opacity = this.active ? eased * (0.28 + Math.sin(elapsed * 2.5) * 0.07) : 0;

    // Walking in: only when it is fully out and open
    if (this.active && t >= 1 && near && flat <= ENTER_DISTANCE && !this.entered) {
      this.entered = true;
      this.walkedIn = true;
    }
  }

  // True once, on the frame the arch has just become open (for a message and a sound)
  consumeOpened() {
    if (this.active && this.riseTime >= RISE_TIME && !this.announced) {
      this.announced = true;
      return true;
    }
    return false;
  }

  // True once, when CUBIT walked into the open arch
  consumeEntered() {
    if (this.walkedIn) {
      this.walkedIn = false;
      return true;
    }
    return false;
  }
}
