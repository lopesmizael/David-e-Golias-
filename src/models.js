// Modelos procedurais em estilo "chibi" (cabeça grande, olhos expressivos,
// tons terrosos). Cada personagem é um THREE.Group com userData.parts
// (membros para animar), userData.radius (colisão), userData.aimY (altura do
// centro do corpo) e userData.headY (altura do centro da cabeça).
import * as THREE from 'three';

const matCache = new Map();
// material facetado (cenário)
export function mat(color, opts = {}) {
  const key = 'l' + color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts }));
  return matCache.get(key);
}
// material suave (personagens)
function soft(color, rough = 0.8, metal = 0) {
  const key = `s${color}-${rough}-${metal}`;
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
  return matCache.get(key);
}

function mesh(geo, material) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = true;
  return m;
}
const ball = (r, c, seg = 16) => mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg * 0.75)), typeof c === 'number' ? soft(c) : c);
const cyl = (rt, rb, h, c, seg = 16) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof c === 'number' ? soft(c) : c);
const cap = (r, len, c) => mesh(new THREE.CapsuleGeometry(r, len, 4, 10), typeof c === 'number' ? soft(c) : c);
const box = (w, h, d, c) => mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'number' ? soft(c) : c);

const SKIN = 0xe9b48c;
const SKIN_TAN = 0xc98e64;
const CREAM = 0xf0e4c6;
const LEATHER = 0x7a4d28;
const LEATHER_D = 0x5a361a;
const IRON = 0x8a8f96;
const BRONZE = 0xb78a3f;

// Membro com pivô no topo (para balançar ao andar); a cápsula pende para baixo.
function limb(r, len, color, x, y, z = 0) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  const m = cap(r, len, color);
  m.position.y = -len / 2 - r * 0.5;
  pivot.add(m);
  pivot.userData.len = len + r;
  return pivot;
}

// Rosto: olhos grandes com brilho, sobrancelhas, nariz, bochechas, sorriso.
function face(head, r, { brow = 0x4a2a12, iris = 0x4a2c16, mood = 'happy', cheeks = true } = {}) {
  const f = new THREE.Group();
  const eyeR = r * (mood === 'angry' ? 0.2 : 0.26);
  [-1, 1].forEach((s) => {
    const white = ball(eyeR, soft(0xffffff, 0.3));
    white.scale.set(0.9, 1.05, 0.55);
    white.position.set(s * r * 0.36, r * 0.05, r * 0.86);
    f.add(white);
    const ir = ball(eyeR * 0.72, soft(iris, 0.25));
    ir.scale.set(0.9, 1, 0.5);
    ir.position.set(s * r * 0.35, r * 0.02, r * 0.97);
    f.add(ir);
    const pupil = ball(eyeR * 0.38, soft(0x120a05, 0.2));
    pupil.scale.set(1, 1, 0.5);
    pupil.position.set(s * r * 0.35, r * 0.02, r * 1.02);
    f.add(pupil);
    const shine = ball(eyeR * 0.22, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    shine.position.set(s * r * 0.35 + eyeR * 0.3, r * 0.02 + eyeR * 0.35, r * 1.05);
    f.add(shine);
    const b = box(eyeR * 1.7, r * 0.07, r * 0.08, brow);
    b.position.set(s * r * 0.36, r * 0.36, r * 0.9);
    b.rotation.z = mood === 'angry' ? s * 0.45 : -s * 0.12;
    f.add(b);
    if (cheeks) {
      const ch = ball(r * 0.13, new THREE.MeshBasicMaterial({ color: 0xf08a7a, transparent: true, opacity: 0.45 }));
      ch.scale.set(1.2, 0.7, 0.3);
      ch.position.set(s * r * 0.58, -r * 0.22, r * 0.8);
      f.add(ch);
    }
  });
  const nose = ball(r * 0.09, soft(0xd99a74));
  nose.position.set(0, -r * 0.12, r * 0.99);
  f.add(nose);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(r * 0.16, r * 0.025, 6, 12, Math.PI),
    soft(mood === 'angry' ? 0x5a2a1a : 0x8a3a2a));
  smile.position.set(0, -r * 0.3, r * 0.93);
  smile.rotation.z = mood === 'angry' ? 0 : Math.PI;
  if (mood === 'angry') smile.scale.set(0.8, 0.4, 1);
  f.add(smile);
  f.traverse((o) => { o.castShadow = false; }); // detalhes pequenos não precisam de sombra
  head.add(f);
  return f;
}

