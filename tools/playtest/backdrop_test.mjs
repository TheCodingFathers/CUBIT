// Checks for the backdrop (src/background.js). No browser needed.  Run:  node tools/playtest/backdrop_test.mjs
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import * as THREE from 'three';

const root = path.resolve(import.meta.dirname, '..', '..');
const url = (p) => pathToFileURL(path.join(root, p)).href;
let failed = 0;
const check = (name, ok, extra = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '   ' + extra}`);
};

const { createBackdrop } = await import(url('src/background.js'));
const { WORLDS } = await import(url('src/worlds.js'));

const backdrop = createBackdrop(0x0a1230);
const meshes = [];
backdrop.scene.traverse((o) => (o.isMesh || o.isPoints) && meshes.push(o));
check('backdrop has its own scene and camera', backdrop.scene.isScene && backdrop.camera.isPerspectiveCamera);
check('only a few draw calls (sky + specks)', meshes.length === 2, `got ${meshes.length}`);
const triangles = meshes.filter((m) => m.isMesh).reduce((s, m) => s + m.geometry.index.count / 3, 0);
check('sky dome is light (under 1000 triangles)', triangles > 0 && triangles < 1000, `got ${triangles}`);
check('nothing in the backdrop casts or needs lights', meshes.every((m) => m.material.isMeshBasicMaterial || m.material.isPointsMaterial));
check('backdrop never writes depth (the level always draws over it)', meshes.every((m) => m.material.depthWrite === false));
check('World 01 has backdrop data', WORLDS[0].backdrop?.sky && WORLDS[0].backdrop.specks > 0);

backdrop.setWorld(WORLDS[0]);
const sky = meshes.find((m) => m.isMesh);
const specks = meshes.find((m) => m.isPoints);
check('World 01 shows sky and specks', sky.visible && specks.visible);
const colors = sky.geometry.attributes.color;
let lo = Infinity, hi = -Infinity;
for (let i = 0; i < colors.count; i++) { const b = colors.getZ(i); lo = Math.min(lo, b); hi = Math.max(hi, b); }
check('sky has a real gradient (dark to lighter)', hi > lo * 1.5, `${lo} ${hi}`);
const posY = sky.geometry.attributes.position;
let bottom = 0, topIndex = 0;
for (let i = 0; i < posY.count; i++) { if (posY.getY(i) < posY.getY(bottom)) bottom = i; if (posY.getY(i) > posY.getY(topIndex)) topIndex = i; }
check('far below is lighter than the horizon side', colors.getZ(bottom) > colors.getZ(topIndex));
check('specks draw range follows the world setting', specks.geometry.drawRange.count === WORLDS[0].backdrop.specks);
check('flat background color follows the world', backdrop.scene.background.getHex() === WORLDS[0].background);

backdrop.setWorld(WORLDS[1]);
check('a world without backdrop data falls back to its flat color', !sky.visible && !specks.visible && backdrop.scene.background.getHex() === WORLDS[1].background);
backdrop.setWorld(WORLDS[0]);

const main = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 100);
main.position.set(20, 8, -30);
main.lookAt(0, 0, -40);
main.updateMatrixWorld();
backdrop.update(main, 1);
check('backdrop camera copies the game camera view', backdrop.camera.quaternion.angleTo(main.quaternion) < 1e-6);
check('backdrop moves much less than the game camera (far away)', backdrop.camera.position.length() < main.position.length() * 0.2);
main.aspect = 4 / 3;
backdrop.update(main, 2);
check('backdrop camera follows window shape changes', backdrop.camera.aspect === 4 / 3);

console.log(failed === 0 ? '\nALL BACKDROP TESTS PASSED' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
