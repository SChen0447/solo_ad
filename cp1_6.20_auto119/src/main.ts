import * as THREE from 'three';
import { MazeGenerator, Cell, CellType, CELL_COLORS } from './mazeGenerator';
import { Character, CharacterClass, Inventory, CLASS_COLORS, CLASS_INITIALS, Item, Rarity, Equipment, EquipmentSlot, createRandomEquipment } from './character';
import { BattleManager, LootItem } from './battleManager';
import { UIManager } from './uiManager';

class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private mazeGenerator: MazeGenerator;
  private uiManager: UIManager;
  private battleManager: BattleManager;
  private inventory: Inventory;
  private party: Character[] = [];
  private playerPosition: { x: number; y: number } = { x: 0, y: 0 };
  private targetPosition: { x: number; y: number } | null = null;
  private moveProgress: number = 0;
  private isMoving: boolean = false;
  private cellMeshes: Map<string, THREE.Group> = new Map();
  private partyMeshes: THREE.Group[] = [];
  private animationId: number = 0;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;
  private gameStarted: boolean = false;
  private keys: Set<string> = new Set();
  private eventActive: boolean = false;
  private currentEventType: string = '';
  private battleActive: boolean = false;
  private treasureParticles: THREE.Points[] = [];
  private trapPulse: THREE.Mesh[] = [];
  private time: number = 0;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a12);
    
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    this.mazeGenerator = new MazeGenerator(12, 12);
    this.battleManager = new BattleManager();
    this.uiManager = new UIManager();
    this.inventory = new Inventory(12);
    
    this.setupLights();
    this.setupEventListeners();
    this.resize();
    
    this.uiManager.setMazeGenerator(this.mazeGenerator);
    this.uiManager.setBattleManager(this.battleManager);
    this.uiManager.setInventory(this.inventory);
    
    this.battleManager.setOnUpdate(() => {
      this.uiManager.updateBattleUI();
    });
    
    this.battleManager.setOnBattleEnd((victory, loot) => {
      this.onBattleEnd(victory, loot);
    });
    
    this.uiManager.setOnStartGame((classes) => {
      this.startGame(classes);
    });
    
    this.uiManager.setOnEventChoice((choice) => {
      this.handleEventChoice(choice);
    });
    
    this.animate(0);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404050, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    this.scene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(0xffaa44, 0.5, 20);
    pointLight.position.set(0, 5, 0);
    this.scene.add(pointLight);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.resize());
    
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());
      
      if (!this.gameStarted || this.eventActive || this.battleActive) return;
      if (this.isMoving) return;
      
      let dx = 0;
      let dy = 0;
      
      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') {
        dy = -1;
      } else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') {
        dy = 1;
      } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') {
        dx = -1;
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') {
        dx = 1;
      }
      
      if (dx !== 0 || dy !== 0) {
        this.tryMove(dx, dy);
      }
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
  }

  private resize(): void {
    const mazeView = document.getElementById('maze-view');
    if (mazeView) {
      const width = mazeView.clientWidth;
      const height = mazeView.clientHeight;
      
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      
      this.renderer.setSize(width, height);
    }
  }

  public startGame(classIds: string[]): void {
    this.party = [];
    
    for (let i = 0; i < classIds.length; i++) {
      const charClass = classIds[i] as CharacterClass;
      const char = new Character(charClass);
      char.position = { x: 0, y: 0 };
      this.party.push(char);
    }
    
    this.mazeGenerator = new MazeGenerator(12, 12);
    this.mazeGenerator.generate();
    
    const entrance = this.mazeGenerator.findEntrance();
    this.playerPosition = { ...entrance };
    
    this.mazeGenerator.exploreAround(entrance.x, entrance.y, 2);
    
    this.uiManager.setMazeGenerator(this.mazeGenerator);
    this.uiManager.setParty(this.party);
    this.uiManager.setPlayerPosition(this.playerPosition);
    
    this.buildMaze();
    this.createPartyMeshes();
    
    this.updateCamera();
    
    this.gameStarted = true;
    this.uiManager.addLog('你进入了暗黑地牢...', 'info');
    
    setTimeout(() => this.resize(), 100);
  }

  private buildMaze(): void {
    for (const mesh of this.cellMeshes.values()) {
      this.scene.remove(mesh);
    }
    this.cellMeshes.clear();
    
    for (const particle of this.treasureParticles) {
      this.scene.remove(particle);
    }
    this.treasureParticles = [];
    
    for (const pulse of this.trapPulse) {
      this.scene.remove(pulse);
    }
    this.trapPulse = [];
    
    const cellWidth = 80 / 15;
    const cellHeight = 60 / 15;
    const wallHeight = 30 / 15;
    
    for (let y = 0; y < this.mazeGenerator.getHeight(); y++) {
      for (let x = 0; x < this.mazeGenerator.getWidth(); x++) {
        const cell = this.mazeGenerator.getCell(x, y);
        if (!cell) continue;
        
        const group = new THREE.Group();
        
        const color = new THREE.Color(CELL_COLORS[cell.type]);
        
        const floorGeometry = new THREE.PlaneGeometry(cellWidth, cellHeight);
        const floorMaterial = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.8,
          metalness: 0.1
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        group.add(floor);
        
        if (cell.type === CellType.TREASURE) {
          const particleCount = 15;
          const positions = new Float32Array(particleCount * 3);
          const colors = new Float32Array(particleCount * 3);
          
          for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * cellWidth * 0.8;
            positions[i * 3 + 1] = Math.random() * 0.5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * cellHeight * 0.8;
            
            colors[i * 3] = 1;
            colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
            colors[i * 3 + 2] = 0.2;
          }
          
          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
          
          const material = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
          });
          
          const particles = new THREE.Points(geometry, material);
          particles.position.y = 0.1;
          group.add(particles);
          this.treasureParticles.push(particles);
          
          const starShape = new THREE.Shape();
          const starPoints = 5;
          const outerRadius = 0.2;
          const innerRadius = 0.1;
          
          for (let i = 0; i < starPoints * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / starPoints - Math.PI / 2;
            if (i === 0) {
              starShape.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
            } else {
              starShape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
            }
          }
          
          const starGeometry = new THREE.ShapeGeometry(starShape);
          const starMaterial = new THREE.MeshBasicMaterial({
            color: 0xffd700,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
          });
          
          const star = new THREE.Mesh(starGeometry, starMaterial);
          star.position.y = 0.4;
          star.rotation.x = Math.PI / 6;
          group.add(star);
        }
        
        if (cell.type === CellType.TRAP) {
          const pulseGeometry = new THREE.RingGeometry(0.3, 0.5, 32);
          const pulseMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3333,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide
          });
          const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
          pulse.rotation.x = -Math.PI / 2;
          pulse.position.y = 0.02;
          group.add(pulse);
          this.trapPulse.push(pulse);
        }
        
        if (cell.type === CellType.BOSS) {
          const bossMarkGeometry = new THREE.CircleGeometry(0.4, 32);
          const bossMarkMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.3
          });
          const bossMark = new THREE.Mesh(bossMarkGeometry, bossMarkMaterial);
          bossMark.rotation.x = -Math.PI / 2;
          bossMark.position.y = 0.02;
          group.add(bossMark);
        }
        
        const worldX = this.gridToWorldX(x, y);
        const worldZ = this.gridToWorldZ(x, y);
        group.position.set(worldX, 0, worldZ);
        
        this.cellMeshes.set(`${x},${y}`, group);
        this.scene.add(group);
      }
    }
    
    this.addWalls();
  }

  private addWalls(): void {
    const cellWidth = 80 / 15;
    const cellHeight = 60 / 15;
    const wallHeight = 30 / 15;
    const wallTopWidth = 8 / 15;
    
    const wallColor = new THREE.Color(0x1a1814);
    const wallTopColor = new THREE.Color(0x2a2620);
    
    for (let y = 0; y < this.mazeGenerator.getHeight(); y++) {
      for (let x = 0; x < this.mazeGenerator.getWidth(); x++) {
        const cell = this.mazeGenerator.getCell(x, y);
        if (!cell) continue;
        
        if (cell.type === CellType.CORRIDOR) continue;
        
        const neighbors = [
          { dx: 0, dy: -1, side: 'top' },
          { dx: 0, dy: 1, side: 'bottom' },
          { dx: -1, dy: 0, side: 'left' },
          { dx: 1, dy: 0, side: 'right' }
        ];
        
        for (const neighbor of neighbors) {
          const nx = x + neighbor.dx;
          const ny = y + neighbor.dy;
          const neighborCell = this.mazeGenerator.getCell(nx, ny);
          
          if (!neighborCell || neighborCell.type === CellType.CORRIDOR) {
            const wallGroup = new THREE.Group();
            
            const worldX = this.gridToWorldX(x, y);
            const worldZ = this.gridToWorldZ(x, y);
            
            let wallWidth = cellWidth;
            let wallDepth = 0.2;
            
            if (neighbor.side === 'top' || neighbor.side === 'bottom') {
              wallWidth = cellWidth;
              wallDepth = 0.2;
            } else {
              wallWidth = 0.2;
              wallDepth = cellHeight;
            }
            
            const wallGeometry = new THREE.BoxGeometry(wallWidth, wallHeight, wallDepth);
            const wallMaterial = new THREE.MeshStandardMaterial({
              color: wallColor,
              roughness: 0.9,
              metalness: 0.1
            });
            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
            wall.position.y = wallHeight / 2;
            wall.castShadow = true;
            wall.receiveShadow = true;
            wallGroup.add(wall);
            
            const topGeometry = new THREE.BoxGeometry(wallWidth + wallTopWidth, 0.1, wallDepth + wallTopWidth);
            const topMaterial = new THREE.MeshStandardMaterial({
              color: wallTopColor,
              roughness: 0.7
            });
            const top = new THREE.Mesh(topGeometry, topMaterial);
            top.position.y = wallHeight + 0.05;
            wallGroup.add(top);
            
            if (neighbor.side === 'top') {
              wallGroup.position.set(worldX, 0, worldZ - cellHeight / 2);
            } else if (neighbor.side === 'bottom') {
              wallGroup.position.set(worldX, 0, worldZ + cellHeight / 2);
            } else if (neighbor.side === 'left') {
              wallGroup.position.set(worldX - cellWidth / 2, 0, worldZ);
            } else if (neighbor.side === 'right') {
              wallGroup.position.set(worldX + cellWidth / 2, 0, worldZ);
            }
            
            this.scene.add(wallGroup);
            this.cellMeshes.set(`wall_${x},${y}_${neighbor.side}`, wallGroup);
          }
        }
      }
    }
  }

  private gridToWorldX(x: number, y: number): number {
    const cellWidth = 80 / 15;
    const cellHeight = 60 / 15;
    return (x - this.mazeGenerator.getWidth() / 2) * cellWidth;
  }

  private gridToWorldZ(x: number, y: number): number {
    const cellWidth = 80 / 15;
    const cellHeight = 60 / 15;
    return (y - this.mazeGenerator.getHeight() / 2) * cellHeight;
  }

  private createPartyMeshes(): void {
    for (const mesh of this.partyMeshes) {
      this.scene.remove(mesh);
    }
    this.partyMeshes = [];
    
    for (let i = 0; i < this.party.length; i++) {
      const char = this.party[i];
      const color = new THREE.Color(CLASS_COLORS[char.class]);
      const initial = CLASS_INITIALS[char.class];
      
      const group = new THREE.Group();
      
      const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.35, 0.8, 8);
      const bodyMaterial = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.5,
        metalness: 0.3
      });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 0.4;
      body.castShadow = true;
      group.add(body);
      
      const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
      const headMaterial = new THREE.MeshStandardMaterial({
        color: 0xffdbac,
        roughness: 0.7
      });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 1;
      head.castShadow = true;
      group.add(head);
      
      const hpBgGeometry = new THREE.PlaneGeometry(0.8, 0.1);
      const hpBgMaterial = new THREE.MeshBasicMaterial({
        color: 0x1a1a1a,
        transparent: true,
        opacity: 0.8
      });
      const hpBg = new THREE.Mesh(hpBgGeometry, hpBgMaterial);
      hpBg.position.set(0, 1.4, 0);
      hpBg.name = 'hpBarBg';
      group.add(hpBg);
      
      const hpGeometry = new THREE.PlaneGeometry(0.76, 0.07);
      const hpMaterial = new THREE.MeshBasicMaterial({
        color: 0x2ecc71
      });
      const hpBar = new THREE.Mesh(hpGeometry, hpMaterial);
      hpBar.position.set(0, 1.4, 0.01);
      hpBar.name = 'hpBar';
      group.add(hpBar);
      
      const worldX = this.gridToWorldX(this.playerPosition.x, this.playerPosition.y);
      const worldZ = this.gridToWorldZ(this.playerPosition.x, this.playerPosition.y);
      
      const offsetAngle = (i / this.party.length) * Math.PI * 2 - Math.PI / 2;
      const offsetRadius = 0.5;
      const offsetX = Math.cos(offsetAngle) * offsetRadius;
      const offsetZ = Math.sin(offsetAngle) * offsetRadius;
      
      group.position.set(worldX + offsetX, 0, worldZ + offsetZ);
      group.userData = { charIndex: i, offsetX, offsetZ };
      
      this.partyMeshes.push(group);
      this.scene.add(group);
    }
  }

  private tryMove(dx: number, dy: number): void {
    const newX = this.playerPosition.x + dx;
    const newY = this.playerPosition.y + dy;
    
    const cell = this.mazeGenerator.getCell(newX, newY);
    if (!cell) return;
    
    this.targetPosition = { x: newX, y: newY };
    this.isMoving = true;
    this.moveProgress = 0;
  }

  private updateMovement(deltaTime: number): void {
    if (!this.isMoving || !this.targetPosition) return;
    
    const moveSpeed = 1 / 0.3;
    this.moveProgress += deltaTime * moveSpeed;
    
    if (this.moveProgress >= 1) {
      this.moveProgress = 1;
      this.playerPosition = { ...this.targetPosition };
      this.targetPosition = null;
      this.isMoving = false;
      
      const cell = this.mazeGenerator.getCell(this.playerPosition.x, this.playerPosition.y);
      if (cell) {
        cell.visited = true;
        this.mazeGenerator.exploreAround(this.playerPosition.x, this.playerPosition.y, 2);
      }
      
      this.uiManager.setPlayerPosition(this.playerPosition);
      
      this.checkCellEvent();
    }
    
    const startX = this.isMoving ? (this.targetPosition ? this.playerPosition.x : 0) : 0;
    const startY = this.isMoving ? (this.targetPosition ? this.playerPosition.y : 0) : 0;
    
    this.updatePartyPositions();
    this.updateCamera();
  }

  private updatePartyPositions(): void {
    let worldX: number;
    let worldZ: number;
    
    if (this.isMoving && this.targetPosition) {
      const startWorldX = this.gridToWorldX(this.playerPosition.x, this.playerPosition.y);
      const startWorldZ = this.gridToWorldZ(this.playerPosition.x, this.playerPosition.y);
      const endWorldX = this.gridToWorldX(this.targetPosition.x, this.targetPosition.y);
      const endWorldZ = this.gridToWorldZ(this.targetPosition.x, this.targetPosition.y);
      
      const t = this.easeInOut(this.moveProgress);
      worldX = startWorldX + (endWorldX - startWorldX) * t;
      worldZ = startWorldZ + (endWorldZ - startWorldZ) * t;
    } else {
      worldX = this.gridToWorldX(this.playerPosition.x, this.playerPosition.y);
      worldZ = this.gridToWorldZ(this.playerPosition.x, this.playerPosition.y);
    }
    
    for (let i = 0; i < this.partyMeshes.length; i++) {
      const mesh = this.partyMeshes[i];
      const { offsetX, offsetZ } = mesh.userData;
      
      const staggerDelay = i * 0.1;
      let charProgress = Math.max(0, Math.min(1, this.moveProgress - staggerDelay));
      
      if (this.isMoving && this.targetPosition) {
        const startWorldX = this.gridToWorldX(this.playerPosition.x, this.playerPosition.y);
        const startWorldZ = this.gridToWorldZ(this.playerPosition.x, this.playerPosition.y);
        const endWorldX = this.gridToWorldX(this.targetPosition.x, this.targetPosition.y);
        const endWorldZ = this.gridToWorldZ(this.targetPosition.x, this.targetPosition.y);
        
        const t = this.easeInOut(charProgress / (1 - staggerDelay));
        const charX = startWorldX + (endWorldX - startWorldX) * t + offsetX;
        const charZ = startWorldZ + (endWorldZ - startWorldZ) * t + offsetZ;
        
        mesh.position.x = charX;
        mesh.position.z = charZ;
        
        const bobAmount = Math.sin(charProgress * Math.PI) * 0.1;
        mesh.position.y = bobAmount;
      } else {
        mesh.position.x = worldX + offsetX;
        mesh.position.z = worldZ + offsetZ;
        mesh.position.y = 0;
      }
      
      const hpBar = mesh.getObjectByName('hpBar');
      const hpBarBg = mesh.getObjectByName('hpBarBg');
      if (hpBar && hpBarBg) {
        hpBar.lookAt(this.camera.position);
        hpBarBg.lookAt(this.camera.position);
      }
      
      const char = this.party[i];
      if (char && hpBar) {
        const hpPercent = char.getHpPercentage();
        const scale = Math.max(0, hpPercent);
        hpBar.scale.x = scale;
        hpBar.position.x = -(1 - scale) * 0.38;
        
        const hpMaterial = (hpBar as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (hpPercent < 0.3) {
          hpMaterial.color.setHex(0xe74c3c);
        } else {
          hpMaterial.color.setHex(0x2ecc71);
        }
      }
    }
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  private updateCamera(): void {
    const worldX = this.gridToWorldX(this.playerPosition.x, this.playerPosition.y);
    const worldZ = this.gridToWorldZ(this.playerPosition.x, this.playerPosition.y);
    
    const targetX = worldX;
    const targetZ = worldZ + 3;
    const targetY = 6;
    
    this.camera.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), 0.1);
    this.camera.lookAt(worldX, 0, worldZ);
  }

  private checkCellEvent(): void {
    const cell = this.mazeGenerator.getCell(this.playerPosition.x, this.playerPosition.y);
    if (!cell || cell.eventTriggered) return;
    
    cell.eventTriggered = true;
    
    if (cell.type === CellType.TREASURE) {
      this.triggerTreasureEvent();
    } else if (cell.type === CellType.TRAP) {
      this.triggerTrapEvent();
    } else if (cell.type === CellType.BOSS) {
      this.triggerBossBattle();
    } else if (cell.type === CellType.ROOM) {
      const rand = Math.random();
      if (rand < 0.5) {
        this.triggerEnemyEvent();
      } else if (rand < 0.7) {
        this.triggerRestEvent();
      }
    }
  }

  private triggerTreasureEvent(): void {
    this.eventActive = true;
    this.currentEventType = 'treasure';
    this.uiManager.showEventModal(
      '发现宝箱！',
      '你发现了一个闪闪发光的宝箱，要打开它吗？',
      '打开',
      '离开'
    );
  }

  private triggerTrapEvent(): void {
    this.eventActive = true;
    this.currentEventType = 'trap';
    const damage = 10 + Math.floor(Math.random() * 15);
    
    const targetChar = this.party.find(c => c.isAlive);
    if (targetChar) {
      targetChar.takeDamage(damage);
    }
    
    this.uiManager.showEventModal(
      '陷阱！',
      `你触发了一个陷阱！队伍受到了 ${damage} 点伤害。`,
      '继续'
    );
    
    this.uiManager.addLog(`触发陷阱，受到 ${damage} 点伤害！`, 'danger');
    this.uiManager.updatePartyPanel();
  }

  private triggerEnemyEvent(): void {
    this.eventActive = true;
    this.currentEventType = 'enemy';
    const enemyCount = 2 + Math.floor(Math.random() * 3);
    
    this.uiManager.showEventModal(
      '遭遇敌人！',
      `前方出现了 ${enemyCount} 个敌人，准备战斗！`,
      '战斗',
      '逃跑'
    );
  }

  private triggerBossBattle(): void {
    this.eventActive = true;
    this.currentEventType = 'boss';
    this.uiManager.showEventModal(
      'BOSS房间！',
      '你来到了地牢的最深处，一个强大的敌人正在等待着你...',
      '挑战BOSS'
    );
  }

  private triggerRestEvent(): void {
    this.eventActive = true;
    this.currentEventType = 'rest';
    this.uiManager.showEventModal(
      '休息点',
      '你发现了一个安全的房间，可以在这里休息恢复。',
      '休息',
      '继续前进'
    );
  }

  private handleEventChoice(choice: number): void {
    this.uiManager.hideEventModal();
    
    switch (this.currentEventType) {
      case 'treasure':
        if (choice === 0) {
          this.openTreasure();
        }
        this.eventActive = false;
        this.currentEventType = '';
        break;
        
      case 'trap':
        this.eventActive = false;
        this.currentEventType = '';
        break;
        
      case 'enemy':
        if (choice === 0) {
          this.startRoomBattle();
        } else {
          this.eventActive = false;
          this.currentEventType = '';
        }
        break;
        
      case 'boss':
        if (choice === 0) {
          this.startBossBattle();
        } else {
          this.eventActive = false;
          this.currentEventType = '';
        }
        break;
        
      case 'rest':
        if (choice === 0) {
          this.restParty();
        }
        this.eventActive = false;
        this.currentEventType = '';
        break;
        
      default:
        this.eventActive = false;
        this.currentEventType = '';
        break;
    }
    
    this.uiManager.updatePartyPanel();
  }

  private openTreasure(): void {
    const rand = Math.random();
    const slots = [EquipmentSlot.WEAPON, EquipmentSlot.ARMOR, EquipmentSlot.ACCESSORY];
    const slot = slots[Math.floor(Math.random() * slots.length)];
    
    let minRarity = Rarity.COMMON;
    if (rand > 0.8) minRarity = Rarity.RARE;
    if (rand > 0.95) minRarity = Rarity.EPIC;
    
    const equipment = createRandomEquipment(slot, minRarity);
    
    const item: Item = {
      id: equipment.id,
      name: equipment.name,
      type: 'equipment',
      rarity: equipment.rarity,
      quantity: 1,
      icon: slot,
      equipment
    };
    
    if (this.inventory.addItem(item)) {
      this.uiManager.addLog(`获得了 ${equipment.name}！`, 'loot');
    } else {
      this.uiManager.addLog('背包已满，无法拾取！', 'warning');
    }
    
    this.eventActive = false;
  }

  private startRoomBattle(): void {
    this.battleActive = true;
    this.uiManager.showBattleScreen();
    
    setTimeout(() => {
      const enemyCount = 2 + Math.floor(Math.random() * 3);
      this.battleManager.startBattle(this.party, enemyCount, false);
      this.uiManager.updateBattleUI();
      this.uiManager.hideSkillPanel();
    }, 300);
  }

  private startBossBattle(): void {
    this.battleActive = true;
    this.uiManager.showBattleScreen();
    
    setTimeout(() => {
      this.battleManager.startBattle(this.party, 3, true);
      this.uiManager.updateBattleUI();
      this.uiManager.hideSkillPanel();
    }, 300);
  }

  private restParty(): void {
    for (const char of this.party) {
      const hpHeal = Math.floor(char.maxHp * 0.3);
      const mpHeal = Math.floor(char.maxMp * 0.3);
      char.heal(hpHeal);
      char.restoreMana(mpHeal);
    }
    this.uiManager.addLog('队伍休息，恢复了生命和法力！', 'heal');
  }

  private onBattleEnd(victory: boolean, loot: LootItem[]): void {
    if (victory) {
      for (const lootItem of loot) {
        const item: Item = {
          id: lootItem.item.id,
          name: lootItem.item.name,
          type: 'equipment',
          rarity: lootItem.item.rarity,
          quantity: lootItem.quantity,
          icon: lootItem.item.slot,
          equipment: lootItem.item
        };
        if (this.inventory.addItem(item)) {
          this.uiManager.addLog(`获得战利品：${lootItem.item.name}`, 'loot');
        }
      }
      
      const cell = this.mazeGenerator.getCell(this.playerPosition.x, this.playerPosition.y);
      if (cell?.type === CellType.BOSS) {
        setTimeout(() => {
          this.uiManager.showEventModal(
            '🎉 胜利！',
            '你击败了地牢领主，成功通关了暗黑地牢！',
            '重新开始'
          );
          this.battleActive = false;
          
          const btn = document.querySelector('#event-btn1') as HTMLButtonElement;
          btn.onclick = () => {
            location.reload();
          };
        }, 1000);
        return;
      }
    } else {
      setTimeout(() => {
        this.uiManager.showEventModal(
          '💀 失败',
          '你的队伍全军覆没...',
          '重新开始'
        );
        this.battleActive = false;
        
        const btn = document.querySelector('#event-btn1') as HTMLButtonElement;
        btn.onclick = () => {
          location.reload();
        };
      }, 1000);
      return;
    }
    
    setTimeout(() => {
      this.uiManager.hideBattleScreen();
      this.battleActive = false;
      this.eventActive = false;
      this.uiManager.updatePartyPanel();
    }, 1500);
  }

  private animate = (time: number): void => {
    this.animationId = requestAnimationFrame(this.animate);
    
    const deltaTime = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;
    this.time += deltaTime;
    
    this.frameCount++;
    if (this.frameCount >= 30) {
      this.fps = Math.round(1 / deltaTime);
      this.frameCount = 0;
    }
    
    if (this.gameStarted) {
      this.updateMovement(deltaTime);
      this.updatePartyPositions();
      this.updateEffects(deltaTime);
    }
    
    this.renderer.render(this.scene, this.camera);
  };

  private updateEffects(deltaTime: number): void {
    for (let i = 0; i < this.treasureParticles.length; i++) {
      const particles = this.treasureParticles[i];
      const positions = particles.geometry.attributes.position.array as Float32Array;
      
      for (let j = 0; j < positions.length / 3; j++) {
        positions[j * 3 + 1] += Math.sin(this.time * 2 + j) * 0.002;
      }
      particles.geometry.attributes.position.needsUpdate = true;
      
      particles.rotation.y += deltaTime * 0.5;
    }
    
    for (const pulse of this.trapPulse) {
      const scale = 1 + Math.sin(this.time * 3) * 0.3;
      pulse.scale.set(scale, scale, 1);
      const material = pulse.material as THREE.MeshBasicMaterial;
      material.opacity = 0.2 + Math.sin(this.time * 3) * 0.2;
    }
    
    if (this.treasureParticles.length > 0) {
      for (const group of this.cellMeshes.values()) {
        const star = group.children.find(c => c.type === 'Mesh' && c.geometry?.type === 'ShapeGeometry');
        if (star) {
          star.rotation.z += deltaTime * 2;
        }
      }
    }
  }

  public destroy(): void {
    cancelAnimationFrame(this.animationId);
    this.renderer.dispose();
  }
}

const game = new Game();

window.addEventListener('resize', () => {
  setTimeout(() => {
    const mazeView = document.getElementById('maze-view');
    if (mazeView) {
      const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
      canvas.width = mazeView.clientWidth;
      canvas.height = mazeView.clientHeight;
    }
  }, 100);
});

export default Game;
