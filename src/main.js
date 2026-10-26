// Davi e Golias — reconstrução do jogo a partir do vídeo de gameplay.
import * as THREE from 'three';
import { LEVELS, STONES, UPGRADES, QUIZ, PRIZES, DIFFICULTIES } from './data.js';
import { loadSave, writeSave, resetSave } from './save.js';
import { sfx } from './audio.js';
import { music } from './music.js';
import { buildWorld } from './world.js';
import {
  makeDavid, makeSheep, makeBear, makeLion, makeSoldier, makeGoliath, makeJar,
  makeStoneMesh, makeSpear, walkAnim, quadAnim, mat,
} from './models.js';

const $ = (id) => document.getElementById(id);
const diff = () => DIFFICULTIES[save.difficulty] || DIFFICULTIES.normal;
const TRACK_FOR_SCENE = { 'pasto': 'pasto', 'pasto-tarde': 'pasto', 'deserto': 'combate', 'deserto-tarde': 'combate', 'vale': 'golias' };
const GRAVITY = 14;
const LANE = 6.5; // Davi anda entre -LANE e +LANE
const SPAWN_Z = -33;

// ---------- Render ----------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);
const raycaster = new THREE.Raycaster();

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // em retrato a câmera abre mais para caber a arena
  camera.fov = w / h < 1 ? 75 : 55;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------- Estado ----------
let save = loadSave();
let state = 'menu';
let world = null;
let G = null; // dados da partida atual
let timeScale = 1;
let slowMoT = 0;

const screens = ['menu', 'map', 'intro', 'shop', 'pause', 'result', 'over', 'victory', 'brook'];
function show(name) {
  screens.forEach((s) => $('screen-' + s).classList.toggle('hidden', s !== name));
  $('hud').classList.toggle('hidden', !(name === null || name === 'pause' || name === 'shop') || !G);
}

function persist() { writeSave(save); }

// ---------- Cena de fundo do menu/mapa ----------
let menuDavid = null;
function setBackdrop(key) {
  clearWorld();
  world = buildWorld(scene, key);
  menuDavid = makeDavid();
  menuDavid.position.set(0, 0, -2);
  menuDavid.rotation.y = Math.PI * 0.15;
  scene.add(menuDavid);
  for (let i = 0; i < 4; i++) {
    const s = makeSheep();
    s.position.set(-3 + i * 2.2, 0, -5 - (i % 2) * 2);
    s.rotation.y = i;
    world.add(s);
  }
}

function clearWorld() {
  if (world) scene.remove(world);
  if (menuDavid) scene.remove(menuDavid);
  if (G) {
    [G.player.mesh, ...G.enemies.map((e) => e.mesh), ...G.sheep.map((s) => s.mesh),
      ...G.stones.map((s) => s.mesh), ...G.spears.map((s) => s.mesh), ...G.fx.map((f) => f.mesh)]
      .forEach((m) => scene.remove(m));
  }
  world = null;
  menuDavid = null;
}

// ---------- Partida ----------
function startLevel(idx) {
  const L = LEVELS[idx];
  clearWorld();
  G = null;
  world = buildWorld(scene, L.scene);
  const player = { mesh: makeDavid(), x: 0, hp: 0, maxHp: 0, cd: 0, inv: 0, walkT: 0, throwT: 0, vx: 0 };
  player.maxHp = Math.max(2, 5 + save.upgrades.vida + diff().playerHp);
  player.hp = player.maxHp;
  scene.add(player.mesh);
  G = {
    idx, L, player, enemies: [], sheep: [], stones: [], spears: [], fx: [],
    t: 0, waveI: 0, score: 0, throws: 0, hits: 0, kills: 0,
    total: L.waves.length, ended: false, continued: false, outOfAmmoT: 0, msgT: 0,
    stone: 'comum', lives: diff().lives, combo: 0,
  };
  for (let i = 0; i < L.sheep; i++) {
    const m = makeSheep();
    const s = { mesh: m, x: -4 + (i / Math.max(1, L.sheep - 1)) * 8, z: -4 - (i % 2) * 2.5, tx: 0, tz: 0, wT: 0, fled: false, fleeDir: 0 };
    s.tx = s.x; s.tz = s.z;
    m.position.set(s.x, 0, s.z);
    scene.add(m);
    G.sheep.push(s);
  }
  // Fase do Golias: as pedras de fogo vêm do riacho (tela anterior); ao recomeçar
  // direto, garante ao menos 3 para a fase continuar vencível.
  if (isBossLevel(L) && save.stones.fogo < 3) {
    save.stones.fogo = 3;
    persist();
  }
  G.stone = pickAvailable('comum');
  $('floats').innerHTML = '';
  updateCombo();
  $('sheepInfo').classList.toggle('hidden', !L.protectSheep);
  state = 'play';
  show(null);
  updateHud();
  flash(L.goal, 2.5);
  music.duck(false);
  music.play(TRACK_FOR_SCENE[L.scene]);
}

function isBossLevel(L) { return L.waves.some((w) => w[1] === 'golias'); }

function pickAvailable(pref) {
  if (save.stones[pref] > 0) return pref;
  return ['comum', 'ferro', 'fogo'].find((k) => save.stones[k] > 0) || pref;
}

function spawn(type, xr) {
  const x = xr * (LANE - 0.5);
  let mesh, e;
  const base = { type, x, z: SPAWN_Z, hp: 1, maxHp: 1, speed: 0, t: Math.random() * 10, state: 'walk', atk: 0, dead: false, deadT: 0 };
  switch (type) {
    case 'jarro':
      mesh = makeJar();
      e = { ...base, z: -13 - Math.random() * 7, hp: 1, static: true };
      break;
    case 'urso':
      mesh = makeBear();
      e = { ...base, hp: 3, speed: 2.4 };
      sfx.roar();
      break;
    case 'leao':
      mesh = makeLion();
      e = { ...base, hp: 4, speed: 3.8, zig: Math.random() * 6 };
      sfx.roar();
      break;
    case 'soldado':
      mesh = makeSoldier();
      e = { ...base, hp: 2, speed: 2.2, stopZ: -11 - Math.random() * 6, throwsLeft: 2 };
      break;
    case 'escudeiro':
      mesh = makeSoldier({ shield: true });
      e = { ...base, hp: 2, speed: 1.8, stopZ: -10 - Math.random() * 5, throwsLeft: 2, shieldHp: 3 };
      break;
    case 'golias':
      mesh = makeGoliath();
      e = { ...base, z: -28, hp: 12, speed: 0.9, phase: 'walk', phaseT: 3, boss: true };
      sfx.roar();
      flash('Golias desafia Israel!', 2.5);
      break;
  }
  if (type !== 'jarro') {
    e.hp = Math.max(1, Math.round(e.hp * diff().enemyHp));
    e.speed *= diff().enemySpeed;
  }
  e.maxHp = e.hp;
  e.mesh = mesh;
  e.baseY = mesh.position.y;
  mesh.position.set(e.x, mesh.position.y, e.z);
  scene.add(mesh);
  G.enemies.push(e);
}

