'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Skins de nave ─────────────────────────────────────────────────────────────
const SHIP_SKINS = [
  { name: 'CLASICA', color: '#fff', shape: 'classic' },
  { name: 'INTERCEPTOR', color: '#40dfff', shape: 'interceptor' },
  { name: 'FENIX', color: '#ff7a40', shape: 'phoenix' },
];

let selectedSkin = 0;

function drawShipSkin(skin, thrusting = false, scale = 1) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.strokeStyle = skin.color;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();

  if (skin.shape === 'interceptor') {
    ctx.moveTo(20, 0);
    ctx.lineTo(3, -6);
    ctx.lineTo(-4, -13);
    ctx.lineTo(-10, -13);
    ctx.lineTo(-7, -4);
    ctx.lineTo(-14, 0);
    ctx.lineTo(-7, 4);
    ctx.lineTo(-10, 13);
    ctx.lineTo(-4, 13);
    ctx.lineTo(3, 6);
  } else if (skin.shape === 'phoenix') {
    ctx.moveTo(20, 0);
    ctx.lineTo(3, -5);
    ctx.lineTo(-4, -14);
    ctx.lineTo(-9, -7);
    ctx.lineTo(-14, -9);
    ctx.lineTo(-9, 0);
    ctx.lineTo(-14, 9);
    ctx.lineTo(-9, 7);
    ctx.lineTo(-4, 14);
    ctx.lineTo(3, 5);
  } else {
    ctx.moveTo(20, 0);
    ctx.lineTo(-12, -9);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-12, 9);
  }
  ctx.closePath();
  ctx.stroke();

  if (skin.shape === 'interceptor') {
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.lineTo(7, 0);
    ctx.stroke();
  } else if (skin.shape === 'phoenix') {
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(6, 0);
    ctx.stroke();
  }

  if (thrusting && Math.random() > 0.35) {
    ctx.beginPath();
    ctx.moveTo(-8, -4);
    ctx.lineTo(-8 - rand(6, 14), 0);
    ctx.lineTo(-8, 4);
    ctx.strokeStyle = 'rgba(255, 130, 0, 0.85)';
    ctx.stroke();
  }
  ctx.restore();
}

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño
const SHOOTING_STAR_HITS = 3;
const SHOOTING_STAR_POINTS = 500;
const SHOOTING_STAR_SPEED_MULTIPLIER = 2;

class Asteroid {
  constructor(x, y, size = 3, shootingStar = false) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;
    this.shootingStar = shootingStar;
    this.hits = shootingStar ? SHOOTING_STAR_HITS : 1;

    const angle = rand(0, Math.PI * 2);
    const speed = (SPEEDS[size] + rand(-15, 15)) *
      (shootingStar ? SHOOTING_STAR_SPEED_MULTIPLIER : 1);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.shootingStar) return [];
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = this.shootingStar ? '#ffd700' : '#fff';
    ctx.lineWidth   = this.shootingStar ? 4 : 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ítem de velocidad ───────────────────────────────────────────────────────
class SpeedItem {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 13;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = '#40dfff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + i * Math.PI / 5;
      const radius = i % 2 === 0 ? 13 : 6;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ítem de triple disparo ──────────────────────────────────────────────────
class TripleShotItem {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 13;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = '#ff5cff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, -8);
    ctx.lineTo(10, -8);
    ctx.moveTo(0, -8);
    ctx.lineTo(0, 10);
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ítem de escudo ──────────────────────────────────────────────────────────
class ShieldItem {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 14;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = '#8c6cff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(11, -8);
    ctx.lineTo(9, 6);
    ctx.lineTo(0, 13);
    ctx.lineTo(-9, 6);
    ctx.lineTo(-11, -8);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedBoost    = 0;
    this.tripleShot    = 0;
    this.shield        = false;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoost    > 0) this.speedBoost    -= dt;
    if (this.tripleShot    > 0) this.tripleShot    -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260 * (this.speedBoost > 0 ? 2 : 1); // px/s²
    const DRAG   = 0.987;

    if (keys['KeyA']) this.angle -= ROT * dt;
    if (keys['KeyD']) this.angle += ROT * dt;

