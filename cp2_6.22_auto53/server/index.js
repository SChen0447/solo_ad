import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3005;

const TRACK_LENGTH = 10000;
const SEGMENT_WIDTH = 200;
const TRACK_Y = 400;
const TRACK_HEIGHT = 200;
const LANE_COUNT = 3;
const SHIP_WIDTH = 48;
const SHIP_HEIGHT = 32;

function getLaneY(lane) {
  const laneHeight = TRACK_HEIGHT / LANE_COUNT;
  return TRACK_Y + lane * laneHeight + laneHeight / 2;
}

function generateTrack() {
  const segments = [];
  const obstacles = [];
  const powerUps = [];

  const numSegments = Math.ceil(TRACK_LENGTH / SEGMENT_WIDTH);

  for (let i = 0; i < numSegments; i++) {
    const x = i * SEGMENT_WIDTH;
    let curveDirection = 'straight';
    let curveAngle = 0;

    if (i > 2 && i < numSegments - 2 && Math.random() < 0.15) {
      curveDirection = Math.random() < 0.5 ? 'left' : 'right';
      curveAngle = 30 + Math.random() * 15;
    }

    segments.push({ x, width: SEGMENT_WIDTH, curveAngle, curveDirection });

    if (i > 1 && i < numSegments - 1 && Math.random() < 0.3) {
      const lane = Math.floor(Math.random() * LANE_COUNT);
      const laneY = getLaneY(lane);
      obstacles.push({
        id: uuidv4(),
        x: x + Math.random() * SEGMENT_WIDTH,
        y: laneY - 32,
        width: 64,
        height: 64,
        type: Math.random() < 0.5 ? 'rock' : 'debris'
      });
    }
  }

  let lastPowerUpX = 0;
  for (let x = 500; x < TRACK_LENGTH - 500; ) {
    const gap = 300 + Math.random() * 500;
    x += gap;
    if (x - lastPowerUpX < 300) continue;
    lastPowerUpX = x;

    const lane = Math.floor(Math.random() * LANE_COUNT);
    const laneY = getLaneY(lane);
    const type = Math.random() < 0.6 ? 'speed' : 'slow';

    powerUps.push({
      id: uuidv4(),
      x,
      y: laneY - 24,
      width: 48,
      height: 48,
      type,
      collected: false
    });
  }

  return { segments, obstacles, powerUps };
}

function createAIShip(id, name, color, difficulty) {
  const baseSpeed = 4 + difficulty * 1.5;
  return {
    id,
    x: 100 - Math.random() * 50,
    y: getLaneY(Math.floor(Math.random() * LANE_COUNT)),
    width: SHIP_WIDTH,
    height: SHIP_HEIGHT,
    speed: baseSpeed,
    baseSpeed,
    currentSpeed: baseSpeed,
    color,
    name,
    isPlayer: false,
    flashTimer: 0,
    slowTimer: 0,
    boostTimer: 0,
    isAI: true,
    lane: Math.floor(Math.random() * LANE_COUNT),
    targetLane: Math.floor(Math.random() * LANE_COUNT),
    progress: 0,
    reactionTime: 0.3 + (1 - difficulty) * 0.5,
    avoidanceAccuracy: difficulty,
    itemUsageStrategy: difficulty
  };
}

function checkCollision(ship, obj) {
  return (
    ship.x < obj.x + obj.width &&
    ship.x + ship.width > obj.x &&
    ship.y - ship.height / 2 < obj.y + obj.height &&
    ship.y + ship.height / 2 > obj.y
  );
}

const gameState = {
  trackLength: TRACK_LENGTH,
  trackSegments: [],
  obstacles: [],
  powerUps: [],
  ships: [],
  cameraX: 0,
  gameOver: false,
  winner: null,
  raceTime: 0,
  started: false
};

const aiConfigs = [
  { id: 'ai-1', name: '红龙', color: '#E53E3E', difficulty: 0.75 },
  { id: 'ai-2', name: '蓝鲨', color: '#38B2AC', difficulty: 0.85 },
  { id: 'ai-3', name: '金雕', color: '#D69E2E', difficulty: 0.7 }
];

function initGame() {
  const { segments, obstacles, powerUps } = generateTrack();
  gameState.trackSegments = segments;
  gameState.obstacles = obstacles;
  gameState.powerUps = powerUps;
  gameState.ships = aiConfigs.map(cfg => createAIShip(cfg.id, cfg.name, cfg.color, cfg.difficulty));
  gameState.cameraX = 0;
  gameState.gameOver = false;
  gameState.winner = null;
  gameState.raceTime = 0;
  gameState.started = false;
}