// ---------- Tiro ----------
function throwStone(target) {
  const P = G.player;
  if (P.cd > 0 || G.ended) return;
  const type = save.stones[G.stone] > 0 ? G.stone : pickAvailable(G.stone);
  if (save.stones[type] <= 0) {
    sfx.empty();
    flash(canAffordStones() ? 'Compre mais pedras! Toque no 🛒' : 'Compre mais pedras!', 1.8);
    $('btnShopHud').classList.add('pulse');
    return;
  }
  G.stone = type;
  save.stones[type]--;
  G.throws++;
  P.cd = 0.75 - save.upgrades.recarga * 0.15;
  P.throwT = 0.3;
  const from = new THREE.Vector3(P.x + 0.4, 2.1, -0.3);
  const to = target.clone();
  if (to.z > from.z - 2) to.z = from.z - 2;
  const d = Math.hypot(to.x - from.x, to.z - from.z);
  const vh = 22 + save.upgrades.forca * 5;
  const tFlight = Math.max(0.25, d / vh);
  const vel = new THREE.Vector3((to.x - from.x) / tFlight, (to.y - from.y + 0.5 * GRAVITY * tFlight * tFlight) / tFlight, (to.z - from.z) / tFlight);
  const S = STONES[type];
  const mesh = makeStoneMesh(S.color, type === 'fogo');
  mesh.position.copy(from);
  scene.add(mesh);
  G.stones.push({ mesh, pos: from, vel, type, life: 4 });
  sfx.sling();
  updateHud();
}

function enemyAimPoint(e) {
  const p = e.mesh.position.clone();
  p.y = e.mesh.userData.aimY;
  return p;
}

function autoTarget() {
  const P = G.player;
  let best = null, bd = Infinity;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const d = Math.abs(e.x - P.x) * 2 + Math.abs(e.z);
    if (d < bd) { bd = d; best = e; }
  }
  if (best) {
    const p = enemyAimPoint(best);
    // antecipa o movimento do alvo
    if (!best.static) p.z += best.speed * Math.abs(p.z) / 24;
    return p;
  }
  return new THREE.Vector3(P.x, 1.2, -20);
}

function aimFromScreen(cx, cy) {
  const ndc = new THREE.Vector2((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const meshes = G.enemies.filter((e) => !e.dead).map((e) => e.mesh);
  const hit = raycaster.intersectObjects(meshes, true)[0];
  if (hit) return hit.point;
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.0);
  const p = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(plane, p) && p.z < -1) return p;
  const far = raycaster.ray.at(30, new THREE.Vector3());
  return far;
}

// ---------- Efeitos ----------
function puff(pos, color = 0xf0e6d0, n = 8, size = 0.35) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(size * (0.6 + Math.random() * 0.6), 0),
      new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.9, flatShading: true }));
    m.position.copy(pos);
    scene.add(m);
    const v = new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4);
    G.fx.push({ mesh: m, vel: v, life: 0.6 + Math.random() * 0.4, max: 1, grow: 1.8 });
  }
}

function sparks(pos, n = 20) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08),
      new THREE.MeshBasicMaterial({ color: Math.random() < 0.5 ? 0xffb020 : 0xff5a10, transparent: true }));
    m.position.copy(pos);
    scene.add(m);
    const v = new THREE.Vector3((Math.random() - 0.5) * 9, Math.random() * 7, (Math.random() - 0.5) * 9);
    G.fx.push({ mesh: m, vel: v, life: 0.5 + Math.random() * 0.6, max: 1, grow: 0, grav: true });
  }
}

let msgTimer = null;
function flash(text, secs = 1.6) {
  const el = $('msg');
  el.textContent = text;
  el.classList.remove('hidden');
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = '';
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => el.classList.add('hidden'), secs * 1000);
}

// ---------- Dano ----------
function damageEnemy(e, stone, hitPos) {
  const S = STONES[stone.type];
  let dmg = S.damage;
  if (e.type === 'golias') {
    const headshot = hitPos.y > e.mesh.userData.headY - 0.6;
    if (e.phase === 'shield' && !S.pierce) {
      sfx.block();
      puff(hitPos, 0xffe08a, 4, 0.2);
      floatText(hitPos, 'Bloqueou!', 'block');
      flash('Mude para a pedra de fogo!', 1.6);
      return false;
    }
    if (headshot) dmg *= 2;
    if (headshot) floatText(hitPos, 'Na testa! x2', 'crit');
  }
  addCombo();
  if (e.shieldHp > 0 && !S.pierce) {
    e.shieldHp -= dmg;
    sfx.block();
    puff(hitPos, 0xc9a640, 4, 0.2);
    floatText(hitPos, 'Escudo!', 'block');
    if (e.shieldHp <= 0) {
      e.mesh.userData.parts.shield.visible = false;
      flash('Você quebrou o escudo!', 1.2);
    }
    return true;
  }
  if (!(e.type === 'golias' && hitPos.y > e.mesh.userData.headY - 0.6)) floatText(hitPos, e.hp - dmg <= 0 ? '' : 'Acertou!');
  e.hp -= dmg;
  e.hurtT = 0.25;
  sfx.hit();
  if (stone.type === 'fogo') { sparks(hitPos, 26); sfx.fire(); } else puff(hitPos);
  if (e.hp <= 0) killEnemy(e);
  return true;
}

