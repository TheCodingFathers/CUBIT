import * as THREE from 'three';
import { COLORS } from './constants.js';

// CORE CIRCUIT: energy beams, mirrors and receivers.
//
//   Source    shoots a beam in a straight line along the floor grid (east, west, north or south)
//   Mirror    a diagonal panel. The beam bounces off it and turns 90 degrees.
//             ROTATE (R) flips the mirror, so the beam turns the other way.
//   Receiver  lights up when a beam reaches it, and opens the door linked to it
//
// Anything solid in the way stops the beam: cubes, blocks (SHIFT can move them), closed doors.
// There is no simulation: every frame the beam is simply followed cell by cell on the grid.
//
// Level data:
//   circuit: {
//     sources:    [{ cell: [x, y, z], dir: [dx, dz] }]   dir = which way it shoots, [1, 0] = east (+x)
//     reflectors: [{ cell: [x, y, z], state: 0 }]        state 0 turns an eastward beam south (+z), state 1 north (-z)
//     receivers:  [{ cell: [x, y, z], door: 0 }]         door = index in the level's doors list
//   }
// The cells of one beam must all be at the same height (y). They sit on the floor, one cube up.

const MAX_STEPS = 18; // a beam never travels farther than this many cells
const TURN_TIME = 0.35; // seconds a mirror takes to turn
const CORE_THICKNESS = 0.1;
const HALO_THICKNESS = 0.26;
const ORANGE = new THREE.Color(COLORS.orange);
const CYAN = new THREE.Color(COLORS.cyan);

const cellKey = (x, y, z) => `${x},${y},${z}`;

// How a mirror in each state turns a beam travelling in direction d = [dx, dz]
const reflectDirection = (d, state) => (state === 0 ? [d[1], d[0]] : [-d[1], -d[0]]);
// The panel's angle around the vertical axis in each state (they are 90 degrees apart)
const mirrorAngle = (state) => (state === 0 ? -Math.PI / 4 : Math.PI / 4);

// ---------------------------------------------------------------- Source
class EnergySource {
  constructor(scene, level, { cell, dir }) {
    this.cell = cell;
    this.dir = dir;
    level.addCollision(...cell); // CUBIT cannot walk through it

    this.group = new THREE.Group();
    this.group.position.set(...cell);
    scene.add(this.group);

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.9, 0.9),
      new THREE.MeshStandardMaterial({ color: COLORS.blue })
    );
    this.group.add(body);

    // Glowing orange nozzle on the side the beam leaves from (orange = core energy)
    const alongX = dir[0] !== 0;
    const nozzle = new THREE.Mesh(
      new THREE.BoxGeometry(alongX ? 0.16 : 0.42, 0.42, alongX ? 0.42 : 0.16),
      new THREE.MeshStandardMaterial({ color: COLORS.orange, emissive: COLORS.orange, emissiveIntensity: 1.4 })
    );
    nozzle.position.set(dir[0] * 0.46, 0, dir[1] * 0.46);
    this.group.add(nozzle);
  }
}

// ---------------------------------------------------------------- Mirror (rotatable)
class Reflector {
  constructor(scene, level, { cell, state = 0 }) {
    this.kind = 'rotate'; // CUBIT turns it with ROTATE, like any other rotatable thing
    this.cell = cell;
    this.startState = state;
    this.state = state;
    this.moving = false;
    this.t = 0;
    this.fromAngle = 0;
    this.toAngle = 0;
    this.center = new THREE.Vector3(...cell);
    level.addCollision(...cell);

    this.group = new THREE.Group();
    this.group.position.set(...cell);
    scene.add(this.group);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.2, 0.9),
      new THREE.MeshStandardMaterial({ color: COLORS.blue })
    );
    base.position.y = -0.4;
    this.group.add(base);

    const panelGeometry = new THREE.BoxGeometry(0.95, 0.9, 0.06);
    this.panel = new THREE.Mesh(
      panelGeometry,
      new THREE.MeshStandardMaterial({
        color: COLORS.cyan,
        emissive: COLORS.cyan,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 0.55,
      })
    );
    this.panel.position.y = 0.05;
    this.panel.add(new THREE.LineSegments(new THREE.EdgesGeometry(panelGeometry), new THREE.LineBasicMaterial({ color: COLORS.cyan })));
    this.group.add(this.panel);

    // Ghost outline: where the mirror will be after the next ROTATE
    this.ghost = new THREE.LineSegments(
      new THREE.EdgesGeometry(panelGeometry),
      new THREE.LineBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.4 })
    );
    this.ghost.position.y = 0.05;
    this.group.add(this.ghost);

    this.applyState();
  }

  applyState() {
    this.panel.rotation.y = mirrorAngle(this.state);
    this.ghost.rotation.y = mirrorAngle(1 - this.state);
  }

  reflect(direction) {
    return reflectDirection(direction, this.state);
  }

  distanceTo(point) {
    return this.center.distanceTo(point);
  }

  canActivate() {
    return !this.moving;
  }

  activate() {
    this.fromAngle = mirrorAngle(this.state);
    this.state = 1 - this.state;
    this.toAngle = mirrorAngle(this.state);
    this.t = 0;
    this.moving = true;
    this.ghost.rotation.y = mirrorAngle(1 - this.state);
  }

  update(delta) {
    if (!this.moving) return;
    this.t = Math.min(1, this.t + delta / TURN_TIME);
    const eased = this.t * this.t * (3 - 2 * this.t);
    this.panel.rotation.y = THREE.MathUtils.lerp(this.fromAngle, this.toAngle, eased);
    if (this.t >= 1) this.moving = false;
  }

  reset() {
    this.state = this.startState;
    this.moving = false;
    this.t = 0;
    this.applyState();
  }
}

