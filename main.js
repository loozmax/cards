const CONFIG = {
  tileSize: 16,
  viewWidth: 60,
  viewHeight: 40,
  mapWidth: 200,
  mapHeight: 120,
  baseVision: 3,
  visionCap: 12,
  visionStep: 8,
  monsterCount: 18,
  itemCount: 16,
  attackCooldown: 6,
  aggroRange: 10,
  colors: {
    bg: "#05070b",
    wall: "#303b57",
    floor: "#111827",
    water: "#0b2d4a",
    grass: "#0f2f1c",
    rubble: "#251e2b",
    door: "#3a2f22",
  },
};

const TILE_TYPES = {
  wall: { glyph: "#", fg: "#8aa0c9", bg: CONFIG.colors.wall, walkable: false },
  floor: { glyph: "·", fg: "#6b7a99", bg: CONFIG.colors.floor, walkable: true },
  door: { glyph: "+", fg: "#e0b16b", bg: CONFIG.colors.door, walkable: true },
  water: { glyph: "~", fg: "#5db7ff", bg: CONFIG.colors.water, walkable: false },
  grass: { glyph: '"', fg: "#7dd88f", bg: CONFIG.colors.grass, walkable: true },
  rubble: { glyph: ":", fg: "#b08bd4", bg: CONFIG.colors.rubble, walkable: true },
};

const MONSTER_TYPES = [
  { glyph: "g", fg: "#7bf59c", bg: "#1e2b1f", hp: 6, atk: 2, name: "Goblin" },
  { glyph: "Z", fg: "#9f7bff", bg: "#251430", hp: 10, atk: 3, name: "Zombie" },
  { glyph: "&", fg: "#ff7b7b", bg: "#331c1c", hp: 8, atk: 2, name: "Imp" },
  { glyph: "M", fg: "#ffd166", bg: "#3a2b12", hp: 14, atk: 4, name: "Minotaur" },
];

const ITEMS = [
  { glyph: "$", fg: "#ffd166", name: "Gold" },
  { glyph: "!", fg: "#ff7b7b", name: "Potion" },
  { glyph: "?", fg: "#7bd6ff", name: "Mystery" },
  { glyph: "♥", fg: "#ff4d6d", name: "Heart" },
];

class Map {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.tiles = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ({ type: "wall" }))
    );
    this.generate();
  }

  generate() {
    const rooms = [];
    const maxRooms = 24;
    for (let i = 0; i < maxRooms; i += 1) {
      const w = randInt(8, 18);
      const h = randInt(6, 14);
      const x = randInt(2, this.width - w - 2);
      const y = randInt(2, this.height - h - 2);
      const room = { x, y, w, h, cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2) };
      if (rooms.some((r) => intersects(room, r))) {
        continue;
      }
      rooms.push(room);
      for (let yy = y; yy < y + h; yy += 1) {
        for (let xx = x; xx < x + w; xx += 1) {
          this.tiles[yy][xx].type = "floor";
        }
      }
      if (rooms.length > 1) {
        const prev = rooms[rooms.length - 2];
        carveCorridor(this.tiles, prev.cx, prev.cy, room.cx, room.cy);
      }
    }

    rooms.forEach((room) => {
      if (Math.random() < 0.6) {
        this.tiles[room.cy][room.x].type = "door";
      }
      if (Math.random() < 0.6) {
        this.tiles[room.cy][room.x + room.w - 1].type = "door";
      }
    });

    for (let y = 1; y < this.height - 1; y += 1) {
      for (let x = 1; x < this.width - 1; x += 1) {
        if (this.tiles[y][x].type !== "floor") {
          continue;
        }
        const roll = Math.random();
        if (roll < 0.04) {
          this.tiles[y][x].type = "grass";
        } else if (roll < 0.06) {
          this.tiles[y][x].type = "rubble";
        } else if (roll < 0.08) {
          this.tiles[y][x].type = "water";
        }
      }
    }
  }

  isWalkable(x, y) {
    if (!this.inBounds(x, y)) return false;
    const type = TILE_TYPES[this.tiles[y][x].type];
    return type.walkable;
  }

  inBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }
}

class Entity {
  constructor(x, y, glyph, fg, bg) {
    this.x = x;
    this.y = y;
    this.glyph = glyph;
    this.fg = fg;
    this.bg = bg;
    this.hitFlash = 0;
  }
}

