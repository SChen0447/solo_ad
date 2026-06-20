import { RenderEngine, PlayerRenderData } from './RenderEngine';
import { InputManager, InputEvent } from './InputManager';
import { LevelGenerator, IslandData, LevelData } from './LevelGenerator';

export interface PlayerState {
  id: number;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  isJumping: boolean;
  isLanding: boolean;
  landTime: number;
  currentIsland: number;
  hasFinished: boolean;
  finishRank: number;
  score: number;
  fallCount: number;
  color: string;
  rotationY: number;
  isCharging: boolean;
  chargeTime: number;
  moveDirection: { x: number; y: number };
  lastSafePosition: { x: number; y: number; z: number };
  lastSafeIsland: number;
}

export type GameState = 'menu' | 'countdown' | 'playing' | 'roundEnd' | 'gameEnd';

const PLAYER_COLORS = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#a29bfe'];
const PLAYER_NAMES = ['玩家1', '玩家2', '玩家3', '玩家4'];
const GRAVITY = -18;
const BASE_JUMP_SPEED = 5;
const CHARGE_SPEED_MULTIPLIER = 4;
const MAX_CHARGE_TIME = 2.0;
const MOVE_SPEED = 4;
const WATER_Y = -0.5;
const ROUNDS_TOTAL = 3;
const SCORES = [10, 6, 4, 2];

export class GameManager {
  private renderEngine: RenderEngine;
  private inputManager: InputManager;

  private gameState: GameState = 'menu';
  private playerCount: number = 2;
  private players: PlayerState[] = [];
  private currentRound: number = 1;
  private roundFinishCount: number = 0;
  private totalTime: number = 0;

  private levelData: LevelData | null = null;
  private islandPositions: { x: number; y: number; z: number }[] = [];

  private fps: number = 60;
  private frameCount: number = 0;
  private fpsTimer: number = 0;
  private lowFPUMode: boolean = false;

  constructor(renderEngine: RenderEngine, inputManager: InputManager) {
    this.renderEngine = renderEngine;
    this.inputManager = inputManager;

    this.inputManager.addListener((event) => this.handleInput(event));
  }

  startGame(playerCount: number): void {
    this.playerCount = playerCount;
    this.currentRound = 1;
    this.gameState = 'countdown';
    this.roundFinishCount = 0;

    this.inputManager.setActivePlayers(playerCount);
    this.renderEngine.createPlayers(playerCount);

    this.initPlayers();
    this.generateLevel();
  }

  private initPlayers(): void {
    this.players = [];

    for (let i = 0; i < this.playerCount; i++) {
      const startIsland = this.levelData?.islands[0];
      const startX = startIsland ? startIsland.position.x : 0;
      const startZ = startIsland ? startIsland.position.z : 0;
      const offsetX = (i - (this.playerCount - 1) / 2) * 0.5;

      const player: PlayerState = {
        id: i,
        position: { x: startX + offsetX, y: 0.1, z: startZ },
        velocity: { x: 0, y: 0, z: 0 },
        isJumping: false,
        isLanding: false,
        landTime: 0,
        currentIsland: 0,
        hasFinished: false,
        finishRank: 0,
        score: 0,
        fallCount: 0,
        color: PLAYER_COLORS[i],
        rotationY: 0,
        isCharging: false,
        chargeTime: 0,
        moveDirection: { x: 0, y: 0 },
        lastSafePosition: { x: startX + offsetX, y: 0.1, z: startZ },
        lastSafeIsland: 0
      };

      this.players.push(player);
    }
  }

  private generateLevel(): void {
    this.levelData = LevelGenerator.generate(this.currentRound * 1000);
    this.renderEngine.loadLevel(this.levelData.islands);
    this.updateIslandPositions();
  }

  private updateIslandPositions(): void {
    if (!this.levelData) return;

    this.islandPositions = this.levelData.islands.map((island) => {
      return LevelGenerator.getIslandPositionAtTime(island, this.totalTime);
    });
  }

  private handleInput(event: InputEvent): void {
    if (this.gameState !== 'playing' && this.gameState !== 'countdown') return;

    const player = this.players[event.playerId];
    if (!player || player.hasFinished) return;

    switch (event.type) {
      case 'jumpChargeStart':
        if (!player.isJumping) {
          player.isCharging = true;
          player.chargeTime = 0;
        }
        break;

      case 'jumpChargeRelease':
      case 'jumpAutoRelease':
        if (player.isCharging && !player.isJumping) {
          this.jump(player, event.chargeTime || 0);
        }
        player.isCharging = false;
        player.chargeTime = 0;
        break;

      case 'move':
        if (event.direction) {
          player.moveDirection = { ...event.direction };
        }
        break;
    }
  }

