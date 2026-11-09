// Headless playtest: runs the REAL game code (player, levels, blocks, structures, echo, gravity)
// without a browser, and plays a scripted solution. Usage:  node tools/playtest/run.mjs 6 7 8
// Scenarios live in scenarios.mjs. This is a developer tool, it is not part of the game.
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

process.on('unhandledRejection', () => {});
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = path.join(ROOT, 'src');

// ---- pretend to be a browser ----
const handlers = {};
globalThis.window = {
  addEventListener(type, fn) { (handlers[type] ??= []).push(fn); },
  innerWidth: 800, innerHeight: 600,
};
globalThis.self = globalThis;
globalThis.Request = class { constructor(url) { this.url = url; } };
globalThis.fetch = async () => { throw new Error('offline'); };
const realWarn = console.warn;
console.warn = () => {};

const imp = (file) => import(pathToFileURL(path.join(SRC, file)).href);
const THREE = await import(pathToFileURL(path.join(ROOT, 'node_modules', 'three', 'build', 'three.module.js')).href);
const { input } = await imp('input.js');
const { Player } = await imp('player.js');
const { LevelManager } = await imp('levelManager.js');
const { CoreEcho, ECHO_MAX_SECONDS } = await imp('echo.js');
const { LEVELS } = await imp('levels/index.js');
const { default: SCENARIOS } = await import(pathToFileURL(path.join(path.dirname(fileURLToPath(import.meta.url)), 'scenarios.mjs')).href);

const DT = 1 / 60;
const FORWARD = new THREE.Vector3(-6, 0, -8).normalize(); // same as the camera offset in main.js

const keyDown = (code) => (handlers.keydown ?? []).forEach((h) => h({ code, repeat: false, preventDefault() {} }));
const keyUp = (code) => (handlers.keyup ?? []).forEach((h) => h({ code }));

class Sim {
  constructor(levelIndex) {
    this.scene = new THREE.Scene();
    this.player = new Player(this.scene);
    this.levels = new LevelManager(this.scene, this.player, LEVELS);
    this.echo = new CoreEcho(this.scene, this.player);
    this.echo.limit = () => this.levels.data?.echoSeconds ?? ECHO_MAX_SECONDS; // same rule as main.js
    this.levels.load(levelIndex);
    this.t = 0;
    this.held = new Set();
    this.log = [];
  }
  get p() { return this.player.position; }
  get level() { return this.levels.level; }

  hold(keys) {
    const want = new Set(keys);
    for (const k of this.held) if (!want.has(k)) keyUp(k);
    for (const k of want) if (!this.held.has(k)) keyDown(k);
    this.held = want;
  }

  // one frame, same order as animate() in main.js
  frame(keys = [], taps = []) {
    this.hold(keys);
    for (const k of taps) keyDown(k);
    const P = this.player, L = this.levels, data = L.data;
    if (input.wasPressed('KeyQ')) L.puzzles.tryActivate(P, 'shift');
    if (input.wasPressed('KeyR')) L.puzzles.tryActivate(P, 'rotate');
    if (data.gravity) {
      const turn = (how) => { const d = P.gravityTarget(how); if (P.setGravity(d)) L.puzzles.applyGravity(P.gravity, P); };
      if (input.wasPressed('ArrowUp')) turn('forward');
      if (input.wasPressed('ArrowDown')) turn('back');
      if (input.wasPressed('ArrowLeft')) turn('left');
      if (input.wasPressed('ArrowRight')) turn('right');
      if (input.wasPressed('KeyG')) turn('reverse');
      if (input.wasPressed('KeyX')) turn('floor');
    }
    if (data.echo) {
      if (input.wasPressed('KeyE')) this.echo.toggle();
      if (input.wasPressed('KeyC')) this.echo.cancel();
    }
    this.t += DT;
    P.update(DT, this.t, FORWARD);
    this.echo.update(DT, this.t);
    L.update(DT, this.t, this.echo.actors);
    for (const k of taps) keyUp(k);
    input.endFrame();
  }

  wait(seconds, keys = []) { for (let i = 0; i < Math.round(seconds / DT); i++) this.frame(keys); }
  tap(code) { this.frame([...this.held], [code]); }

  waitUntil(cond, timeout, what) {
    for (let i = 0; i < Math.round(timeout / DT); i++) { if (cond()) return; this.frame(); }
    throw new Error(`timeout waiting for ${what}`);
  }

