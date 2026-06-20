import * as THREE from 'three';
import { GameState, Difficulty } from './gameState';
import { AudioAnalyzer } from './audioAnalyzer';
import { PlayerController, PlayerCollisionInfo, LanePosition } from './playerController';

export type ObstacleType = 'jump' | 'dodge' | 'crouch' | 'combo';

export interface Obstacle {
  id: number;
  type: ObstacleType;
  mesh: THREE.Group;
  lanes: LanePosition[];
  speed: number;
  active: boolean;
  passed: boolean;
  spawnTime: number;
  animationProgress: number;
  boundingBox: THREE.Box3;
}

export interface BeatInfo {
  time: number;
  bpm: number;
  beatCount: number;
  energy: number;
}

export class ObstacleGenerator {
  private scene: THREE.Scene;
  private gameState: GameState;
  private audioAnalyzer: AudioAnalyzer;
  private playerController: PlayerController;
  private obstacles: Obstacle[] = [];
  private obstaclePool: Obstacle[] = [];
  private maxPoolSize: number = 50;
  private nextObstacleId: number = 0;
  private beatCount: number = 0;
  private lastSpawnTime: number = 0;
  private baseSpeed: number = 15;
  private spawnDistance: number = -80;
  private despawnDistance: number = 20;
  private laneWidth: number = 2.5;
  private difficulty: Difficulty = 'normal';
  private listeners: Map<string, Set<(data?: unknown) => void>> = new Map();
  private comboObstacleChance: number = 0.25;

  constructor(
    scene: THREE.Scene,
    playerController: PlayerController
  ) {
    this.scene = scene;
    this.gameState = GameState.getInstance();
    this.audioAnalyzer = AudioAnalyzer.getInstance();
    this.playerController = playerController;
    this.difficulty = this.gameState.getDifficulty();

    this.setupEventListeners();
  }

