import * as THREE from 'three';
import { COLORS } from './constants.js';

// Pressure plates and energy doors.
//   - A plate is pressed while CUBIT or its Echo stands on it.
//   - A door is open while EVERY plate linked to it is pressed and EVERY CORE CIRCUIT receiver linked to it is powered.
// Orange means "waiting", cyan means "active".
//
// Level data:
//   plates: [{ cell: [x, y, z], door: 0 }]   cell = the cube the plate sits on, door = index in doors
//   doors:  [{ cells: [[x, y, z], ...] }]     the cells the door fills while it is closed

const FADE_TIME = 0.3; // seconds a door takes to open or close
const HALF = { x: 0.35, y: 0.4, z: 0.35 }; // CUBIT's (and the Echo's) collision box
const EPS = 0.0001;
const ORANGE = new THREE.Color(COLORS.orange);
const CYAN = new THREE.Color(COLORS.cyan);

// Is this actor (CUBIT or the Echo) standing on top of the cube at (x, y, z)?
function standsOn(actor, [x, y, z]) {
  const p = actor.position;
  if (Math.abs(p.x - x) > 0.5 || Math.abs(p.z - z) > 0.5) return false;
  const feet = p.y - HALF.y;
  const top = y + 0.5;
  return feet > top - 0.1 && feet < top + 0.25;
}

// Is this actor's box overlapping the grid cell (x, y, z)?
function overlapsCell(actor, [x, y, z]) {
  const p = actor.position;
  return (
    Math.abs(p.x - x) < HALF.x + 0.5 - EPS &&
    Math.abs(p.z - z) < HALF.z + 0.5 - EPS &&
    p.y + HALF.y > y - 0.5 + EPS &&
    p.y - HALF.y < y + 0.5 - EPS
  );
}

class PressurePlate {
  constructor(scene, cell) {
    this.cell = cell;
    this.pressed = false;
    this.blend = 0; // 0 = waiting (orange), 1 = pressed (cyan)

    this.group = new THREE.Group();
    this.group.position.set(cell[0], cell[1] + 0.5, cell[2]); // on top of its cube
    scene.add(this.group);

    this.base = new THREE.Mesh(
      new THREE.BoxGeometry(0.86, 0.06, 0.86),
      new THREE.MeshStandardMaterial({ color: COLORS.navy })
    );
    this.base.position.y = 0.03;
    this.group.add(this.base);

    this.ringMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.orange,
      emissive: COLORS.orange,
      emissiveIntensity: 0.9,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.32, 4, 1, Math.PI / 4), this.ringMaterial);
    ring.rotation.x = -Math.PI / 2; // lay it flat
    ring.position.y = 0.065;
    this.group.add(ring);
  }

  update(delta, actors) {
    this.pressed = actors.some((actor) => standsOn(actor, this.cell));

    const target = this.pressed ? 1 : 0;
    this.blend += (target - this.blend) * Math.min(1, 12 * delta);

    this.ringMaterial.color.copy(ORANGE).lerp(CYAN, this.blend);
    this.ringMaterial.emissive.copy(ORANGE).lerp(CYAN, this.blend);
    this.ringMaterial.emissiveIntensity = 0.9 + 0.7 * this.blend;
    this.base.position.y = 0.03 - 0.02 * this.blend; // the plate sinks a little when pressed
  }
}

class EnergyDoor {
  constructor(scene, level, cells) {
    this.level = level;
    this.cells = cells;
    this.open = false;
    this.amount = 0; // 0 = closed, 1 = fully open (for the fade)

    this.group = new THREE.Group();
    scene.add(this.group);

    this.panelMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.orange,
      emissive: COLORS.orange,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    this.lineMaterial = new THREE.LineBasicMaterial({ color: COLORS.orange, transparent: true, opacity: 0.9 });

    const cellBox = new THREE.BoxGeometry(0.96, 0.96, 0.96);
    const cellEdges = new THREE.EdgesGeometry(cellBox);
    for (const cell of cells) {
      this.level.addCollision(...cell); // a closed door is solid
      const panel = new THREE.Mesh(cellBox, this.panelMaterial);
      panel.position.set(...cell);
      panel.add(new THREE.LineSegments(cellEdges, this.lineMaterial));
      this.group.add(panel);
    }
  }

  update(delta, actors, shouldOpen) {
    if (shouldOpen && !this.open) {
      this.open = true;
      for (const cell of this.cells) this.level.removeCollision(...cell);
    } else if (!shouldOpen && this.open) {
      // Never close on top of someone standing in the doorway
      const blocked = this.cells.some((cell) => actors.some((actor) => overlapsCell(actor, cell)));
      if (!blocked) {
        this.open = false;
        for (const cell of this.cells) this.level.addCollision(...cell);
      }
    }

    const target = this.open ? 1 : 0;
    const step = delta / FADE_TIME;
    this.amount = target > this.amount ? Math.min(target, this.amount + step) : Math.max(target, this.amount - step);

    this.panelMaterial.opacity = 0.4 * (1 - this.amount);
    this.panelMaterial.color.copy(ORANGE).lerp(CYAN, this.amount);
    this.panelMaterial.emissive.copy(ORANGE).lerp(CYAN, this.amount);
    this.lineMaterial.color.copy(ORANGE).lerp(CYAN, this.amount);
    this.lineMaterial.opacity = 0.9 - 0.78 * this.amount; // only a faint frame is left when open
  }
}

// Builds the plates and doors of a level from its data, and keeps them up to date
export class MechanismManager {
  constructor(scene, level, data) {
    this.doors = (data.doors ?? []).map((door) => new EnergyDoor(scene, level, door.cells));
    this.plates = (data.plates ?? []).map((plate) => ({
      plate: new PressurePlate(scene, plate.cell),
      door: plate.door,
    }));
  }

  // actors = everything that can press a plate (CUBIT and the Echo)
  update(delta, elapsed, actors, receivers = []) {
    for (const { plate } of this.plates) plate.update(delta, actors);

    this.doors.forEach((door, index) => {
      const linked = this.plates.filter((entry) => entry.door === index);
      const linkedReceivers = receivers.filter((receiver) => receiver.door === index);
      const shouldOpen =
        linked.length + linkedReceivers.length > 0 &&
        linked.every((entry) => entry.plate.pressed) &&
        linkedReceivers.every((receiver) => receiver.powered);
      door.update(delta, actors, shouldOpen);
    });
  }
}