// Cabelo bagunçado: vários tufos em volta da cabeça
function messyHair(head, r, color) {
  const g = new THREE.Group();
  const top = ball(r * 1.04, color);
  top.scale.set(1, 0.75, 1);
  top.position.set(0, r * 0.28, -r * 0.08);
  g.add(top);
  const tufts = [
    [-0.55, 0.62, 0.62], [-0.15, 0.78, 0.7], [0.25, 0.72, 0.68], [0.6, 0.55, 0.55], // franja
    [-0.85, 0.2, 0.2], [0.85, 0.2, 0.2], [-0.75, 0.0, -0.4], [0.75, 0.0, -0.4], // laterais
    [0, 0.2, -0.85], [-0.4, -0.15, -0.8], [0.4, -0.15, -0.8], [0, 0.95, -0.1], // nuca/topo
  ];
  tufts.forEach(([x, y, z], i) => {
    const t = ball(r * (0.3 + (i % 3) * 0.04), color, 10);
    t.position.set(x * r, y * r, z * r);
    t.scale.set(1, 0.85, 1);
    g.add(t);
  });
  head.add(g);
}

// Barba cheia e cacheada
function beard(head, r, color, big = false) {
  const g = new THREE.Group();
  const n = big ? 16 : 11;
  for (let i = 0; i < n; i++) {
    const a = (i / (n - 1)) * Math.PI * 1.1 - Math.PI * 0.05;
    const c = ball(r * (big ? 0.26 : 0.22), color, 10);
    c.position.set(Math.cos(a) * r * 0.72, -r * 0.35 - Math.sin(a) * r * (big ? 0.55 : 0.4), r * 0.45 + Math.sin(a) * r * 0.3);
    g.add(c);
  }
  const chin = ball(r * (big ? 0.42 : 0.34), color, 12);
  chin.position.set(0, -r * (big ? 0.95 : 0.78), r * 0.6);
  g.add(chin);
  const must = cap(r * 0.09, r * 0.35, color);
  must.rotation.z = Math.PI / 2;
  must.position.set(0, -r * 0.2, r * 0.98);
  g.add(must);
  head.add(g);
  return g;
}

function curlyHair(head, r, color) {
  const g = new THREE.Group();
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const y = 0.35 + Math.sin(i * 2.3) * 0.25;
    const c = ball(r * 0.28, color, 10);
    c.position.set(Math.cos(a) * r * 0.85, y * r, Math.sin(a) * r * 0.85 - r * 0.1);
    if (c.position.z > r * 0.5) c.position.y += r * 0.35; // deixa a testa livre
    g.add(c);
  }
  const top = ball(r * 0.95, color);
  top.scale.set(1, 0.6, 1);
  top.position.y = r * 0.45;
  g.add(top);
  head.add(g);
}

// Corpo genérico: proporções controladas por parâmetros.
function figure({ skin, legsColor = skin, legLen, bodyH, bodyW, headR, armLen, armR = 0.085, legR = 0.1, muscular = false, tunic }) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const hipY = legLen + legR * 1.2;
  const shoulderY = hipY + bodyH - 0.06;
  const torso = muscular
    ? cyl(bodyW * 1.15, bodyW * 0.85, bodyH, skin)
    : cyl(bodyW * 0.85, bodyW * 1.25, bodyH + 0.12, tunic);
  torso.position.y = hipY + bodyH / 2 - (muscular ? 0 : 0.08);
  body.add(torso);
  const shoulders = ball(bodyW * (muscular ? 1.18 : 0.9), muscular ? skin : tunic);
  shoulders.scale.set(1.05, 0.45, 0.8);
  shoulders.position.y = shoulderY - 0.02;
  body.add(shoulders);
  const headY = shoulderY + headR * 0.92;
  const head = ball(headR, skin, 24);
  head.position.y = headY;
  body.add(head);
  [-1, 1].forEach((s) => {
    const ear = ball(headR * 0.18, skin, 10);
    ear.scale.set(0.6, 1, 0.8);
    ear.position.set(s * headR * 0.97, 0, 0);
    head.add(ear);
  });
  const ax = bodyW * (muscular ? 1.22 : 1.0);
  const armL = limb(armR, armLen, skin, -ax, shoulderY);
  const armR_ = limb(armR, armLen, skin, ax, shoulderY);
  [armL, armR_].forEach((a) => {
    const hand = ball(armR * 1.35, skin, 12);
    hand.position.y = -a.userData.len - armR * 0.4;
    a.add(hand);
    a.userData.hand = hand;
  });
  const legL = limb(legR, legLen - legR, legsColor, -bodyW * 0.45, hipY);
  const legR_ = limb(legR, legLen - legR, legsColor, bodyW * 0.45, hipY);
  body.add(armL, armR_, legL, legR_);
  g.userData.parts = { body, torso, head, armL, armR: armR_, legL, legR: legR_ };
  g.userData.headY = headY;
  g.userData.aimY = hipY + bodyH * 0.45;
  g.userData.hipY = hipY;
  g.userData.shoulderY = shoulderY;
  return g;
}