  private jump(player: PlayerState, chargeTime: number): void {
    const clampedCharge = Math.min(chargeTime, MAX_CHARGE_TIME);
    const jumpSpeed = BASE_JUMP_SPEED + clampedCharge * CHARGE_SPEED_MULTIPLIER;

    const moveX = player.moveDirection.x;
    const moveZ = -player.moveDirection.y;

    const moveStrength = 1.5;
    player.velocity.x = moveX * MOVE_SPEED * moveStrength;
    player.velocity.z = moveZ * MOVE_SPEED * moveStrength;
    player.velocity.y = jumpSpeed;

    player.isJumping = true;
    player.isLanding = false;

    if (Math.abs(moveX) > 0.01 || Math.abs(moveZ) > 0.01) {
      player.rotationY = Math.atan2(moveX, moveZ);
    }
  }

  update(deltaTime: number): void {
    this.totalTime += deltaTime;
    this.updateFPS(deltaTime);
    this.inputManager.update(deltaTime);

    if (this.gameState === 'playing' || this.gameState === 'countdown') {
      this.updateIslandPositions();
      this.updatePlayers(deltaTime);
      this.checkRoundComplete();
    }

    this.syncRenderData();
  }

  private updateFPS(deltaTime: number): void {
    this.frameCount++;
    this.fpsTimer += deltaTime;

    if (this.fpsTimer >= 0.5) {
      this.fps = this.frameCount / this.fpsTimer;
      this.frameCount = 0;
      this.fpsTimer = 0;

      const wasLowFPUMode = this.lowFPUMode;
      this.lowFPUMode = this.fps < 30;

      if (this.lowFPUMode !== wasLowFPUMode) {
        this.renderEngine.setLowFPUMode(this.lowFPUMode);
      }
    }
  }

  private updatePlayers(deltaTime: number): void {
    if (this.gameState !== 'playing') return;

    for (const player of this.players) {
      if (player.hasFinished) continue;

      if (player.isCharging) {
        player.chargeTime = Math.min(player.chargeTime + deltaTime, MAX_CHARGE_TIME);
      }

      if (player.isJumping) {
        player.velocity.y += GRAVITY * deltaTime;

        player.position.x += player.velocity.x * deltaTime;
        player.position.y += player.velocity.y * deltaTime;
        player.position.z += player.velocity.z * deltaTime;

        const horizontalSpeed = Math.sqrt(
          player.velocity.x ** 2 + player.velocity.z ** 2
        );
        player.rotationY += horizontalSpeed * deltaTime * 2;

        this.checkLanding(player);
        this.checkWaterFall(player);
      } else {
        const moveX = player.moveDirection.x * MOVE_SPEED * deltaTime * 0.5;
        const moveZ = -player.moveDirection.y * MOVE_SPEED * deltaTime * 0.5;

        const currentIslandData = this.levelData?.islands[player.currentIsland];
        if (currentIslandData) {
          const islandPos = this.islandPositions[player.currentIsland];
          const halfX = currentIslandData.size.x / 2 - 0.3;
          const halfZ = currentIslandData.size.z / 2 - 0.3;

          const newX = player.position.x + moveX;
          const newZ = player.position.z + moveZ;

          player.position.x = Math.max(islandPos.x - halfX, Math.min(islandPos.x + halfX, newX));
          player.position.z = Math.max(islandPos.z - halfZ, Math.min(islandPos.z + halfZ, newZ));

          const islandTop = currentIslandData.size.y / 2;
          player.position.y = islandTop;

          if (Math.abs(moveX) > 0.001 || Math.abs(moveZ) > 0.001) {
            player.rotationY = Math.atan2(moveX, -moveZ);
          }
        }
      }

      if (player.isLanding) {
        player.landTime += deltaTime;
        if (player.landTime > 0.15) {
          player.isLanding = false;
          player.landTime = 0;
        }
      }
    }
  }

  private checkLanding(player: PlayerState): void {
    if (player.velocity.y > 0) return;
    if (!this.levelData) return;

    for (let i = 0; i < this.levelData.islands.length; i++) {
      const island = this.levelData.islands[i];
      const islandPos = this.islandPositions[i];

      const halfX = island.size.x / 2;
      const halfZ = island.size.z / 2;
      const islandTop = island.size.y / 2;

      if (
        player.position.x >= islandPos.x - halfX &&
        player.position.x <= islandPos.x + halfX &&
        player.position.z >= islandPos.z - halfZ &&
        player.position.z <= islandPos.z + halfZ &&
        player.position.y <= islandTop + 0.1 &&
        player.position.y >= islandTop - 0.5
      ) {
        player.position.y = islandTop;
        player.velocity.y = 0;
        player.velocity.x = 0;
        player.velocity.z = 0;
        player.isJumping = false;
        player.isLanding = true;
        player.landTime = 0;

        if (i > player.currentIsland) {
          player.currentIsland = i;
          player.lastSafeIsland = i;
          player.lastSafePosition = { ...player.position };
        }

        this.renderEngine.triggerLanding(player.id);

        if (island.isEnd && !player.hasFinished) {
          player.hasFinished = true;
          this.roundFinishCount++;
          player.finishRank = this.roundFinishCount;
          player.score += SCORES[this.roundFinishCount - 1] || 0;
        }

        return;
      }
    }
  }

