// SAVED PROGRESS: which levels the player has completed, kept in the browser (localStorage).
// A level is remembered by its name, so reordering the level list never mixes up the save.

const KEY = 'cubit.progress.v1';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    const saved = raw ? JSON.parse(raw) : null;
    return { completed: Array.isArray(saved?.completed) ? saved.completed : [] };
  } catch {
    return { completed: [] }; // storage not available: progress just is not kept
  }
}

let data = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // not kept, that is fine
  }
}

export const progress = {
  isCompleted: (name) => data.completed.includes(name),
  complete(name) {
    if (!data.completed.includes(name)) {
      data.completed.push(name);
      save();
    }
  },
  count: () => data.completed.length,
  hasAny: () => data.completed.length > 0,
  reset() {
    data = { completed: [] };
    save();
  },
};

// Can the player start level number k (0 = first) of this world?
// The first level of the first world is always open. A level opens when the one before it is done.
// A new world opens when every level of the world before it is done.
export function isUnlocked(worlds, levels, progress, worldIndex, k) {
  if (worldIndex > 0) {
    const before = worlds[worldIndex - 1];
    const worldDone = before.levels.length > 0 && before.levels.every((i) => progress.isCompleted(levels[i].name));
    if (!worldDone) return false;
  }
  if (k === 0) return true;
  const list = worlds[worldIndex].levels;
  return progress.isCompleted(levels[list[k - 1]].name) || progress.isCompleted(levels[list[k]].name);
}

// Where "Continue" goes: the first level that is not completed yet (or the very last one when all are done)
export function nextLevelIndex(worlds, levels, progress) {
  for (const world of worlds) {
    for (const i of world.levels) {
      if (!progress.isCompleted(levels[i].name)) return i;
    }
  }
  const last = worlds.filter((world) => world.levels.length > 0).at(-1);
  return last.levels.at(-1);
}