class Player extends Entity {
  constructor(x, y) {
    super(x, y, "@", "#ffd6a5", "#30221b");
    this.hp = 30;
    this.maxHp = 30;
    this.atk = 6;
    this.def = 1;
    this.score = 0;
    this.kills = 0;
    this.facing = { x: 0, y: 1 };
    this.steps = 0;
    this.vision = CONFIG.baseVision;
    this.attackCooldown = 0;
    this.inventory = [];
  }
}

class Monster extends Entity {
  constructor(x, y, type) {
    super(x, y, type.glyph, type.fg, type.bg);
    this.name = type.name;
    this.hp = type.hp;
    this.atk = type.atk;
    this.aggro = false;
  }
}

class FloatingText {
  constructor(x, y, text, color) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.life = 30;
    this.offset = 0;
  }
}

class Game {
  constructor() {
    this.canvas = document.getElementById("game");
    this.ctx = this.canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.map = new Map(CONFIG.mapWidth, CONFIG.mapHeight);
    this.player = new Player(0, 0);
    this.placePlayer();
    this.monsters = [];
    this.items = [];
    this.floaters = [];
    this.log = [];
    this.visibleMask = createMask(CONFIG.mapWidth, CONFIG.mapHeight);
    this.exploredMask = createMask(CONFIG.mapWidth, CONFIG.mapHeight);
    this.camera = { x: this.player.x, y: this.player.y };
    this.turnLocked = false;
    this.gameOver = false;
    this.win = false;
    this.initEntities();
    this.bindEvents();
    this.updateVisibility();
  }

  placePlayer() {
    for (let y = 0; y < this.map.height; y += 1) {
      for (let x = 0; x < this.map.width; x += 1) {
        if (this.map.isWalkable(x, y)) {
          this.player.x = x;
          this.player.y = y;
          return;
        }
      }
    }
  }

  initEntities() {
    for (let i = 0; i < CONFIG.monsterCount; i += 1) {
      const pos = this.randomFloor();
      const type = MONSTER_TYPES[randInt(0, MONSTER_TYPES.length - 1)];
      this.monsters.push(new Monster(pos.x, pos.y, type));
    }
    for (let i = 0; i < CONFIG.itemCount; i += 1) {
      const pos = this.randomFloor();
      const item = ITEMS[randInt(0, ITEMS.length - 1)];
      this.items.push({ x: pos.x, y: pos.y, ...item });
    }
    this.addLog("You awaken in the ruins.");
  }

  randomFloor() {
    let x = 0;
    let y = 0;
    do {
      x = randInt(1, this.map.width - 2);
      y = randInt(1, this.map.height - 2);
    } while (!this.map.isWalkable(x, y) || (x === this.player.x && y === this.player.y));
    return { x, y };
  }

  bindEvents() {
    window.addEventListener("keydown", (event) => {
      if (this.gameOver) return;
      if (this.turnLocked) return;
      const key = event.key.toLowerCase();
      let dx = 0;
      let dy = 0;
      if (key === "w") dy = -1;
      if (key === "s") dy = 1;
      if (key === "a") dx = -1;
      if (key === "d") dx = 1;

      if (dx !== 0 || dy !== 0) {
        this.player.facing = { x: dx, y: dy };
        this.tryMovePlayer(dx, dy);
        event.preventDefault();
      } else if (key === " ") {
        this.tryAttack();
        event.preventDefault();
      }
    });

    document.getElementById("restart").addEventListener("click", () => {
      window.location.reload();
    });
  }

  tryMovePlayer(dx, dy) {
    const nx = this.player.x + dx;
    const ny = this.player.y + dy;
    const monster = this.monsters.find((m) => m.x === nx && m.y === ny);
    if (monster) {
      this.addLog(`A ${monster.name} blocks your path.`);
      return;
    }
    if (!this.map.isWalkable(nx, ny)) {
      this.addLog("You bump into rubble.");
      return;
    }
    this.player.x = nx;
    this.player.y = ny;
    this.player.steps += 1;
    if (this.player.steps % CONFIG.visionStep === 0) {
      this.player.vision = Math.min(CONFIG.visionCap, this.player.vision + 1);
      this.addLog("Your vision grows.");
    }
    this.pickupItem();
    this.resolveTurn();
  }