function killEnemy(e) {
  e.dead = true;
  e.deadT = 0;
  G.kills++;
  const pts = Math.round({ jarro: 100, urso: 300, leao: 400, soldado: 200, escudeiro: 300, golias: 2000 }[e.type] * comboMult());
  G.score += pts;
  floatText(enemyAimPoint(e).add(new THREE.Vector3(0, 0.6, 0)), '+' + pts, 'pts');
  if (e.type === 'urso') flash('Você derrubou o urso!', 1.6);
  if (e.type === 'leao') flash('Você derrubou o leão!', 1.6);
  if (e.type === 'golias') {
    timeScale = 0.18;
    slowMoT = 1.6;
    G.killCam = { target: e.mesh.position.clone().add(new THREE.Vector3(0, 4.5, 0)) };
  }
  puff(e.mesh.position.clone().add(new THREE.Vector3(0, 0.6, 0)), 0xe8d8b8, 12, 0.5);
}

function hurtPlayer(n = 1) {
  const P = G.player;
  if (P.inv > 0 || G.ended) return;
  P.hp -= n;
  P.inv = 1.0;
  sfx.hurt();
  document.body.animate([{ filter: 'none' }, { filter: 'sepia(1) saturate(4) hue-rotate(-40deg)' }, { filter: 'none' }], { duration: 300 });
  if (P.hp <= 0) {
    if (G.lives > 0) {
      // gasta uma vida extra e continua na hora
      G.lives--;
      P.hp = P.maxHp;
      P.inv = 2;
      floatText(new THREE.Vector3(P.x, 2.6, 0), '−1 ❤', 'life');
      flash(G.lives ? `Você perdeu uma vida! Restam ${G.lives}` : 'Última chance!', 1.8);
    } else endLevel(false, 'Davi caiu!');
  }
  updateHud();
}

// ---------- Combo e textos flutuantes ----------
function canAffordStones() { return save.coins >= Math.min(...Object.values(STONES).map((s) => s.price)); }

function comboMult() { return 1 + Math.min(4, Math.floor(G.combo / 3)) * 0.5; } // até 3x

function addCombo() {
  G.combo++;
  if (G.combo >= 3 && G.combo % 3 === 0) sfx.coin();
  updateCombo();
}

function breakCombo() {
  if (G.combo >= 3) floatText(new THREE.Vector3(G.player.x, 2.4, 0), 'Combo perdido', 'block');
  G.combo = 0;
  updateCombo();
}

function updateCombo() {
  const el = $('combo');
  const m = comboMult();
  el.classList.toggle('hidden', m <= 1);
  el.textContent = `Combo x${m.toFixed(1).replace('.0', '')} (${G.combo} acertos)`;
}

