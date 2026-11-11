
// Tests for saved progress, unlocking, worlds and the menu screens. No browser needed:
// a tiny fake page and a fake localStorage are enough.  Run:  node tools/playtest/menus_test.mjs
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
const url = (p, q = '') => pathToFileURL(path.join(root, p)).href + q;

let failed = 0;
const check = (name, ok, extra = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '   ' + extra}`);
};

// ---- fake localStorage ----
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => void store.set(k, String(v)),
  removeItem: (k) => void store.delete(k),
};

// ---- fake page ----
class Node {
  constructor(tag) {
    this.tag = tag; this.className = ''; this.textContent = ''; this.children = [];
    this.disabled = false; this.listeners = {}; this.title = ''; this.focused = false;
    const set = new Set();
    this.classList = {
      add: (c) => set.add(c), remove: (c) => set.delete(c), contains: (c) => set.has(c),
      toggle: (c, f) => ((f ?? !set.has(c)) ? set.add(c) : set.delete(c)),
    };
  }
  append(...k) { this.children.push(...k); }
  appendChild(k) { this.children.push(k); return k; }
  replaceChildren(...k) { this.children = k; }
  get firstChild() { return this.children[0]; }
  addEventListener(t, f) { (this.listeners[t] ??= []).push(f); }
  focus() { this.focused = true; }
  click() { if (!this.disabled) (this.listeners.click ?? []).forEach((f) => f()); }
  text() { return this.textContent + this.children.map((c) => c.text()).join(' '); }
  find(fn, out = []) { if (fn(this)) out.push(this); this.children.forEach((c) => c.find(fn, out)); return out; }
}
globalThis.document = { createElement: (t) => new Node(t), body: new Node('body') };

const { LEVELS } = await import(url('src/levels/index.js'));
const { WORLDS } = await import(url('src/worlds.js'));
const { isUnlocked, nextLevelIndex } = await import(url('src/progress.js', '?a'));
const { createMenus } = await import(url('src/menus.js'));
const fresh = async (tag) => (await import(url('src/progress.js', '?' + tag))).progress;

// ---- data checks ----
const names = LEVELS.map((l) => l.name);
check('level names are unique (save uses names)', new Set(names).size === names.length);
check('every world level index exists', WORLDS.every((w) => w.levels.every((i) => LEVELS[i])));
check('world 1 has the 11 real levels, no Test Room', WORLDS[0].levels.length === 11 && !WORLDS[0].levels.includes(LEVELS.length - 1));
check('no level is in two worlds', new Set(WORLDS.flatMap((w) => w.levels)).size === WORLDS.flatMap((w) => w.levels).length);
check('every world has a background and lights', WORLDS.every((w) => Number.isInteger(w.background) && w.ambient && w.sun));

// ---- progress and unlocking ----
let p = await fresh('b');
const open = (k) => isUnlocked(WORLDS, LEVELS, p, 0, k);
check('fresh save: only level 1 is open', open(0) && !open(1) && !open(10));
check('fresh save: nothing counted', p.count() === 0 && !p.hasAny());
check('fresh save: Continue points at level 1', nextLevelIndex(WORLDS, LEVELS, p) === WORLDS[0].levels[0]);

p.complete(names[0]);
check('after level 1: level 2 opens, 3 stays locked', open(1) && !open(2));
check('after level 1: Continue points at level 2', nextLevelIndex(WORLDS, LEVELS, p) === WORLDS[0].levels[1]);
p.complete(names[0]);
check('completing the same level twice counts once', p.count() === 1);

p = await fresh('c');   // a new import reads the saved data back, like a page reload
check('progress survives a reload', p.isCompleted(names[0]) && p.count() === 1);

for (const i of WORLDS[0].levels) p.complete(LEVELS[i].name);
check('all 11 done: every tile open', WORLDS[0].levels.every((_, k) => open(k)));
check('all done: Continue stays on the last level', nextLevelIndex(WORLDS, LEVELS, p) === WORLDS[0].levels.at(-1));
check('world 2 (empty) cannot be entered by accident', !isUnlocked(WORLDS, LEVELS, p, 2, 0) || WORLDS[2].levels.length === 0);

p.reset();
check('reset clears the save', p.count() === 0 && !p.hasAny());
p = await fresh('d');
check('reset also clears it on disk', p.count() === 0);

store.set('cubit.progress.v1', '{not json');
p = await fresh('e');
check('broken save file is ignored, no crash', p.count() === 0);
store.set('cubit.progress.v1', JSON.stringify({ completed: 'oops' }));
p = await fresh('f');
check('wrong save format is ignored, no crash', p.count() === 0);

const saved = globalThis.localStorage;
delete globalThis.localStorage;
p = await fresh('g');
p.complete(names[0]);
check('no storage at all: game still works, progress kept in memory', p.isCompleted(names[0]));
globalThis.localStorage = saved;

// ---- menus ----
store.clear();
p = await fresh('h');
let played = [];
let opened = 0;
const menus = createMenus({ worlds: WORLDS, levels: LEVELS, progress: p, play: (i) => played.push(i), onOpen: () => opened++ });
const page = document.body.children.find((n) => n.id === 'menus');
const buttons = () => page.find((n) => n.tag === 'button');
const byLabel = (t) => buttons().find((b) => b.text().includes(t));

check('menus start closed', !menus.isOpen);
menus.showTitle();
check('title opens and reports open', menus.isOpen && page.classList.contains('visible') && opened === 1);
check('new player sees PLAY and LEVELS, no CONTINUE', byLabel('PLAY') && byLabel('LEVELS') && !byLabel('CONTINUE'));
check('title focuses the main button', byLabel('PLAY').focused);
byLabel('PLAY').click();
check('PLAY starts level 1', played.at(-1) === WORLDS[0].levels[0]);

p.complete(names[0]); p.complete(names[1]);
menus.showTitle();
check('returning player sees CONTINUE with the next level named', byLabel('CONTINUE') && byLabel('CONTINUE').text().includes(names[2]));
byLabel('CONTINUE').click();
check('CONTINUE goes to level 3', played.at(-1) === WORLDS[0].levels[2]);

menus.showTitle();
const before = p.count();
byLabel('NEW GAME').click();
check('NEW GAME asks first and erases nothing yet', p.count() === before && byLabel('ERASE PROGRESS'));
const n = played.length;
byLabel('ERASE PROGRESS').click();
check('second click erases and starts level 1', p.count() === 0 && played.length === n + 1 && played.at(-1) === WORLDS[0].levels[0]);

menus.showTitle();
byLabel('LEVELS').click();
const hasClass = (x, c) => x.className.split(' ').includes(c);
const tiles = () => page.find((x) => x.tag === 'button' && hasClass(x, 'level-tile'));
check('select shows 11 tiles, level 1 open and the rest locked', tiles().length === 11 && !tiles()[0].disabled && tiles().slice(1).every((t) => t.disabled));
check('select lists all 4 worlds, 3 marked COMING SOON', page.find((x) => hasClass(x, 'world-row')).length === 4 && page.text().split('COMING SOON').length - 1 === 3);
p.complete(names[0]); p.complete(names[1]);
menus.showSelect();
check('after 2 done: tiles 1-3 open, completed ones marked', tiles().slice(0, 3).every((t) => !t.disabled) && tiles()[3].disabled && hasClass(tiles()[0], 'done') && !hasClass(tiles()[2], 'done'));
tiles()[2].click();
check('clicking an open tile plays that level', played.at(-1) === WORLDS[0].levels[2]);
const m = played.length;
tiles()[5].click();
check('clicking a locked tile does nothing', played.length === m);
menus.back();
check('Esc in select goes back to the title', page.text().includes('CORE OF THE COSMOS'));
menus.hide();
check('hide closes everything', !menus.isOpen && !page.classList.contains('visible') && page.children.length === 0);

console.log(failed === 0 ? '\nALL MENU/PROGRESS TESTS PASSED' : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
