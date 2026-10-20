// Modelos low-poly procedurais. Cada personagem é um THREE.Group com
// userData.parts (membros para animar) e userData.radius (colisão).
import * as THREE from 'three';

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts }));
  return matCache.get(key);
}

function mesh(geo, color, opts) {
  const m = new THREE.Mesh(geo, mat(color, opts));
  m.castShadow = true;
  return m;
}
const box = (w, h, d, c) => mesh(new THREE.BoxGeometry(w, h, d), c);
const ball = (r, c, seg = 8) => mesh(new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2)), c);
const cyl = (rt, rb, h, c, seg = 8) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), c);

// Membro com pivô no topo (para balançar ao andar)
function limb(w, h, color, x, y, z = 0) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  const m = box(w, h, w, color);
  m.position.y = -h / 2;
  pivot.add(m);
  return pivot;
}

function humanoid({ skin, tunic, legs, scale = 1, head = 0.34 }) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const torso = box(0.62, 0.8, 0.38, tunic);
  torso.position.y = 1.25;
  body.add(torso);
  const skirt = cyl(0.3, 0.42, 0.35, tunic, 8);
  skirt.position.y = 0.78;
  body.add(skirt);
  const h = ball(head, skin, 10);
  h.position.y = 1.65 + head * 0.8;
  body.add(h);
  const armL = limb(0.17, 0.7, skin, -0.42, 1.6);
  const armR = limb(0.17, 0.7, skin, 0.42, 1.6);
  const legL = limb(0.2, 0.75, legs, -0.16, 0.8);
  const legR = limb(0.2, 0.75, legs, 0.16, 0.8);
  body.add(armL, armR, legL, legR);
  g.scale.setScalar(scale);
  g.userData.parts = { body, torso, head: h, armL, armR, legL, legR };
  return g;
}

export function walkAnim(g, t, amount = 1) {
  const p = g.userData.parts;
  if (!p) return;
  const s = Math.sin(t) * 0.7 * amount;
  p.legL.rotation.x = s;
  p.legR.rotation.x = -s;
  p.armL.rotation.x = -s * 0.8;
  if (!g.userData.aiming) p.armR.rotation.x = s * 0.8;
  p.body.position.y = Math.abs(Math.cos(t)) * 0.06 * amount;
}

export function makeDavid() {
  const g = humanoid({ skin: 0xe8b48a, tunic: 0x7fb7d9, legs: 0xe8b48a });
  const p = g.userData.parts;
  // cabelo castanho cacheado
  const hair = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const c = ball(0.13, 0x5a3417, 6);
    c.position.set(Math.cos(a) * 0.26, 0.12 + Math.sin(i * 1.7) * 0.05, Math.sin(a) * 0.26 + 0.04);
    hair.add(c);
  }
  const top = ball(0.3, 0x5a3417, 8);
  top.position.y = 0.14;
  top.scale.y = 0.6;
  hair.add(top);
  p.head.add(hair);
  // cinto e bolsa de pastor
  const belt = box(0.66, 0.1, 0.42, 0x6b4220);
  belt.position.y = 0.95;
  p.body.add(belt);
  const bag = box(0.2, 0.22, 0.12, 0x8a5a2b);
  bag.position.set(-0.3, 0.85, 0.2);
  p.body.add(bag);
  // funda na mão direita
  const sling = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 4, 10), mat(0x6b4220));
  sling.position.y = -0.75;
  p.armR.add(sling);
  // sandálias
  [p.legL, p.legR].forEach((l) => {
    const s = box(0.24, 0.07, 0.32, 0x6b4220);
    s.position.set(0, -0.76, 0.04);
    l.add(s);
  });
  g.userData.radius = 0.5;
  return g;
}