function sandals(g, color = LEATHER) {
  const p = g.userData.parts;
  [p.legL, p.legR].forEach((l) => {
    const s = box(0.2, 0.06, 0.3, color);
    s.position.set(0, -l.userData.len - 0.06, 0.05);
    l.add(s);
    const strap = cyl(0.105, 0.105, 0.04, color, 12);
    strap.position.y = -l.userData.len + 0.12;
    l.add(strap);
  });
}

export function walkAnim(g, t, amount = 1) {
  const p = g.userData.parts;
  if (!p) return;
  const s = Math.sin(t) * 0.7 * amount;
  p.legL.rotation.x = s;
  p.legR.rotation.x = -s;
  p.armL.rotation.x = -s * 0.8;
  if (!g.userData.aiming) p.armR.rotation.x = s * 0.8;
  p.body.position.y = Math.abs(Math.cos(t)) * 0.05 * amount;
  p.head.rotation.z = Math.sin(t) * 0.04 * amount;
}

// ---------- Davi ----------
export function makeDavid() {
  const g = figure({ skin: SKIN, legLen: 0.42, bodyH: 0.6, bodyW: 0.27, headR: 0.42, armLen: 0.36, tunic: CREAM });
  const p = g.userData.parts;
  const ud = g.userData;
  face(p.head, 0.42, { iris: 0x5a3416 });
  messyHair(p.head, 0.42, 0x7a4a22);
  // faixa de tecido no cabelo
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.035, 6, 24), soft(0xc9a46a));
  band.rotation.x = Math.PI / 2 - 0.25;
  band.position.y = 0.2;
  p.head.add(band);
  // mangas curtas
  [p.armL, p.armR].forEach((a) => {
    const sl = cyl(0.12, 0.13, 0.16, CREAM, 12);
    sl.position.y = -0.06;
    a.add(sl);
  });
  // cinto e faixa transversal
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.045, 6, 20), soft(LEATHER));
  belt.rotation.x = Math.PI / 2;
  belt.position.y = ud.hipY + 0.12;
  p.body.add(belt);
  const knot = ball(0.06, LEATHER_D, 10);
  knot.position.set(0.12, ud.hipY + 0.1, 0.27);
  p.body.add(knot);
  const tail = cap(0.03, 0.18, LEATHER);
  tail.position.set(0.15, ud.hipY - 0.02, 0.28);
  p.body.add(tail);
  const sash = box(0.08, 0.72, 0.03, 0xb98a52);
  sash.position.set(0, ud.hipY + 0.38, 0.25);
  sash.rotation.z = 0.7;
  p.body.add(sash);
  // bolsa de pastor com pedras
  const bag = ball(0.13, 0x9a6a3a, 12);
  bag.scale.set(1, 0.9, 0.7);
  bag.position.set(-0.3, ud.hipY + 0.02, 0.12);
  p.body.add(bag);
  // calça curta enrolada
  [p.legL, p.legR].forEach((l) => {
    const pant = cyl(0.125, 0.115, 0.18, 0xd8c8a4, 12);
    pant.position.y = -0.08;
    l.add(pant);
  });
  sandals(g);
  // funda: duas cordas e a bolsinha, na mão direita
  const sling = new THREE.Group();
  [-0.03, 0.03].forEach((x) => {
    const cord = cyl(0.012, 0.012, 0.42, 0xb9925a, 5);
    cord.position.set(x, -0.21, 0);
    sling.add(cord);
  });
  const pouch = ball(0.06, LEATHER, 10);
  pouch.position.y = -0.44;
  sling.add(pouch);
  sling.position.y = p.armR.userData.hand.position.y;
  p.armR.add(sling);
  g.userData.radius = 0.5;
  return g;
}

