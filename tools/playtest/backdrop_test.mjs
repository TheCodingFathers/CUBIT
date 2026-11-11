// Checks for the backdrop (src/background.js). No browser needed.  Run:  node tools/playtest/backdrop_test.mjs
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const root = path.resolve(import.meta.dirname, '..', '..');
const url = (p) => pathToFileURL(path.join(root, p)).href;
let failed = 0;
const check = (name, ok, extra = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '   ' + extra}`);
};
const triangles = (object) => {
  let n = 0;
  object.traverse((o) => {
    if (o.isMesh) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
  });
  return n;
};
const drawCalls = (object) => {
  let n = 0;
  object.traverse((o) => (o.isMesh || o.isPoints) && n++);
  return n;
};

const { createBackdrop } = await import(url('src/background.js'));
const { WORLDS } = await import(url('src/worlds.js'));

// the real exported model, read straight from disk
const glbPath = path.join(root, 'public', 'models', 'w01_monolith.glb');
const bytes = fs.readFileSync(glbPath);
const gltf = await new Promise((resolve, reject) =>
  new GLTFLoader().parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '', resolve, reject)
);
let loads = 0;
const loader = (u) => { loads++; return Promise.resolve(gltf.scene); };

const backdrop = createBackdrop(0x0a1230, loader);
check('backdrop has its own scene and camera', backdrop.scene.isScene && backdrop.camera.isPerspectiveCamera);
check('model file is small (under 100 KB)', bytes.length < 100 * 1024, `${bytes.length}`);
check('monolith model is light (under 1500 triangles)', triangles(gltf.scene) > 0 && triangles(gltf.scene) < 1500, `${triangles(gltf.scene)}`);
check('model has the parts the code needs', ['Monolith_RingA', 'Monolith_RingB', 'Monolith_Crystal', 'Monolith_Body', 'Monolith_Lights'].every((n) => gltf.scene.getObjectByName(n)));
check('World 01 has backdrop and monolith data', WORLDS[0].backdrop?.sky && WORLDS[0].backdrop.specks > 0 && WORLDS[0].backdrop.monolith?.model === '/models/w01_monolith.glb');
check('model path in worlds.js points at a real file', fs.existsSync(path.join(root, 'public', WORLDS[0].backdrop.monolith.model)));

backdrop.setWorld(WORLDS[0]);
await new Promise((r) => setTimeout(r, 20)); // the model "loads" in the next tick
const sky = backdrop.scene.children.find((o) => o.isMesh && o.geometry.type === 'SphereGeometry');
const specks = backdrop.scene.children.find((o) => o.isPoints);
check('World 01 shows sky, specks and monolith', sky.visible && specks.visible && backdrop.monolith.visible && backdrop.monolith.children.length === 1);
check('monolith loaded once only', loads === 1);
backdrop.setWorld(WORLDS[0]);
await new Promise((r) => setTimeout(r, 20));
check('switching back to the same world does not load it again', loads === 1 && backdrop.monolith.children.length === 1);

const all = triangles(backdrop.scene);
check('whole backdrop is light (under 3000 triangles)', all < 3000, `${all}`);
check('few draw calls (under 12)', drawCalls(backdrop.scene) < 12, `${drawCalls(backdrop.scene)}`);
check('backdrop never writes depth for sky and specks', [sky, specks].every((m) => m.material.depthWrite === false));
check('only two lights in the backdrop scene', backdrop.scene.children.filter((o) => o.isLight).length === 2);

const colors = sky.geometry.attributes.color;
let lo = Infinity, hi = -Infinity;
for (let i = 0; i < colors.count; i++) { const b = colors.getZ(i); lo = Math.min(lo, b); hi = Math.max(hi, b); }
check('sky has a real gradient (dark to lighter)', hi > lo * 1.5, `${lo} ${hi}`);
check('flat background color follows the world', backdrop.scene.background.getHex() === WORLDS[0].background);

// where does the monolith land on screen? use the game's real camera angle (CAMERA_OFFSET 6,7,8 around the player)
const game = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 100);
game.position.set(6, 7, 8);
game.lookAt(0, 0.3, 0);
game.updateMatrixWorld();
backdrop.update(game, 0);
backdrop.camera.updateMatrixWorld();
backdrop.scene.updateMatrixWorld(true);
const box = new THREE.Box3().setFromObject(backdrop.monolith);
const corners = [];
for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
  corners.push(new THREE.Vector3(x, y, z).project(backdrop.camera));
}
const xs = corners.map((c) => c.x), ys = corners.map((c) => c.y);
const mid = box.getCenter(new THREE.Vector3()).project(backdrop.camera);
console.log(`      screen position (-1..1): center x ${mid.x.toFixed(2)}, y ${mid.y.toFixed(2)}; spans x ${Math.min(...xs).toFixed(2)}..${Math.max(...xs).toFixed(2)}, y ${Math.min(...ys).toFixed(2)}..${Math.max(...ys).toFixed(2)}`);
check('monolith is in front of the camera', corners.every((c) => c.z < 1));
check('monolith is centered left to right', Math.abs(mid.x) < 0.25, `${mid.x}`);
check('monolith is fully on screen', Math.min(...xs) > -1 && Math.max(...xs) < 1 && Math.min(...ys) > -0.9 && Math.max(...ys) < 0.95, `${Math.min(...ys)}..${Math.max(...ys)}`);
check('monolith stays in the upper part of the view (not behind the player)', Math.min(...ys) > -0.35, `${Math.min(...ys)}`);

// motion: the rings turn, the crystal pulses
const ringA = backdrop.monolith.getObjectByName('Monolith_RingA');
const ringB = backdrop.monolith.getObjectByName('Monolith_RingB');
const crystal = backdrop.monolith.getObjectByName('Monolith_Crystal');
const a0 = ringA.rotation.y, b0 = ringB.rotation.y;
for (let t = 0.05; t <= 1; t += 0.05) backdrop.update(game, t);
check('rings turn in opposite directions', ringA.rotation.y > a0 && ringB.rotation.y < b0);
let crystalMaterial = null;
crystal.traverse((o) => o.isMesh && (crystalMaterial = o.material));
const gltfCrystal = gltf.scene.getObjectByName('Monolith_Crystal');
let sharedMaterial = null;
gltfCrystal.traverse((o) => o.isMesh && (sharedMaterial = o.material));
check('crystal pulse uses its own material copy', crystalMaterial && sharedMaterial && crystalMaterial !== sharedMaterial);
backdrop.update(game, 1.1);
const e1 = crystalMaterial.emissiveIntensity;
backdrop.update(game, 1.1 + Math.PI / 1.8);
const e2 = crystalMaterial.emissiveIntensity;
check('crystal glow changes over time', Math.abs(e1 - e2) > 0.05, `${e1} ${e2}`);

// a world without backdrop data falls back to its flat color and hides everything
backdrop.setWorld(WORLDS[1]);
check('a world without backdrop data hides sky, specks and monolith', !sky.visible && !specks.visible && !backdrop.monolith.visible && backdrop.scene.background.getHex() === WORLDS[1].background);
backdrop.setWorld(WORLDS[0]);
check('going back to World 01 shows the monolith again', backdrop.monolith.visible);

// failing to load must not crash
const broken = createBackdrop(0x0a1230, () => Promise.reject(new Error('no file')));
const warn = console.warn; console.warn = () => {};
broken.setWorld(WORLDS[0]);
await new Promise((r) => setTimeout(r, 20));
console.warn = warn;
check('a missing model file does not crash and leaves the monolith hidden', !broken.monolith.visible);

const main = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 100);
main.aspect = 4 / 3;
backdrop.update(main, 2);
check('backdrop camera follows window shape changes', backdrop.camera.aspect === 4 / 3);

console.log(failed === 0 ? '\nALL BACKDROP TESTS PASSED' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
