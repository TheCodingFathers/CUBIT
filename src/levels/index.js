// The list of levels, in play order.
// To add a level: create a file like level1.js, import it here, and add it to LEVELS.
import level1 from './level1.js';
import level2 from './level2.js';
import level3 from './level3.js';
import testRoom from './testRoom.js';

export const LEVELS = [level1, level2, level3, testRoom];