export function makeSheep() {
  const g = new THREE.Group();
  const wool = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const b = ball(0.32, 0xf4f1ea, 7);
    b.position.set((Math.random() - 0.5) * 0.5, 0.65 + Math.random() * 0.15, (i / 6 - 0.5) * 0.8);
    wool.add(b);
  }
  g.add(wool);
  const head = ball(0.2, 0x3b3330, 7);
  head.position.set(0, 0.75, 0.6);
  head.scale.z = 1.3;
  g.add(head);
  const legs = [];
  [[-0.2, -0.3], [0.2, -0.3], [-0.2, 0.3], [0.2, 0.3]].forEach(([x, z]) => {
    const l = limb(0.09, 0.45, 0x3b3330, x, 0.45, z);
    legs.push(l);
    g.add(l);
  });
  g.userData.parts = { legs, head };
  g.userData.radius = 0.6;
  return g;
}

function quadruped({ body, belly, size = 1, mane = null }) {
  const g = new THREE.Group();
  const torso = box(1.0, 0.8, 1.7, body);
  torso.position.y = 1.0;
  g.add(torso);
  const head = new THREE.Group();
  head.position.set(0, 1.35, 1.0);
  const skull = box(0.7, 0.6, 0.65, body);
  head.add(skull);
  const snout = box(0.4, 0.3, 0.35, belly);
  snout.position.set(0, -0.1, 0.45);
  head.add(snout);
  const nose = box(0.16, 0.1, 0.06, 0x1d1714);
  nose.position.set(0, 0, 0.64);
  head.add(nose);
  [-0.22, 0.22].forEach((x) => {
    const e = box(0.08, 0.08, 0.04, 0x111111);
    e.position.set(x, 0.12, 0.33);
    head.add(e);
    const ear = box(0.16, 0.16, 0.08, body);
    ear.position.set(x * 1.2, 0.35, -0.05);
    head.add(ear);
  });
  if (mane) {
    const m = mesh(new THREE.DodecahedronGeometry(0.62, 0), mane);
    m.position.set(0, 0.05, -0.15);
    m.scale.set(1.15, 1.15, 0.7);
    head.add(m);
  }
  g.add(head);
  const legs = [];
  [[-0.35, -0.6], [0.35, -0.6], [-0.35, 0.6], [0.35, 0.6]].forEach(([x, z]) => {
    const l = limb(0.28, 0.65, body, x, 0.7, z);
    legs.push(l);
    g.add(l);
  });
  g.scale.setScalar(size);
  g.userData.parts = { legs, head, torso };
  return g;
}

export function makeBear() {
  const g = quadruped({ body: 0x5b3a22, belly: 0x8a6343, size: 1.15 });
  g.userData.radius = 1.0;
  return g;
}

export function makeLion() {
  const g = quadruped({ body: 0xd8a24a, belly: 0xedc98a, size: 1.0, mane: 0x8a4b1c });
  const tail = cyl(0.05, 0.05, 0.9, 0xd8a24a, 5);
  tail.rotation.x = 1.0;
  tail.position.set(0, 1.1, -1.1);
  g.add(tail);
  g.userData.radius = 0.95;
  return g;
}

