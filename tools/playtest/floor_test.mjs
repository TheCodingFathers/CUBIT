// Checks for the floor tiles (src/level.js + public/models/floor_tiles_slate.glb). No browser needed.
// Run:  node tools/playtest/floor_test.mjs
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
const meshesOf = (object) => {
  const list = [];
  object.traverse((o) => o.isMesh && list.push(o));
  return list;
};
const triangles = (object) => meshesOf(object).reduce((n, o) => n + (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3, 0);

const { chooseFloorTiles, buildLevel, setFloorColor } = await import(url('src/level.js'));
const { WORLDS } = await import(url('src/worlds.js'));

const readGlb = async (file) => {
  const b = fs.readFileSync(path.join(root, 'public', 'models', file));
  const gltf = await new Promise((resolve, reject) =>
    new GLTFLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '', resolve, reject)
  );
  return { bytes: b.length, scene: gltf.scene };
};
const tiles = await readGlb('floor_tiles_slate.glb');
const baseBlock = await readGlb('base_block.glb');
const corePlatform = await readGlb('core_fragment_platform.glb');

// ---------------------------------------------------------------- the model file
const VARIANTS = ['Plain', 'Strips', 'Chevron', 'Worn', 'Edge', 'Corner', 'Panel'];
const group = (name) => tiles.scene.getObjectByName(`Tile_${name}`);
const partMaterials = (g) => meshesOf(g).map((o) => o.material.name);
check('floor model has all 7 tile variants', VARIANTS.every((v) => !!group(v)), VARIANTS.filter((v) => !group(v)).join());
check('floor model file is small (under 100 KB)', tiles.bytes < 100 * 1024, `${tiles.bytes}`);
check('every variant is light (under 300 triangles)', VARIANTS.every((v) => triangles(group(v)) < 300), VARIANTS.map((v) => `${v}:${triangles(group(v))}`).join(' '));
check('every variant has a slate part and a navy seams part', VARIANTS.every((v) => partMaterials(group(v)).includes('TILE_Slate') && partMaterials(group(v)).includes('TILE_Navy')));
check('every variant except Plain has cyan', VARIANTS.every((v) => partMaterials(group(v)).includes('TILE_Cyan') === (v !== 'Plain')));
check('every tile fills exactly one cell (1 x 1 x 1)', VARIANTS.every((v) => {
  const s = new THREE.Box3().setFromObject(group(v)).getSize(new THREE.Vector3());
  return Math.abs(s.x - 1) < 0.02 && Math.abs(s.z - 1) < 0.02 && s.y > 0.95 && s.y < 1.05;
}));
const cyanBox = (v) => {
  const box = new THREE.Box3();
  meshesOf(group(v)).filter((o) => o.material.name === 'TILE_Cyan').forEach((o) => box.union(new THREE.Box3().setFromObject(o)));
  return box;
};
const edgeLip = cyanBox('Edge');
check('Edge tile: the cyan lip is on its north side (-z)', edgeLip.max.z < -0.38 && edgeLip.min.x < -0.3 && edgeLip.max.x > 0.3, `${edgeLip.min.toArray()} ${edgeLip.max.toArray()}`);
const cornerLip = cyanBox('Corner');
check('Corner tile: the cyan lips are on its north (-z) and east (+x) sides', cornerLip.min.z < -0.4 && cornerLip.max.x > 0.4 && cornerLip.min.x < -0.3 && cornerLip.max.z > 0.3, `${cornerLip.min.toArray()} ${cornerLip.max.toArray()}`);
check('base block and Core platform have a TILE_Blue part to tint', partMaterials(baseBlock.scene).includes('TILE_Blue') && partMaterials(corePlatform.scene).includes('TILE_Blue'));

// ---------------------------------------------------------------- choosing tiles
const key = (x, y, z) => `${x},${y},${z}`;
const SIDES = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // north, east, south, west (x, z)
function floorOf(w, d, y = 0) {
  const cells = [];
  for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) cells.push([x, y, z]);
  return { cells, keys: new Set(cells.map((c) => key(...c))) };
}
const lipDirection = (yaw, local) => new THREE.Vector3(...local).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
const same = (a, b) => a.distanceTo(new THREE.Vector3(b[0], 0, b[1])) < 1e-6;

