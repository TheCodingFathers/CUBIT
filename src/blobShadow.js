import * as THREE from 'three';

// A soft round shadow under CUBIT. It lands on the first solid cube below him (below = the way
// gravity pulls), shrinks and fades the higher he floats. It is a flat disc, so it costs almost nothing.
// It helps you judge jumps and edges, because the camera looks down at the cubes from an angle.

const MAX_SCAN = 14; // how many cubes below CUBIT it looks
const SAMPLE = 0.3; // it checks the middle and four points around, so a half-supported CUBIT still has a shadow
const INSET = 0.03; // the visible top of a cube sits a little below its grid face
const LIFT = 0.012; // keeps the disc just above the surface so it never flickers
const SIZE_NEAR = 0.9; // diameter when CUBIT is on the ground
const SIZE_FAR = 0.5; // diameter when he is high up
const FADE_DISTANCE = 5; // how far down the shadow takes to reach its smallest and faintest
const OPACITY_NEAR = 0.55;
const OPACITY_FAR = 0.15;
const CONTACT = 0.4; // distance from CUBIT's center to the ground when he stands on it

const AXES = ['x', 'y', 'z'];
const FRONT = new THREE.Vector3(0, 0, 1);

// A soft black blob: opaque in the middle, fading to nothing at the edge
function makeBlobTexture() {
  if (typeof document === 'undefined') return null; // no browser (headless tests)
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
  gradient.addColorStop(0.55, 'rgba(0, 0, 0, 0.7)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

export class BlobShadow {
  constructor(scene) {
    this.material = new THREE.MeshBasicMaterial({
      map: makeBlobTexture(),
      color: 0x000000,
      transparent: true,
      opacity: OPACITY_NEAR,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.material);
    this.mesh.visible = false;
    this.mesh.renderOrder = 1; // drawn after the floor
    scene.add(this.mesh);
    this.up = new THREE.Vector3();
  }

  // Call once per frame after CUBIT has moved. 'level' needs isSolid(x, y, z).
  update(player, level) {
    if (!level) {
      this.mesh.visible = false;
      return;
    }

    const axis = player.gAxis ?? 'y';
    const s = player.gravity[axis] > 0 ? 1 : -1; // +1 = gravity pulls toward +axis, -1 toward -axis
    const [a, b] = AXES.filter((name) => name !== axis); // the two sideways axes
    const p = player.position;

    // Find the nearest solid cube below, checking the middle and four points around CUBIT
    let bestK = null;
    let bestDistance = Infinity;
    for (const [da, db] of [[0, 0], [SAMPLE, 0], [-SAMPLE, 0], [0, SAMPLE], [0, -SAMPLE]]) {
      const start = Math.round(p[axis]);
      for (let i = 0; i <= MAX_SCAN; i++) {
        const k = start + s * i;
        const cell = { x: 0, y: 0, z: 0 };
        cell[axis] = k;
        cell[a] = Math.round(p[a] + da);
        cell[b] = Math.round(p[b] + db);
        if (!level.isSolid(cell.x, cell.y, cell.z)) continue;
        const surface = k - 0.5 * s; // the face of that cube that looks at CUBIT
        const distance = (surface - p[axis]) * s;
        if (distance >= -0.2 && distance < bestDistance) {
          bestDistance = distance;
          bestK = k;
        }
        break; // nothing below this cube matters for this sample point
      }
    }

    if (bestK === null) {
      this.mesh.visible = false;
      return;
    }

    // Place the disc on that surface, directly under CUBIT, lying flat on it
    this.mesh.position.copy(p);
    this.mesh.position[axis] = bestK - 0.5 * s + s * INSET - s * LIFT;
    this.up.copy(player.gravity).negate();
    this.mesh.quaternion.setFromUnitVectors(FRONT, this.up);

    // The higher CUBIT is, the smaller and fainter it gets
    const t = Math.min(1, Math.max(0, (bestDistance - CONTACT) / FADE_DISTANCE));
    const size = SIZE_NEAR + (SIZE_FAR - SIZE_NEAR) * t;
    this.mesh.scale.set(size, size, 1);
    this.material.opacity = OPACITY_NEAR + (OPACITY_FAR - OPACITY_NEAR) * t;
    this.mesh.visible = true;
  }
}
