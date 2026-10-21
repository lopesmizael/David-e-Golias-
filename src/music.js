// Trilha sonora procedural (WebAudio) — composições originais.
// Um sequenciador simples agenda notas um pouco à frente do tempo real.
// Melodias são escritas em graus da escala, uma colcheia por item:
//   número = grau (7 = oitava acima, -1 = grau abaixo), '-' = segura, '.' = pausa
import { audioCtx, musicOut } from './audio.js';

const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const HIJAZ = [0, 1, 4, 5, 7, 8, 10]; // escala do Oriente Médio

const seq = (s) => s.replace(/\|/g, ' ').trim().split(/\s+/);

const TRACKS = {
  // Menu e mapa: flauta de pastor sobre um bordão, bem calmo
  tema: {
    bpm: 76, root: 62, scale: DORIAN, lead: 'flute', drone: true, shaker: 0.25,
    melody: seq(`4 - 5 4 3 - 2 - | 3 4 2 - 0 - - . | 0 2 3 4 5 - 6 5 | 4 - - - 3 - . .
                 7 - 6 5 4 - 5 - | 3 - 4 2 1 - - . | 2 3 4 3 2 1 0 - | 0 - - - . . . .`),
    chords: [0, 3, 0, 4, 5, 3, 4, 0], arp: [0, 2, 4, 2, 7, 4, 2, 4], arpVol: 0.07,
  },
  // Fases no pasto: lira dedilhada, mais movimento
  pasto: {
    bpm: 98, root: 62, scale: DORIAN, lead: 'pluck', drone: false, shaker: 0.4, doum: [0, 8],
    melody: seq(`0 2 4 2 3 - 2 0 | 1 3 5 3 4 - . . | 4 5 7 5 4 3 2 3 | 4 - 2 - 0 - . .
                 5 - 4 5 7 - 5 4 | 3 4 5 - 4 - 2 - | 1 2 3 2 1 - 0 -1 | 0 - - - . . . .`),
    chords: [0, 4, 3, 0, 5, 3, 4, 0], bass: seq('0 . . 0 4 . 0 .'), arp: [0, 4, 7, 4, 2, 4, 7, 4], arpVol: 0.05,
  },
  // Combate: alaúde e tambor de mão no ritmo maqsum
  combate: {
    bpm: 128, root: 62, scale: HIJAZ, lead: 'pluck', drone: false, shaker: 0.3,
    doum: [0, 8], tek: [2, 6, 12, 14, 15],
    melody: seq(`0 1 2 1 0 - . 4 | 3 2 1 2 0 - - . | 4 5 4 3 2 3 4 - | 5 4 3 2 1 - - .
                 7 - 6 5 4 5 6 - | 5 4 3 4 2 - 1 - | 0 1 2 3 4 3 2 1 | 0 - - - 0 . 0 .`),
    chords: [0, 0, 3, 4, 0, 3, 0, 0], bass: seq('0 . . 0 . 0 4 .'),
  },
  // Golias: trompas graves, tambores pesados, tensão
  golias: {
    bpm: 92, root: 57, scale: HIJAZ, lead: 'horn', drone: true, shaker: 0,
    doum: [0, 4, 8, 12], tek: [6, 14], low: true,
    melody: seq(`0 - - 1 - - 0 - | -1 - 0 - - - . . | 4 - - 5 - 4 3 - | 1 - - - 0 - . .
                 7 - 6 - 5 - 4 - | 5 - 4 3 1 - - - | 0 1 0 -1 0 - 4 - | 1 - - - 0 - - -`),
    chords: [0, 0, 3, 0, 4, 3, 0, 0], bass: seq('0 . 0 . 0 . 1 .'),
  },
};

let ctx = null;
let trackGain = null;
let current = null;
let pending = null;
let step = 0;
let nextTime = 0;
let timer = null;
let enabled = true;
let ducked = false;
let noiseBuf = null;

const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
function degToMidi(T, d) {
  const n = T.scale.length;
  const oct = Math.floor(d / n);
  const idx = ((d % n) + n) % n;
  return T.root + T.scale[idx] + 12 * oct;
}

function env(g, t, a, peak, dur) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

function pluck(freq, t, dur, vol) {
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(freq * 6, t);
  f.frequency.exponentialRampToValueAtTime(freq * 1.5, t + dur);
  [['triangle', 1, 1], ['sine', 2, 0.35], ['sawtooth', 1, 0.12]].forEach(([type, mul, v]) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq * mul;
    const og = ctx.createGain();
    og.gain.value = v;
    o.connect(og).connect(f);
    o.start(t);
    o.stop(t + dur + 0.05);
  });
  env(g, t, 0.005, vol, Math.max(0.35, dur));
  f.connect(g).connect(trackGain);
}

function flute(freq, t, dur, vol) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.value = freq;
  const vib = ctx.createOscillator();
  vib.frequency.value = 5;
  const vg = ctx.createGain();
  vg.gain.setValueAtTime(0, t);
  vg.gain.linearRampToValueAtTime(freq * 0.012, t + 0.25);
  vib.connect(vg).connect(o.frequency);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.08);
  g.gain.setValueAtTime(vol, t + Math.max(0.09, dur - 0.08));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
  const h = ctx.createOscillator();
  h.type = 'triangle';
  h.frequency.value = freq * 2;
  const hg = ctx.createGain();
  hg.gain.value = 0.15;
  h.connect(hg).connect(g);
  o.connect(g).connect(trackGain);
  [o, vib, h].forEach((x) => { x.start(t); x.stop(t + dur + 0.2); });
}

