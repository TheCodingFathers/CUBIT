// Keyboard input.
// We use event.code (like "KeyW" or "Space") so controls work on any keyboard layout.

const down = new Set(); // keys currently held
const pressed = new Set(); // keys that went down during this frame

window.addEventListener('keydown', (event) => {
  // Stop the page from scrolling (Space) or going back (Backspace in some browsers)
  const blocked = ['Space', 'Backspace', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  if (blocked.includes(event.code)) event.preventDefault();
  if (!event.repeat) pressed.add(event.code);
  down.add(event.code);
});

window.addEventListener('keyup', (event) => {
  down.delete(event.code);
});

// If the window loses focus, forget all keys so CUBIT doesn't keep walking by itself.
window.addEventListener('blur', () => {
  down.clear();
  pressed.clear();
});

export const input = {
  isDown: (code) => down.has(code), // true while the key is held
  wasPressed: (code) => pressed.has(code), // true only on the frame the key went down
  endFrame: () => pressed.clear(), // call once at the end of every frame
};