  pickupItem() {
    const idx = this.items.findIndex((i) => i.x === this.player.x && i.y === this.player.y);
    if (idx >= 0) {
      const item = this.items.splice(idx, 1)[0];
      this.player.inventory.push(item.name);
      this.player.score += 10;
      if (item.name === "Potion") {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 8);
      }
      if (item.name === "Heart") {
        this.player.maxHp += 2;
        this.player.hp += 2;
      }
      this.addLog(`Picked up ${item.name}.`);
    }
  }

  tryAttack() {
    if (this.player.attackCooldown > 0) {
      this.addLog("Your weapon is cooling down.");
      return;
    }
    const targetX = this.player.x + this.player.facing.x;
    const targetY = this.player.y + this.player.facing.y;
    const target = this.monsters.find((m) => m.x === targetX && m.y === targetY);
    if (!target) {
      this.addLog("You swing at the air.");
      this.player.attackCooldown = CONFIG.attackCooldown;
      this.resolveTurn();
      return;
    }
    const damage = randInt(this.player.atk - 1, this.player.atk + 2);
    target.hp -= damage;
    target.hitFlash = 4;
    this.floaters.push(new FloatingText(target.x + 0.2, target.y - 0.2, `${damage}`, "#ffd166"));
    this.addLog(`You strike the ${target.name} for ${damage}.`);
    const knockX = target.x + this.player.facing.x;
    const knockY = target.y + this.player.facing.y;
    if (this.map.isWalkable(knockX, knockY) && !this.monsters.some((m) => m !== target && m.x === knockX && m.y === knockY)) {
      target.x = knockX;
      target.y = knockY;
    }
    if (target.hp <= 0) {
      this.addLog(`The ${target.name} collapses.`);
      this.player.kills += 1;
      this.player.score += 25;
      this.floaters.push(new FloatingText(target.x, target.y, "✖", "#ff7b7b"));
      this.monsters = this.monsters.filter((m) => m !== target);
      if (this.monsters.length === 0) {
        this.winGame();
      }
    }
    this.player.attackCooldown = CONFIG.attackCooldown;
    this.resolveTurn();
  }

  resolveTurn() {
    this.turnLocked = true;
    this.monstersAct();
    this.player.attackCooldown = Math.max(0, this.player.attackCooldown - 1);
    this.updateVisibility();
    this.turnLocked = false;
  }

  monstersAct() {
    const distanceMap = this.buildDistanceMap();
    for (const monster of this.monsters) {
      const distance = distanceMap[monster.y]?.[monster.x] ?? Infinity;
      if (distance <= CONFIG.aggroRange) {
        monster.aggro = true;
      }
      if (!monster.aggro) {
        if (Math.random() < 0.4) continue;
      }
      if (distance === 1) {
        this.attackPlayer(monster);
        continue;
      }
      const step = this.nextStep(monster, distanceMap);
      if (step) {
        monster.x = step.x;
        monster.y = step.y;
      }
    }
  }

  attackPlayer(monster) {
    const damage = Math.max(1, randInt(monster.atk - 1, monster.atk + 2) - this.player.def);
    this.player.hp -= damage;
    this.player.hitFlash = 4;
    this.floaters.push(new FloatingText(this.player.x, this.player.y - 0.2, `${damage}`, "#ff9f1c"));
    this.addLog(`${monster.name} hits you for ${damage}.`);
    if (this.player.hp <= 0) {
      this.loseGame();
    }
  }

  buildDistanceMap() {
    const dist = Array.from({ length: this.map.height }, () =>
      Array.from({ length: this.map.width }, () => Infinity)
    );
    const queue = [{ x: this.player.x, y: this.player.y }];
    dist[this.player.y][this.player.x] = 0;
    let index = 0;
    while (index < queue.length) {
      const current = queue[index];
      index += 1;
      const neighbors = [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 },
      ];
      for (const n of neighbors) {
        if (!this.map.isWalkable(n.x, n.y)) continue;
        if (dist[n.y][n.x] <= dist[current.y][current.x] + 1) continue;
        dist[n.y][n.x] = dist[current.y][current.x] + 1;
        queue.push(n);
      }
    }
    return dist;
  }

  nextStep(monster, distanceMap) {
    const options = [
      { x: monster.x + 1, y: monster.y },
      { x: monster.x - 1, y: monster.y },
      { x: monster.x, y: monster.y + 1 },
      { x: monster.x, y: monster.y - 1 },
    ];
    let best = null;
    let bestDistance = distanceMap[monster.y][monster.x];
    for (const option of options) {
      if (!this.map.isWalkable(option.x, option.y)) continue;
      if (option.x === this.player.x && option.y === this.player.y) continue;
      if (this.monsters.some((m) => m !== monster && m.x === option.x && m.y === option.y)) continue;
      const dist = distanceMap[option.y]?.[option.x] ?? Infinity;
      if (dist < bestDistance) {
        bestDistance = dist;
        best = option;
      }
    }
    return best;
  }

  updateVisibility() {
    this.visibleMask = createMask(this.map.width, this.map.height);
    const radius = this.player.vision;
    for (let y = this.player.y - radius; y <= this.player.y + radius; y += 1) {
      for (let x = this.player.x - radius; x <= this.player.x + radius; x += 1) {
        if (!this.map.inBounds(x, y)) continue;
        const dist = Math.hypot(x - this.player.x, y - this.player.y);
        if (dist > radius + 0.8) continue;
        if (!hasLineOfSight(this.map, this.player.x, this.player.y, x, y)) continue;
        this.visibleMask[y][x] = true;
        this.exploredMask[y][x] = true;
      }
    }
  }

  addLog(message) {
    this.log.unshift(message);
    if (this.log.length > 8) {
      this.log.length = 8;
    }
  }

  loseGame() {
    this.gameOver = true;
    this.showOverlay("You have fallen");
  }

  winGame() {
    this.gameOver = true;
    this.win = true;
    this.showOverlay("Ruins cleared!");
  }

  showOverlay(text) {
    const overlay = document.getElementById("overlay");
    const title = document.getElementById("overlay-title");
    overlay.classList.remove("hidden");
    title.textContent = text;
  }
}