const f12 = floorOf(12, 12);
const t12 = chooseFloorTiles(f12.cells, f12.keys);
const kinds = (v) => [...t12.values()].filter((t) => t.variant === v).length;
check('every floor cell gets a tile', t12.size === 144);
check('a 12 x 12 platform has 4 corners, 40 edges, 100 inside tiles', kinds('Corner') === 4 && kinds('Edge') === 40 && 144 - kinds('Corner') - kinds('Edge') === 100, `${kinds('Corner')} ${kinds('Edge')}`);
let edgesOk = true;
let cornersOk = true;
for (const [k, tile] of t12) {
  const [x, , z] = k.split(',').map(Number);
  const sides = SIDES.map(([dx, dz], i) => (f12.keys.has(key(x + dx, 0, z + dz)) ? -1 : i)).filter((i) => i >= 0);
  if (tile.variant === 'Edge') edgesOk = edgesOk && sides.length === 1 && same(lipDirection(tile.yaw, [0, 0, -1]), SIDES[sides[0]]);
  if (tile.variant === 'Corner') {
    const lips = [lipDirection(tile.yaw, [0, 0, -1]), lipDirection(tile.yaw, [1, 0, 0])]; // the model's north and east lips
    cornersOk = cornersOk && sides.length === 2 && sides.every((i) => lips.some((l) => same(l, SIDES[i])));
  }
}
check('every Edge tile is turned so its lip is on the open side', edgesOk);
check('every Corner tile is turned so its two lips are on the two open sides', cornersOk);

// a tile with a cube next to it on 3 sides only has a lip on the 4th
const walled = new Set([key(1, 0, 1), key(0, 0, 1), key(2, 0, 1), key(1, 0, 2)]);
const wt = chooseFloorTiles([[1, 0, 1]], walled).get(key(1, 0, 1));
check('a cube next to a tile closes that side (no lip toward a wall)', wt.variant === 'Edge' && same(lipDirection(wt.yaw, [0, 0, -1]), SIDES[0]), JSON.stringify(wt));
// a step: only a cube at the SAME height closes a side
const step = new Set([key(1, 1, 1), key(1, 0, 1), key(0, 0, 1), key(2, 0, 1)]);
const stepTile = chooseFloorTiles([[1, 1, 1]], step).get(key(1, 1, 1));
check('a tile at the edge of a higher step gets a lip', ['Edge', 'Corner'].includes(stepTile.variant), JSON.stringify(stepTile));
const strip = floorOf(5, 1);
check('a platform one tile wide still gets a lip on every tile', [...chooseFloorTiles(strip.cells, strip.keys).values()].every((t) => ['Edge', 'Corner'].includes(t.variant)));

// same input, same answer: no flicker, and the order of the cells does not matter
const f40 = floorOf(40, 40);
const a = chooseFloorTiles(f40.cells, f40.keys);
const b = chooseFloorTiles([...f40.cells].reverse(), f40.keys);
check('the choice is the same every time and for any cell order', [...a].every(([k, t]) => b.get(k)?.variant === t.variant && b.get(k)?.yaw === t.yaw));

const CYAN = new Set(['Strips', 'Chevron', 'Panel']);
let touching = 0;
for (const [k, t] of a) {
  if (!CYAN.has(t.variant)) continue;
  const [x, y, z] = k.split(',').map(Number);
  for (const [dx, dz] of SIDES) if (CYAN.has(a.get(key(x + dx, y, z + dz))?.variant)) touching++;
}
check('no two cyan-strip tiles ever touch', touching === 0, `${touching}`);
const inside = [...a.values()].filter((t) => !['Edge', 'Corner'].includes(t.variant));
const share = (v) => inside.filter((t) => t.variant === v).length / inside.length;
check('Plain is the most common inside tile (40-65%)', share('Plain') > 0.4 && share('Plain') < 0.65, `${share('Plain')}`);
const INSIDE = ['Plain', 'Worn', 'Strips', 'Chevron', 'Panel'];
check('every inside variant shows up on a big floor', INSIDE.every((v) => share(v) > 0.03), INSIDE.map((v) => `${v}:${share(v).toFixed(2)}`).join(' '));
check('inside tiles use all 4 turns', new Set(inside.map((t) => t.yaw)).size === 4);

