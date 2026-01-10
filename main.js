const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const viewport = { cols: 120, rows: 40 };
const world = { cols: 300, rows: 150 };
const cell = { width: 10, height: 16 };
canvas.width = viewport.cols * cell.width;
canvas.height = viewport.rows * cell.height;

const colors = {
  fog: "#0b0f14",
  dim: "#1e293b",
  bright: "#e2e8f0",
  player: "#7dd3fc",
  wall: "#64748b",
  floor: "#94a3b8",
  water: "#38bdf8",
  grass: "#4ade80",
  rubble: "#facc15",
  door: "#fb923c",
  monster: "#f87171",
  monsterElite: "#f472b6",
  monsterBoss: "#c084fc",
  itemGold: "#fbbf24",
  itemPotion: "#22d3ee",
  itemScroll: "#a3e635",
  damage: "#f97316",
};

const tiles = {
  wall: { char: "#", fg: colors.wall, bg: "#0f172a" },
  floor: { char: "·", fg: colors.floor, bg: "#111827" },
  water: { char: "~", fg: colors.water, bg: "#0b1d2d" },
  grass: { char: '"', fg: colors.grass, bg: "#0f1f16" },
  rubble: { char: ":", fg: colors.rubble, bg: "#1f160b" },
  door: { char: "+", fg: colors.door, bg: "#1f130b" },
};

const rng = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Cell definition for the ASCII grid.
const createCell = (char, fg, bg, bold = false) => ({ char, fg, bg, bold });

const createGrid = (cols, rows, filler) =>
  Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => filler())
  );

const worldGrid = createGrid(world.cols, world.rows, () =>
  createCell(" ", colors.bright, colors.fog)
);
const explored = createGrid(world.cols, world.rows, () => false);

const logEntries = [];
const addLog = (message) => {
  logEntries.unshift({
    message,
    time: new Date().toLocaleTimeString(),
  });
  if (logEntries.length > 12) logEntries.pop();
};

const player = {
  x: 10,
  y: 10,
  hp: 30,
  maxHp: 30,
  attack: 6,
  defense: 2,
  vision: 8,
  cooldown: 0,
};

const monsters = [];
const items = [];
const damagePopups = [];

const carveRoom = (x, y, w, h) => {
  for (let yPos = y; yPos < y + h; yPos += 1) {
    for (let xPos = x; xPos < x + w; xPos += 1) {
      worldGrid[yPos][xPos] = createCell(
        tiles.floor.char,
        tiles.floor.fg,
        tiles.floor.bg
      );
    }
  }
};

const carveCorridor = (x1, y1, x2, y2) => {
  let x = x1;
  let y = y1;
  while (x !== x2 || y !== y2) {
    worldGrid[y][x] = createCell(
      tiles.floor.char,
      tiles.floor.fg,
      tiles.floor.bg
    );
    if (x < x2) x += 1;
    if (x > x2) x -= 1;
    if (y < y2) y += 1;
    if (y > y2) y -= 1;
  }
};

