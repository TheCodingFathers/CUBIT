// SOUND: every sound is made in code with the browser's Web Audio, so there are no sound files to load.
// Browsers keep audio locked until the player presses a key or clicks, so unlock() runs on the first input.
// M turns all sound on or off (remembered).
// Sounds are layered (soft tone + noise + bell tail) and share a small reverb so they feel like one world.

const MUTE_KEY = 'cubit.muted';
const VOLUME = 0.55; // master volume, 0 to 1

let ctx = null;
let master = null;
let reverbSend = null;
let noiseBuffer = null;
let muted = false;
try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
} catch {
  // storage is not available: sound simply starts on
}

// A short, dark, noisy tail: cheap reverb that makes everything sound like it is in a big metal room
function makeImpulse(c, seconds, decay) {
  const length = Math.floor(c.sampleRate * seconds);
  const buffer = c.createBuffer(2, length, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
  }
  return buffer;
}

function context() {
  if (ctx) return ctx;
  const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!AudioContextClass) return null;
  ctx = new AudioContextClass();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : VOLUME;
  // Gentle limiter so layered sounds never clip
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -14;
  limiter.ratio.value = 5;
  master.connect(limiter);
  limiter.connect(ctx.destination);
  // Reverb
  const convolver = ctx.createConvolver();
  convolver.buffer = makeImpulse(ctx, 1.1, 2.6);
  reverbSend = ctx.createGain();
  reverbSend.gain.value = 0.4;
  reverbSend.connect(convolver);
  convolver.connect(master);
  return ctx;
}

// The context to play on right now, or null if sound is not ready yet
function ready() {
  const c = context();
  return c && c.state === 'running' ? c : null;
}

// Sends a sound to the speakers, plus some of it into the reverb (wet: 0 dry, 1 very echoey)
function route(c, node, wet) {
  node.connect(master);
  if (wet > 0) {
    const send = c.createGain();
    send.gain.value = wet;
    node.connect(send);
    send.connect(reverbSend);
  }
}

// One note: a pitch that can slide, with a quick fade in and out
function tone({ freq, to, dur = 0.15, type = 'sine', gain = 0.1, delay = 0, attack = 0.005, wet = 0.25, detune = 0 }) {
  const c = ready();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.detune.value = detune;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp);
  route(c, amp, wet);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// A metallic bell: the note plus two inharmonic overtones that die away faster
function bell({ freq, dur = 0.6, gain = 0.09, delay = 0, wet = 0.5 }) {
  tone({ freq, dur, gain, delay, wet, attack: 0.003 });
  tone({ freq: freq * 2.76, dur: dur * 0.5, gain: gain * 0.35, delay, wet, attack: 0.002 });
  tone({ freq: freq * 5.4, dur: dur * 0.25, gain: gain * 0.12, delay, wet, attack: 0.002 });
}

// A low round knock (landings, clunks, button presses)
function thump({ freq = 120, to = 45, dur = 0.18, gain = 0.2, delay = 0 }) {
  tone({ freq, to, dur, gain, delay, wet: 0.15, attack: 0.002 });
}

