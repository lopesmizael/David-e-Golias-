// Efeitos sonoros sintetizados com WebAudio (sem arquivos de áudio).
let ctx = null;
let muted = false;

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, { type = 'sine', vol = 0.2, slide = 0, delay = 0 } = {}) {
  const a = ac();
  if (!a || muted) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, { vol = 0.25, freq = 800, delay = 0 } = {}) {
  const a = ac();
  if (!a || muted) return;
  const t = a.currentTime + delay;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
}

export const sfx = {
  unlock: () => ac(),
  setMuted: (m) => { muted = m; },
  isMuted: () => muted,
  sling: () => { noise(0.18, { vol: 0.18, freq: 2500 }); tone(500, 0.15, { type: 'triangle', vol: 0.08, slide: 600 }); },
  hit: () => { noise(0.25, { vol: 0.35, freq: 600 }); tone(140, 0.2, { type: 'square', vol: 0.08, slide: -80 }); },
  block: () => { tone(900, 0.25, { type: 'square', vol: 0.08 }); tone(1350, 0.2, { type: 'square', vol: 0.05 }); },
  fire: () => { noise(0.5, { vol: 0.35, freq: 400 }); tone(90, 0.4, { type: 'sawtooth', vol: 0.1, slide: -40 }); },
  hurt: () => { tone(220, 0.25, { type: 'sawtooth', vol: 0.15, slide: -120 }); },
  roar: () => { noise(0.7, { vol: 0.25, freq: 300 }); tone(110, 0.6, { type: 'sawtooth', vol: 0.08, slide: -50 }); },
  coin: () => { tone(988, 0.08, { type: 'square', vol: 0.07 }); tone(1319, 0.2, { type: 'square', vol: 0.07, delay: 0.08 }); },
  click: () => tone(660, 0.05, { type: 'triangle', vol: 0.1 }),
  empty: () => tone(180, 0.12, { type: 'square', vol: 0.08 }),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.15, delay: i * 0.13 })),
  lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.35, { type: 'triangle', vol: 0.15, delay: i * 0.18 })),
};