// ---------- Ovelha ----------
export function makeSheep() {
  const g = new THREE.Group();
  const wool = new THREE.Group();
  const W = 0xf5eedd;
  const core = ball(0.42, W);
  core.scale.set(1, 0.85, 1.25);
  core.position.y = 0.62;
  wool.add(core);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const b = ball(0.2, W, 12);
    b.position.set(Math.cos(a) * 0.36, 0.62 + Math.sin(i * 1.9) * 0.18 + 0.12, Math.sin(a) * 0.46);
    wool.add(b);
  }
  g.add(wool);
  const head = new THREE.Group();
  head.position.set(0, 0.78, 0.55);
  const skull = ball(0.22, 0xe8d6b8, 16);
  skull.scale.set(0.9, 1, 1.05);
  head.add(skull);
  const tuft = ball(0.14, W, 12);
  tuft.position.set(0, 0.17, -0.02);
  head.add(tuft);
  [-1, 1].forEach((s) => {
    const ear = ball(0.08, 0xe0c9a6, 10);
    ear.scale.set(1.6, 0.6, 0.8);
    ear.position.set(s * 0.24, 0.05, -0.02);
    ear.rotation.z = s * -0.4;
    head.add(ear);
    const eye = ball(0.04, soft(0x1a1410, 0.2), 10);
    eye.position.set(s * 0.09, 0.04, 0.19);
    head.add(eye);
    const shine = ball(0.012, new THREE.MeshBasicMaterial({ color: 0xffffff }), 6);
    shine.position.set(s * 0.09 + 0.012, 0.055, 0.225);
    head.add(shine);
  });
  const nose = ball(0.03, 0xc98a7a, 8);
  nose.position.set(0, -0.08, 0.21);
  head.add(nose);
  g.add(head);
  const legs = [];
  [[-0.18, -0.3], [0.18, -0.3], [-0.18, 0.3], [0.18, 0.3]].forEach(([x, z]) => {
    const l = limb(0.06, 0.32, 0xd9c3a5, x, 0.42, z);
    legs.push(l);
    g.add(l);
  });
  g.userData.parts = { legs, head };
  g.userData.radius = 0.6;
  return g;
}

// ---------- Urso e leão ----------
function quadruped({ body, belly, size = 1, earC = body }) {
  const g = new THREE.Group();
  const torso = ball(0.62, body, 20);
  torso.scale.set(1, 0.9, 1.35);
  torso.position.y = 1.0;
  g.add(torso);
  const bellyM = ball(0.5, belly, 16);
  bellyM.scale.set(0.9, 0.7, 1.1);
  bellyM.position.set(0, 0.85, 0.15);
  g.add(bellyM);
  const head = new THREE.Group();
  head.position.set(0, 1.35, 0.85);
  const skull = ball(0.46, body, 20);
  head.add(skull);
  const snout = ball(0.22, belly, 14);
  snout.scale.set(1.1, 0.8, 1);
  snout.position.set(0, -0.12, 0.36);
  head.add(snout);
  const nose = ball(0.08, soft(0x1d1714, 0.3), 10);
  nose.scale.set(1.3, 0.8, 1);
  nose.position.set(0, -0.06, 0.56);
  head.add(nose);
  [-1, 1].forEach((s) => {
    const eye = ball(0.075, soft(0x1a1208, 0.2), 12);
    eye.position.set(s * 0.18, 0.1, 0.38);
    head.add(eye);
    const shine = ball(0.022, new THREE.MeshBasicMaterial({ color: 0xffffff }), 6);
    shine.position.set(s * 0.18 + 0.025, 0.13, 0.45);
    head.add(shine);
    const brow = box(0.14, 0.035, 0.04, soft(0x2a1a0e));
    brow.position.set(s * 0.18, 0.21, 0.4);
    brow.rotation.z = s * 0.4; // cara de bravo
    head.add(brow);
    const ear = ball(0.13, earC, 12);
    ear.scale.set(1, 1, 0.5);
    ear.position.set(s * 0.32, 0.36, -0.05);
    head.add(ear);
  });
  g.add(head);
  const legs = [];
  [[-0.32, -0.5], [0.32, -0.5], [-0.32, 0.5], [0.32, 0.5]].forEach(([x, z]) => {
    const l = limb(0.15, 0.5, body, x, 0.75, z);
    const paw = ball(0.17, belly, 10);
    paw.scale.set(1, 0.6, 1.2);
    paw.position.set(0, -0.72, 0.05);
    l.add(paw);
    legs.push(l);
    g.add(l);
  });
  g.scale.setScalar(size);
  g.userData.parts = { legs, head, torso };
  g.userData.aimY = 1.05 * size;
  return g;
}

