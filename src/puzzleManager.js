const INTERACT_RANGE = 3; // how close CUBIT must be to SHIFT or ROTATE something (in units)

// Keeps track of everything CUBIT can change (shiftable blocks, rotatable structures).
// Each item has: kind ('shift' or 'rotate'), distanceTo(point), canActivate(player),
// activate(), update(delta) and reset().
export class PuzzleManager {
  constructor() {
    this.items = [];
  }

  add(item) {
    this.items.push(item);
  }

  // Finds the nearest item of this kind within range, or null if none is close enough.
  findTarget(player, kind) {
    let best = null;
    let bestDistance = INTERACT_RANGE;

    for (const item of this.items) {
      if (item.kind !== kind) continue;
      const distance = item.distanceTo(player.position);
      if (distance <= bestDistance) {
        bestDistance = distance;
        best = item;
      }
    }

    if (!best) return null;
    return { item: best, canActivate: best.canActivate(player) };
  }

  // Called when the player presses SHIFT (Q) or ROTATE (R)
  tryActivate(player, kind) {
    const target = this.findTarget(player, kind);
    if (target && target.canActivate) {
      target.item.activate();
    }
  }

  update(delta) {
    for (const item of this.items) {
      item.update(delta);
    }
  }

  // Put every block and structure back where it started
  resetAll() {
    for (const item of this.items) {
      item.reset();
    }
  }
}