    this.thrusting = !!keys['KeyW'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    if (keys['KeyS']) {
      this.vx -= Math.cos(this.angle) * THRUST * dt;
      this.vy -= Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShot <= 0) return [new Bullet(ox, oy, this.angle)];

    const SPREAD = Math.PI / 15;
    return [
      new Bullet(ox, oy, this.angle - SPREAD),
      new Bullet(ox, oy, this.angle),
      new Bullet(ox, oy, this.angle + SPREAD),
    ];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    if (this.shield) {
      ctx.strokeStyle = 'rgba(140, 108, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 27, 0, Math.PI * 2);
      ctx.stroke();
    }
    drawShipSkin(SHIP_SKINS[selectedSkin], this.thrusting);

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, speedItem, tripleShotItem, shieldItem;
let score, lives, level;
let state;      // 'selecting' | 'playing' | 'dead' | 'gameover'
let deadTimer;
let speedSpawnTimer;
let tripleShotSpawnTimer;
let shieldSpawnTimer;
let shootingStarSpawnTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  speedItem = null;
  tripleShotItem = null;
  shieldItem = null;
  speedSpawnTimer = 0;
  tripleShotSpawnTimer = 0;
  shieldSpawnTimer = 0;
  shootingStarSpawnTimer = 0;
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
}

function startGame() {
  initGame();
}

function spawnShootingStar() {
  const SAFE_DIST = 130;
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (Math.hypot(x - ship.x, y - ship.y) < SAFE_DIST);
  asteroids.push(new Asteroid(x, y, 1, true));
}

function nextLevel() {
  const shieldActive = ship.shield;
  level++;
  bullets   = [];
  particles = [];
  speedItem = null;
  tripleShotItem = null;
  shieldItem = null;
  speedSpawnTimer = 0;
  tripleShotSpawnTimer = 0;
  shieldSpawnTimer = 0;
  shootingStarSpawnTimer = 0;
  ship.reset();
  ship.shield = shieldActive;
  spawnAsteroids(3 + level);
}

function spawnSpeedItem() {
  const SAFE_DIST = 130;
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (Math.hypot(x - ship.x, y - ship.y) < SAFE_DIST);
  speedItem = new SpeedItem(x, y);
}

function spawnTripleShotItem() {
  const SAFE_DIST = 130;
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (Math.hypot(x - ship.x, y - ship.y) < SAFE_DIST);
  tripleShotItem = new TripleShotItem(x, y);
}

function spawnShieldItem() {
  const SAFE_DIST = 130;
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (Math.hypot(x - ship.x, y - ship.y) < SAFE_DIST);
  shieldItem = new ShieldItem(x, y);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  speedItem = null;
  tripleShotItem = null;
  shieldItem = null;
  speedSpawnTimer = 0;
  tripleShotSpawnTimer = 0;
  shieldSpawnTimer = 0;
  shootingStarSpawnTimer = 0;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'selecting') {
    if (pressed('ArrowLeft'))
      selectedSkin = (selectedSkin + SHIP_SKINS.length - 1) % SHIP_SKINS.length;
    if (pressed('ArrowRight'))
      selectedSkin = (selectedSkin + 1) % SHIP_SKINS.length;
    if (pressed('Space')) startGame();
    return;
  }

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));

  if (speedItem) {
    if (dist(ship, speedItem) < ship.radius + speedItem.radius) {
      ship.speedBoost = 5;
      speedItem = null;
      speedSpawnTimer = 0;
    }
  } else {
    speedSpawnTimer += dt;
    if (speedSpawnTimer >= 10) {
      spawnSpeedItem();
      speedSpawnTimer = 0;
    }
  }

  if (tripleShotItem) {
    if (dist(ship, tripleShotItem) < ship.radius + tripleShotItem.radius) {
      ship.tripleShot = 5;
      tripleShotItem = null;
      tripleShotSpawnTimer = 0;
    }
  } else {
    tripleShotSpawnTimer += dt;
    if (tripleShotSpawnTimer >= 14) {
      spawnTripleShotItem();
      tripleShotSpawnTimer = 0;
    }
  }

  if (shieldItem) {
    if (dist(ship, shieldItem) < ship.radius + shieldItem.radius) {
      ship.shield = true;
      shieldItem = null;
      shieldSpawnTimer = 0;
    }
  } else {
    shieldSpawnTimer += dt;
    if (shieldSpawnTimer >= 15) {
      spawnShieldItem();
      shieldSpawnTimer = 0;
    }
  }

  shootingStarSpawnTimer += dt;
  if (shootingStarSpawnTimer >= 10) {
    if (!asteroids.some(a => a.shootingStar)) spawnShootingStar();
    shootingStarSpawnTimer = 0;
  }

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.hits--;
        if (a.hits <= 0) {
          a.dead = true;
          score += a.shootingStar ? SHOOTING_STAR_POINTS : POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
        }
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (ship.shield) {
          ship.shield = false;
          a.dead = true;
          score += a.shootingStar ? SHOOTING_STAR_POINTS : POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          asteroids = asteroids.filter(other => !other.dead).concat(a.split());
        } else {
          killShip();
        }
        break;
      }
    }
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  drawShipSkin(SHIP_SKINS[selectedSkin], false, 0.5);
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  let powerUpY = 52;
  if (ship.speedBoost > 0) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#40dfff';
    ctx.fillText(`VELOCIDAD ${Math.ceil(ship.speedBoost)}s`, W - 14, powerUpY);
    powerUpY += 24;
  }

  if (ship.tripleShot > 0) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff5cff';
    ctx.fillText(`TRIPLE SHOT ${Math.ceil(ship.tripleShot)}s`, W - 14, powerUpY);
    powerUpY += 24;
  }

  if (ship.shield) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#8c6cff';
    ctx.fillText('ESCUDO ACTIVO', W - 14, powerUpY);
  }

}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function drawSkinSelector() {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 32px monospace';
  ctx.fillText('ELIGE TU NAVE', W / 2, 115);
  ctx.font = '15px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText('USA ← Y → PARA ELEGIR', W / 2, 150);

  const skin = SHIP_SKINS[selectedSkin];
  ctx.save();
  ctx.translate(W / 2, H / 2 - 15);
  ctx.rotate(-Math.PI / 2);
  drawShipSkin(skin, false, 3.8);
  ctx.restore();

  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = skin.color;
  ctx.fillText(skin.name, W / 2, H / 2 + 95);
  ctx.font = '16px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(`${selectedSkin + 1} / ${SHIP_SKINS.length}`, W / 2, H / 2 + 128);
  ctx.fillText('ESPACIO PARA COMENZAR', W / 2, H - 90);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  if (state === 'selecting') {
    drawSkinSelector();
    return;
  }

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  bullets.forEach(b => b.draw());
  if (speedItem) speedItem.draw();
  if (tripleShotItem) tripleShotItem.draw();
  if (shieldItem) shieldItem.draw();
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

state = 'selecting';
requestAnimationFrame(loop);