// ---------------------------------------------------------------- the level, with the real models
const models = {
  '/models/floor_tiles_slate.glb': tiles.scene,
  '/models/base_block.glb': baseBlock.scene,
  '/models/core_fragment_platform.glb': corePlatform.scene,
};
const loader = (u) => Promise.resolve(models[u]);
const data = { boxes: [{ from: [0, 0, 0], to: [9, 1, 9] }], fragments: [[8, 1, 8]] }; // two layers; one Core platform on top
const scene = new THREE.Scene();
const levelGroup = new THREE.Group();
scene.add(levelGroup);
const level = buildLevel(levelGroup, data, loader);
check('before the models load, plain slate cubes stand in', level.meshes.length === 1 && level.placeholderMaterial.color.getHex() === 0x303744);
await level.ready;
const slateMeshes = level.meshes.filter((m) => m.material.name === 'TILE_Slate');
const slateCount = slateMeshes.reduce((n, m) => n + m.count, 0);
const blueMeshes = level.meshes.filter((m) => m.material.name === 'TILE_Blue');
check('every floor cell is drawn with a tile (the Core cell has its own platform)', level.floorTiles.size === 99 && slateCount === 99, `${level.floorTiles.size} ${slateCount}`);
check('base blocks and the Core platform are drawn too', blueMeshes.reduce((n, m) => n + m.count, 0) === 101, `${blueMeshes.reduce((n, m) => n + m.count, 0)}`);
check('few draw calls for the whole floor (under 30)', level.meshes.length < 30, `${level.meshes.length}`);
check('the floor starts with the default slate #303744', slateMeshes.every((m) => m.material.color.getHex() === 0x303744));
check('base blocks and the Core platform use the same slate', blueMeshes.every((m) => m.material.color.getHex() === 0x303744));
check('the original model materials are not changed (SHIFT blocks keep their blue)', meshesOf(baseBlock.scene).every((o) => o.material.color.getHex() !== 0x303744));
const shades = Array.from(slateMeshes[0].instanceColor?.array ?? []);
check('slate tiles differ slightly in shade (within 6%)', shades.length > 0 && Math.max(...shades) <= 1.0601 && Math.min(...shades) >= 0.9399 && Math.max(...shades) - Math.min(...shades) > 0.02, `${Math.min(...shades)}..${Math.max(...shades)}`);
setFloorColor(0x414653);
check('changing the floor color changes tiles, base blocks and the Core platform live', [...slateMeshes, ...blueMeshes].every((m) => m.material.color.getHex() === 0x414653));
const nextGroup = new THREE.Group();
scene.add(nextGroup);
const next = buildLevel(nextGroup, { boxes: [{ from: [0, 0, 0], to: [1, 0, 1] }] }, loader);
check('a level built after the change starts with the new color', next.placeholderMaterial.color.getHex() === 0x414653);
setFloorColor(0x303744);

// when the models fail to load, the plain cubes stay and nothing crashes
const warn = console.warn;
console.warn = () => {};
const failGroup = new THREE.Group();
scene.add(failGroup);
const failing = buildLevel(failGroup, data, () => Promise.reject(new Error('no file')));
await failing.ready;
console.warn = warn;
check('if the models fail to load, the plain cubes stay', failing.meshes.length === 1 && failGroup.children.includes(failing.meshes[0]));

// ---------------------------------------------------------------- the worlds
const w1 = WORLDS[0];
check('World 01 has the floor color from the concept (#303744)', w1.floorColor === 0x303744);
check('World 01 has the 4 floor colors of the concept sheet to compare', w1.floorPresets?.length === 4 && w1.floorPresets[0].color === w1.floorColor && [0x414653, 0x494641, 0x252d3b].every((c) => w1.floorPresets.some((p) => p.color === c)));

console.log(failed ? `\n${failed} FLOOR TEST(S) FAILED` : '\nALL FLOOR TESTS PASSED');
process.exit(failed ? 1 : 0);