class Renderer {
  constructor(game) {
    this.game = game;
    this.canvas = game.canvas;
    this.ctx = game.ctx;
    this.ctx.font = `${CONFIG.tileSize}px Courier New, monospace`;
    this.ctx.textBaseline = "top";
  }

  render() {
    const { ctx } = this;
    const { player } = this.game;
    this.game.camera.x += (player.x - this.game.camera.x) * 0.2;
    this.game.camera.y += (player.y - this.game.camera.y) * 0.2;

    ctx.fillStyle = CONFIG.colors.bg;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const startX = Math.floor(this.game.camera.x - CONFIG.viewWidth / 2);
    const startY = Math.floor(this.game.camera.y - CONFIG.viewHeight / 2);

    for (let vy = 0; vy < CONFIG.viewHeight; vy += 1) {
      for (let vx = 0; vx < CONFIG.viewWidth; vx += 1) {
        const wx = startX + vx;
        const wy = startY + vy;
        if (!this.game.map.inBounds(wx, wy)) continue;
        if (!this.game.exploredMask[wy][wx]) continue;
        const tile = TILE_TYPES[this.game.map.tiles[wy][wx].type];
        const visible = this.game.visibleMask[wy][wx];
        const dist = Math.hypot(wx - player.x, wy - player.y);
        const fade = clamp(1 - (dist - player.vision + 1) * 0.4, 0.1, 1);
        const light = visible ? fade : 0.25;
        const flicker = visible && Math.random() < 0.02 ? 1.2 : 1;

        drawCell(ctx, vx, vy, tile.glyph, applyLight(tile.fg, light * flicker), applyLight(tile.bg, light * 0.9));
      }
    }

    for (const item of this.game.items) {
      if (!this.isVisible(item.x, item.y)) continue;
      const screen = this.toScreen(item.x, item.y, startX, startY);
      drawCell(ctx, screen.x, screen.y, item.glyph, item.fg, "#10141f");
    }

    for (const monster of this.game.monsters) {
      if (!this.isVisible(monster.x, monster.y)) continue;
      const screen = this.toScreen(monster.x, monster.y, startX, startY);
      const bg = monster.hitFlash > 0 ? "#ffffff" : monster.bg;
      drawCell(ctx, screen.x, screen.y, monster.glyph, monster.fg, bg);
      if (monster.hitFlash > 0) monster.hitFlash -= 1;
    }

    const playerScreen = this.toScreen(player.x, player.y, startX, startY);
    if (playerScreen) {
      const pulse = Math.sin(Date.now() / 200) * 0.2 + 0.8;
      const bg = player.hitFlash > 0 ? "#ffffff" : "#2a1f1f";
      drawCell(ctx, playerScreen.x, playerScreen.y, player.glyph, applyLight(player.fg, pulse), bg);
      if (player.hitFlash > 0) player.hitFlash -= 1;
    }

    this.renderFloaters(startX, startY);
    this.renderVignette();
  }

  renderFloaters(startX, startY) {
    for (const floater of this.game.floaters) {
      const screen = this.toScreen(floater.x, floater.y, startX, startY);
      if (!screen) continue;
      const alpha = clamp(floater.life / 30, 0, 1);
      this.ctx.fillStyle = withAlpha(floater.color, alpha);
      this.ctx.fillText(floater.text, screen.x * CONFIG.tileSize, (screen.y * CONFIG.tileSize) - floater.offset);
      floater.life -= 1;
      floater.offset += 0.4;
    }
    this.game.floaters = this.game.floaters.filter((f) => f.life > 0);
  }