export function quadAnim(g, t, amount = 1) {
  const p = g.userData.parts;
  if (!p?.legs) return;
  p.legs.forEach((l, i) => { l.rotation.x = Math.sin(t + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.6 * amount; });
  if (p.head) p.head.rotation.x = Math.sin(t * 0.5) * 0.08 * amount;
}

export function makeSoldier({ shield = false } = {}) {
  const g = humanoid({ skin: 0xc98d62, tunic: 0xa5322a, legs: 0xc98d62 });
  const p = g.userData.parts;
  const helm = cyl(0.3, 0.36, 0.3, 0x9b7b3a, 8);
  helm.position.y = 0.18;
  p.head.add(helm);
  const crest = box(0.08, 0.25, 0.5, 0xd9c35c);
  crest.position.y = 0.42;
  p.head.add(crest);
  const armor = box(0.66, 0.4, 0.42, 0x9b7b3a);
  armor.position.y = 1.4;
  p.body.add(armor);
  const spear = new THREE.Group();
  const shaft = cyl(0.035, 0.035, 2.2, 0x6b4220, 5);
  spear.add(shaft);
  const tip = mesh(new THREE.ConeGeometry(0.08, 0.3, 5), 0xc0c0c8);
  tip.position.y = 1.2;
  spear.add(tip);
  spear.position.set(0, -0.6, 0.1);
  p.armR.add(spear);
  p.spear = spear;
  if (shield) {
    const sh = cyl(0.55, 0.55, 0.1, 0x8b5a2b, 10);
    sh.rotation.x = Math.PI / 2;
    sh.position.set(-0.1, 1.2, 0.5);
    const boss = ball(0.15, 0xc9a640, 6);
    boss.position.y = 0.06;
    sh.add(boss);
    p.body.add(sh);
    p.shield = sh;
  }
  g.userData.radius = 0.55;
  return g;
}

export function makeGoliath() {
  const g = humanoid({ skin: 0xc98d62, tunic: 0x7a2a22, legs: 0xc98d62, scale: 3.1, head: 0.32 });
  const p = g.userData.parts;
  // armadura de bronze com escamas
  const mail = box(0.7, 0.85, 0.44, 0xb08a3e);
  mail.position.y = 1.27;
  p.body.add(mail);
  for (let r = 0; r < 4; r++) {
    const row = box(0.72, 0.05, 0.46, 0x8a6a2e);
    row.position.y = 0.95 + r * 0.2;
    p.body.add(row);
  }
  const helm = cyl(0.3, 0.36, 0.34, 0xc9a640, 8);
  helm.position.y = 0.16;
  p.head.add(helm);
  const plume = box(0.06, 0.3, 0.55, 0x2b2b2b);
  plume.position.y = 0.45;
  p.head.add(plume);
  const beard = box(0.3, 0.22, 0.12, 0x2b1a0e);
  beard.position.set(0, -0.2, 0.26);
  p.head.add(beard);
  // escudo dourado grande
  const sh = new THREE.Group();
  const disc = cyl(0.62, 0.62, 0.1, 0xd8b440, 12);
  disc.rotation.x = Math.PI / 2;
  sh.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 4, 16), mat(0x8a6a2e));
  sh.add(ring);
  const boss = ball(0.16, 0xf0d070, 6);
  boss.position.z = 0.08;
  sh.add(boss);
  sh.position.set(-0.15, 1.3, 0.55);
  p.body.add(sh);
  p.shield = sh;
  // lança enorme
  const spear = new THREE.Group();
  spear.add(cyl(0.05, 0.05, 2.6, 0x4a2f15, 5));
  const tip = mesh(new THREE.ConeGeometry(0.1, 0.4, 5), 0xd0d0d8);
  tip.position.y = 1.45;
  spear.add(tip);
  spear.position.set(0, -0.6, 0.1);
  p.armR.add(spear);
  // a cabeça é o ponto fraco: guardamos uma esfera de acerto
  g.userData.radius = 1.6;
  return g;
}

export function makeJar() {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    pts.push(new THREE.Vector2(0.12 + Math.sin(t * Math.PI) * 0.32 + (t > 0.85 ? 0.06 : 0), t * 1.0));
  }
  const body = mesh(new THREE.LatheGeometry(pts, 9), 0xb5652f);
  g.add(body);
  const stand = box(0.5, 0.6, 0.5, 0x8a6343);
  stand.position.y = -0.3;
  g.add(stand);
  g.position.y = 0.6;
  g.userData.radius = 0.55;
  g.userData.center = 0.5;
  return g;
}

export function makeStoneMesh(color, fire) {
  const m = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.13, 0),
    fire ? new THREE.MeshBasicMaterial({ color }) : mat(color),
  );
  m.castShadow = true;
  return m;
}

export function makeSpear() {
  const g = new THREE.Group();
  const shaft = cyl(0.04, 0.04, 1.8, 0x6b4220, 5);
  shaft.rotation.x = Math.PI / 2;
  g.add(shaft);
  const tip = mesh(new THREE.ConeGeometry(0.08, 0.3, 5), 0xc0c0c8);
  tip.rotation.x = Math.PI / 2;
  tip.position.z = 1.0;
  g.add(tip);
  return g;
}