const projV = new THREE.Vector3();
function floatText(pos, text, cls = '') {
  if (!text) return;
  projV.copy(pos).project(camera);
  if (projV.z > 1) return;
  const el = document.createElement('div');
  el.className = 'float ' + cls;
  el.textContent = text;
  el.style.left = ((projV.x + 1) / 2 * 100) + '%';
  el.style.top = ((1 - projV.y) / 2 * 100) + '%';
  $('floats').appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// ---------- Atualização ----------
const keys = {};
let holdL = false, holdR = false;

function update(dt) {
  if (state !== 'play' || !G) return;
  const P = G.player, L = G.L;
  G.t += dt;

  // ondas
  while (G.waveI < L.waves.length && L.waves[G.waveI][0] <= G.t) {
    const [, type, x] = L.waves[G.waveI++];
    spawn(type, x);
  }

  // jogador
  const dir = (keys.ArrowLeft || keys.KeyA || holdL ? -1 : 0) + (keys.ArrowRight || keys.KeyD || holdR ? 1 : 0);
  P.vx += (dir * 7 - P.vx) * Math.min(1, dt * 12);
  P.x = THREE.MathUtils.clamp(P.x + P.vx * dt, -LANE, LANE);
  P.mesh.position.set(P.x, 0, 0);
  P.mesh.rotation.y = Math.PI + P.vx * 0.04; // de costas para a câmera
  P.walkT += dt * 10 * Math.min(1, Math.abs(P.vx) / 3);
  walkAnim(P.mesh, P.walkT, Math.min(1, Math.abs(P.vx) / 3));
  const arm = P.mesh.userData.parts.armR;
  if (P.throwT > 0) { P.throwT -= dt; arm.rotation.x = -2.6 + (0.3 - P.throwT) * 8; P.mesh.userData.aiming = true; }
  else P.mesh.userData.aiming = false;
  P.cd = Math.max(0, P.cd - dt);
  P.inv = Math.max(0, P.inv - dt);
  P.mesh.visible = P.inv <= 0 || Math.floor(P.inv * 12) % 2 === 0;

  // sem munição e sem moedas para comprar: o riacho dá algumas pedras
  // depois de um tempo (assim a fase nunca trava)
  const ammo = save.stones.comum + save.stones.ferro + save.stones.fogo;
  if (ammo === 0 && canAffordStones()) {
    // como no vídeo: o aviso se repete e a loja pisca enquanto não houver pedras
    G.outOfAmmoT += dt;
    if (G.outOfAmmoT > 3) {
      G.outOfAmmoT = 0;
      flash('Compre mais pedras! Toque no 🛒', 2);
      $('btnShopHud').classList.add('pulse');
    }
  } else if (ammo === 0) {
    G.outOfAmmoT += dt;
    if (G.outOfAmmoT > 5) {
      save.stones.comum += 3;
      G.outOfAmmoT = 0;
      flash('Davi achou 3 pedras no riacho', 1.6);
      updateHud();
    }
  } else G.outOfAmmoT = 0;

  updateSheep(dt);
  for (const e of G.enemies) updateEnemy(e, dt);
  updateStones(dt);
  updateSpears(dt);
  updateFx(dt);

  // limpa inimigos mortos
  G.enemies = G.enemies.filter((e) => {
    if (e.dead && e.deadT > 2.2) { scene.remove(e.mesh); return false; }
    return true;
  });

  // vitória?
  if (!G.ended && G.waveI >= L.waves.length && G.enemies.every((e) => e.dead)) {
    G.ended = true;
    setTimeout(() => endLevel(true), G.killCam ? 2600 : 900);
  }
  updateHud(true);
}

function updateSheep(dt) {
  const L = G.L;
  for (const s of G.sheep) {
    if (s.fled) {
      s.x += s.fleeDir * 6 * dt;
      s.z -= 1 * dt;
      s.mesh.rotation.y = s.fleeDir > 0 ? Math.PI / 2 : -Math.PI / 2;
      if (Math.abs(s.x) > 30) s.mesh.visible = false;
    } else {
      s.wT -= dt;
      if (s.wT <= 0) {
        s.wT = 2 + Math.random() * 3;
        s.tx = THREE.MathUtils.clamp(s.x + (Math.random() - 0.5) * 3, -LANE + 1, LANE - 1);
        s.tz = THREE.MathUtils.clamp(s.z + (Math.random() - 0.5) * 2, -8, -3);
      }
      const dx = s.tx - s.x, dz = s.tz - s.z, d = Math.hypot(dx, dz);
      if (d > 0.1) {
        s.x += (dx / d) * 0.8 * dt;
        s.z += (dz / d) * 0.8 * dt;
        s.mesh.rotation.y = Math.atan2(dx, dz);
        s.mesh.userData.parts.legs.forEach((l, i) => { l.rotation.x = Math.sin(G.t * 10 + i * 1.6) * 0.4; });
      }
    }
    s.mesh.position.set(s.x, 0, s.z);
  }
  if (L.protectSheep && !G.ended && G.sheep.length && G.sheep.every((s) => s.fled)) endLevel(false, 'As ovelhas fugiram!');
}

function updateEnemy(e, dt) {
  const P = G.player;
  e.t += dt;
  const m = e.mesh;
  if (e.dead) {
    e.deadT += dt;
    m.rotation.x = Math.max(-Math.PI / 2, m.rotation.x - dt * 4);
    if (e.type === 'jarro') m.scale.setScalar(Math.max(0.01, 1 - e.deadT * 3));
    if (e.type === 'golias') { m.rotation.x = -Math.min(Math.PI / 2, e.deadT * 1.4); }
    return;
  }
  if (e.hurtT > 0) {
    e.hurtT -= dt;
    m.position.y = e.baseY + Math.sin(e.hurtT * 40) * 0.08;
  }
  switch (e.type) {
    case 'jarro':
      m.rotation.y += dt * 0.5;
      break;
    case 'urso':
    case 'leao': {
      const alive = G.sheep.filter((s) => !s.fled);
      let tx = P.x, tz = 0, target = null;
      if (alive.length) {
        target = alive.reduce((a, b) => (Math.hypot(a.x - e.x, a.z - e.z) < Math.hypot(b.x - e.x, b.z - e.z) ? a : b));
        tx = target.x; tz = target.z;
      }
      let dx = tx - e.x, dz = tz - e.z;
      const d = Math.hypot(dx, dz);
      if (e.type === 'leao') dx += Math.sin(e.t * 2 + e.zig) * 3;
      const n = Math.hypot(dx, dz) || 1;
      e.x += (dx / n) * e.speed * dt;
      e.z += (dz / n) * e.speed * dt;
      m.rotation.y = Math.atan2(dx, dz);
      quadAnim(m, e.t * e.speed * 3);
      if (target && d < 1.3) {
        target.fled = true;
        target.fleeDir = target.x < 0 ? -1 : 1;
        flash('Uma ovelha fugiu!', 1.2);
        sfx.roar();
        e.z -= 6; // recua depois do ataque
      } else if (!target && d < 1.4) {
        hurtPlayer(1);
        e.z -= 5;
      }
      break;
    }
    case 'soldado':
    case 'escudeiro': {
      e.atk -= dt;
      if (e.state === 'walk') {
        e.z += e.speed * dt;
        e.x += Math.sign(P.x - e.x) * Math.min(Math.abs(P.x - e.x), 0.5 * dt);
        walkAnim(m, e.t * 8);
        if (e.z >= e.stopZ && e.throwsLeft > 0) { e.state = 'aim'; e.atk = (0.8 + Math.random() * 0.6) * diff().fire; }
        if (e.z >= -1.6) { e.state = 'melee'; e.atk = 0.4; }
      } else if (e.state === 'aim') {
        walkAnim(m, 0, 0);
        m.userData.parts.armR.rotation.x = -2.4;
        if (e.atk <= 0) {
          throwSpear(e);
          e.throwsLeft--;
          e.state = 'cool';
          e.atk = 1.4 * diff().fire;
        }
      } else if (e.state === 'cool') {
        m.userData.parts.armR.rotation.x = 0;
        if (e.atk <= 0) {
          if (e.throwsLeft > 0) { e.state = 'aim'; e.atk = 1.2 * diff().fire; } else { e.state = 'walk'; e.stopZ = 0; }
        }
      } else if (e.state === 'melee') {
        m.userData.parts.armR.rotation.x = -1.2 + Math.sin(e.t * 8) * 0.8;
        if (Math.abs(e.x - P.x) > 1) e.x += Math.sign(P.x - e.x) * 2 * dt;
        if (e.atk <= 0 && Math.abs(e.x - P.x) < 1.4) { hurtPlayer(1); e.atk = 1.4 * diff().fire; }
      }
      m.rotation.y = Math.atan2(P.x - e.x, -e.z) * 0.4;
      break;
    }
    case 'golias': {
      e.phaseT -= dt;
      const sh = m.userData.parts.shield;
      if (e.phase === 'walk') {
        e.z = Math.min(-9, e.z + e.speed * dt);
        walkAnim(m, e.t * 3);
        sh.position.set(-0.55, 1.1, 0.2);
        sh.rotation.y = -0.9;
        if (e.phaseT <= 0) { e.phase = 'shield'; e.phaseT = 3.2 * diff().shield; flash('Golias ergueu o escudo!', 1.3); }
      } else if (e.phase === 'shield') {
        walkAnim(m, 0, 0);
        e.z = Math.min(-9, e.z + e.speed * 0.5 * dt);
        sh.position.set(0, 1.55, 0.55);
        sh.rotation.y = 0;
        if (e.phaseT <= 0) { e.phase = 'throw'; e.phaseT = 1.6; }
      } else if (e.phase === 'throw') {
        sh.position.set(-0.55, 1.1, 0.2);
        sh.rotation.y = -0.9;
        const arm = m.userData.parts.armR;
        arm.rotation.x = -2.6 + Math.max(0, 1.6 - e.phaseT) * 1.5;
        if (!e.thrown && e.phaseT < 0.6) { throwSpear(e, true); e.thrown = true; }
        if (e.phaseT <= 0) { e.phase = 'walk'; e.phaseT = 2.5 + Math.random() * 1.5; e.thrown = false; arm.rotation.x = 0; }
      }
      e.x += Math.sign(P.x - e.x) * Math.min(Math.abs(P.x - e.x), 0.6 * dt);
      m.rotation.y = Math.atan2(P.x - e.x, -e.z) * 0.5;
      // golpe de perto
      if (e.z > -10 && e.atk <= 0) { e.atk = 2.5 * diff().fire; if (Math.abs(e.x - P.x) < 3) hurtPlayer(1); }
      e.atk -= dt;
      break;
    }
  }
  m.position.x = e.x;
  m.position.z = e.z;
}

function throwSpear(e, big = false) {
  const P = G.player;
  const from = new THREE.Vector3(e.x, big ? 6 : 2, e.z + 0.5);
  const to = new THREE.Vector3(P.x + P.vx * diff().lead, 1.2, 0);
  const t = Math.max(0.6, Math.hypot(to.x - from.x, to.z - from.z) / ((big ? 16 : 13) * diff().spear));
  const vel = new THREE.Vector3((to.x - from.x) / t, (to.y - from.y + 0.5 * GRAVITY * t * t) / t, (to.z - from.z) / t);
  const mesh = makeSpear();
  if (big) mesh.scale.setScalar(1.8);
  mesh.position.copy(from);
  scene.add(mesh);
  G.spears.push({ mesh, pos: from, vel, life: 4 });
  // alvo vermelho no chão: mostra onde a lança vai cair para dar tempo de desviar
  const ring = new THREE.Mesh(new THREE.RingGeometry(big ? 0.7 : 0.45, big ? 0.95 : 0.65, 24),
    new THREE.MeshBasicMaterial({ color: 0xff3b2a, transparent: true, opacity: 0.8, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(to.x, 0.04, 0);
  scene.add(ring);
  G.fx.push({ mesh: ring, vel: new THREE.Vector3(), life: Math.min(1, t), max: 1, grow: 0, ring: true });
}

const tmp = new THREE.Vector3();
function updateStones(dt) {
  for (const s of G.stones) {
    s.vel.y -= GRAVITY * dt;
    s.pos.addScaledVector(s.vel, dt);
    s.mesh.position.copy(s.pos);
    s.mesh.rotation.x += dt * 12;
    s.life -= dt;
    if (s.type === 'fogo' && Math.random() < 0.6) sparks(s.pos, 1);
    for (const e of G.enemies) {
      if (e.dead) continue;
      const r = e.mesh.userData.radius;
      let hit = false;
      if (e.type === 'golias') {
        // corpo (cilindro) + cabeça
        const dx = s.pos.x - e.x, dz = s.pos.z - e.z;
        hit = Math.hypot(dx, dz) < 1.4 && s.pos.y < 7.2 && s.pos.y > 0;
      } else {
        tmp.copy(enemyAimPoint(e));
        hit = tmp.distanceTo(s.pos) < r + 0.25;
      }
      if (hit) {
        G.hits++;
        damageEnemy(e, s, s.pos.clone());
        s.life = 0;
        break;
      }
    }
    if (s.pos.y < 0.05) { puff(s.pos, 0xd8c8a8, 3, 0.18); s.life = 0; breakCombo(); }
  }
  G.stones = G.stones.filter((s) => { if (s.life <= 0) scene.remove(s.mesh); return s.life > 0; });
}

function updateSpears(dt) {
  const P = G.player;
  for (const s of G.spears) {
    s.vel.y -= GRAVITY * dt;
    s.pos.addScaledVector(s.vel, dt);
    s.mesh.position.copy(s.pos);
    s.mesh.lookAt(tmp.copy(s.pos).add(s.vel));
    s.life -= dt;
    if (Math.abs(s.pos.z) < 0.6 && Math.abs(s.pos.x - P.x) < 0.7 && s.pos.y < 2.4) { hurtPlayer(1); s.life = 0; }
    if (s.pos.y < 0.1) { s.vel.set(0, 0, 0); s.pos.y = 0.1; s.life = Math.min(s.life, 0.8); }
  }
  G.spears = G.spears.filter((s) => { if (s.life <= 0) scene.remove(s.mesh); return s.life > 0; });
}

function updateFx(dt) {
  for (const f of G.fx) {
    f.life -= dt;
    if (f.grav) f.vel.y -= GRAVITY * 0.6 * dt;
    else f.vel.multiplyScalar(1 - dt * 3);
    f.mesh.position.addScaledVector(f.vel, dt);
    if (f.grow) f.mesh.scale.multiplyScalar(1 + dt * f.grow);
    f.mesh.material.opacity = f.ring ? 0.35 + 0.45 * Math.abs(Math.sin(f.life * 14)) : Math.max(0, f.life);
  }
  G.fx = G.fx.filter((f) => {
    if (f.life <= 0) { scene.remove(f.mesh); f.mesh.geometry.dispose(); f.mesh.material.dispose(); return false; }
    return true;
  });
}

// ---------- Câmera ----------
const camPos = new THREE.Vector3(0, 4.5, 8);
const camLook = new THREE.Vector3(0, 1.5, -10);
function updateCamera(dt, realDt) {
  const portrait = camera.aspect < 1;
  if (state === 'play' || state === 'pause' || state === 'shop' || (G && G.ended)) {
    const P = G.player;
    let pos = new THREE.Vector3(P.x * 0.55, portrait ? 6 : 4.4, portrait ? 10 : 7.5);
    let look = new THREE.Vector3(P.x * 0.3, 1.6, -12);
    if (G.killCam) {
      const t = G.killCam.target;
      pos = new THREE.Vector3(t.x + 4, t.y + 0.5, t.z + 7);
      look = t;
    }
    const k = Math.min(1, realDt * (G.killCam ? 3 : 6));
    camPos.lerp(pos, k);
    camLook.lerp(look, k);
  } else {
    // câmera lenta girando no menu/mapa
    const a = performance.now() * 0.00008;
    camPos.set(Math.sin(a) * 9, 4, -2 + Math.cos(a) * 9);
    camLook.set(0, 1.4, -3);
  }
  camera.position.copy(camPos);
  camera.lookAt(camLook);
}

// ---------- Fim de fase ----------
function endLevel(win, reason) {
  if (!['play', 'pause', 'shop'].includes(state)) return;
  G.ended = true;
  if (!win) {
    state = 'over';
    music.duck(true);
    sfx.lose();
    $('overMain').classList.remove('hidden');
    $('quiz').classList.add('hidden');
    $('btnQuiz').classList.toggle('hidden', G.continued);
    $('overMain').querySelector('p').textContent = (reason ? reason + ' ' : '') +
      (G.continued ? 'Tente de novo!' : `Responda o quiz (${QUIZ_N} perguntas): acertando ${QUIZ_MIN}, você continua com duas vidas extras.`);
    show('over');
    persist();
    return;
  }
  state = 'result';
  music.stop();
  sfx.win();
  const P = G.player;
  const saved = G.sheep.filter((s) => !s.fled).length;
  const acc = G.throws ? G.hits / G.throws : 0;
  G.score += P.hp * 100 + saved * 150 + Math.round(acc * 500);
  const coins = Math.round((G.score / 10) * diff().reward);
  save.coins += coins;
  save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, G.idx + 2));
  const prev = save.best[G.L.id] || 0;
  save.best[G.L.id] = Math.max(prev, G.score);
  persist();
  $('points').textContent = G.score;
  $('resultCoins').textContent = `+${coins} moedas · pontaria ${Math.round(acc * 100)}% · ${diff().label}`;
  if (G.L.waves.some((w) => w[1] === 'golias')) {
    show('victory');
    return;
  }
  showResult();
}

function showResult() {
  state = 'result';
  show('result');
  $('congrats').classList.remove('hidden');
  $('scoreCard').classList.add('hidden');
  $('prizeBox').classList.add('hidden');
  setTimeout(() => {
    $('congrats').classList.add('hidden');
    $('scoreCard').classList.remove('hidden');
  }, 1500);
}

function showPrizes() {
  $('scoreCard').classList.add('hidden');
  $('prizeBox').classList.remove('hidden');
  $('btnToMap').classList.add('hidden');
  const deck = [...PRIZES].sort(() => Math.random() - 0.5);
  const cards = $('cards');
  cards.innerHTML = '';
  let picked = false;
  deck.forEach((p, i) => {
    const c = document.createElement('button');
    c.className = 'card';
    c.addEventListener('click', () => {
      if (picked) return;
      picked = true;
      sfx.coin();
      if (p.coins) save.coins += p.coins;
      if (p.stone) save.stones[p.stone] += p.n;
      persist();
      [...cards.children].forEach((el, j) => {
        el.classList.add('open');
        el.textContent = deck[j].label;
        if (j !== i) el.classList.add('dim');
      });
      $('btnToMap').classList.remove('hidden');
    });
    cards.appendChild(c);
  });
}

// ---------- Mapa ----------
const NODE_POS = [[12, 78], [28, 45], [45, 70], [58, 32], [74, 62], [88, 26]];
function openMap() {
  state = 'map';
  if (G) { clearWorld(); G = null; }
  setBackdrop('pasto');
  const svg = $('mapPath');
  const pts = NODE_POS.map(([x, y]) => `${x},${y * 0.6}`).join(' ');
  svg.innerHTML = `<polyline points="${pts}" fill="none" stroke="#e9dcb5" stroke-width="2.2" stroke-dasharray="2 2" stroke-linecap="round"/>`;
  const wrap = $('mapNodes');
  wrap.innerHTML = '';
  LEVELS.forEach((L, i) => {
    const b = document.createElement('button');
    const locked = i + 1 > save.unlocked;
    b.className = 'node' + (locked ? ' locked' : '') + (i + 1 === save.unlocked && !save.best[L.id] ? ' next' : '');
    b.style.left = NODE_POS[i][0] + '%';
    b.style.top = NODE_POS[i][1] + '%';
    const best = save.best[L.id];
    b.innerHTML = `${locked ? '🔒' : L.id}<small>${L.name}</small>` + (best ? `<span class="stars">★ ${best}</span>` : '');
    b.disabled = locked;
    b.addEventListener('click', () => { sfx.click(); openIntro(i); });
    wrap.appendChild(b);
  });
  $('mapCoins').textContent = save.coins;
  $('btnMute').textContent = sfx.isMuted() ? '🔇' : '🔊';
  updateAudioButtons();
  $('btnDiffMap').textContent = diff().label;
  show('map');
  music.duck(false);
  music.play('tema');
}

let introIdx = 0;
function openIntro(i) {
  introIdx = i;
  const L = LEVELS[i];
  state = 'intro';
  $('introNum').textContent = L.id;
  $('introTag').textContent = L.tag;
  $('introName').textContent = L.name;
  $('introStory').textContent = L.story;
  $('introGoal').textContent = L.goal;
  $('introTip').textContent = L.tip;
  show('intro');
}

// ---------- Riacho: escolher 5 pedras lisas antes do Golias ----------
// Inspirado na tela do vídeo em que Davi aparece junto ao riacho com pedras no chão.
const SMOOTH_SVG = '<svg viewBox="0 0 60 46"><ellipse cx="30" cy="24" rx="26" ry="18" fill="#9fa4a8"/><ellipse cx="22" cy="17" rx="10" ry="5" fill="#ffffff66"/></svg>';
const ROUGH_SVG = '<svg viewBox="0 0 60 46"><polygon points="6,30 12,10 26,4 34,12 48,6 56,24 46,40 30,36 16,42" fill="#7d6f62"/><polygon points="14,14 24,8 22,18" fill="#ffffff33"/></svg>';
function openBrook(idx) {
  state = 'brook';
  show('brook');
  let got = 0;
  $('brookN').textContent = '0';
  const river = $('river');
  river.innerHTML = '';
  const spots = [];
  for (let i = 0; i < 12; i++) {
    let x, y, tries = 0;
    do { x = 8 + Math.random() * 84; y = 22 + Math.random() * 56; tries++; } while (tries < 40 && spots.some(([a, b]) => Math.hypot(a - x, (b - y) * 1.6) < 13));
    spots.push([x, y]);
    const smooth = i < 7; // 7 lisas para escolher 5, 5 ásperas
    const b = document.createElement('button');
    b.className = 'pebble';
    b.style.left = x + '%';
    b.style.top = y + '%';
    b.style.transform = `translate(-50%, -50%) rotate(${Math.round(Math.random() * 60 - 30)}deg) scale(${0.85 + Math.random() * 0.3})`;
    b.innerHTML = smooth ? SMOOTH_SVG : ROUGH_SVG;
    b.setAttribute('aria-label', smooth ? 'Pedra lisa' : 'Pedra áspera');
    b.addEventListener('click', () => {
      if (got >= 5) return;
      if (!smooth) {
        sfx.empty();
        b.classList.remove('no'); void b.offsetWidth; b.classList.add('no');
        return;
      }
      got++;
      sfx.coin();
      b.classList.add('got');
      $('brookN').textContent = got;
      if (got === 5) {
        save.stones.fogo += 5;
        persist();
        setTimeout(() => startLevel(idx), 700);
      }
    });
    river.appendChild(b);
  }
}

// ---------- Loja ----------
let shopReturn = 'map';
function openShop() {
  shopReturn = state;
  if (state === 'play') state = 'shop';
  renderShop();
  show('shop');
}

function upgradePrice(k) { return UPGRADES[k].base * (save.upgrades[k] + 1); }

function renderShop() {
  $('shopCoins').textContent = save.coins;
  const grid = $('shopGrid');
  grid.innerHTML = '';
  const add = (ico, title, desc, price, can, onBuy, label) => {
    const d = document.createElement('div');
    d.className = 'item';
    d.innerHTML = `<div class="ico">${ico}</div><h3>${title}</h3><p>${desc}</p>`;
    const b = document.createElement('button');
    b.className = 'wood';
    b.textContent = label || `● ${price}`;
    b.disabled = !can || save.coins < price;
    b.addEventListener('click', () => {
      if (save.coins < price) return;
      save.coins -= price;
      onBuy();
      sfx.coin();
      persist();
      renderShop();
      updateHud();
      $('btnShopHud').classList.remove('pulse');
    });
    d.appendChild(b);
    grid.appendChild(d);
  };
  for (const [k, S] of Object.entries(STONES)) {
    add(`<span class="dot ${k}" style="width:28px;height:28px"></span>`, S.name,
      `+${S.pack} pedras · dano ${S.damage}${S.pierce ? ' · atravessa escudos' : ''} · você tem ${save.stones[k]}`,
      S.price, true, () => { save.stones[k] += S.pack; });
  }
  for (const [k, U] of Object.entries(UPGRADES)) {
    const lvl = save.upgrades[k];
    const maxed = lvl >= U.max;
    add(k === 'vida' ? '❤' : '🪢', U.name, `${U.desc} · nível ${lvl}/${U.max}`, maxed ? 0 : upgradePrice(k), !maxed,
      () => { save.upgrades[k]++; }, maxed ? 'MÁXIMO' : null);
  }
}

function closeShop() {
  sfx.click();
  if (shopReturn === 'play') { state = 'play'; show(null); music.duck(false); } else openMap();
}

// ---------- Quiz ----------
// Como no vídeo: "Responda o quiz de perguntas e continue com duas vidas extras".
// São 3 perguntas sorteadas; acertando pelo menos 2, Davi volta com vida cheia + 2 vidas.
const QUIZ_N = 3;
const QUIZ_MIN = 2;
function openQuiz() {
  const pool = [...QUIZ].sort(() => Math.random() - 0.5).slice(0, QUIZ_N);
  let qi = 0, right = 0;
  $('overMain').classList.add('hidden');
  $('quiz').classList.remove('hidden');
  const ask = () => {
    const Q = pool[qi];
    $('quizNum').textContent = `Pergunta ${qi + 1} de ${QUIZ_N} · acertos: ${right}`;
    $('quizQ').textContent = Q.q;
    $('quizRes').textContent = '';
    const box = $('quizA');
    box.innerHTML = '';
    // embaralha as alternativas para a posição da certa variar
    Q.a.map((txt, k) => ({ txt, k })).sort(() => Math.random() - 0.5).forEach(({ txt, k }) => {
      const b = document.createElement('button');
      b.className = 'wood';
      b.textContent = txt;
      b.dataset.k = k;
      b.addEventListener('click', () => {
        [...box.children].forEach((x) => { x.disabled = true; if (Number(x.dataset.k) === Q.c) x.classList.add('ok'); });
        if (k === Q.c) { right++; sfx.coin(); $('quizRes').textContent = 'Certo!'; } else { b.classList.add('bad'); sfx.empty(); $('quizRes').textContent = 'Errado.'; }
        qi++;
        setTimeout(qi < QUIZ_N ? ask : finish, 1000);
      });
      box.appendChild(b);
    });
  };
  const finish = () => {
    G.continued = true;
    $('quizA').innerHTML = '';
    $('quizNum').textContent = '';
    if (right >= QUIZ_MIN) {
      sfx.win();
      $('quizQ').textContent = `Você acertou ${right} de ${QUIZ_N}!`;
      $('quizRes').textContent = 'Continue lutando com 2 vidas extras!';
      setTimeout(() => continueLevel(2), 1400);
    } else {
      sfx.lose();
      $('quizQ').textContent = `Você acertou ${right} de ${QUIZ_N}.`;
      $('quizRes').textContent = `Era preciso acertar ${QUIZ_MIN}. Não foi dessa vez.`;
      setTimeout(() => {
        $('quiz').classList.add('hidden');
        $('overMain').classList.remove('hidden');
        $('btnQuiz').classList.add('hidden');
        $('overMain').querySelector('p').textContent = 'Tente de novo!';
      }, 1800);
    }
  };
  ask();
}

function continueLevel(extraLives = 0) {
  G.continued = true;
  G.ended = false;
  G.lives += extraLives;
  G.player.hp = G.player.maxHp;
  G.player.inv = 2;
  // as ovelhas que fugiram voltam
  G.sheep.forEach((s) => { if (s.fled) { s.fled = false; s.x = (Math.random() - 0.5) * 8; s.z = -5; s.mesh.visible = true; } });
  // afasta os inimigos
  G.enemies.forEach((e) => { if (!e.dead) { e.z = Math.min(e.z, -16); if (e.state === 'melee') e.state = 'walk'; } });
  G.spears.forEach((s) => scene.remove(s.mesh));
  G.spears = [];
  state = 'play';
  show(null);
  music.duck(false);
  updateHud();
}

// ---------- HUD ----------
let hudCache = '';
function updateHud(light = false) {
  if (!G) return;
  const P = G.player;
  const alive = G.enemies.filter((e) => !e.dead).length;
  const remaining = G.total - G.waveI + alive;
  const prog = G.total ? 1 - remaining / G.total : 0;
  const key = [P.hp, G.score, save.coins, prog.toFixed(2), Math.floor(G.t), G.stone, save.stones.comum, save.stones.ferro, save.stones.fogo,
    G.sheep.filter((s) => !s.fled).length, P.cd > 0, G.lives].join('|');
  if (light && key === hudCache) return;
  hudCache = key;
  $('hp').style.width = (100 * Math.max(0, P.hp) / P.maxHp) + '%';
  $('score').textContent = G.score;
  $('lives').textContent = G.lives;
  $('best').textContent = Math.max(save.best[G.L.id] || 0, G.score);
  $('coins').textContent = save.coins;
  $('prog').style.width = (prog * 100) + '%';
  const s = Math.floor(G.t);
  $('time').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  $('sheepCount').textContent = G.sheep.filter((x) => !x.fled).length + '/' + G.sheep.length;
  document.querySelectorAll('.type').forEach((b) => {
    const t = b.dataset.t;
    b.querySelector('b').textContent = save.stones[t];
    b.classList.toggle('sel', t === G.stone);
    b.classList.toggle('empty', save.stones[t] <= 0);
  });
  $('btnFire').classList.toggle('cool', P.cd > 0);
}

// ---------- Entrada ----------
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (state === 'play') {
    if (e.code === 'Space') { e.preventDefault(); throwStone(autoTarget()); }
    if (e.code === 'Digit1') G.stone = 'comum';
    if (e.code === 'Digit2') G.stone = 'ferro';
    if (e.code === 'Digit3') G.stone = 'fogo';
    if (e.code === 'Escape' || e.code === 'KeyP') pause();
    updateHud();
  } else if (state === 'pause' && (e.code === 'Escape' || e.code === 'KeyP')) resume();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => { Object.keys(keys).forEach((k) => { keys[k] = false; }); holdL = holdR = false; if (state === 'play') pause(); });

canvas.addEventListener('pointerdown', (e) => {
  sfx.unlock();
  if (state !== 'play') return;
  throwStone(aimFromScreen(e.clientX, e.clientY));
});

function hold(id, set) {
  const b = $(id);
  const on = (e) => { e.preventDefault(); set(true); b.classList.add('on'); };
  const off = () => { set(false); b.classList.remove('on'); };
  b.addEventListener('pointerdown', on);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, off));
}
hold('btnL', (v) => { holdL = v; });
hold('btnR', (v) => { holdR = v; });
$('btnFire').addEventListener('pointerdown', (e) => { e.preventDefault(); if (state === 'play') throwStone(autoTarget()); });
document.querySelectorAll('.type').forEach((b) => b.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (!G) return;
  G.stone = b.dataset.t;
  sfx.click();
  updateHud();
}));