  renderVignette() {
    const { ctx } = this;
    const gradient = ctx.createRadialGradient(
      this.canvas.width / 2,
      this.canvas.height / 2,
      this.canvas.width * 0.2,
      this.canvas.width / 2,
      this.canvas.height / 2,
      this.canvas.width * 0.55
    );
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.6)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  toScreen(wx, wy, startX, startY) {
    const sx = Math.floor(wx - startX);
    const sy = Math.floor(wy - startY);
    if (sx < 0 || sy < 0 || sx >= CONFIG.viewWidth || sy >= CONFIG.viewHeight) return null;
    return { x: sx, y: sy };
  }

  isVisible(x, y) {
    return this.game.visibleMask[y]?.[x];
  }
}

class UI {
  constructor(game) {
    this.game = game;
    this.statsEl = document.getElementById("stats");
    this.inventoryEl = document.getElementById("inventory");
    this.logEl = document.getElementById("log");
  }

  update() {
    const { player } = this.game;
    const statsLines = [
      "┌─ STATUS ──────────┐",
      `│ HP: ${pad(`${player.hp}/${player.maxHp}`, 15)}│`,
      `│ ATK: ${pad(player.atk, 14)}│`,
      `│ DEF: ${pad(player.def, 14)}│`,
      `│ Score: ${pad(player.score, 11)}│`,
      `│ Kills: ${pad(player.kills, 11)}│`,
      `│ Monsters: ${pad(this.game.monsters.length, 8)}│`,
      `│ Vision: ${pad(player.vision, 10)}│`,
      "└───────────────────┘",
    ];
    this.statsEl.textContent = statsLines.join("\n");

    const invLines = ["┌─ INVENTORY ───────┐"];
    const items = player.inventory.length ? player.inventory.slice(-6) : ["(empty)"];
    for (const item of items) {
      invLines.push(`│ ${pad(item, 16)}│`);
    }
    while (invLines.length < 8) {
      invLines.push("│                   │");
    }
    invLines.push("└───────────────────┘");
    this.inventoryEl.textContent = invLines.join("\n");

    const logLines = ["┌─ LOG ─────────────┐"];
    for (const entry of this.game.log) {
      logLines.push(`│ ${pad(entry, 16)}│`);
    }
    while (logLines.length < 10) {
      logLines.push("│                   │");
    }
    logLines.push("└───────────────────┘");
    this.logEl.textContent = logLines.join("\n");
  }
}

function drawCell(ctx, x, y, glyph, fg, bg) {
  const px = x * CONFIG.tileSize;
  const py = y * CONFIG.tileSize;
  ctx.fillStyle = bg;
  ctx.fillRect(px, py, CONFIG.tileSize, CONFIG.tileSize);
  ctx.fillStyle = fg;
  ctx.fillText(glyph, px + 1, py + 1);
}

function createMask(width, height) {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => false));
}

function hasLineOfSight(map, x0, y0, x1, y1) {
  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  let sx = x0 < x1 ? 1 : -1;
  let sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  while (x !== x1 || y !== y1) {
    if (x !== x0 || y !== y0) {
      if (!map.isWalkable(x, y) && map.tiles[y][x].type !== "door") {
        return false;
      }
    }
    const e2 = err * 2;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
  return true;
}

function applyLight(color, amount) {
  const [r, g, b] = hexToRgb(color);
  return `rgb(${Math.floor(r * amount)}, ${Math.floor(g * amount)}, ${Math.floor(b * amount)})`;
}

function withAlpha(color, alpha) {
  const [r, g, b] = hexToRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function hexToRgb(hex) {
  const cleaned = hex.replace("#", "");
  const bigint = parseInt(cleaned, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function carveCorridor(tiles, x1, y1, x2, y2) {
  let x = x1;
  let y = y1;
  while (x !== x2) {
    tiles[y][x].type = "floor";
    x += x < x2 ? 1 : -1;
  }
  while (y !== y2) {
    tiles[y][x].type = "floor";
    y += y < y2 ? 1 : -1;
  }
}

function pad(text, length) {
  const str = String(text);
  if (str.length >= length) return str.slice(0, length);
  return str + " ".repeat(length - str.length);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

const game = new Game();
const renderer = new Renderer(game);
const ui = new UI(game);

function loop() {
  renderer.render();
  ui.update();
  requestAnimationFrame(loop);
}

loop();
