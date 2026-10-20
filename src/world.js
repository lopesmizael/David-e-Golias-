// Cenários: pasto, deserto e vale de Elá — tudo procedural.
import * as THREE from 'three';
import { mat, makeSoldier } from './models.js';

const PALETTES = {
  'pasto': { sky: 0x9fd3ef, fog: 0xbfe0ef, ground: 0x7db04a, path: 0xc9b077, hill: 0x5f8f3a, sun: 0xfff1d6, amb: 0.75 },
  'pasto-tarde': { sky: 0xf2b27a, fog: 0xf0c49a, ground: 0x8aa344, path: 0xc9a06a, hill: 0x6a7f38, sun: 0xffc68a, amb: 0.6 },
  'deserto': { sky: 0xd9e3e6, fog: 0xe8d2b0, ground: 0xd9935a, path: 0xe3a76c, hill: 0xb5643a, sun: 0xfff0d0, amb: 0.7 },
  'deserto-tarde': { sky: 0xe39a6c, fog: 0xd9906a, ground: 0xc97f4c, path: 0xd8935c, hill: 0x9a4d2e, sun: 0xffb27a, amb: 0.55 },
  'vale': { sky: 0x4e5f80, fog: 0x8a7a72, ground: 0xc9a77a, path: 0xd9b88a, hill: 0x7a5a42, sun: 0xffd9a0, amb: 0.55 },
};

const rand = (a, b) => a + Math.random() * (b - a);

function tree(color) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 2.2, 6), mat(0x6b4a2b));
  trunk.position.y = 1.1;
  g.add(trunk);
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1 - i * 0.2, 0), mat(color));
    c.position.set(rand(-0.3, 0.3), 2.4 + i * 0.6, rand(-0.3, 0.3));
    c.castShadow = true;
    g.add(c);
  }
  return g;
}

function palm() {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.7, 6), mat(0x8a6a42));
    seg.position.set(i * 0.06, 0.35 + i * 0.68, 0);
    g.add(seg);
  }
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 1.8), mat(0x3f8a3a));
    const pivot = new THREE.Group();
    pivot.position.set(0.3, 3.5, 0);
    pivot.rotation.y = (i / 6) * Math.PI * 2;
    leaf.position.z = 0.85;
    leaf.rotation.x = 0.45;
    pivot.add(leaf);
    g.add(pivot);
  }
  return g;
}

function rock(color, s = 1) {
  const r = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat(color));
  r.scale.y = rand(0.5, 0.9);
  r.rotation.set(rand(0, 3), rand(0, 3), 0);
  r.castShadow = true;
  r.receiveShadow = true;
  return r;
}

function mesa(color) {
  // formação rochosa em forma de cogumelo (como as do deserto)
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.4, 6, 7), mat(color));
  stem.position.y = 3;
  g.add(stem);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 3.2, 2.2, 8), mat(color));
  cap.position.y = 7;
  g.add(cap);
  return g;
}

function tent(color = 0xe9dfc4) {
  const g = new THREE.Group();
  const t = new THREE.Mesh(new THREE.ConeGeometry(2, 2.2, 4), mat(color));
  t.rotation.y = Math.PI / 4;
  t.position.y = 1.1;
  t.castShadow = true;
  g.add(t);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1), new THREE.MeshBasicMaterial({ color: 0x2a1f18 }));
  door.position.set(0, 0.5, 1.02);
  door.rotation.x = -0.3;
  g.add(door);
  return g;
}

function fenceLine(width, z, color = 0x6b4a2b) {
  const g = new THREE.Group();
  const rail = new THREE.Mesh(new THREE.BoxGeometry(width, 0.12, 0.12), mat(color));
  rail.position.set(0, 0.8, z);
  g.add(rail);
  const rail2 = rail.clone();
  rail2.position.y = 0.4;
  g.add(rail2);
  const postGeo = new THREE.BoxGeometry(0.15, 1.1, 0.15);
  const n = Math.floor(width / 1.2);
  const posts = new THREE.InstancedMesh(postGeo, mat(color), n);
  const m = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    m.makeTranslation(-width / 2 + i * 1.2, 0.55, z);
    posts.setMatrixAt(i, m);
  }
  g.add(posts);
  return g;
}