export function makeBear() {
  const g = quadruped({ body: 0x6b4426, belly: 0xa77a52, size: 1.15 });
  g.userData.radius = 1.0;
  return g;
}

export function makeLion() {
  const g = quadruped({ body: 0xdaa451, belly: 0xf0d29a, size: 1.0, earC: 0xc98a3a });
  const head = g.userData.parts.head;
  // juba em camadas de tufos
  for (let ring = 0; ring < 2; ring++) {
    const n = 14 + ring * 4;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const t = ball(0.2 - ring * 0.03, ring ? 0x7a3e16 : 0x9a5220, 10);
      const R = 0.5 + ring * 0.16;
      t.position.set(Math.cos(a) * R, Math.sin(a) * R, -0.12 - ring * 0.1);
      head.add(t);
    }
  }
  const tail = cap(0.05, 0.8, 0xdaa451);
  tail.rotation.x = 1.0;
  tail.position.set(0, 1.1, -1.05);
  g.add(tail);
  const tip = ball(0.11, 0x7a3e16, 10);
  tip.position.set(0, 1.42, -1.45);
  g.add(tip);
  g.userData.radius = 0.95;
  return g;
}

export function quadAnim(g, t, amount = 1) {
  const p = g.userData.parts;
  if (!p?.legs) return;
  p.legs.forEach((l, i) => { l.rotation.x = Math.sin(t + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.6 * amount; });
  if (p.head) p.head.rotation.x = Math.sin(t * 0.5) * 0.08 * amount;
  if (p.torso) p.torso.position.y = 1.0 + Math.abs(Math.sin(t)) * 0.04 * amount;
}

// ---------- Guerreiros ----------
// Peças de armadura compartilhadas por soldados e Golias.
function warriorKit(g, { metal, strap = LEATHER_D, skirt = 0x8a4a2a, shoulderSize }) {
  const p = g.userData.parts;
  const ud = g.userData;
  // ombreiras
  [p.armL, p.armR].forEach((a, i) => {
    const pad = ball(shoulderSize, soft(metal, 0.45, 0.6), 14);
    pad.scale.set(1.1, 0.7, 1);
    pad.position.set(i ? 0.03 : -0.03, 0.02, 0);
    a.add(pad);
    for (let k = 0; k < 3; k++) {
      const rivet = ball(shoulderSize * 0.12, soft(0xd8d0b0, 0.3, 0.8), 6);
      rivet.position.set((i ? 1 : -1) * shoulderSize * 0.6, shoulderSize * 0.25, (k - 1) * shoulderSize * 0.45);
      a.add(rivet);
    }
    // braçadeira
    const br = cyl(0.11, 0.1, 0.16, soft(metal, 0.45, 0.6), 12);
    br.position.y = -a.userData.len + 0.1;
    a.add(br);
  });
  // cinto largo com fivela redonda
  const belt = cyl(0.3, 0.3, 0.14, strap);
  belt.scale.set(ud.bodyW / 0.3, 1, ud.bodyW / 0.3 * 0.85);
  belt.position.y = ud.hipY + 0.05;
  p.body.add(belt);
  const buckle = cyl(0.09, 0.09, 0.04, soft(metal, 0.35, 0.7), 14);
  buckle.rotation.x = Math.PI / 2;
  buckle.position.set(0, ud.hipY + 0.05, ud.bodyW * 0.88);
  p.body.add(buckle);
  // saia de tiras de couro
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const strip = box(0.11, 0.26, 0.03, i % 2 ? skirt : LEATHER);
    strip.position.set(Math.sin(a) * ud.bodyW * 0.92, ud.hipY - 0.12, Math.cos(a) * ud.bodyW * 0.8);
    strip.rotation.y = a;
    strip.rotation.x = 0.12;
    p.body.add(strip);
  }
  // grevas nas canelas
  [p.legL, p.legR].forEach((l) => {
    const gr = cyl(0.125, 0.11, 0.26, soft(metal, 0.45, 0.6), 12);
    gr.position.y = -l.userData.len + 0.2;
    l.add(gr);
  });
  sandals(g, LEATHER_D);
}