// ---------------------------------------------------------------- Receiver
class EnergyReceiver {
  constructor(scene, level, { cell, door }) {
    this.cell = cell;
    this.door = door;
    this.powered = false;
    this.blend = 0; // 0 = waiting (orange), 1 = powered (cyan)
    level.addCollision(...cell);

    this.group = new THREE.Group();
    this.group.position.set(...cell);
    scene.add(this.group);

    const bodyGeometry = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const body = new THREE.Mesh(bodyGeometry, new THREE.MeshStandardMaterial({ color: COLORS.navy }));
    this.group.add(body);

    this.edgeMaterial = new THREE.LineBasicMaterial({ color: COLORS.orange });
    body.add(new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeometry), this.edgeMaterial));

    // A glowing pad on each side: orange while it waits for energy, cyan when it has it
    this.padMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.orange,
      emissive: COLORS.orange,
      emissiveIntensity: 0.9,
    });
    for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(sx ? 0.06 : 0.46, 0.46, sx ? 0.46 : 0.06),
        this.padMaterial
      );
      pad.position.set(sx * 0.46, 0, sz * 0.46);
      this.group.add(pad);
    }
  }

  update(delta) {
    const target = this.powered ? 1 : 0;
    this.blend += (target - this.blend) * Math.min(1, 12 * delta);
    this.padMaterial.color.copy(ORANGE).lerp(CYAN, this.blend);
    this.padMaterial.emissive.copy(ORANGE).lerp(CYAN, this.blend);
    this.padMaterial.emissiveIntensity = 0.9 + 1.0 * this.blend;
    this.edgeMaterial.color.copy(ORANGE).lerp(CYAN, this.blend);
  }
}

// ---------------------------------------------------------------- The whole circuit of a level
export class CircuitManager {
  constructor(scene, level, data) {
    const circuit = data.circuit ?? {};
    this.level = level;

    this.sources = (circuit.sources ?? []).map((s) => new EnergySource(scene, level, s));
    this.reflectors = (circuit.reflectors ?? []).map((r) => new Reflector(scene, level, r));
    this.receivers = (circuit.receivers ?? []).map((r) => new EnergyReceiver(scene, level, r));

    this.reflectorAt = new Map(this.reflectors.map((r) => [cellKey(...r.cell), r]));
    this.receiverAt = new Map(this.receivers.map((r) => [cellKey(...r.cell), r]));

    // Beams are drawn as thin glowing boxes. They are rebuilt only when the beam path changes.
    this.beamGroup = new THREE.Group();
    scene.add(this.beamGroup);
    this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.coreMaterial = new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.95 });
    this.haloMaterial = new THREE.MeshBasicMaterial({
      color: COLORS.cyan,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.signature = '';
  }

  // Follows every beam cell by cell. Returns its straight pieces [y, x0, z0, x1, z1]
  // and the set of receivers that a beam reaches.
  trace() {
    const segments = [];
    const powered = new Set();

    for (const source of this.sources) {
      const y = source.cell[1];
      let d = source.dir;
      let cx = source.cell[0];
      let cz = source.cell[2];
      let start = [cx + d[0] * 0.5, cz + d[1] * 0.5]; // leaves through the face of the source
      let ended = false;

      for (let step = 0; step < MAX_STEPS && !ended; step++) {
        cx += d[0];
        cz += d[1];
        const faceX = cx - d[0] * 0.5; // the near face of this cell
        const faceZ = cz - d[1] * 0.5;
        const key = cellKey(cx, y, cz);

        const reflector = this.reflectorAt.get(key);
        if (reflector) {
          if (reflector.moving) {
            // the beam is cut while the mirror turns
            segments.push([y, start[0], start[1], faceX, faceZ]);
            ended = true;
          } else {
            segments.push([y, start[0], start[1], cx, cz]);
            d = reflector.reflect(d);
            start = [cx, cz];
          }
          continue;
        }

        const receiver = this.receiverAt.get(key);
        if (receiver) {
          segments.push([y, start[0], start[1], faceX, faceZ]);
          powered.add(receiver);
          ended = true;
        } else if (this.level.isSolid(cx, y, cz)) {
          segments.push([y, start[0], start[1], faceX, faceZ]);
          ended = true;
        } else if (step === MAX_STEPS - 1) {
          segments.push([y, start[0], start[1], cx, cz]);
          ended = true;
        }
      }
    }
    return { segments, powered };
  }

  rebuildBeams(segments) {
    this.beamGroup.clear();
    for (const [y, x0, z0, x1, z1] of segments) {
      const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
      const length = (alongX ? Math.abs(x1 - x0) : Math.abs(z1 - z0)) + CORE_THICKNESS; // a little extra fills the corners
      for (const [thickness, material] of [
        [CORE_THICKNESS, this.coreMaterial],
        [HALO_THICKNESS, this.haloMaterial],
      ]) {
        const mesh = new THREE.Mesh(this.boxGeometry, material);
        const long = length + (thickness - CORE_THICKNESS);
        mesh.scale.set(alongX ? long : thickness, thickness, alongX ? thickness : long);
        mesh.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
        this.beamGroup.add(mesh);
      }
    }
  }

  // Returns [{ door, powered }] for the mechanisms, so receivers can open doors
  update(delta, elapsed) {
    const { segments, powered } = this.trace();

    const signature = segments.map((s) => s.join(',')).join('|');
    if (signature !== this.signature) {
      this.signature = signature;
      this.rebuildBeams(segments);
    }
    this.haloMaterial.opacity = 0.16 + 0.06 * Math.sin(elapsed * 8);

    for (const receiver of this.receivers) {
      receiver.powered = powered.has(receiver);
      receiver.update(delta);
    }
    return this.receivers.map((r) => ({ door: r.door, powered: r.powered }));
  }
}