  on(event: string, callback: (data?: unknown) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data?: unknown) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  private emit(event: string, data?: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  private setupEventListeners(): void {
    this.audioAnalyzer.on('beat', this.handleBeat.bind(this));
    this.gameState.on('difficultyChange', this.handleDifficultyChange.bind(this));
    this.gameState.on('reset', this.handleReset.bind(this));
  }

  private handleBeat(data?: unknown): void {
    if (this.gameState.getStatus() !== 'playing') return;

    const beatInfo = data as BeatInfo;
    this.beatCount = beatInfo.beatCount;

    const isFourthBeat = this.beatCount % 4 === 0;
    const spawnType = isFourthBeat ? 'combo' : this.getRandomObstacleType();
    
    this.spawnObstacle(spawnType, beatInfo);
  }

  private handleDifficultyChange(data?: unknown): void {
    this.difficulty = data as Difficulty;
    this.updateDifficultySettings();
  }

  private handleReset(): void {
    this.clearAllObstacles();
    this.beatCount = 0;
    this.lastSpawnTime = 0;
  }

  private updateDifficultySettings(): void {
    switch (this.difficulty) {
      case 'easy':
        this.baseSpeed = 12;
        this.comboObstacleChance = 0.15;
        break;
      case 'normal':
        this.baseSpeed = 15;
        this.comboObstacleChance = 0.25;
        break;
      case 'hard':
        this.baseSpeed = 18;
        this.comboObstacleChance = 0.35;
        break;
    }
  }

  private getRandomObstacleType(): ObstacleType {
    const types: ObstacleType[] = ['jump', 'dodge', 'crouch'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private spawnObstacle(type: ObstacleType, beatInfo: BeatInfo): void {
    const now = performance.now() / 1000;
    const minInterval = this.gameState.getObstacleInterval();
    
    if (now - this.lastSpawnTime < minInterval * 0.8) return;

    const lanes = this.getLanesForType(type);
    const obstacle = this.getObstacleFromPool(type, lanes, beatInfo.energy);
    
    if (obstacle) {
      this.obstacles.push(obstacle);
      this.scene.add(obstacle.mesh);
      this.lastSpawnTime = now;
      this.emit('obstacleSpawn', obstacle);
    }
  }

  private getLanesForType(type: ObstacleType): LanePosition[] {
    switch (type) {
      case 'jump':
        return [['left'], ['center'], ['right']][Math.floor(Math.random() * 3)] as LanePosition[];
      case 'dodge': {
        const allLanes: LanePosition[] = ['left', 'center', 'right'];
        const random = Math.random();
        if (random < 0.4) {
          const blocked = allLanes[Math.floor(Math.random() * 3)];
          return allLanes.filter(l => l !== blocked) as LanePosition[];
        } else {
          return [allLanes[Math.floor(Math.random() * 3)]] as LanePosition[];
        }
      }
      case 'crouch':
        return ['left', 'center', 'right'];
      case 'combo':
        return this.getComboLanes();
    }
  }

  private getComboLanes(): LanePosition[] {
    const patterns: LanePosition[][] = [
      ['left', 'center'],
      ['center', 'right'],
      ['left', 'right'],
      ['left', 'center', 'right']
    ];
    return patterns[Math.floor(Math.random() * patterns.length)];
  }

  private getObstacleFromPool(type: ObstacleType, lanes: LanePosition[], energy: number): Obstacle | null {
    if (this.obstaclePool.length > 0) {
      const pooled = this.obstaclePool.pop()!;
      this.recycleObstacle(pooled, type, lanes, energy);
      return pooled;
    }

    if (this.obstacles.length >= this.maxPoolSize) {
      return null;
    }

    return this.createNewObstacle(type, lanes, energy);
  }

  private createNewObstacle(type: ObstacleType, lanes: LanePosition[], energy: number): Obstacle {
    const mesh = this.createObstacleMesh(type, energy);
    const laneX = this.getAverageLaneX(lanes);
    
    mesh.position.set(laneX, this.getHeightForType(type), this.spawnDistance);

    const obstacle: Obstacle = {
      id: this.nextObstacleId++,
      type,
      mesh,
      lanes,
      speed: this.baseSpeed * this.gameState.getGameSpeed(),
      active: true,
      passed: false,
      spawnTime: performance.now() / 1000,
      animationProgress: 0,
      boundingBox: new THREE.Box3()
    };

    mesh.scale.set(1.5, 1.5, 1.5);
    this.updateBoundingBox(obstacle);

    return obstacle;
  }

  private recycleObstacle(obstacle: Obstacle, type: ObstacleType, lanes: LanePosition[], energy: number): void {
    while (obstacle.mesh.children.length > 0) {
      obstacle.mesh.remove(obstacle.mesh.children[0]);
    }

    const newMesh = this.createObstacleMesh(type, energy);
    while (newMesh.children.length > 0) {
      obstacle.mesh.add(newMesh.children[0]);
    }

    const laneX = this.getAverageLaneX(lanes);
    obstacle.mesh.position.set(laneX, this.getHeightForType(type), this.spawnDistance);
    obstacle.mesh.scale.set(1.5, 1.5, 1.5);

    obstacle.id = this.nextObstacleId++;
    obstacle.type = type;
    obstacle.lanes = lanes;
    obstacle.speed = this.baseSpeed * this.gameState.getGameSpeed();
    obstacle.active = true;
    obstacle.passed = false;
    obstacle.spawnTime = performance.now() / 1000;
    obstacle.animationProgress = 0;

    this.updateBoundingBox(obstacle);
  }

  private createObstacleMesh(type: ObstacleType, energy: number): THREE.Group {
    const group = new THREE.Group();
    const color = this.generateHighSaturationColor();
    const intensity = 0.3 + energy * 0.5;

    switch (type) {
      case 'jump':
        this.createJumpObstacle(group, color, intensity);
        break;
      case 'dodge':
        this.createDodgeObstacle(group, color, intensity);
        break;
      case 'crouch':
        this.createCrouchObstacle(group, color, intensity);
        break;
      case 'combo':
        this.createComboObstacle(group, color, intensity);
        break;
    }

    return group;
  }

  private generateHighSaturationColor(): THREE.Color {
    const hue = Math.random();
    const saturation = 0.8 + Math.random() * 0.2;
    const lightness = 0.5 + Math.random() * 0.2;
    return new THREE.Color().setHSL(hue, saturation, lightness);
  }

  private createJumpObstacle(group: THREE.Group, color: THREE.Color, intensity: number): void {
    const geometry = new THREE.BoxGeometry(1.8, 0.8, 1.8);
    const material = new THREE.MeshPhysicalMaterial({
      color,
      metalness: 0.1,
      roughness: 0.1,
      transparent: true,
      opacity: 0.7,
      emissive: color,
      emissiveIntensity: intensity,
      clearcoat: 1,
      clearcoatRoughness: 0.1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    group.add(mesh);

    const edges = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
    group.add(edgeLines);

    const glowGeometry = new THREE.BoxGeometry(2.2, 1.2, 2.2);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.15
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glow);
  }

  private createDodgeObstacle(group: THREE.Group, color: THREE.Color, intensity: number): void {
    const geometry = new THREE.CylinderGeometry(0.6, 0.6, 4, 12);
    const material = new THREE.MeshPhysicalMaterial({
      color,
      metalness: 0.1,
      roughness: 0.1,
      transparent: true,
      opacity: 0.7,
      emissive: color,
      emissiveIntensity: intensity,
      clearcoat: 1,
      clearcoatRoughness: 0.1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 1.5;
    mesh.castShadow = true;
    group.add(mesh);

    const edges = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
    edgeLines.position.y = 1.5;
    group.add(edgeLines);

    const glowGeometry = new THREE.CylinderGeometry(0.9, 0.9, 4.5, 12);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.15
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = 1.5;
    group.add(glow);
  }

  private createCrouchObstacle(group: THREE.Group, color: THREE.Color, intensity: number): void {
    const geometry = new THREE.BoxGeometry(7, 0.5, 1);
    const material = new THREE.MeshPhysicalMaterial({
      color,
      metalness: 0.1,
      roughness: 0.1,
      transparent: true,
      opacity: 0.7,
      emissive: color,
      emissiveIntensity: intensity,
      clearcoat: 1,
      clearcoatRoughness: 0.1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = 2;
    mesh.castShadow = true;
    group.add(mesh);

    const edges = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
    edgeLines.position.y = 2;
    group.add(edgeLines);

    const glowGeometry = new THREE.BoxGeometry(7.5, 0.8, 1.5);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.15
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = 2;
    group.add(glow);
  }

  private createComboObstacle(group: THREE.Group, color: THREE.Color, intensity: number): void {
    this.createJumpObstacle(group, color, intensity);
    
    const secondColor = this.generateHighSaturationColor();
    const cylinderGeometry = new THREE.CylinderGeometry(0.4, 0.4, 3, 8);
    const cylinderMaterial = new THREE.MeshPhysicalMaterial({
      color: secondColor,
      metalness: 0.1,
      roughness: 0.1,
      transparent: true,
      opacity: 0.7,
      emissive: secondColor,
      emissiveIntensity: intensity * 0.8,
      clearcoat: 1,
      clearcoatRoughness: 0.1
    });

    const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    cylinder.position.set(1.8, 1.2, 0);
    cylinder.castShadow = true;
    group.add(cylinder);

    const edges = new THREE.EdgesGeometry(cylinderGeometry);
    const edgeMaterial = new THREE.LineBasicMaterial({ color: secondColor, transparent: true, opacity: 0.9 });
    const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
    edgeLines.position.copy(cylinder.position);
    group.add(edgeLines);
  }

  private getAverageLaneX(lanes: LanePosition[]): number {
    const xValues = lanes.map(lane => this.getLaneX(lane));
    return xValues.reduce((a, b) => a + b, 0) / xValues.length;
  }

  private getLaneX(lane: LanePosition): number {
    switch (lane) {
      case 'left': return -this.laneWidth;
      case 'center': return 0;
      case 'right': return this.laneWidth;
    }
  }

  private getHeightForType(type: ObstacleType): number {
    switch (type) {
      case 'jump': return 0.4;
      case 'dodge': return 0;
      case 'crouch': return 0;
      case 'combo': return 0.4;
    }
  }

  private updateBoundingBox(obstacle: Obstacle): void {
    const size = this.getSizeForType(obstacle.type);
    const scale = obstacle.mesh.scale.x;
    
    obstacle.boundingBox.min.set(
      obstacle.mesh.position.x - size.x * scale / 2,
      obstacle.mesh.position.y - size.y * scale / 2,
      obstacle.mesh.position.z - size.z * scale / 2
    );
    obstacle.boundingBox.max.set(
      obstacle.mesh.position.x + size.x * scale / 2,
      obstacle.mesh.position.y + size.y * scale / 2,
      obstacle.mesh.position.z + size.z * scale / 2
    );
  }

  private getSizeForType(type: ObstacleType): THREE.Vector3 {
    switch (type) {
      case 'jump':
        return new THREE.Vector3(1.8, 0.8, 1.8);
      case 'dodge':
        return new THREE.Vector3(1.2, 4, 1.2);
      case 'crouch':
        return new THREE.Vector3(7, 0.5, 1);
      case 'combo':
        return new THREE.Vector3(4, 4, 2);
    }
  }

  update(deltaTime: number, gameSpeed: number): void {
    if (this.gameState.getStatus() !== 'playing') return;

    const speedMultiplier = gameSpeed;
    const playerInfo = this.playerController.getCollisionInfo();

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obstacle = this.obstacles[i];
      
      if (!obstacle.active) continue;

      if (obstacle.animationProgress < 1) {
        obstacle.animationProgress += deltaTime / 0.2;
        const t = Math.min(obstacle.animationProgress, 1);
        const eased = this.easeOutBack(t);
        const scale = 1.5 - eased * 0.5;
        obstacle.mesh.scale.set(scale, scale, scale);
      }

      obstacle.mesh.position.z += obstacle.speed * speedMultiplier * deltaTime;
      this.updateBoundingBox(obstacle);

      if (!obstacle.passed && obstacle.mesh.position.z > playerInfo.position.z + 1) {
        obstacle.passed = true;
        this.gameState.addScore(10);
        this.emit('obstaclePassed', obstacle);
      }

      if (this.checkCollision(obstacle, playerInfo)) {
        this.handleCollision(obstacle);
        return;
      }

      if (obstacle.mesh.position.z > this.despawnDistance) {
        this.despawnObstacle(obstacle, i);
      }
    }
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private checkCollision(obstacle: Obstacle, playerInfo: PlayerCollisionInfo): boolean {
    if (!obstacle.boundingBox.intersectsBox(playerInfo.boundingBox)) {
      return false;
    }

    const playerState = playerInfo.state;
    const obstacleType = obstacle.type;

    switch (obstacleType) {
      case 'jump':
        if (playerState === 'jumping') {
          const playerBottom = playerInfo.boundingBox.min.y;
          const obstacleTop = obstacle.boundingBox.max.y;
          if (playerBottom > obstacleTop + 0.2) {
            return false;
          }
        }
        break;
      case 'dodge': {
        const playerLane = this.playerController.getLane();
        if (!obstacle.lanes.includes(playerLane)) {
          return false;
        }
        break;
      }
      case 'crouch':
        if (playerState === 'crouching') {
          const playerTop = playerInfo.boundingBox.max.y;
          const obstacleBottom = obstacle.boundingBox.min.y;
          if (playerTop < obstacleBottom - 0.2) {
            return false;
          }
        }
        break;
      case 'combo': {
        const playerLane = this.playerController.getLane();
        const isInLane = obstacle.lanes.includes(playerLane);
        
        if (playerState === 'jumping') {
          const playerBottom = playerInfo.boundingBox.min.y;
          const obstacleTop = obstacle.boundingBox.max.y;
          if (playerBottom > obstacleTop + 0.2 && !isInLane) {
            return false;
          }
        }
        
        if (playerState === 'crouching') {
          const playerTop = playerInfo.boundingBox.max.y;
          const obstacleBottom = obstacle.boundingBox.min.y;
          if (playerTop < obstacleBottom - 0.2 && !isInLane) {
            return false;
          }
        }
        
        if (!isInLane && playerState !== 'jumping' && playerState !== 'crouching') {
          return false;
        }
        break;
      }
    }

    return true;
  }

  private handleCollision(obstacle: Obstacle): void {
    this.emit('collision', obstacle);
    this.gameState.triggerCollision();
  }

  private despawnObstacle(obstacle: Obstacle, index: number): void {
    obstacle.active = false;
    this.scene.remove(obstacle.mesh);
    this.obstacles.splice(index, 1);
    
    if (this.obstaclePool.length < this.maxPoolSize) {
      this.obstaclePool.push(obstacle);
    }
    
    this.emit('obstacleDespawned', obstacle);
  }

  private clearAllObstacles(): void {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obstacle = this.obstacles[i];
      obstacle.active = false;
      this.scene.remove(obstacle.mesh);
      
      if (this.obstaclePool.length < this.maxPoolSize) {
        this.obstaclePool.push(obstacle);
      }
    }
    this.obstacles = [];
  }

  getObstacles(): Obstacle[] {
    return this.obstacles.filter(o => o.active);
  }

  reset(): void {
    this.handleReset();
  }

  destroy(): void {
    this.audioAnalyzer.off('beat', this.handleBeat.bind(this));
    this.gameState.off('difficultyChange', this.handleDifficultyChange.bind(this));
    this.gameState.off('reset', this.handleReset.bind(this));
    this.clearAllObstacles();
  }
}