function spearMesh(len, thick) {
  const spear = new THREE.Group();
  spear.add(cyl(thick, thick, len, soft(0x6b4220), 6));
  const tip = mesh(new THREE.ConeGeometry(thick * 2.4, thick * 9, 6), soft(0xc8ccd2, 0.3, 0.8));
  tip.position.y = len / 2 + thick * 4.5;
  spear.add(tip);
  return spear;
}

export function makeSoldier({ shield = false } = {}) {
  const g = figure({ skin: SKIN_TAN, legLen: 0.55, bodyH: 0.72, bodyW: 0.34, headR: 0.36, armLen: 0.45, armR: 0.1, legR: 0.11, muscular: true });
  g.userData.bodyW = 0.34;
  const p = g.userData.parts;
  face(p.head, 0.36, { mood: 'angry', brow: 0x1a120a, cheeks: false });
  beard(p.head, 0.36, 0x2a1a10);
  // capacete de bronze com crista
  const helm = ball(0.38, soft(BRONZE, 0.4, 0.7), 18);
  helm.scale.set(1, 0.7, 1);
  helm.position.y = 0.14;
  p.head.add(helm);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.03, 6, 20), soft(0x8a6a2e, 0.4, 0.7));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.08;
  p.head.add(rim);
  const crest = box(0.07, 0.18, 0.5, 0xa5322a);
  crest.position.y = 0.42;
  p.head.add(crest);
  // couraça de couro no peito
  const chest = cyl(0.4, 0.33, 0.42, 0x8a4a2a);
  chest.position.y = g.userData.shoulderY - 0.24;
  p.body.add(chest);
  warriorKit(g, { metal: BRONZE, skirt: 0xa5322a, shoulderSize: 0.16 });
  const spear = spearMesh(2.0, 0.03);
  spear.position.set(0, p.armR.userData.hand.position.y, 0.08);
  p.armR.add(spear);
  p.spear = spear;
  if (shield) {
    const sh = new THREE.Group();
    const disc = cyl(0.52, 0.52, 0.08, 0x8b5a2b, 20);
    disc.rotation.x = Math.PI / 2;
    sh.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.04, 6, 24), soft(BRONZE, 0.4, 0.7));
    sh.add(ring);
    const boss = ball(0.13, soft(0xd8b44a, 0.35, 0.7), 12);
    boss.position.z = 0.05;
    sh.add(boss);
    sh.position.set(-0.12, 1.05, 0.48);
    p.body.add(sh);
    p.shield = sh;
  }
  g.userData.radius = 0.55;
  return g;
}

export function makeGoliath() {
  const g = figure({ skin: SKIN_TAN, legLen: 0.6, bodyH: 0.8, bodyW: 0.42, headR: 0.34, armLen: 0.5, armR: 0.13, legR: 0.14, muscular: true });
  g.userData.bodyW = 0.42;
  const p = g.userData.parts;
  face(p.head, 0.34, { mood: 'angry', brow: 0x120a05, cheeks: false, iris: 0x2a1a0e });
  beard(p.head, 0.34, 0x1e130b, true);
  curlyHair(p.head, 0.34, 0x1e130b);
  // peitoral de ferro trabalhado
  const chest = cyl(0.5, 0.42, 0.5, soft(IRON, 0.45, 0.6), 20);
  chest.position.y = g.userData.shoulderY - 0.27;
  p.body.add(chest);
  for (let r = 0; r < 3; r++) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.47 - r * 0.02, 0.025, 6, 24), soft(BRONZE, 0.4, 0.7));
    band.rotation.x = Math.PI / 2;
    band.position.y = g.userData.shoulderY - 0.1 - r * 0.15;
    p.body.add(band);
  }
  const emblem = cyl(0.11, 0.11, 0.04, soft(BRONZE, 0.35, 0.7), 16);
  emblem.rotation.x = Math.PI / 2;
  emblem.position.set(0, g.userData.shoulderY - 0.25, 0.47);
  p.body.add(emblem);
  warriorKit(g, { metal: IRON, skirt: 0x9a5a32, shoulderSize: 0.22 });
  // escudo dourado grande
  const sh = new THREE.Group();
  const disc = cyl(0.62, 0.62, 0.1, soft(0xd8b440, 0.35, 0.7), 24);
  disc.rotation.x = Math.PI / 2;
  sh.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 6, 28), soft(0x8a6a2e, 0.4, 0.7));
  sh.add(ring);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const rv = ball(0.035, soft(0xf0d880, 0.3, 0.8), 6);
    rv.position.set(Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0.06);
    sh.add(rv);
  }
  const boss = ball(0.16, soft(0xf0d070, 0.3, 0.8), 14);
  boss.position.z = 0.08;
  sh.add(boss);
  sh.position.set(-0.55, 1.1, 0.2);
  sh.rotation.y = -0.9;
  p.body.add(sh);
  p.shield = sh;
  // lança enorme
  const spear = spearMesh(2.5, 0.045);
  spear.position.set(0, p.armR.userData.hand.position.y, 0.1);
  p.armR.add(spear);
  g.scale.setScalar(3.1);
  g.userData.headY *= 3.1;
  g.userData.aimY *= 3.1;
  g.userData.radius = 1.6;
  return g;
}