// Simple room + corridor dungeon generator.
const generateDungeon = () => {
  for (let y = 0; y < world.rows; y += 1) {
    for (let x = 0; x < world.cols; x += 1) {
      worldGrid[y][x] = createCell(
        tiles.wall.char,
        tiles.wall.fg,
        tiles.wall.bg
      );
    }
  }

  const rooms = [];
  for (let i = 0; i < 40; i += 1) {
    const w = rng(8, 18);
    const h = rng(6, 12);
    const x = rng(2, world.cols - w - 2);
    const y = rng(2, world.rows - h - 2);
    const room = { x, y, w, h };
    const overlaps = rooms.some(
      (other) =>
        x < other.x + other.w + 2 &&
        x + w + 2 > other.x &&
        y < other.y + other.h + 2 &&
        y + h + 2 > other.y
    );
    if (overlaps) continue;
    carveRoom(x, y, w, h);
    if (rooms.length > 0) {
      const prev = rooms[rooms.length - 1];
      carveCorridor(
        Math.floor(prev.x + prev.w / 2),
        Math.floor(prev.y + prev.h / 2),
        Math.floor(x + w / 2),
        Math.floor(y + h / 2)
      );
    }
    rooms.push(room);
  }

  rooms.forEach((room) => {
    const doorX = rng(room.x + 1, room.x + room.w - 2);
    worldGrid[room.y][doorX] = createCell(
      tiles.door.char,
      tiles.door.fg,
      tiles.door.bg,
      true
    );
  });

  for (let i = 0; i < 900; i += 1) {
    const x = rng(1, world.cols - 2);
    const y = rng(1, world.rows - 2);
    const tileRoll = Math.random();
    if (worldGrid[y][x].char !== tiles.floor.char) continue;
    if (tileRoll < 0.35) {
      worldGrid[y][x] = createCell(
        tiles.grass.char,
        tiles.grass.fg,
        tiles.grass.bg
      );
    } else if (tileRoll < 0.5) {
      worldGrid[y][x] = createCell(
        tiles.rubble.char,
        tiles.rubble.fg,
        tiles.rubble.bg
      );
    } else if (tileRoll < 0.58) {
      worldGrid[y][x] = createCell(
        tiles.water.char,
        tiles.water.fg,
        tiles.water.bg
      );
    }
  }
};

// Spawn monsters and items across walkable tiles.
const spawnEntities = () => {
  const monsterTypes = [
    { glyph: "g", color: colors.monster, hp: 8, attack: 3 },
    { glyph: "Z", color: colors.monsterElite, hp: 12, attack: 4 },
    { glyph: "M", color: colors.monsterBoss, hp: 18, attack: 6 },
  ];

  for (let i = 0; i < 22; i += 1) {
    const type = monsterTypes[i % monsterTypes.length];
    let x = rng(5, world.cols - 5);
    let y = rng(5, world.rows - 5);
    while (!isWalkable(x, y)) {
      x = rng(5, world.cols - 5);
      y = rng(5, world.rows - 5);
    }
    monsters.push({
      id: `m-${i}`,
      x,
      y,
      glyph: type.glyph,
      color: type.color,
      hp: type.hp,
      maxHp: type.hp,
      attack: type.attack,
      cooldown: rng(0, 2),
    });
  }

  const itemGlyphs = [
    { glyph: "$", color: colors.itemGold, name: "Gold" },
    { glyph: "!", color: colors.itemPotion, name: "Potion" },
    { glyph: "?", color: colors.itemScroll, name: "Scroll" },
  ];

  for (let i = 0; i < 24; i += 1) {
    const type = itemGlyphs[i % itemGlyphs.length];
    let x = rng(6, world.cols - 6);
    let y = rng(6, world.rows - 6);
    while (!isWalkable(x, y)) {
      x = rng(6, world.cols - 6);
      y = rng(6, world.rows - 6);
    }
    items.push({ id: `i-${i}`, x, y, ...type });
  }
};

const isWalkable = (x, y) => {
  const cellData = worldGrid[y]?.[x];
  if (!cellData) return false;
  return cellData.char !== tiles.wall.char;
};

const input = {
  queue: [],
};

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["w", "a", "s", "d", " "].includes(key)) {
    event.preventDefault();
  }
  if (key === "w") input.queue.push({ dx: 0, dy: -1 });
  if (key === "s") input.queue.push({ dx: 0, dy: 1 });
  if (key === "a") input.queue.push({ dx: -1, dy: 0 });
  if (key === "d") input.queue.push({ dx: 1, dy: 0 });
  if (key === " ") input.queue.push({ attack: true });
});