// A burst of filtered noise (whooshes, scrapes and clicks)
function noise({ dur = 0.15, gain = 0.08, from = 800, to = 800, q = 1, delay = 0, type = 'bandpass', wet = 0.2 }) {
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
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  source.connect(filter);
  filter.connect(amp);
  route(c, amp, wet);
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

// A tiny random pitch change so repeated jumps and landings do not sound robotic
const vary = () => 1 + (Math.random() - 0.5) * 0.1;

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

  // Jump: a soft springy "boop". Land: a round thud with a puff of dust.
  jump: () =>
    once('jump', 0.08, () => {
      const v = vary();
      tone({ freq: 300 * v, to: 620 * v, dur: 0.14, gain: 0.11 });
      tone({ freq: 600 * v, to: 1240 * v, dur: 0.1, gain: 0.03, type: 'triangle' });
    }),
  land: () =>
    once('land', 0.08, () => {
      thump({ freq: 150 * vary(), to: 48, dur: 0.16, gain: 0.2 });
      noise({ dur: 0.08, gain: 0.05, from: 700, to: 180, type: 'lowpass' });
    }),

  // SHIFT: a stone block slides and settles. ROTATE: heavy gears turn and lock twice. Blocked: two dull knocks.
  shift: () => {
    noise({ dur: 0.28, gain: 0.06, from: 250, to: 1100, q: 1.5 });
    tone({ freq: 196, to: 294, dur: 0.28, type: 'triangle', gain: 0.08 });
    thump({ freq: 110, to: 55, dur: 0.12, gain: 0.14, delay: 0.27 });
    bell({ freq: 588, dur: 0.5, gain: 0.05, delay: 0.27 });
  },
  rotate: () => {
    noise({ dur: 0.18, gain: 0.04, from: 300, to: 650, q: 3 });
    [0.16, 0.36].forEach((delay, i) => {
      thump({ freq: 110 - i * 15, to: 50, dur: 0.14, gain: 0.18, delay });
      noise({ dur: 0.04, gain: 0.08, from: 2400, to: 1200, delay });
      bell({ freq: i === 0 ? 165 : 196, dur: 0.5, gain: 0.06, delay });
    });
  },
  blocked: () =>
    once('blocked', 0.15, () => {
      thump({ freq: 95, to: 60, dur: 0.1, gain: 0.14 });
      thump({ freq: 80, to: 50, dur: 0.1, gain: 0.12, delay: 0.1 });
      tone({ freq: 140, dur: 0.18, type: 'square', gain: 0.025 });
    }),

  // Fragment pickup: a bright bell run. Level complete: a warm rising chord with a long shimmer.
  collect: () => {
    [659, 784, 988, 1319, 1568].forEach((freq, i) => bell({ freq, dur: 0.55, gain: 0.09, delay: i * 0.065, wet: 0.55 }));
    tone({ freq: 2637, dur: 0.25, gain: 0.03, delay: 0.3, type: 'triangle', wet: 0.6 });
  },
  complete: () => {
    [392, 523, 659, 784].forEach((freq, i) => bell({ freq, dur: 0.9, gain: 0.1, delay: i * 0.1, wet: 0.6 }));
    bell({ freq: 1047, dur: 1.4, gain: 0.12, delay: 0.55, wet: 0.7 });
    tone({ freq: 131, dur: 1.2, gain: 0.08, delay: 0.4, type: 'triangle', wet: 0.5 });
  },

  // CORE CIRCUIT, doors and plates
  receiverOn: () => {
    tone({ freq: 330, to: 660, dur: 0.3, gain: 0.09 });
    noise({ dur: 0.25, gain: 0.03, from: 800, to: 3000, q: 2 });
    bell({ freq: 880, dur: 0.7, gain: 0.08, delay: 0.12 });
    bell({ freq: 1320, dur: 0.6, gain: 0.05, delay: 0.2 });
  },
  doorOpen: () => {
    noise({ dur: 0.4, gain: 0.05, from: 300, to: 1400, q: 1.5 });
    tone({ freq: 140, to: 280, dur: 0.4, type: 'triangle', gain: 0.07 });
    thump({ freq: 90, to: 55, dur: 0.12, gain: 0.1, delay: 0.38 });
  },
  doorClose: () => {
    noise({ dur: 0.3, gain: 0.05, from: 1400, to: 300, q: 1.5 });
    tone({ freq: 280, to: 140, dur: 0.3, type: 'triangle', gain: 0.07 });
    thump({ freq: 100, to: 50, dur: 0.14, gain: 0.16, delay: 0.28 });
  },
  plateOn: () => {
    thump({ freq: 200, to: 120, dur: 0.06, gain: 0.12 });
    tone({ freq: 760, dur: 0.05, type: 'square', gain: 0.03 });
    bell({ freq: 1040, dur: 0.3, gain: 0.04, delay: 0.03 });
  },
  plateOff: () => {
    thump({ freq: 160, to: 90, dur: 0.06, gain: 0.09 });
    tone({ freq: 520, dur: 0.05, type: 'square', gain: 0.025 });
  },

  // CORE ECHO: three rising blips start a recording, three falling blips finish it
  echoStart: () => {
    tone({ freq: 660, dur: 0.1, gain: 0.08, type: 'triangle', wet: 0.5 });
    tone({ freq: 880, dur: 0.1, gain: 0.08, type: 'triangle', wet: 0.5, delay: 0.08 });
    tone({ freq: 1320, dur: 0.3, gain: 0.08, type: 'triangle', wet: 0.6, delay: 0.16 });
  },
  echoStop: () => {
    tone({ freq: 1320, dur: 0.1, gain: 0.08, type: 'triangle', wet: 0.5 });
    tone({ freq: 880, dur: 0.1, gain: 0.08, type: 'triangle', wet: 0.5, delay: 0.08 });
    tone({ freq: 660, dur: 0.3, gain: 0.08, type: 'triangle', wet: 0.6, delay: 0.16 });
  },
  echoOff: () => tone({ freq: 440, to: 200, dur: 0.25, gain: 0.07, wet: 0.5 }),

  // GRAVITY FLIP: a whoosh over a deep falling sweep
  gravity: () => {
    noise({ dur: 0.4, gain: 0.1, from: 200, to: 2000, q: 2, wet: 0.35 });
    tone({ freq: 260, to: 60, dur: 0.4, gain: 0.12 });
    thump({ freq: 70, to: 40, dur: 0.2, gain: 0.12, delay: 0.3 });
  },

  // The beam's hum: low, steady and quiet, with a slow wobble. Call every frame with true while it should play.
  hum(on) {
    const c = ready();
    if (!c) return;
    if (on && !hum) {
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 240;
      const amp = c.createGain();
      amp.gain.setValueAtTime(0.0001, c.currentTime);
      amp.gain.exponentialRampToValueAtTime(0.03, c.currentTime + 0.5);
      const oscillators = [
        ['sawtooth', 55],
        ['sawtooth', 55.8],
        ['triangle', 110],
      ].map(([type, freq]) => {
        const osc = c.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;
        osc.connect(filter);
        osc.start();
        return osc;
      });
      // Slow wobble in the filter so the hum feels alive
      const lfo = c.createOscillator();
      lfo.frequency.value = 0.25;
      const lfoDepth = c.createGain();
      lfoDepth.gain.value = 60;
      lfo.connect(lfoDepth);
      lfoDepth.connect(filter.frequency);
      lfo.start();
      oscillators.push(lfo);
      filter.connect(amp);
      route(c, amp, 0.15);
      hum = { amp, oscillators };
    } else if (!on && hum) {
      const { amp, oscillators } = hum;
      amp.gain.setTargetAtTime(0.0001, c.currentTime, 0.1);
      oscillators.forEach((osc) => osc.stop(c.currentTime + 0.5));
      hum = null;
    }
  },
};
