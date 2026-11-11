import { isUnlocked, nextLevelIndex } from './progress.js';

// TITLE SCREEN and WORLD / LEVEL SELECT. Everything is built here in code and styled in style.css.
// While a menu is open the game stands still (main.js checks menus.isOpen).

function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

// A button with a main label and an optional small note under it
function button(label, onClick, { note = '', className = 'menu-button', disabled = false } = {}) {
  const node = el('button', className);
  node.type = 'button';
  node.append(el('span', 'menu-label', label));
  if (note) node.append(el('span', 'menu-note', note));
  node.disabled = disabled;
  node.addEventListener('click', onClick);
  return node;
}

export function createMenus({ worlds, levels, progress, play, onOpen }) {
  const root = el('div');
  root.id = 'menus';
  document.body.appendChild(root);
  let view = null; // 'title', 'select' or null (closed)

  const playableCount = worlds.reduce((sum, world) => sum + world.levels.length, 0);

  function levelTitle(index) {
    const world = worlds.find((w) => w.levels.includes(index));
    const k = world ? world.levels.indexOf(index) : -1;
    return k >= 0 ? `Level ${k + 1}: ${levels[index].name}` : levels[index].name;
  }

  function open(name, built) {
    view = name;
    root.classList.add('visible');
    root.replaceChildren(built.node);
    if (built.focus) built.focus.focus();
    if (onOpen) onOpen();
  }

  function buildTitle() {
    const node = el('div', 'menu-panel');
    node.append(el('div', 'menu-logo', 'CUBIT'), el('div', 'menu-sub', 'CORE OF THE COSMOS'));
    const list = el('div', 'menu-list');
    let focus = null;

    if (progress.hasAny()) {
      const next = nextLevelIndex(worlds, levels, progress);
      focus = button('CONTINUE', () => play(next), { note: levelTitle(next) });
      list.append(focus);
    }

    const first = worlds.find((world) => world.levels.length > 0).levels[0];
    let armed = false;
    const newGame = button(progress.hasAny() ? 'NEW GAME' : 'PLAY', () => {
      if (progress.hasAny() && !armed) {
        armed = true; // erasing progress needs a second click
        newGame.firstChild.textContent = 'ERASE PROGRESS? CLICK AGAIN';
        return;
      }
      progress.reset();
      play(first);
    });
    if (!focus) focus = newGame;
    list.append(newGame, button('LEVELS', () => api.showSelect()));

    node.append(list, el('div', 'menu-footer', `${progress.count()} / ${playableCount} levels completed   M sound`));
    return { node, focus };
  }

  function buildSelect() {
    const node = el('div', 'menu-panel wide');
    node.append(el('div', 'menu-heading', 'LEVEL SELECT'));
    const nameLabel = el('div', 'menu-name', '\u00a0');
    let focus = null;

    worlds.forEach((world, worldIndex) => {
      const soon = world.levels.length === 0;
      const row = el('div', soon ? 'world-row soon' : 'world-row');
      const head = el('div', 'world-head', `WORLD ${String(world.id).padStart(2, '0')}   ${world.name.toUpperCase()}`);
      if (soon) head.append(el('span', 'world-soon', 'COMING SOON'));
      row.append(head);

      const tiles = el('div', 'level-tiles');
      world.levels.forEach((levelIndex, k) => {
        const unlocked = isUnlocked(worlds, levels, progress, worldIndex, k);
        const done = progress.isCompleted(levels[levelIndex].name);
        const tile = button(String(k + 1), () => play(levelIndex), {
          className: `level-tile${done ? ' done' : ''}${unlocked ? '' : ' locked'}`,
          disabled: !unlocked,
        });
        const text = unlocked ? levelTitle(levelIndex) + (done ? '  (completed)' : '') : 'Locked: finish the level before it';
        tile.title = text;
        tile.addEventListener('mouseenter', () => (nameLabel.textContent = text));
        tile.addEventListener('focus', () => (nameLabel.textContent = text));
        tiles.append(tile);
        if (unlocked && !done && !focus) focus = tile;
      });
      row.append(tiles);
      node.append(row);
    });

    const back = button('BACK', () => api.showTitle(), { className: 'menu-button small' });
    node.append(nameLabel, back);
    return { node, focus: focus ?? back };
  }

  const api = {
    get isOpen() {
      return view !== null;
    },
    showTitle: () => open('title', buildTitle()),
    showSelect: () => open('select', buildSelect()),
    hide() {
      view = null;
      root.classList.remove('visible');
      root.replaceChildren();
    },
    // Escape: from the level select back to the title screen
    back() {
      if (view === 'select') api.showTitle();
    },
  };
  return api;
}