// Breadth-first search step for monster pathing.
const bfsStep = (start, goal, maxDepth = 12) => {
  const queue = [{ x: start.x, y: start.y, path: [] }];
  const visited = new Set([`${start.x},${start.y}`]);
  while (queue.length) {
    const current = queue.shift();
    if (current.path.length > maxDepth) continue;
    if (current.x === goal.x && current.y === goal.y) {
      return current.path[0];
    }
    const neighbors = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
    neighbors.forEach((step) => {
      const nextX = current.x + step.dx;
      const nextY = current.y + step.dy;
      const key = `${nextX},${nextY}`;
      if (visited.has(key)) return;
      if (!isWalkable(nextX, nextY)) return;
      visited.add(key);
      queue.push({
        x: nextX,
        y: nextY,
        path: [...current.path, step],
      });
    });
  }
  return null;
};

// Update fog-of-war around the player.
const updateFog = () => {
  for (let y = player.y - player.vision; y <= player.y + player.vision; y += 1) {
    for (let x = player.x - player.vision; x <= player.x + player.vision; x += 1) {
      if (x < 0 || y < 0 || x >= world.cols || y >= world.rows) continue;
      const distance = Math.hypot(player.x - x, player.y - y);
      if (distance <= player.vision) {
        explored[y][x] = true;
      }
    }
  }
};

const isVisible = (x, y) => {
  const distance = Math.hypot(player.x - x, player.y - y);
  return distance <= player.vision;
};

const attack = () => {
  if (player.cooldown > 0) return;
  player.cooldown = 4;
  addLog("You swing your blade.");
  const targets = monsters.filter((monster) => {
    const distance = Math.hypot(player.x - monster.x, player.y - monster.y);
    return distance <= 1.5;
  });
  targets.forEach((monster) => {
    monster.hp -= player.attack;
    damagePopups.push({
      x: monster.x,
      y: monster.y,
      value: player.attack,
      life: 12,
    });
    if (monster.hp <= 0) {
      monster.hp = monster.maxHp;
      monster.x = rng(4, world.cols - 4);
      monster.y = rng(4, world.rows - 4);
      addLog(`You slay a ${monster.glyph}!`);
    }
  });
};

const movePlayer = (dx, dy) => {
  const nextX = player.x + dx;
  const nextY = player.y + dy;
  if (!isWalkable(nextX, nextY)) return;
  player.x = nextX;
  player.y = nextY;
  items.forEach((item) => {
    if (item.x === player.x && item.y === player.y) {
      addLog(`Picked up ${item.name}.`);
      item.x = rng(4, world.cols - 4);
      item.y = rng(4, world.rows - 4);
      player.inventory[item.name] = (player.inventory[item.name] || 0) + 1;
    }
  });
};

const updateMonsters = () => {
  monsters.forEach((monster) => {
    if (monster.cooldown > 0) {
      monster.cooldown -= 1;
      return;
    }
    const distance = Math.hypot(player.x - monster.x, player.y - monster.y);
    if (distance <= 1.2) {
      player.hp = Math.max(0, player.hp - monster.attack);
      damagePopups.push({
        x: player.x,
        y: player.y,
        value: monster.attack,
        life: 10,
      });
      monster.cooldown = 2;
      addLog(`The ${monster.glyph} hits you!`);
      return;
    }
    const step = bfsStep(monster, player, 10);
    if (step) {
      const nextX = monster.x + step.dx;
      const nextY = monster.y + step.dy;
      if (
        isWalkable(nextX, nextY) &&
        !monsters.some((other) => other !== monster && other.x === nextX && other.y === nextY)
      ) {
        monster.x = nextX;
        monster.y = nextY;
      }
    }
  });
};