function pause() { if (state !== 'play') return; state = 'pause'; show('pause'); music.duck(true); }
function resume() { sfx.click(); state = 'play'; show(null); music.duck(false); }

// ---------- Dificuldade e som ----------
function setDifficulty(k) {
  if (!DIFFICULTIES[k]) return;
  save.difficulty = k;
  persist();
  document.querySelectorAll('.diff').forEach((b) => b.classList.toggle('sel', b.dataset.d === k));
  $('diffDesc').textContent = DIFFICULTIES[k].desc;
  $('btnDiffMap').textContent = DIFFICULTIES[k].label;
}
document.querySelectorAll('.diff').forEach((b) => b.addEventListener('click', () => { sfx.unlock(); sfx.click(); setDifficulty(b.dataset.d); }));

function updateAudioButtons() {
  $('btnMusic').classList.toggle('off', !save.music);
  $('btnMusic').title = save.music ? 'Música: ligada' : 'Música: desligada';
}
music.setEnabled(save.music);

const on = (id, fn) => $(id).addEventListener('click', () => { sfx.unlock(); fn(); });
on('btnPlay', () => { sfx.click(); openMap(); });
on('btnDiffMap', () => {
  const keys = Object.keys(DIFFICULTIES);
  setDifficulty(keys[(keys.indexOf(save.difficulty) + 1) % keys.length]);
  sfx.click();
});
on('btnMusic', () => {
  save.music = !save.music;
  persist();
  music.setEnabled(save.music);
  updateAudioButtons();
});
on('btnStart', () => { sfx.click(); if (isBossLevel(LEVELS[introIdx])) openBrook(introIdx); else startLevel(introIdx); });
on('btnPause', pause);
on('btnResume', resume);
on('btnRestart', () => startLevel(G.idx));
on('btnQuit', openMap);
on('btnShopHud', () => { if (state === 'play') openShop(); });
on('btnShopMap', openShop);
on('btnShopClose', closeShop);
on('btnToPrize', () => { sfx.click(); showPrizes(); });
on('btnToMap', openMap);
on('btnQuiz', openQuiz);
on('btnRetry', () => startLevel(G.idx));
on('btnOverMap', openMap);
on('btnVictory', () => { sfx.click(); showResult(); });
on('btnMute', () => { sfx.setMuted(!sfx.isMuted()); $('btnMute').textContent = sfx.isMuted() ? '🔇' : '🔊'; });
on('btnReset', () => {
  if (!confirm('Apagar todo o progresso?')) return;
  save = resetSave();
  openMap();
});

