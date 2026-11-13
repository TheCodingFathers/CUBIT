// Checks for the teleport arch (src/teleportArch.js, ARCHES in src/worlds.js, and how LevelManager uses them).
// Runs the real game code without a browser. Run:  node tools/playtest/arch_test.mjs
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

process.on('unhandledRejection', () => {});
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = path.join(ROOT, 'src');

// ---- pretend to be a browser (same as run.mjs) ----
globalThis.window = { addEventListener() {}, innerWidth: 800, innerHeight: 600 };
globalThis.self = globalThis;
globalThis.Request = class { constructor(url) { this.url = url; } };
globalThis.fetch = async () => { throw new Error('offline'); };
console.warn = () => {};

const imp = (file) => import(pathToFileURL(path.join(SRC, file)).href);
const THREE = await import(pathToFileURL(path.join(ROOT, 'node_modules', 'three', 'build', 'three.module.js')).href);
const { Player } = await imp('player.js');
const { LevelManager } = await imp('levelManager.js');
const { LEVELS } = await imp('levels/index.js');
const { ARCHES, WORLDS } = await imp('worlds.js');

let failed = 0;
const check = (name, ok, extra = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '   ' + extra}`);
};
const indexOf = (name) => LEVELS.findIndex((level) => level.name === name);
const DT = 1 / 60;

// ---------------------------------------------------------------- the data
const names = Object.keys(ARCHES);
check('there is at least one arch', names.length >= 1);
check('every arch names an existing level', names.every((n) => indexOf(n) >= 0), names.filter((n) => indexOf(n) < 0).join());
check('every arch leads to an existing, different level', names.every((n) => indexOf(ARCHES[n].to) >= 0 && ARCHES[n].to !== n));
check('every arch has a cell and a walking direction (x or z)', names.every((n) => ARCHES[n].cell?.length === 3 && ['x', 'z'].includes(ARCHES[n].axis)));
check('the playtest area (levels 1 to 3) ends with an arch on level 3', ARCHES['Turn the World'] && !ARCHES['First Steps'] && !ARCHES['A Place to Stand']);
const world1 = WORLDS[0].levels;
check('the arch level is in World 01 and so is its destination', names.every((n) => world1.includes(indexOf(n)) && world1.includes(indexOf(ARCHES[n].to))));

// ---------------------------------------------------------------- the arch on its level
const scene = new THREE.Scene();
const player = new Player(scene);
const levels = new LevelManager(scene, player, LEVELS, ARCHES);
const archLevel = indexOf('Turn the World');
levels.load(archLevel);
const arch = levels.arch;
const spec = ARCHES['Turn the World'];
const [cx, cy, cz] = spec.cell;
check('the level manager builds the arch for its level', !!arch && arch.destination === spec.to);
check('other levels have no arch', (levels.load(indexOf('First Steps')), levels.arch === null));
levels.load(archLevel);
const arch2 = levels.arch;

const solid = (x, y, z) => levels.level.isSolid(x, y, z);
check('the arch stands on solid floor (the floor cube and both sides)', solid(cx, cy, cz) && solid(cx, cy, cz - 1) && solid(cx, cy, cz + 1));
check('the doorway is free (2 cubes tall)', !solid(cx, cy + 1, cz) && !solid(cx, cy + 2, cz));
check('before it comes out, the arch is invisible and has no collision', !arch2.group.visible && arch2.solidCells.every(([x, y, z]) => !solid(x, y, z)));
check('the arch has 7 solid cells (2 pillars x 2, 3 lintel) and none inside the doorway', arch2.solidCells.length === 7 && arch2.solidCells.every(([x, y, z]) => !(x === cx && z === cz && y <= cy + 2)));

// the player far away (the start): nothing happens
player.position.set(0, 1.5, 2);
for (let i = 0; i < 30; i++) levels.update(DT, i * DT);
check('far away, the arch stays hidden', !arch2.revealed && !arch2.group.visible);

// CUBIT high above the arch: not "near" even if the flat distance is small
player.position.set(cx + 3, cy + 12, cz);
levels.update(DT, 1);
check('far above or below, the arch stays hidden', !arch2.revealed);

// CUBIT walks near: it comes out
player.position.set(cx + 5, cy + 1.5, cz);
levels.update(DT, 1);
check('going near reveals the arch', arch2.revealed && arch2.group.visible);
check('once out, the pillars and the lintel are solid', arch2.solidCells.every(([x, y, z]) => solid(x, y, z)));
check('the doorway stays free after it comes out', !solid(cx, cy + 1, cz) && !solid(cx, cy + 2, cz));
check('it starts to rise from the floor, not all at once', arch2.group.scale.y < 0.5);
for (let i = 0; i < 90; i++) levels.update(DT, 1 + i * DT);
check('after a moment it is fully out', Math.abs(arch2.group.scale.y - 1) < 0.01);
player.position.set(cx + 20, cy + 1.5, cz + 20);
levels.update(DT, 3);
check('it stays out when CUBIT walks away', arch2.revealed && arch2.group.visible);

// closed until the level is complete
check('the level is not complete yet', !levels.complete);
player.position.set(cx, cy + 1.5, cz);
levels.update(DT, 4);
check('closed arch: standing in the doorway does nothing, no portal', !arch2.active && !arch2.consumeEntered() && arch2.portalMaterial.opacity === 0);
check('the arch does not announce itself while closed', arch2.consumeOpened() === false);

// the level is complete: it opens
levels.fragments.items.forEach((f) => { f.collected = true; });
check('the level is now complete', levels.complete);
player.position.set(cx + 2, cy + 1.5, cz); // close, but not in the doorway
levels.update(DT, 5);
check('open arch: the portal shows', arch2.active && arch2.portalMaterial.opacity > 0.1);
check('the opening is announced once', arch2.consumeOpened() === true && arch2.consumeOpened() === false);
check('open arch: being near it is not enough', arch2.consumeEntered() === false);
player.position.set(cx + 0.9, cy + 1.5, cz); // still outside the entering distance
levels.update(DT, 5.1);
check('almost a cube from the middle is not walked in yet', arch2.consumeEntered() === false);
player.position.set(cx, cy + 1.5, cz); // in the doorway
levels.update(DT, 5.2);
check('walking into the open arch is noticed', arch2.consumeEntered() === true);
check('and only once', arch2.consumeEntered() === false);
levels.update(DT, 5.3);
check('standing in the doorway does not trigger it again', arch2.consumeEntered() === false);

// walking in from below: at the wrong height does not count
levels.load(archLevel);
const arch3 = levels.arch;
player.position.set(cx + 4, cy + 1.5, cz);
levels.update(DT, 0);
for (let i = 0; i < 90; i++) levels.update(DT, i * DT);
levels.fragments.items.forEach((f) => { f.collected = true; });
player.position.set(cx, cy - 6, cz);
levels.update(DT, 2);
check('a player far below the doorway cannot walk in', arch3.consumeEntered() === false);

// restart and reload: the arch is hidden again
levels.restart();
check('restarting the level puts the arch away again', levels.arch && !levels.arch.revealed && !levels.arch.group.visible);
levels.unload();
check('unloading the level removes the arch', levels.arch === null);

// the arch does not need anything from the level files
const withoutArches = new LevelManager(new THREE.Scene(), new Player(new THREE.Scene()), LEVELS);
withoutArches.load(archLevel);
check('a level manager without arches works as before', withoutArches.arch === null);

console.log(failed ? `\n${failed} ARCH TEST(S) FAILED` : '\nALL ARCH TESTS PASSED');
process.exit(failed ? 1 : 0);