function updateAI(ship, deltaTime) {
  const nearbyObstacles = gameState.obstacles.filter(
    o => o.x > ship.x - 100 && o.x < ship.x + 300
  );

  const obstacleLanes = new Set();
  for (const obs of nearbyObstacles) {
    const obsLane = Math.floor(((obs.y + obs.height / 2) - TRACK_Y) / (TRACK_HEIGHT / LANE_COUNT));
    if (obsLane >= 0 && obsLane < LANE_COUNT && obs.x > ship.x && obs.x < ship.x + 200) {
      obstacleLanes.add(obsLane);
    }
  }

  const changeChance = ship.avoidanceAccuracy * 0.02;
  if (Math.random() < changeChance) {
    if (obstacleLanes.has(ship.lane)) {
      const possibleLanes = [0, 1, 2].filter(l => !obstacleLanes.has(l));
      if (possibleLanes.length > 0) {
        ship.targetLane = possibleLanes[Math.floor(Math.random() * possibleLanes.length)];
      }
    } else if (Math.random() < 0.01) {
      ship.targetLane = Math.floor(Math.random() * LANE_COUNT);
    }
  }

  const nearbyPowerUps = gameState.powerUps.filter(
    p => !p.collected && p.type === 'speed' && p.x > ship.x && p.x < ship.x + 250
  );

  if (nearbyPowerUps.length > 0 && Math.random() < ship.itemUsageStrategy * 0.03) {
    const target = nearbyPowerUps[0];
    const targetLane = Math.floor(((target.y + target.height / 2) - TRACK_Y) / (TRACK_HEIGHT / LANE_COUNT));
    if (targetLane >= 0 && targetLane < LANE_COUNT) {
      ship.targetLane = targetLane;
    }
  }

  const targetY = getLaneY(ship.targetLane);
  const dy = targetY - ship.y;
  ship.y += dy * 0.1;

  if (Math.abs(ship.y - getLaneY(ship.targetLane)) < 5) {
    ship.lane = ship.targetLane;
  }
}

let lastTime = Date.now();

function gameLoop() {
  if (!gameState.started || gameState.gameOver) return;

  const now = Date.now();
  const deltaTime = (now - lastTime) / 1000;
  lastTime = now;

  gameState.raceTime += deltaTime;

  for (const ship of gameState.ships) {
    if (ship.isAI) {
      updateAI(ship, deltaTime);
    }

    let speed = ship.baseSpeed;

    if (ship.boostTimer > 0) {
      speed *= 1.5;
      ship.boostTimer -= deltaTime;
    }

    if (ship.slowTimer > 0) {
      speed *= 0.5;
      ship.slowTimer -= deltaTime;
    }

    if (ship.flashTimer > 0) {
      ship.flashTimer -= deltaTime;
    }

    ship.currentSpeed = speed;
    ship.x += speed * deltaTime * 60;
    ship.progress = ship.x / gameState.trackLength;

    if (ship.x >= gameState.trackLength) {
      gameState.gameOver = true;
      gameState.winner = ship;
    }
  }

  for (const ship of gameState.ships) {
    for (const obs of gameState.obstacles) {
      if (checkCollision(ship, obs) && ship.flashTimer <= 0) {
        ship.flashTimer = 0.5;
        ship.slowTimer = 1;
      }
    }
  }

  for (const ship of gameState.ships) {
    for (const powerUp of gameState.powerUps) {
      if (!powerUp.collected && checkCollision(ship, powerUp)) {
        powerUp.collected = true;
        if (powerUp.type === 'speed') {
          ship.boostTimer = 3;
        } else {
          ship.slowTimer = 2;
        }
      }
    }
  }

  gameState.ships.sort((a, b) => b.progress - a.progress);
}

setInterval(gameLoop, 1000 / 60);

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.send(JSON.stringify({
    type: 'init',
    data: {
      trackLength: gameState.trackLength,
      trackSegments: gameState.trackSegments,
      obstacles: gameState.obstacles,
      powerUps: gameState.powerUps,
      aiShips: gameState.ships,
      gameOver: gameState.gameOver
    }
  }));

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === 'start') {
        initGame();
        gameState.started = true;
        lastTime = Date.now();
        broadcastGameState();
      }

      if (message.type === 'playerUpdate') {
        const playerData = message.data;
        let playerShip = gameState.ships.find(s => s.id === 'player');
        
        if (!playerShip) {
          playerShip = {
            id: 'player',
            x: playerData.x,
            y: playerData.y,
            width: SHIP_WIDTH,
            height: SHIP_HEIGHT,
            speed: playerData.speed,
            baseSpeed: playerData.speed,
            currentSpeed: playerData.speed,
            color: '#60A5FA',
            name: '玩家',
            isPlayer: true,
            flashTimer: 0,
            slowTimer: 0,
            boostTimer: 0,
            isAI: false,
            lane: playerData.lane,
            targetLane: playerData.targetLane,
            progress: 0
          };
          gameState.ships.push(playerShip);
        } else {
          playerShip.x = playerData.x;
          playerShip.y = playerData.y;
          playerShip.lane = playerData.lane;
          playerShip.targetLane = playerData.targetLane;
          playerShip.currentSpeed = playerData.currentSpeed;
          playerShip.progress = playerData.progress;
          playerShip.boostTimer = playerData.boostTimer || 0;
          playerShip.slowTimer = playerData.slowTimer || 0;
          playerShip.flashTimer = playerData.flashTimer || 0;
        }

        if (!gameState.started) {
          gameState.started = true;
          lastTime = Date.now();
        }
      }

      if (message.type === 'restart') {
        initGame();
        gameState.started = true;
        lastTime = Date.now();
      }
    } catch (e) {
      console.error('Error parsing message:', e);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    const playerIndex = gameState.ships.findIndex(s => s.isPlayer);
    if (playerIndex > -1) {
      gameState.ships.splice(playerIndex, 1);
    }
  });
});

function broadcastGameState() {
  const state = {
    type: 'gameState',
    data: {
      ships: gameState.ships,
      obstacles: gameState.obstacles,
      powerUps: gameState.powerUps,
      raceTime: gameState.raceTime,
      gameOver: gameState.gameOver,
      winner: gameState.winner
    }
  };

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(state));
    }
  });
}

setInterval(broadcastGameState, 1000 / 30);

initGame();