// ---------- Loop ----------
let last = performance.now();
function frame(now) {
  const realDt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (slowMoT > 0) {
    slowMoT -= realDt;
    if (slowMoT <= 0) timeScale = 1;
  }
  const dt = realDt * timeScale;
  update(dt);
  if (G && G.ended && state !== 'play') updateFx(dt);
  if (menuDavid) {
    menuDavid.userData.parts.armR.rotation.x = -2.2 + Math.sin(now * 0.008) * 0.6;
    menuDavid.rotation.y += realDt * 0.2;
  }
  updateCamera(dt, realDt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

setBackdrop('pasto');
$('loading').classList.add('hidden');
setDifficulty(save.difficulty);
updateAudioButtons();
show('menu');
// a música só pode começar depois do primeiro toque/clique (regra dos navegadores)
window.addEventListener('pointerdown', () => { if (!music.current && state === 'menu') music.play('tema'); }, { once: true });
requestAnimationFrame(frame);

// gancho para testes automatizados
window.__game = {
  get state() { return state; }, get G() { return G; }, get save() { return save; },
  renderer, music, setDifficulty, startLevel, openMap, hurt: (n) => hurtPlayer(n), quiz: QUIZ, throwAt: (x, y, z) => throwStone(new THREE.Vector3(x, y, z)), autoTarget,
};
