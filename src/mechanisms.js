import * as THREE from 'three';
import { COLORS } from './constants.js';
import { loadModel } from './level.js';

// Pressure plates and energy doors.
//   - A plate is pressed while CUBIT or its Echo stands on it.
//   - A door is open while EVERY plate linked to it is pressed and EVERY CORE CIRCUIT receiver linked to it is powered.
// A door is two pillars with an orange energy barrier between them while it waits.
// When it opens the barrier fades away and the pillar lights turn cyan.
// A plate is dim blue while it waits and glows cyan while it is pressed.
//
// Level data:
//   plates: [{ cell: [x, y, z], door: 0 }]   cell = the cube the plate sits on, door = index in doors
//   doors:  [{ cells: [[x, y, z], ...] }]     the cells the door fills while it is closed

const FADE_TIME = 0.3; // seconds a door takes to open or close
const HALF = { x: 0.35, y: 0.4, z: 0.35 }; // CUBIT's (and the Echo's) collision box
const EPS = 0.0001;
const ORANGE = new THREE.Color(COLORS.orange);
const CYAN = new THREE.Color(COLORS.cyan);

// PRESSURE PLATE look (model made in Blender, lives in public/models/)
const PLATE_MODEL_URL = '/models/pressure_plate.glb';
const PLATE_SINK = 0.02; // how far the pad sinks when pressed
const GLOW_OFF = 0.55; // brightness of the light strips and the square symbol while waiting
const GLOW_ON = 1.6; // ...and while pressed
const PAD_GLOW = 0.8; // how bright the pad glows while pressed
const BLACK = new THREE.Color(0x000000);

// ENERGY DOOR look. The pillars are a Blender model (public/models/), the barrier is drawn here
// because a door can be 3, 7 or any number of cubes wide.
const DOOR_PILLAR_URL = '/models/core_lock_pillar.glb';
const PILLAR_WIDTH = 0.5; // the model's width: the pillar ends flush with the edge of the floor
const PILLAR_MODEL_HEIGHT = 2.2; // the model is made for doors 2 cubes tall (other heights stretch it)
const BARRIER_MARGIN = 0.05; // the barrier stops this far below the top of the door cells
const FLOOR_GLOW_Y = 0.03; // the glow strip floats just above the floor
const FLOOR_GLOW_CLOSED = 0.55; // brightness of the floor glow while the door is closed...
const FLOOR_GLOW_OPEN = 0.2; // ...and while it is open
const TEXTURE_UNIT = 96; // pixels per grid unit in the barrier picture

// The barrier pictures are drawn once and shared (a door 3 cubes wide always looks the same)
const textureCache = new Map();

function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Returns null when there is no screen (the headless playtest), the door then just has no picture
function makeCanvas(width, height) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width);
  canvas.height = Math.ceil(height);
  return canvas;
}