  private checkWaterFall(player: PlayerState): void {
    if (player.position.y < WATER_Y) {
      player.fallCount++;
      player.score = Math.max(0, player.score - 1);

      this.renderEngine.spawnSplashParticles(player.position.x, player.position.z);

      const respawnPos = { ...player.lastSafePosition };
      player.position = respawnPos;
      player.velocity = { x: 0, y: 0, z: 0 };
      player.isJumping = false;
      player.isCharging = false;
      player.chargeTime = 0;
      player.currentIsland = player.lastSafeIsland;
    }
  }

  private checkRoundComplete(): void {
    if (this.gameState !== 'playing') return;

    const finishedCount = this.players.filter(p => p.hasFinished).length;

    if (finishedCount >= this.playerCount - 1 || this.allPlayersFinished()) {
      this.endRound();
    }
  }

  private allPlayersFinished(): boolean {
    return this.players.every(p => p.hasFinished);
  }

  private endRound(): void {
    this.gameState = 'roundEnd';
  }

  startNextRound(): boolean {
    if (this.currentRound >= ROUNDS_TOTAL) {
      this.gameState = 'gameEnd';
      this.renderEngine.spawnCelebrationParticles();
      return false;
    }

    this.currentRound++;
    this.roundFinishCount = 0;
    this.gameState = 'countdown';

    this.generateLevel();

    for (const player of this.players) {
      const startIsland = this.levelData?.islands[0];
      const startX = startIsland ? startIsland.position.x : 0;
      const startZ = startIsland ? startIsland.position.z : 0;
      const offsetX = (player.id - (this.playerCount - 1) / 2) * 0.5;

      player.position = { x: startX + offsetX, y: 0.1, z: startZ };
      player.velocity = { x: 0, y: 0, z: 0 };
      player.isJumping = false;
      player.isLanding = false;
      player.landTime = 0;
      player.currentIsland = 0;
      player.hasFinished = false;
      player.finishRank = 0;
      player.fallCount = 0;
      player.isCharging = false;
      player.chargeTime = 0;
      player.moveDirection = { x: 0, y: 0 };
      player.lastSafePosition = { x: startX + offsetX, y: 0.1, z: startZ };
      player.lastSafeIsland = 0;
    }

    return true;
  }

  startRound(): void {
    this.gameState = 'playing';
  }

  private syncRenderData(): void {
    for (const player of this.players) {
      const renderData: PlayerRenderData = {
        id: player.id,
        position: { ...player.position },
        color: player.color,
        isCharging: player.isCharging,
        chargeTime: player.chargeTime,
        maxChargeTime: MAX_CHARGE_TIME,
        isJumping: player.isJumping,
        isLanding: player.isLanding,
        landTime: player.landTime,
        rotationY: player.rotationY,
        fallCount: player.fallCount
      };

      this.renderEngine.updatePlayer(renderData);
    }
  }

  getGameState(): GameState {
    return this.gameState;
  }

  setGameState(state: GameState): void {
    this.gameState = state;
  }

  getPlayers(): PlayerState[] {
    return this.players;
  }

  getCurrentRound(): number {
    return this.currentRound;
  }

  getTotalRounds(): number {
    return ROUNDS_TOTAL;
  }

  getFPS(): number {
    return this.fps;
  }

  isLowFPUMode(): boolean {
    return this.lowFPUMode;
  }

  getPlayerCount(): number {
    return this.playerCount;
  }

  getPlayerName(playerId: number): string {
    return PLAYER_NAMES[playerId];
  }

  getPlayerColor(playerId: number): string {
    return PLAYER_COLORS[playerId];
  }

  getRoundRankings(): { playerId: number; rank: number; score: number; color: string; name: string }[] {
    const rankings = this.players
      .filter(p => p.hasFinished)
      .map(p => ({
        playerId: p.id,
        rank: p.finishRank,
        score: p.score,
        color: p.color,
        name: PLAYER_NAMES[p.id]
      }));

    const unfinished = this.players.filter(p => !p.hasFinished);
    for (let i = 0; i < unfinished.length; i++) {
      rankings.push({
        playerId: unfinished[i].id,
        rank: this.roundFinishCount + i + 1,
        score: unfinished[i].score,
        color: unfinished[i].color,
        name: PLAYER_NAMES[unfinished[i].id]
      });
    }

    return rankings.sort((a, b) => a.rank - b.rank);
  }

  getFinalRankings(): { playerId: number; rank: number; totalScore: number; color: string; name: string }[] {
    return this.players
      .map(p => ({
        playerId: p.id,
        rank: 0,
        totalScore: p.score,
        color: p.color,
        name: PLAYER_NAMES[p.id]
      }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((p, index) => ({ ...p, rank: index + 1 }));
  }
}