// Render the visible window of the world and entities.
const renderGrid = () => {
  ctx.fillStyle = colors.fog;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const camera = {
    x: clamp(player.x - Math.floor(viewport.cols / 2), 0, world.cols - viewport.cols),
    y: clamp(player.y - Math.floor(viewport.rows / 2), 0, world.rows - viewport.rows),
  };

  ctx.font = "bold 14px 'Fira Mono', monospace";
  ctx.textBaseline = "top";

  for (let row = 0; row < viewport.rows; row += 1) {
    for (let col = 0; col < viewport.cols; col += 1) {
      const worldX = camera.x + col;
      const worldY = camera.y + row;
      const tile = worldGrid[worldY]?.[worldX];
      if (!tile) continue;
      const visible = isVisible(worldX, worldY);
      const wasExplored = explored[worldY][worldX];
      if (!visible && !wasExplored) continue;
      const fg = visible ? tile.fg : colors.dim;
      const bg = visible ? tile.bg : "#0f172a";
      ctx.fillStyle = bg;
      ctx.fillRect(col * cell.width, row * cell.height, cell.width, cell.height);
      ctx.fillStyle = fg;
      ctx.fillText(tile.char, col * cell.width, row * cell.height);
    }
  }

  const entitiesToRender = [
    ...items.map((item) => ({ ...item, layer: 1, glyph: item.glyph, color: item.color })),
    ...monsters.map((monster) => ({
      ...monster,
      layer: 2,
      glyph: monster.glyph,
      color: monster.color,
    })),
    { ...player, layer: 3, glyph: "@", color: colors.player },
  ];

  entitiesToRender.forEach((entity) => {
    if (!isVisible(entity.x, entity.y)) return;
    const col = entity.x - camera.x;
    const row = entity.y - camera.y;
    if (col < 0 || row < 0 || col >= viewport.cols || row >= viewport.rows) return;
    ctx.fillStyle = entity.color;
    ctx.fillText(entity.glyph, col * cell.width, row * cell.height);
  });

  damagePopups.forEach((popup) => {
    if (!isVisible(popup.x, popup.y)) return;
    const col = popup.x - camera.x;
    const row = popup.y - camera.y - 1;
    if (col < 0 || row < 0 || col >= viewport.cols || row >= viewport.rows) return;
    ctx.fillStyle = colors.damage;
    ctx.fillText(String(popup.value), col * cell.width, row * cell.height);
  });
};

const updateHUD = () => {
  const hud = document.getElementById("hud");
  hud.innerHTML = `
    <div class="hud-row"><span>HP</span><strong>${player.hp}/${player.maxHp}</strong></div>
    <div class="hud-row"><span>Attack</span><strong>${player.attack}</strong></div>
    <div class="hud-row"><span>Defense</span><strong>${player.defense}</strong></div>
    <div class="hud-row"><span>Monsters</span><strong>${monsters.length}</strong></div>
    <div class="hud-row"><span>Cooldown</span><strong>${player.cooldown}</strong></div>
  `;

  const inventory = document.getElementById("inventory");
  const itemsList = Object.entries(player.inventory);
  if (itemsList.length === 0) {
    inventory.innerHTML = "<li>Empty</li>";
  } else {
    inventory.innerHTML = itemsList
      .map(([name, amount]) => `<li>${name}: ${amount}</li>`)
      .join("");
  }

  const log = document.getElementById("log");
  log.innerHTML = logEntries
    .map((entry) => `<div class="log-entry">[${entry.time}] ${entry.message}</div>`)
    .join("");
};

// Main loop.
const tick = () => {
  if (player.cooldown > 0) player.cooldown -= 1;
  const action = input.queue.shift();
  if (action) {
    if (action.attack) {
      attack();
    } else {
      movePlayer(action.dx, action.dy);
    }
    updateMonsters();
  }
  updateFog();
  damagePopups.forEach((popup) => {
    popup.life -= 1;
  });
  for (let i = damagePopups.length - 1; i >= 0; i -= 1) {
    if (damagePopups[i].life <= 0) damagePopups.splice(i, 1);
  }
  renderGrid();
  updateHUD();
  requestAnimationFrame(tick);
};

const init = () => {
  player.inventory = {};
  generateDungeon();
  spawnEntities();
  addLog("The wilds awaken. Hunt carefully.");
  updateFog();
  tick();
};

init();
