// SOUND: every sound is made in code with the browser's Web Audio, so there are no sound files to load.
// Browsers keep audio locked until the player presses a key or clicks, so unlock() runs on the first input.
// M turns all sound on or off (remembered).

const MUTE_KEY = 'cubit.muted';
const VOLUME = 0.5; // master volume, 0 to 1

let ctx = null;
let master = null;
let noiseBuffer = null;
let muted = false;
try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
} catch {
  // storage is not available: sound simply starts on
}

function context() {
  if (ctx) return ctx;
  const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!AudioContextClass) return null;
  ctx = new AudioContextClass();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : VOLUME;
  master.connect(ctx.destination);
  return ctx;
}

// The context to play on right now, or null if sound is not ready yet
function ready() {
  const c = context();
  return c && c.state === 'running' ? c : null;
}

// One note: a pitch that can slide, with a quick fade in and out
function tone({ freq, to, dur = 0.15, type = 'sine', gain = 0.1, delay = 0, attack = 0.005 }) {
  const c = ready();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp);
  amp.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// A burst of filtered noise (whooshes, scrapes and clunks)
function noise({ dur = 0.15, gain = 0.08, from = 800, to = 800, q = 1, delay = 0, type = 'bandpass' }) {
  const c = ready();
  if (!c) return;
  if (!noiseBuffer) {
    noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const t0 = c.currentTime + delay;
  const source = c.createBufferSource();
  source.buffer = noiseBuffer;
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, t0);
  if (to !== from) filter.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const amp = c.createGain();
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  source.connect(filter);
  filter.connect(amp);
  amp.connect(master);
  source.start(t0);
  source.stop(t0 + dur + 0.02);
}

// The same sound is never played twice within minGap seconds
const lastPlayed = {};
function once(name, minGap, play) {
  const c = ready();
  if (!c) return;
  if (c.currentTime - (lastPlayed[name] ?? -1) < minGap) return;
  lastPlayed[name] = c.currentTime;
  play();
}

let hum = null; // the beam's low hum while a level has an energy source

export const audio = {
  // Called on the first key press or click (browsers require this before any sound)
  unlock: () => {
    const c = context();
    if (c && c.state === 'suspended') c.resume();
  },

  get muted() {
    return muted;
  },

  // Returns true if sound is now off
  toggleMute() {
    muted = !muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      // not remembered, that is fine
    }
    if (master) master.gain.setTargetAtTime(muted ? 0 : VOLUME, ctx.currentTime, 0.02);
    return muted;
  },

  jump: () => once('jump', 0.08, () => tone({ freq: 330, to: 560, dur: 0.12, gain: 0.12 })),
  land: () =>
    once('land', 0.08, () => {
      tone({ freq: 170, to: 70, dur: 0.12, gain: 0.16 });
      noise({ dur: 0.07, gain: 0.05, from: 600, to: 200, type: 'lowpass' });
    }),

  // SHIFT: a slide. ROTATE: two mechanical clunks. Blocked: a short low buzz
  shift: () => {
    tone({ freq: 220, to: 340, dur: 0.2, type: 'triangle', gain: 0.1 });
    noise({ dur: 0.18, gain: 0.05, from: 500, to: 1400 });
  },
  rotate: () => {
    tone({ freq: 150, to: 90, dur: 0.1, type: 'square', gain: 0.07 });
    noise({ dur: 0.05, gain: 0.07, from: 1800, to: 900 });
    tone({ freq: 190, to: 110, dur: 0.1, type: 'square', gain: 0.06, delay: 0.2 });
    noise({ dur: 0.05, gain: 0.06, from: 1800, to: 900, delay: 0.2 });
  },
  blocked: () => once('blocked', 0.15, () => tone({ freq: 120, to: 90, dur: 0.14, type: 'sawtooth', gain: 0.07 })),

  // Fragment pickup, and the longer fanfare when the level is complete
  collect: () => [523, 659, 784, 1047].forEach((freq, i) => tone({ freq, dur: 0.14, gain: 0.11, delay: i * 0.07 })),
  complete: () =>
    [392, 523, 659, 784, 1047].forEach((freq, i) =>
      tone({ freq, dur: 0.35, type: 'triangle', gain: 0.12, delay: i * 0.12 })
    ),

  // CORE CIRCUIT, doors and plates
  receiverOn: () => {
    tone({ freq: 440, to: 880, dur: 0.25, gain: 0.1 });
    tone({ freq: 1320, dur: 0.3, gain: 0.05, delay: 0.1 });
  },
  doorOpen: () => {
    tone({ freq: 300, to: 620, dur: 0.35, type: 'triangle', gain: 0.07 });
    noise({ dur: 0.3, gain: 0.04, from: 400, to: 1600 });
  },
  doorClose: () => {
    tone({ freq: 620, to: 260, dur: 0.3, type: 'triangle', gain: 0.07 });
    noise({ dur: 0.25, gain: 0.04, from: 1600, to: 400 });
  },
  plateOn: () => tone({ freq: 620, dur: 0.05, type: 'square', gain: 0.06 }),
  plateOff: () => tone({ freq: 420, dur: 0.05, type: 'square', gain: 0.05 }),

  // CORE ECHO: two rising beeps start a recording, two falling beeps finish it
  echoStart: () => {
    tone({ freq: 660, dur: 0.08, gain: 0.09 });
    tone({ freq: 880, dur: 0.1, gain: 0.09, delay: 0.09 });
  },
  echoStop: () => {
    tone({ freq: 880, dur: 0.08, gain: 0.09 });
    tone({ freq: 660, dur: 0.1, gain: 0.09, delay: 0.09 });
  },
  echoOff: () => tone({ freq: 330, to: 220, dur: 0.15, gain: 0.07 }),

  // GRAVITY FLIP: a whoosh
  gravity: () => {
    noise({ dur: 0.35, gain: 0.1, from: 300, to: 1800, q: 2 });
    tone({ freq: 220, to: 90, dur: 0.3, gain: 0.07 });
  },

  // The beam's hum: low, steady and quiet. Call every frame with true while it should play.
  hum(on) {
    const c = ready();
    if (!c) return;
    if (on && !hum) {
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 220;
      const amp = c.createGain();
      amp.gain.setValueAtTime(0.0001, c.currentTime);
      amp.gain.exponentialRampToValueAtTime(0.03, c.currentTime + 0.5);
      const oscillators = [55, 55.8].map((freq) => {
        const osc = c.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        osc.connect(filter);
        osc.start();
        return osc;
      });
      filter.connect(amp);
      amp.connect(master);
      hum = { amp, oscillators };
    } else if (!on && hum) {
      const { amp, oscillators } = hum;
      amp.gain.setTargetAtTime(0.0001, c.currentTime, 0.1);
      oscillators.forEach((osc) => osc.stop(c.currentTime + 0.5));
      hum = null;
    }
  },
};