// Exército ao fundo: fileira de soldados estáticos (decorativos)
function army(z, count, spread) {
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const s = makeSoldier({ shield: i % 3 === 0 });
    s.position.set(-spread / 2 + (i / (count - 1)) * spread + rand(-0.2, 0.2), 0, z + rand(-0.8, 0.8) - (i % 2) * 1.2);
    s.rotation.y = 0;
    s.traverse((o) => { o.castShadow = false; });
    g.add(s);
  }
  return g;
}

export function buildWorld(scene, key) {
  const P = PALETTES[key];
  const root = new THREE.Group();
  scene.background = new THREE.Color(P.sky);
  scene.fog = new THREE.Fog(P.fog, 35, 95);

  const hemi = new THREE.HemisphereLight(P.sky, P.ground, P.amb);
  root.add(hemi);
  const sun = new THREE.DirectionalLight(P.sun, 1.25);
  sun.position.set(12, 22, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -25, right: 25, top: 25, bottom: -40, near: 1, far: 80 });
  root.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 220, 30, 30), mat(P.ground));
  const pos = ground.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const far = Math.max(0, Math.abs(x) - 14) + Math.max(0, -y - 45);
    pos.setZ(i, Math.sin(x * 0.2) * Math.cos(y * 0.15) * 0.3 + far * far * 0.01);
  }
  ground.geometry.computeVertexNormals();
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);

  // faixa de terra onde o Davi anda
  const path = new THREE.Mesh(new THREE.PlaneGeometry(16, 60), mat(P.path));
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.02, -18);
  path.receiveShadow = true;
  root.add(path);

  // morros ao fundo
  for (let i = 0; i < 14; i++) {
    const h = new THREE.Mesh(new THREE.ConeGeometry(rand(10, 18), rand(8, 18), 6), mat(P.hill));
    h.position.set(-70 + i * 11 + rand(-3, 3), 3, -70 + rand(-8, 4));
    root.add(h);
  }

  if (key.startsWith('pasto')) {
    for (let i = 0; i < 22; i++) {
      const side = i % 2 ? 1 : -1;
      const t = tree(i % 3 ? 0x4f8a34 : 0x3f7a2c);
      t.position.set(side * rand(10, 26), 0, rand(-50, 6));
      t.scale.setScalar(rand(0.8, 1.4));
      root.add(t);
    }
    for (let i = 0; i < 18; i++) {
      const r = rock(0x9a948a, rand(0.3, 1.0));
      r.position.set(rand(-24, 24), 0.2, rand(-45, 4));
      if (Math.abs(r.position.x) < 8 && r.position.z > -36) r.position.x += 16 * Math.sign(r.position.x || 1);
      root.add(r);
    }
    root.add(fenceLine(30, -38));
  } else {
    for (let i = 0; i < 6; i++) {
      const side = i % 2 ? 1 : -1;
      const m = mesa(P.hill);
      m.position.set(side * rand(22, 34), 0, -20 - i * 9);
      m.scale.setScalar(rand(0.8, 1.3));
      root.add(m);
    }
    for (let i = 0; i < 8; i++) {
      const p = palm();
      p.position.set((i % 2 ? 1 : -1) * rand(11, 20), 0, rand(-36, 4));
      root.add(p);
    }
    for (let i = 0; i < 6; i++) {
      const t = tent(i % 2 ? 0xe9dfc4 : 0xd9c9a4);
      t.position.set((i % 2 ? 1 : -1) * rand(10, 16), 0, rand(-30, 2));
      root.add(t);
    }
    for (let i = 0; i < 12; i++) {
      const r = rock(P.hill, rand(0.3, 0.8));
      r.position.set((Math.random() < 0.5 ? -1 : 1) * rand(9, 22), 0.2, rand(-40, 4));
      root.add(r);
    }
    // exército filisteu atrás da cerca
    root.add(fenceLine(34, -36, 0x5a3a22));
    root.add(army(-39, key === 'vale' ? 26 : 20, 32));
    if (key === 'vale') {
      // exército de Israel atrás do jogador
      const israel = army(10, 16, 28);
      israel.rotation.y = Math.PI;
      israel.position.z = 20;
      israel.traverse((o) => { if (o.material?.color?.getHex() === 0xa5322a) o.material = mat(0x3a5fa5); });
      root.add(israel);
    }
  }

  scene.add(root);
  return root;
}