// White circuit lines on a see-through panel with a bright edge. The door colors it (orange, then cyan).
function barrierTexture(width, height) {
  const key = `barrier ${width.toFixed(2)}x${height.toFixed(2)}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = makeCanvas(width * TEXTURE_UNIT, height * TEXTURE_UNIT);
  let texture = null;
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const rand = seededRandom(Math.round(width * 100));
    const step = TEXTURE_UNIT / 2;

    ctx.fillStyle = 'rgba(255,255,255,0.3)'; // the panel itself
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < Math.round(width * 3); i++) { // faint patches, like plates of energy
      const pw = (0.4 + rand() * 0.8) * TEXTURE_UNIT;
      const ph = (0.3 + rand() * 0.7) * TEXTURE_UNIT;
      ctx.fillStyle = `rgba(255,255,255,${0.06 + rand() * 0.08})`;
      ctx.fillRect(rand() * (w - pw), rand() * (h - ph), pw, ph);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; // circuit lines: straight runs and 45 degree bends
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    for (let i = 0; i < Math.max(3, Math.round(width * 2)); i++) {
      let x = Math.round((rand() * w) / step) * step;
      let y = Math.round((rand() * h) / step) * step;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 4; s++) {
        const kind = Math.floor(rand() * 3);
        const dir = rand() < 0.5 ? -1 : 1;
        const length = (1 + Math.floor(rand() * 2)) * step;
        if (kind === 0) x += dir * length;
        else if (kind === 1) y += dir * length;
        else {
          x += dir * length;
          y += (rand() < 0.5 ? -1 : 1) * length;
        }
        x = Math.min(w - 6, Math.max(6, x));
        y = Math.min(h - 6, Math.max(6, y));
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.95)'; // a small node at the end of the line
      ctx.fillRect(x - 4, y - 4, 8, 8);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; // glowing edge
    ctx.lineWidth = 16;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.strokeStyle = 'rgba(255,255,255,1)';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, w - 6, h - 6);

    texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  textureCache.set(key, texture);
  return texture;
}

// A soft stripe (bright in the middle, fading to the sides) for the glow on the floor
function floorGlowTexture() {
  if (textureCache.has('floor glow')) return textureCache.get('floor glow');
  const canvas = makeCanvas(8, 64);
  let texture = null;
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 64);
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 8, 64);
    texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  textureCache.set('floor glow', texture);
  return texture;
}

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
    this.blend = 0; // 0 = waiting, 1 = pressed

    this.group = new THREE.Group();
    this.group.position.set(cell[0], cell[1] + 0.5, cell[2]); // on top of its cube
    scene.add(this.group);

    // Placeholder flat plate, shown until the Blender model has loaded (and kept if loading fails)
    this.placeholder = new THREE.Mesh(
      new THREE.BoxGeometry(0.86, 0.06, 0.86),
      new THREE.MeshStandardMaterial({ color: COLORS.navy })
    );
    this.placeholder.position.y = 0.03;
    this.group.add(this.placeholder);

    // Parts of the model that change when the plate is pressed (set when the model has loaded)
    this.pad = null;
    this.padRestY = 0;
    this.padMaterial = null;
    this.padOffColor = null;
    this.glowMaterial = null;

    loadModel(PLATE_MODEL_URL)
      .then((source) => this.useModel(source))
      .catch((error) => {
        console.warn('Could not load the pressure plate model, keeping the placeholder.', error);
      });
  }

  // Swaps the placeholder for the real plate (GLB from Blender)
  useModel(source) {
    const model = source.clone(true); // shares geometry, so it is cheap
    const pad = model.getObjectByName('Plate_Pad');
    const strips = model.getObjectByName('Plate_Strips');
    if (!pad || !strips) throw new Error('pressure_plate.glb needs the parts Plate_Pad and Plate_Strips');

    // Every plate gets its own copy of the materials, so each one lights up on its own
    const copies = new Map();
    model.traverse((object) => {
      if (!object.isMesh) return;
      if (!copies.has(object.material)) copies.set(object.material, object.material.clone());
      object.material = copies.get(object.material);
    });

    this.pad = pad;
    this.padRestY = pad.position.y;
    this.padMaterial = pad.material;
    this.padOffColor = pad.material.color.clone();
    this.glowMaterial = strips.material; // the strips and the square symbol share this material

    this.group.remove(this.placeholder);
    this.placeholder.geometry.dispose();
    this.placeholder.material.dispose();
    this.group.add(model);
    this.applyLook();
  }

  // Sets the pad and the glow from this.blend (0 = waiting, 1 = pressed)
  applyLook() {
    const b = this.blend;
    if (!this.pad) {
      this.placeholder.position.y = 0.03 - 0.02 * b;
      return;
    }
    this.pad.position.y = this.padRestY - PLATE_SINK * b; // the pad sinks when pressed
    this.padMaterial.color.copy(this.padOffColor).lerp(CYAN, b);
    this.padMaterial.emissive.copy(BLACK).lerp(CYAN, b);
    this.padMaterial.emissiveIntensity = PAD_GLOW;
    this.glowMaterial.emissive.copy(CYAN);
    this.glowMaterial.emissiveIntensity = GLOW_OFF + (GLOW_ON - GLOW_OFF) * b;
  }

  update(delta, actors) {
    this.pressed = actors.some((actor) => standsOn(actor, this.cell));

    const target = this.pressed ? 1 : 0;
    this.blend += (target - this.blend) * Math.min(1, 12 * delta);
    this.applyLook();
  }
}

class EnergyDoor {
  constructor(scene, level, cells) {
    this.level = level;
    this.cells = cells;
    this.open = false;
    this.amount = 0; // 0 = closed, 1 = fully open (for the fade)

    for (const cell of cells) this.level.addCollision(...cell); // a closed door is solid

    // Work out where the door is and how big, from the cells it fills
    const xs = cells.map((cell) => cell[0]);
    const ys = cells.map((cell) => cell[1]);
    const zs = cells.map((cell) => cell[2]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const alongX = maxX - minX >= maxZ - minZ; // does the door stretch left-right or front-back?
    const width = (alongX ? maxX - minX : maxZ - minZ) + 1;
    const height = maxY - minY + 1;

    // The group's x axis runs along the door, y is up, z is the thickness
    this.group = new THREE.Group();
    this.group.position.set((minX + maxX) / 2, minY - 0.5, (minZ + maxZ) / 2);
    if (!alongX) this.group.rotation.y = Math.PI / 2;
    scene.add(this.group);

    // The energy barrier between the two pillars
    const barrierWidth = width - 2 * PILLAR_WIDTH + 0.04; // tucks a little behind each pillar
    const barrierHeight = height - BARRIER_MARGIN;
    this.barrierMaterial = new THREE.MeshBasicMaterial({
      map: barrierTexture(barrierWidth, barrierHeight),
      color: ORANGE.clone(),
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.barrier = new THREE.Mesh(new THREE.PlaneGeometry(barrierWidth, barrierHeight), this.barrierMaterial);
    this.barrier.position.y = barrierHeight / 2 + 0.02;

    // Soft glow on the floor under the barrier
    this.glowMaterial = new THREE.MeshBasicMaterial({
      map: floorGlowTexture(),
      color: ORANGE.clone(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.floorGlow = new THREE.Mesh(new THREE.PlaneGeometry(barrierWidth + 0.2, 1), this.glowMaterial);
    this.floorGlow.rotation.x = -Math.PI / 2;
    this.floorGlow.position.y = FLOOR_GLOW_Y;
    this.group.add(this.barrier, this.floorGlow);

    // The two pillars (set when the model has loaded; without them the barrier still works)
    this.orangeMaterials = []; // the orange pillar windows, they turn cyan when the door opens
    this.loadPillars(width, height);
    this.applyLook();
  }

  loadPillars(width, height) {
    loadModel(DOOR_PILLAR_URL)
      .then((source) => {
        const copies = new Map(); // both pillars share this door's own materials
        for (const side of [-1, 1]) {
          const pillar = source.clone(true); // shares geometry, so it is cheap
          pillar.traverse((object) => {
            if (!object.isMesh) return;
            if (!copies.has(object.material)) {
              const copy = object.material.clone();
              copies.set(object.material, copy);
              if (copy.name === 'Pillar_Orange') this.orangeMaterials.push(copy);
            }
            object.material = copies.get(object.material);
          });
          pillar.position.x = side * (width / 2 - PILLAR_WIDTH / 2); // flush with the edge of the floor
          pillar.scale.y = height / (PILLAR_MODEL_HEIGHT - 0.2); // 1 for a door 2 cubes tall
          if (side === 1) pillar.rotation.y = Math.PI; // the right pillar faces the other way round
          this.group.add(pillar);
        }
        this.applyLook();
      })
      .catch((error) => {
        console.warn('Could not load the door pillar model, the door has only its barrier.', error);
      });
  }

  // Sets barrier, floor glow and pillar lights from this.amount (0 = closed, 1 = open)
  applyLook() {
    const a = this.amount;
    this.barrier.visible = a < 1;
    this.barrierMaterial.opacity = 1 - a; // the barrier fades away when the door opens
    this.barrierMaterial.color.copy(ORANGE).lerp(CYAN, a);
    this.glowMaterial.color.copy(ORANGE).lerp(CYAN, a);
    this.glowMaterial.opacity = FLOOR_GLOW_CLOSED + (FLOOR_GLOW_OPEN - FLOOR_GLOW_CLOSED) * a;
    for (const material of this.orangeMaterials) material.emissive.copy(ORANGE).lerp(CYAN, a);
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
    this.applyLook();
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