  // Walk toward a point. null means "ignore that axis". Jumps by itself at edges and steps.
  goto(target, { tol = 0.18, timeout = 12, jump = true, air = false } = {}) {
    const P = this.player;
    for (let i = 0; i < Math.round(timeout / DT); i++) {
      const g = P.gravity;
      const want = new THREE.Vector3(
        target[0] === null ? 0 : target[0] - P.position.x,
        target[1] === null ? 0 : target[1] - P.position.y,
        target[2] === null ? 0 : target[2] - P.position.z,
      );
      want[P.gAxis] = 0;
      if (want.length() < tol && (P.onGround || air)) { this.hold([]); return; }
      want.normalize();

      const up = g.clone().negate();
      const wf = P.forwardBase.clone().applyQuaternion(P.targetQuat);
      const wr = new THREE.Vector3().crossVectors(wf, up);
      let best = null, bestDot = -2;
      for (const w of [-1, 0, 1]) for (const d of [-1, 0, 1]) {
        if (!w && !d) continue;
        const v = wf.clone().multiplyScalar(w).addScaledVector(wr, d);
        v[P.gAxis] = 0; v.normalize();
        const dot = v.dot(want);
        if (dot > bestDot) { bestDot = dot; best = [w, d, v]; }
      }
      const keys = [];
      if (best[0] > 0) keys.push('KeyW'); if (best[0] < 0) keys.push('KeyS');
      if (best[1] > 0) keys.push('KeyD'); if (best[1] < 0) keys.push('KeyA');

      const taps = [];
      if (jump && P.onGround) {
        const dir = best[2];
        const ahead = P.position.clone().addScaledVector(dir, 0.5);
        const below = ahead.clone(); below[P.gAxis] += P.gSign * 0.9;
        const gap = !this.level.isSolid(Math.round(below.x), Math.round(below.y), Math.round(below.z));
        const wall = this.level.isSolid(Math.round(ahead.x), Math.round(ahead.y), Math.round(ahead.z));
        if (gap || wall) taps.push('Space');
      }
      this.frame(keys, taps);
    }
    throw new Error(`goto ${JSON.stringify(target)} timed out at (${P.position.x.toFixed(2)}, ${P.position.y.toFixed(2)}, ${P.position.z.toFixed(2)})`);
  }
}

const here = (s) => `(${s.p.x.toFixed(2)}, ${s.p.y.toFixed(2)}, ${s.p.z.toFixed(2)})`;

function resetInput() {
  for (const k of ['KeyW','KeyA','KeyS','KeyD','Space','KeyQ','KeyR','KeyE','KeyC','KeyG','KeyX','ArrowUp','ArrowDown','ArrowLeft','ArrowRight']) keyUp(k);
  input.endFrame();
}

function runScenario(key) {
  resetInput(); // never let keys from the previous scenario leak into this one
  const steps = SCENARIOS[key];
  const levelNumber = key;
  const exploit = /x/i.test(String(key));
  if (!steps) return { level: key, ok: false, note: 'no scenario' };
  const sim = new Sim(parseInt(key) - 1);
  let n = 0;
  try {
    for (const step of steps) {
      n++;
      if (step.goto) sim.goto(step.goto, step.opts ?? {});
      else if (step.tap) sim.tap(step.tap);
      else if (step.wait !== undefined) sim.wait(step.wait);
      else if (step.ground) sim.waitUntil(() => sim.player.onGround, step.timeout ?? 4, 'landing');
      else if (step.check) {
        const result = step.check(sim);
        if (result !== true) throw new Error(`check failed: ${step.msg ?? ''} ${result === false ? '' : result} at ${here(sim)}`);
      }
      else if (step.note) { /* comment only */ }
      if (process.env.DEBUG) { const b = sim.levels.puzzles.items.map((i) => i.kind === 'rotate' ? `rot@${i.angles[i.index]}` : `blk@${i.cell}`).join(' '); console.log(`  step ${n} ${JSON.stringify(step).slice(0, 60)} -> ${here(sim)} g=${sim.player.gravity.toArray()} ground=${sim.player.onGround} echo=${sim.echo.recording ? 'rec' : sim.echo.active ? 'on' : 'off'} ${b}`); }
    }
    sim.wait(0.5);
    const complete = sim.levels.complete;
    if (exploit) return { level: key, ok: false, steps: n, note: 'EXPLOIT WORKS: every step succeeded, ending at ' + here(sim) + (complete ? ' and the level was completed' : '') };
    return { level: levelNumber, ok: complete, steps: n, time: sim.t.toFixed(1) + 's', note: complete ? 'fragment collected, level complete' : 'finished steps but level NOT complete, CUBIT at ' + here(sim) };
  } catch (error) {
    if (exploit) return { level: key, ok: true, steps: n, note: `blocked at step ${n}: ${error.message}` };
    return { level: levelNumber, ok: false, steps: n, note: `step ${n}: ${error.message}` };
  }
}

const wanted = process.argv.slice(2);
const results = (wanted.length ? wanted : Object.keys(SCENARIOS)).map(runScenario);
console.warn = realWarn;
for (const r of results) console.log(`Level ${r.level}: ${r.ok ? 'PASS' : 'FAIL'}  ${r.time ?? ''}  ${r.note}`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