function horn(freq, t, dur, vol) {
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(freq * 1.5, t);
  f.frequency.linearRampToValueAtTime(freq * 4, t + 0.15);
  f.Q.value = 2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.07);
  g.gain.setValueAtTime(vol * 0.8, t + Math.max(0.08, dur - 0.05));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15);
  [0, 7].forEach((det) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    o.detune.value = det;
    o.connect(f);
    o.start(t);
    o.stop(t + dur + 0.2);
  });
  f.connect(g).connect(trackGain);
}

function droneNote(freq, t, dur, vol) {
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 380;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.05);
  [freq, freq * 1.5, freq * 0.5].forEach((fr, i) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = fr;
    o.detune.value = i * 4 - 4;
    o.connect(f);
    o.start(t);
    o.stop(t + dur * 1.1);
  });
  f.connect(g).connect(trackGain);
}

function noiseHit(t, { dur, vol, type, freq, q = 1 }) {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  env(g, t, 0.002, vol, dur);
  s.connect(f).connect(g).connect(trackGain);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}

function doum(t, low) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(low ? 85 : 120, t);
  o.frequency.exponentialRampToValueAtTime(low ? 42 : 60, t + 0.25);
  const g = ctx.createGain();
  env(g, t, 0.003, low ? 0.6 : 0.4, 0.35);
  o.connect(g).connect(trackGain);
  o.start(t);
  o.stop(t + 0.4);
  noiseHit(t, { dur: 0.08, vol: 0.12, type: 'lowpass', freq: 600 });
}

// agenda um passo (semicolcheia) da trilha atual
function scheduleStep(T, s, t) {
  const sixteenth = 60 / T.bpm / 4;
  const eighth = sixteenth * 2;
  const inBar = s % 16;
  const bar = Math.floor(s / 16);
  // melodia (colcheias)
  if (s % 2 === 0) {
    const i = (s / 2) % T.melody.length;
    const tok = T.melody[i];
    if (tok !== '-' && tok !== '.') {
      let len = 1;
      while (T.melody[(i + len) % T.melody.length] === '-' && len < 8) len++;
      const f = midiHz(degToMidi(T, Number(tok)));
      const dur = eighth * len;
      if (T.lead === 'flute') flute(f, t, dur, 0.13);
      else if (T.lead === 'horn') horn(f, t, dur, 0.09);
      else pluck(f, t, dur, 0.16);
    }
  }
  const chord = T.chords[bar % T.chords.length];
  // bordão no início de cada compasso
  if (T.drone && inBar === 0) droneNote(midiHz(degToMidi(T, chord) - 24), t, sixteenth * 16, T.low ? 0.07 : 0.045);
  // arpejo de acompanhamento
  if (T.arp && s % 2 === 0) {
    const a = T.arp[(inBar / 2) % T.arp.length];
    pluck(midiHz(degToMidi(T, chord + a) - 12), t, eighth * 1.5, T.arpVol);
  }
  // baixo
  if (T.bass && s % 2 === 0) {
    const tok = T.bass[(inBar / 2) % T.bass.length];
    if (tok !== '.' && tok !== '-') pluck(midiHz(degToMidi(T, chord + Number(tok)) - 24), t, eighth * 1.6, 0.2);
  }
  // percussão
  if (T.doum && T.doum.includes(inBar)) doum(t, T.low);
  if (T.tek && T.tek.includes(inBar)) noiseHit(t, { dur: 0.05, vol: 0.13, type: 'highpass', freq: 3500 });
  if (T.shaker && s % 2 === 1) noiseHit(t, { dur: 0.035, vol: 0.05 * T.shaker, type: 'bandpass', freq: 7000, q: 2 });
}

function tick() {
  if (!ctx || !current) return;
  const T = TRACKS[current];
  const sixteenth = 60 / T.bpm / 4;
  while (nextTime < ctx.currentTime + 0.15) {
    scheduleStep(T, step, nextTime);
    nextTime += sixteenth;
    step++;
  }
}

function level() {
  if (!enabled) return 0.0001;
  return ducked ? 0.25 : 1;
}

function fadeTo(v, secs) {
  const t = ctx.currentTime;
  trackGain.gain.cancelScheduledValues(t);
  trackGain.gain.setValueAtTime(Math.max(0.0001, trackGain.gain.value), t);
  trackGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, v), t + secs);
}

export const music = {
  // Toca uma trilha (troca com fade). Precisa de um gesto do usuário antes (política do navegador).
  play(name) {
    ctx = audioCtx();
    if (!ctx || !TRACKS[name]) return;
    if (!trackGain) {
      trackGain = ctx.createGain();
      trackGain.gain.value = 0.0001;
      trackGain.connect(musicOut());
    }
    if (!timer) timer = setInterval(tick, 25);
    if (name === current && !pending) { fadeTo(level(), 0.4); return; }
    clearTimeout(pending);
    const start = () => {
      pending = null;
      current = name;
      step = 0;
      nextTime = ctx.currentTime + 0.05;
      fadeTo(level(), 0.8);
    };
    if (current) {
      fadeTo(0.0001, 0.4);
      pending = setTimeout(start, 450);
    } else start();
  },
  stop() {
    if (!ctx || !trackGain) return;
    clearTimeout(pending);
    pending = null;
    fadeTo(0.0001, 0.4);
    setTimeout(() => { if (!pending) current = null; }, 450);
  },
  duck(on) {
    ducked = on;
    if (ctx && trackGain && current) fadeTo(level(), 0.3);
  },
  setEnabled(on) {
    enabled = on;
    if (ctx && trackGain && current) fadeTo(level(), 0.3);
  },
  isEnabled: () => enabled,
  get current() { return current; },
};