// ---------- Objetos ----------
export function makeJar() {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    pts.push(new THREE.Vector2(0.12 + Math.sin(t * Math.PI) * 0.32 + (t > 0.88 ? 0.06 : 0), t * 1.0));
  }
  const body = mesh(new THREE.LatheGeometry(pts, 20), soft(0xb5652f, 0.7));
  g.add(body);
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.025, 6, 24), soft(0xf0e4c6));
  stripe.rotation.x = Math.PI / 2;
  stripe.position.y = 0.5;
  g.add(stripe);
  const stand = box(0.5, 0.6, 0.5, 0x8a6343);
  stand.position.y = -0.3;
  g.add(stand);
  g.position.y = 0.6;
  g.userData.radius = 0.55;
  g.userData.aimY = 1.1;
  return g;
}

export function makeStoneMesh(color, fire) {
  const m = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.13, 1),
    fire ? new THREE.MeshBasicMaterial({ color }) : soft(color, 0.9),
  );
  m.castShadow = true;
  return m;
}

export function makeSpear() {
  const g = new THREE.Group();
  const s = spearMesh(1.8, 0.035);
  s.rotation.x = Math.PI / 2;
  g.add(s);
  return g;
}

// Versão leve para o exército ao fundo (poucos objetos por soldado,
// geometrias compartilhadas): de longe parece igual e custa muito menos.
const LOW = {};
function lowGeo() {
  if (LOW.body) return LOW;
  LOW.body = new THREE.CylinderGeometry(0.38, 0.3, 0.8, 8);
  LOW.skirt = new THREE.CylinderGeometry(0.34, 0.42, 0.3, 8);
  LOW.legs = new THREE.BoxGeometry(0.38, 0.55, 0.2);
  LOW.head = new THREE.SphereGeometry(0.36, 10, 8);
  LOW.helm = new THREE.SphereGeometry(0.38, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  LOW.beard = new THREE.SphereGeometry(0.26, 8, 6);
  LOW.spear = new THREE.CylinderGeometry(0.03, 0.03, 2.2, 5);
  LOW.shield = new THREE.CylinderGeometry(0.45, 0.45, 0.08, 12);
  return LOW;
}
export function makeSoldierLow({ shield = false, tunic = 0xa5322a } = {}) {
  const L = lowGeo();
  const g = new THREE.Group();
  const add = (geo, color, x, y, z, m) => {
    const o = new THREE.Mesh(geo, m || soft(color));
    o.position.set(x, y, z);
    g.add(o);
    return o;
  };
  add(L.legs, SKIN_TAN, 0, 0.28, 0);
  add(L.skirt, LEATHER, 0, 0.62, 0);
  add(L.body, tunic, 0, 1.1, 0);
  add(L.head, SKIN_TAN, 0, 1.78, 0);
  add(L.helm, BRONZE, 0, 1.86, 0, soft(BRONZE, 0.4, 0.7));
  add(L.beard, 0x2a1a10, 0, 1.6, 0.18);
  add(L.spear, 0x6b4220, 0.48, 1.3, 0.1);
  if (shield) {
    const s = add(L.shield, 0x8b5a2b, -0.15, 1.05, 0.4);
    s.rotation.x = Math.PI / 2;
  }
  return g;
}
