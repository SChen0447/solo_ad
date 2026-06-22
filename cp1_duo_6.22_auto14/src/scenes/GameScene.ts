import * as Phaser from 'phaser';
import { FlowerData, getBaseFlowers, crossBreed, getThreeStarFlowers } from '../utils/genetics';
import { drawFlower, drawHourglass } from '../utils/flowerRenderer';
import { saveProgress, loadProgress, clearProgress } from '../utils/storage';
import { perfTester } from '../utils/performance';

interface FlowerSprite {
  container: Phaser.GameObjects.Container;
  graphics: Phaser.GameObjects.Graphics;
  shadow: Phaser.GameObjects.Graphics;
  hoverGlow: Phaser.GameObjects.Graphics;
  flower: FlowerData;
  originalX: number;
  originalY: number;
  isDragging: boolean;
  dragStartTime: number;
  floatTween: Phaser.Tweens.Tween | null;
}

interface TreeNode {
  id: string;
  flower: FlowerData;
  x: number;
  y: number;
  circle: Phaser.GameObjects.Graphics;
  text?: Phaser.GameObjects.Text;
  parents?: string[];
}

interface TreeConnection {
  line: Phaser.GameObjects.Graphics;
  fromId: string;
  toId: string;
}

interface PotSlot {
  graphics: Phaser.GameObjects.Graphics;
  flower: FlowerData | null;
}

const MOBILE_BREAKPOINT = 768;
const GRID_COLS_DESKTOP = 4;
const GRID_ROWS_DESKTOP = 2;
const GRID_COLS_MOBILE = 2;
const GRID_ROWS_MOBILE = 4;

export class GameScene extends Phaser.Scene {
  private baseFlowers: FlowerData[] = [];
  private unlockedFlowers: Map<string, FlowerData> = new Map();
  private flowerSprites: FlowerSprite[] = [];
  private treeNodes: Map<string, TreeNode> = new Map();
  private treeConnections: TreeConnection[] = [];
  
  private potSlots: PotSlot[] = [];
  private potContainer: Phaser.GameObjects.Container | null = null;
  private hourglassSprite: Phaser.GameObjects.Container | null = null;
  private hourglassTween: Phaser.Tweens.Tween | null = null;
  private isBreeding: boolean = false;
  
  private gardenArea: Phaser.GameObjects.Graphics | null = null;
  private treeArea: Phaser.GameObjects.Graphics | null = null;
  private toolbar: Phaser.GameObjects.Container | null = null;
  
  private propertyPanel: Phaser.GameObjects.Container | null = null;
  
  private isMobile: boolean = false;
  private gardenWidth: number = 0;
  private treeWidth: number = 0;
  private toolbarHeight: number = 60;
  
  private lastDragTime: number = 0;
  private dragResponseTimes: number[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    console.log('[GameScene] 创建场景');
    
    this.checkMobile();
    this.initData();
    this.createLayout();
    this.createGarden();
    this.createPotArea();
    this.createEvolutionTree();
    this.createToolbar();
    this.createParticles();
    this.setupInput();
    this.setupResize();
    
    this.runPerformanceTests();
    
    this.scale.on('resize', this.handleResize, this);
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth < MOBILE_BREAKPOINT;
  }

  private initData(): void {
    this.baseFlowers = getBaseFlowers();
    
    const saved = loadProgress();
    if (saved && saved.length > 0) {
      for (const f of saved) {
        this.unlockedFlowers.set(f.id, f);
      }
    } else {
      for (const f of this.baseFlowers) {
        this.unlockedFlowers.set(f.id, f);
      }
    }
  }

  private createLayout(): void {
    const { width } = this.scale;
    
    if (this.isMobile) {
      this.gardenWidth = width - 40;
      this.treeWidth = width - 40;
    } else {
      const sideWidth = Math.min(320, width * 0.28);
      this.gardenWidth = sideWidth;
      this.treeWidth = sideWidth;
    }
    
    if (this.gardenArea) this.gardenArea.destroy();
    if (this.treeArea) this.treeArea.destroy();
    
    this.gardenArea = this.add.graphics();
    this.treeArea = this.add.graphics();
    
    this.updateLayout();
  }

  private updateLayout(): void {
    const { width, height } = this.scale;
    const bottomMargin = this.toolbarHeight + 20;
    
    this.gardenArea?.clear();
    this.treeArea?.clear();
    
    if (this.isMobile) {
      const gardenHeight = (height - bottomMargin) * 0.45;
      const gardenX = 20;
      const gardenY = 20;
      
      this.gardenArea?.fillStyle(0xffffff, 0.6);
      this.gardenArea?.fillRoundedRect(gardenX, gardenY, this.gardenWidth, gardenHeight, 15);
      this.gardenArea?.lineStyle(2, 0xd4a574, 1);
      this.gardenArea?.strokeRoundedRect(gardenX, gardenY, this.gardenWidth, gardenHeight, 15);
      
      const treeY = gardenY + gardenHeight + 20;
      const treeHeight = height - bottomMargin - treeY - 20;
      
      this.treeArea?.fillStyle(0xffffff, 0.6);
      this.treeArea?.fillRoundedRect(20, treeY, this.treeWidth, treeHeight, 15);
      this.treeArea?.lineStyle(2, 0xd4a574, 1);
      this.treeArea?.strokeRoundedRect(20, treeY, this.treeWidth, treeHeight, 15);
    } else {
      const gardenX = 20;
      const gardenY = 20;
      const gardenHeight = height - bottomMargin - 40;
      
      this.gardenArea?.fillStyle(0xffffff, 0.6);
      this.gardenArea?.fillRoundedRect(gardenX, gardenY, this.gardenWidth, gardenHeight, 15);
      this.gardenArea?.lineStyle(2, 0xd4a574, 1);
      this.gardenArea?.strokeRoundedRect(gardenX, gardenY, this.gardenWidth, gardenHeight, 15);
      
      const treeX = width - this.treeWidth - 20;
      
      this.treeArea?.fillStyle(0xffffff, 0.6);
      this.treeArea?.fillRoundedRect(treeX, gardenY, this.treeWidth, gardenHeight, 15);
      this.treeArea?.lineStyle(2, 0xd4a574, 1);
      this.treeArea?.strokeRoundedRect(treeX, gardenY, this.treeWidth, gardenHeight, 15);
    }
  }

  private createGarden(): void {
    const { height } = this.scale;
    const bottomMargin = this.toolbarHeight + 20;
    
    let gardenX: number, gardenY: number, gardenWidth: number, gardenHeight: number;
    let cols: number, rows: number;
    
    if (this.isMobile) {
      gardenX = 20;
      gardenY = 20;
      gardenWidth = this.gardenWidth;
      gardenHeight = (height - bottomMargin) * 0.45;
      cols = GRID_COLS_MOBILE;
      rows = GRID_ROWS_MOBILE;
    } else {
      gardenX = 20;
      gardenY = 20;
      gardenWidth = this.gardenWidth;
      gardenHeight = height - bottomMargin - 40;
      cols = GRID_COLS_DESKTOP;
      rows = GRID_ROWS_DESKTOP;
    }
    
    for (const sprite of this.flowerSprites) {
      sprite.container.destroy();
    }
    this.flowerSprites = [];
    
    const padding = 15;
    const availableWidth = gardenWidth - padding * 2;
    const availableHeight = gardenHeight - padding * 2 - 30;
    const cellWidth = availableWidth / cols;
    const cellHeight = availableHeight / rows;
    const flowerSize = Math.min(cellWidth, cellHeight) * 0.7;
    
    const titleY = gardenY + 20;
    this.add.text(gardenX + gardenWidth / 2, titleY, '🌸 花圃', {
      fontSize: '18px',
      color: '#2d5016',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const gridStartY = titleY + 30;
    
    for (let i = 0; i < this.baseFlowers.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      const x = gardenX + padding + col * cellWidth + cellWidth / 2;
      const y = gridStartY + row * cellHeight + cellHeight / 2;
      
      const flower = this.baseFlowers[i];
      const sprite = this.createFlowerSprite(x, y, flowerSize, flower);
      this.flowerSprites.push(sprite);
    }
  }

  private createFlowerSprite(x: number, y: number, size: number, flower: FlowerData): FlowerSprite {
    const container = this.add.container(x, y);
    container.setSize(size * 1.2, size * 1.2);
    container.setInteractive({ useHandCursor: true, pixelPerfect: false });
    
    const hoverGlow = this.add.graphics();
    const glowColor = this.getFlowerColorHex(flower.color);
    hoverGlow.lineStyle(3, glowColor, 0);
    hoverGlow.strokeCircle(0, 0, size * 0.7);
    hoverGlow.fillStyle(glowColor, 0);
    hoverGlow.fillCircle(0, 0, size * 0.65);
    container.add(hoverGlow);
    
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0);
    shadow.fillEllipse(0, size * 0.5, size * 0.6, size * 0.15);
    container.add(shadow);
    
    const graphics = this.add.graphics();
    drawFlower(graphics, 0, 0, size, flower);
    container.add(graphics);
    
    const floatAmount = Phaser.Math.Between(20, 30) / 10;
    const floatDuration = Phaser.Math.Between(1500, 2000);
    const floatDelay = Phaser.Math.Between(0, 500);
    
    const floatTween = this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: floatDuration,
      delay: floatDelay,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        const offsetY = (t - 0.5) * 2 * floatAmount;
        graphics.y = offsetY;
        shadow.y = -offsetY;
      }
    });
    
    const flowerSprite: FlowerSprite = {
      container,
      graphics,
      shadow,
      hoverGlow,
      flower,
      originalX: x,
      originalY: y,
      isDragging: false,
      dragStartTime: 0,
      floatTween
    };
    
    container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.onFlowerPointerDown(flowerSprite, pointer);
    });
    
    container.on('pointerover', () => {
      this.tweens.add({
        targets: container,
        scale: 1.1,
        duration: 200,
        ease: 'Power2.Out'
      });
      
      this.tweens.add({
        targets: hoverGlow,
        alpha: { from: 0, to: 1 },
        duration: 200,
        ease: 'Power2.Out',
        onUpdate: (tween) => {
          const progress = tween.progress;
          hoverGlow.clear();
          hoverGlow.lineStyle(3, glowColor, progress * 0.5);
          hoverGlow.strokeCircle(0, 0, size * 0.7);
          hoverGlow.fillStyle(glowColor, progress * 0.15);
          hoverGlow.fillCircle(0, 0, size * 0.65);
        }
      });
      
      shadow.fillStyle(0x000000, 0.2);
      shadow.clear();
      shadow.fillEllipse(0, size * 0.55, size * 0.7, size * 0.2);
    });
    
    container.on('pointerout', () => {
      if (!flowerSprite.isDragging) {
        this.tweens.add({
          targets: container,
          scale: 1,
          duration: 200,
          ease: 'Power2.Out'
        });
        
        this.tweens.add({
          targets: hoverGlow,
          alpha: { from: 1, to: 0 },
          duration: 200,
          ease: 'Power2.Out',
          onUpdate: (tween) => {
            const progress = 1 - tween.progress;
            hoverGlow.clear();
            hoverGlow.lineStyle(3, glowColor, progress * 0.5);
            hoverGlow.strokeCircle(0, 0, size * 0.7);
            hoverGlow.fillStyle(glowColor, progress * 0.15);
            hoverGlow.fillCircle(0, 0, size * 0.65);
          },
          onComplete: () => {
            hoverGlow.clear();
            hoverGlow.lineStyle(3, glowColor, 0);
            hoverGlow.strokeCircle(0, 0, size * 0.7);
            hoverGlow.fillStyle(glowColor, 0);
            hoverGlow.fillCircle(0, 0, size * 0.65);
          }
        });
        
        shadow.fillStyle(0x000000, 0);
        shadow.clear();
        shadow.fillEllipse(0, size * 0.5, size * 0.6, size * 0.15);
      }
    });
    
    return flowerSprite;
  }

  private onFlowerPointerDown(sprite: FlowerSprite, _pointer: Phaser.Input.Pointer): void {
    sprite.isDragging = true;
    sprite.dragStartTime = performance.now();
    this.lastDragTime = performance.now();
    
    sprite.container.setDepth(100);
    sprite.container.setScale(1.15);
    
    this.tweens.add({
      targets: sprite.container,
      angle: { from: -5, to: 5 },
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.onPointerMove(sprite, p);
    });
    
    this.input.once('pointerup', (p: Phaser.Input.Pointer) => {
      this.onFlowerPointerUp(sprite, p);
    });
    
    this.time.delayedCall(200, () => {
      if (sprite.isDragging && !this.propertyPanel) {
        this.showPropertyPanel(sprite.flower, sprite.originalX, sprite.originalY);
      }
    });
  }

  private onPointerMove(sprite: FlowerSprite, pointer: Phaser.Input.Pointer): void {
    if (!sprite.isDragging) return;
    
    const now = performance.now();
    const responseTime = now - this.lastDragTime;
    this.dragResponseTimes.push(responseTime);
    if (this.dragResponseTimes.length > 100) {
      this.dragResponseTimes.shift();
    }
    this.lastDragTime = now;
    
    sprite.container.x = pointer.x;
    sprite.container.y = pointer.y;
  }

  private onFlowerPointerUp(sprite: FlowerSprite, pointer: Phaser.Input.Pointer): void {
    sprite.isDragging = false;
    
    this.tweens.killTweensOf(sprite.container);
    
    this.input.off('pointermove');
    
    const dragDuration = performance.now() - sprite.dragStartTime;
    
    if (dragDuration < 200) {
      this.tweens.add({
        targets: sprite.container,
        scale: 1,
        angle: 0,
        duration: 200,
        ease: 'Power2.Out',
        onComplete: () => {
          this.showPropertyPanel(sprite.flower, sprite.originalX, sprite.originalY);
        }
      });
      sprite.container.x = sprite.originalX;
      sprite.container.y = sprite.originalY;
      sprite.container.setDepth(0);
      return;
    }
    
    this.hidePropertyPanel();
    
    if (this.isInPotArea(pointer.x, pointer.y) && !this.isBreeding) {
      this.addFlowerToPot(sprite.flower);
    }
    
    this.tweens.add({
      targets: sprite.container,
      x: sprite.originalX,
      y: sprite.originalY,
      scale: 1,
      angle: 0,
      duration: 300,
      ease: 'Power2.Out',
      onComplete: () => {
        sprite.container.setDepth(0);
      }
    });
  }

  private isInPotArea(x: number, y: number): boolean {
    if (!this.potContainer) return false;
    const bounds = this.potContainer.getBounds();
    return x >= bounds.x && x <= bounds.x + bounds.width &&
           y >= bounds.y && y <= bounds.y + bounds.height;
  }

  private createPotArea(): void {
    const { width, height } = this.scale;
    const bottomMargin = this.toolbarHeight + 20;
    
    let potX: number, potY: number;
    
    if (this.isMobile) {
      const gardenHeight = (height - bottomMargin) * 0.45;
      const gardenBottom = 20 + gardenHeight;
      const treeTop = gardenBottom + 20;
      const midY = (gardenBottom + treeTop) / 2;
      potX = width / 2;
      potY = midY;
    } else {
      const centerX = (20 + this.gardenWidth + width - this.treeWidth - 20) / 2;
      potX = centerX;
      potY = height / 2 - 30;
    }
    
    if (this.potContainer) {
      this.potContainer.destroy();
    }
    
    this.potContainer = this.add.container(potX, potY);
    
    const dashedRing = this.add.graphics();
    this.drawDashedCircle(dashedRing, 0, -5, 90, 0xcccccc, 0.3, 5, 4);
    this.potContainer.add(dashedRing);
    
    const potBg = this.add.graphics();
    potBg.fillStyle(0xffffff, 0.9);
    potBg.fillRoundedRect(-100, -70, 200, 140, 20);
    potBg.lineStyle(3, 0xd4a574, 1);
    potBg.strokeRoundedRect(-100, -70, 200, 140, 20);
    this.potContainer.add(potBg);
    
    const title = this.add.text(0, -55, '🌱 培育盆', {
      fontSize: '16px',
      color: '#2d5016',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.potContainer.add(title);
    
    this.potSlots = [];
    const slotPositions = [-55, 55];
    const slotSize = 70;
    
    for (let i = 0; i < 2; i++) {
      const slotGraphics = this.add.graphics();
      slotGraphics.fillStyle(0xf5f5dc, 0.8);
      slotGraphics.fillRoundedRect(slotPositions[i] - slotSize / 2, -slotSize / 2 - 10, slotSize, slotSize, 10);
      slotGraphics.lineStyle(2, 0xc4a060, 0.6);
      slotGraphics.strokeRoundedRect(slotPositions[i] - slotSize / 2, -slotSize / 2 - 10, slotSize, slotSize, 10);
      this.potContainer.add(slotGraphics);
      
      this.potSlots.push({
        graphics: slotGraphics,
        flower: null
      });
    }
    
    const plusText = this.add.text(0, -10, '+', {
      fontSize: '28px',
      color: '#999'
    }).setOrigin(0.5);
    this.potContainer.add(plusText);
    
    const hintText = this.add.text(0, 50, '拖动花朵到此处进行杂交', {
      fontSize: '12px',
      color: '#888'
    }).setOrigin(0.5);
    this.potContainer.add(hintText);
    
    this.hourglassSprite = this.add.container(0, 0);
    this.hourglassSprite.setVisible(false);
    
    const hourglassGraphics = this.add.graphics();
    drawHourglass(hourglassGraphics, 0, 0, 40);
    this.hourglassSprite.add(hourglassGraphics);
    
    const loadingText = this.add.text(0, 35, '培育中...', {
      fontSize: '12px',
      color: '#666'
    }).setOrigin(0.5);
    this.hourglassSprite.add(loadingText);
    
    this.potContainer.add(this.hourglassSprite);
  }

  private addFlowerToPot(flower: FlowerData): void {
    let targetSlot = -1;
    
    for (let i = 0; i < this.potSlots.length; i++) {
      if (!this.potSlots[i].flower) {
        targetSlot = i;
        break;
      }
    }
    
    if (targetSlot === -1) {
      targetSlot = 0;
      this.clearPotSlot(0);
    }
    
    const slot = this.potSlots[targetSlot];
    slot.flower = flower;
    
    const slotX = targetSlot === 0 ? -55 : 55;
    const flowerG = this.add.graphics();
    drawFlower(flowerG, slotX, -10, 35, flower);
    flowerG.setName('slotFlower');
    
    flowerG.alpha = 0;
    this.tweens.add({
      targets: flowerG,
      alpha: 1,
      duration: 300,
      ease: 'Power2.Out'
    });
    
    this.potContainer?.add(flowerG);
    
    if (this.potSlots[0].flower && this.potSlots[1].flower) {
      this.startBreeding();
    }
  }

  private clearPotSlot(index: number): void {
    const slot = this.potSlots[index];
    slot.flower = null;
    
    if (this.potContainer) {
      const flowerG = this.potContainer.getByName('slotFlower');
      if (flowerG) {
        this.tweens.add({
          targets: flowerG,
          alpha: 0,
          duration: 200,
          onComplete: () => {
            flowerG.destroy();
          }
        });
      }
    }
  }

  private startBreeding(): void {
    if (this.isBreeding || !this.potSlots[0].flower || !this.potSlots[1].flower) return;
    
    this.isBreeding = true;
    
    this.hourglassSprite?.setVisible(true);
    this.hourglassSprite?.setPosition(0, -10);
    
    if (this.hourglassSprite) {
      this.hourglassTween = this.tweens.add({
        targets: this.hourglassSprite,
        angle: 360,
        duration: 1000,
        repeat: -1,
        ease: 'Linear'
      });
    }
    
    const flower1 = this.potSlots[0].flower;
    const flower2 = this.potSlots[1].flower;
    
    this.time.delayedCall(2000, () => {
      this.completeBreeding(flower1!, flower2!);
    });
  }

  private completeBreeding(flower1: FlowerData, flower2: FlowerData): void {
    const result = crossBreed(flower1, flower2);
    
    this.hourglassTween?.stop();
    this.hourglassSprite?.setVisible(false);
    
    const isNew = !this.unlockedFlowers.has(result.id);
    
    if (isNew) {
      this.unlockedFlowers.set(result.id, result);
      this.addTreeNode(result, [flower1.id, flower2.id]);
      saveProgress(Array.from(this.unlockedFlowers.values()));
      
      if (this.potContainer) {
        const potBounds = this.potContainer.getBounds();
        this.spawnPetalParticles(potBounds.x + potBounds.width / 2, potBounds.y + potBounds.height / 2);
      }
    }
    
    this.showResultFlower(result, isNew);
    
    this.time.delayedCall(1500, () => {
      this.clearAllPotSlots();
      this.isBreeding = false;
    });
  }

  private showResultFlower(flower: FlowerData, isNew: boolean): void {
    if (!this.potContainer) return;
    
    const resultG = this.add.graphics();
    drawFlower(resultG, 0, -10, 60, flower);
    resultG.setScale(0);
    this.potContainer.add(resultG);
    
    this.tweens.add({
      targets: resultG,
      scale: { from: 0, to: 1 },
      duration: 500,
      ease: 'Back.Out'
    });
    
    const label = this.add.text(0, 45, isNew ? '✨ 新品种！' : flower.colorName + flower.shapeName, {
      fontSize: isNew ? '16px' : '13px',
      color: isNew ? '#e74c3c' : '#666',
      fontStyle: isNew ? 'bold' : 'normal'
    }).setOrigin(0.5);
    label.alpha = 0;
    this.potContainer.add(label);
    
    this.tweens.add({
      targets: label,
      alpha: 1,
      duration: 300,
      delay: 200
    });
    
    this.time.delayedCall(1500, () => {
      this.tweens.add({
        targets: [resultG, label],
        alpha: 0,
        duration: 300,
        onComplete: () => {
          resultG.destroy();
          label.destroy();
        }
      });
    });
  }

  private clearAllPotSlots(): void {
    for (let i = 0; i < this.potSlots.length; i++) {
      this.potSlots[i].flower = null;
    }
    
    if (this.potContainer) {
      const flowers = this.potContainer.getAll('name', 'slotFlower');
      for (const f of flowers) {
        f.destroy();
      }
    }
  }

  private createEvolutionTree(): void {
    const { width, height } = this.scale;
    const bottomMargin = this.toolbarHeight + 20;
    
    let treeX: number, treeY: number, treeWidth: number, treeHeight: number;
    
    if (this.isMobile) {
      const gardenHeight = (height - bottomMargin) * 0.45;
      treeX = 20;
      treeY = 20 + gardenHeight + 20;
      treeWidth = this.treeWidth;
      treeHeight = height - bottomMargin - treeY - 20;
    } else {
      treeX = width - this.treeWidth - 20;
      treeY = 20;
      treeWidth = this.treeWidth;
      treeHeight = height - bottomMargin - 40;
    }
    
    for (const conn of this.treeConnections) {
      conn.line.destroy();
    }
    this.treeConnections = [];
    
    for (const node of this.treeNodes.values()) {
      node.circle.destroy();
      node.text?.destroy();
    }
    this.treeNodes.clear();
    
    const titleY = treeY + 20;
    this.add.text(treeX + treeWidth / 2, titleY, '🌳 进化树', {
      fontSize: '18px',
      color: '#2d5016',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const contentStartY = titleY + 40;
    const contentHeight = treeHeight - 60;
    const padding = 15;
    
    const unlockedArray = Array.from(this.unlockedFlowers.values());
    
    if (this.isMobile) {
      this.layoutTreeHorizontal(unlockedArray, treeX + padding, contentStartY, treeWidth - padding * 2, contentHeight);
    } else {
      this.layoutTreeVertical(unlockedArray, treeX + padding, contentStartY, treeWidth - padding * 2, contentHeight);
    }
  }

  private layoutTreeVertical(flowers: FlowerData[], startX: number, startY: number, width: number, height: number): void {
    const baseFlowers = flowers.filter(f => !f.parents || f.parents.length === 0);
    const derivedFlowers = flowers.filter(f => f.parents && f.parents.length > 0);
    
    const colCount = 3;
    const colWidth = width / colCount;
    const nodeSize = 36;
    
    for (let i = 0; i < Math.min(baseFlowers.length, 4); i++) {
      const col = i < 2 ? 0 : 2;
      const row = i % 2;
      const x = startX + col * colWidth + colWidth / 2;
      const y = startY + row * 60 + nodeSize / 2;
      
      this.addTreeNodeToScene(baseFlowers[i], x, y, nodeSize, false);
    }
    
    for (let i = 0; i < derivedFlowers.length; i++) {
      const col = 1;
      const row = i;
      const x = startX + col * colWidth + colWidth / 2;
      const y = startY + 60 + row * 55 + nodeSize / 2;
      
      if (y < startY + height - nodeSize) {
        this.addTreeNodeToScene(derivedFlowers[i], x, y, nodeSize, false);
        this.connectToParents(derivedFlowers[i]);
      }
    }
  }

  private layoutTreeHorizontal(flowers: FlowerData[], startX: number, startY: number, width: number, height: number): void {
    const baseFlowers = flowers.filter(f => !f.parents || f.parents.length === 0);
    const derivedFlowers = flowers.filter(f => f.parents && f.parents.length > 0);
    
    const allFlowers = [...baseFlowers, ...derivedFlowers];
    const cols = 4;
    const rows = Math.ceil(allFlowers.length / cols);
    const colWidth = width / cols;
    const rowHeight = Math.min(50, height / (rows + 1));
    const nodeSize = 32;
    
    for (let i = 0; i < allFlowers.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * colWidth + colWidth / 2;
      const y = startY + row * rowHeight + nodeSize / 2 + 10;
      
      this.addTreeNodeToScene(allFlowers[i], x, y, nodeSize, false);
    }
  }

  private addTreeNode(flower: FlowerData, _parents: string[]): void {
    const { width } = this.scale;
    
    let treeX: number, treeWidth: number;
    
    if (this.isMobile) {
      treeX = 20;
      treeWidth = this.treeWidth;
    } else {
      treeX = width - this.treeWidth - 20;
      treeWidth = this.treeWidth;
    }
    
    const padding = 15;
    const nodeSize = 36;
    
    const derivedCount = Array.from(this.treeNodes.values()).filter(n => n.flower.parents && n.flower.parents.length > 0).length;
    
    let x: number, y: number;
    
    if (this.isMobile) {
      const cols = 4;
      const colWidth = (treeWidth - padding * 2) / cols;
      const totalCount = this.treeNodes.size + 1;
      const col = (totalCount - 1) % cols;
      const row = Math.floor((totalCount - 1) / cols);
      x = treeX + padding + col * colWidth + colWidth / 2;
      y = 80 + row * 50 + nodeSize / 2;
    } else {
      x = treeX + treeWidth / 2;
      y = 100 + derivedCount * 55 + nodeSize / 2;
    }
    
    this.addTreeNodeToScene(flower, x, y, nodeSize, true);
    this.connectToParents(flower);
  }

  private addTreeNodeToScene(flower: FlowerData, x: number, y: number, size: number, animate: boolean): void {
    const circle = this.add.graphics();
    
    const colorValue = this.getFlowerColorHex(flower.color);
    circle.fillStyle(colorValue, animate ? 0 : 1);
    circle.fillCircle(x, y, size / 2);
    
    circle.lineStyle(2, 0xffffff, animate ? 0 : 1);
    circle.strokeCircle(x, y, size / 2);
    
    const innerG = this.add.graphics();
    innerG.setAlpha(animate ? 0 : 1);
    drawFlower(innerG, x, y, size * 0.7, flower);
    
    if (animate) {
      this.tweens.add({
        targets: circle,
        alpha: 1,
        duration: 500,
        ease: 'Power2.Out'
      });
      
      this.tweens.add({
        targets: innerG,
        alpha: 1,
        duration: 500,
        ease: 'Power2.Out'
      });
    }
    
    const text = this.add.text(x, y + size / 2 + 8, flower.colorName, {
      fontSize: '10px',
      color: '#666'
    }).setOrigin(0.5);
    text.setAlpha(animate ? 0 : 1);
    
    if (animate) {
      this.tweens.add({
        targets: text,
        alpha: 1,
        duration: 500,
        ease: 'Power2.Out'
      });
    }
    
    this.treeNodes.set(flower.id, {
      id: flower.id,
      flower,
      x,
      y,
      circle,
      text,
      parents: flower.parents
    });
  }

  private connectToParents(flower: FlowerData): void {
    if (!flower.parents || flower.parents.length < 2) return;
    
    const childNode = this.treeNodes.get(flower.id);
    if (!childNode) return;
    
    for (const parentId of flower.parents) {
      const parentNode = this.treeNodes.get(parentId);
      if (!parentNode) continue;
      
      const line = this.add.graphics();
      line.lineStyle(2, 0xcccccc, 0);
      line.beginPath();
      line.moveTo(parentNode.x, parentNode.y + 18);
      line.lineTo(childNode.x, childNode.y - 18);
      line.strokePath();
      
      this.treeConnections.push({
        line,
        fromId: parentId,
        toId: flower.id
      });
      
      this.tweens.add({
        targets: line,
        alpha: 1,
        duration: 500,
        ease: 'Power2.Out'
      });
    }
  }

  private getFlowerColorHex(color: string): number {
    const colorMap: Record<string, number> = {
      red: 0xe74c3c,
      yellow: 0xf1c40f,
      blue: 0x3498db,
      white: 0xecf0f1,
      orange: 0xe67e22,
      green: 0x27ae60,
      purple: 0x9b59b6,
      pink: 0xff69b4,
      lightBlue: 0x87ceeb,
      lightYellow: 0xfffacd
    };
    return colorMap[color] || 0xcccccc;
  }

  private createToolbar(): void {
    const { width, height } = this.scale;
    
    if (this.toolbar) {
      this.toolbar.destroy();
    }
    
    this.toolbar = this.add.container(0, height - this.toolbarHeight);
    
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.85);
    bg.fillRect(0, 0, width, this.toolbarHeight);
    bg.lineStyle(1, 0xd4a574, 0.5);
    bg.beginPath();
    bg.moveTo(0, 0);
    bg.lineTo(width, 0);
    bg.strokePath();
    this.toolbar.add(bg);
    
    const achievementBtn = this.createToolbarButton(width / 2 - 80, this.toolbarHeight / 2, '🏆', '成就');
    achievementBtn.container.on('pointerdown', () => {
      this.showAchievementPanel();
    });
    this.toolbar.add(achievementBtn.container);
    
    const resetBtn = this.createToolbarButton(width / 2 + 80, this.toolbarHeight / 2, '🔄', '重置');
    resetBtn.container.on('pointerdown', () => {
      this.showResetConfirm();
    });
    this.toolbar.add(resetBtn.container);
    
    const infoText = this.add.text(20, this.toolbarHeight / 2, 
      `已解锁: ${this.unlockedFlowers.size} 种`, {
      fontSize: '14px',
      color: '#2d5016'
    }).setOrigin(0, 0.5);
    this.toolbar.add(infoText);
  }

  private createToolbarButton(x: number, y: number, icon: string, label: string): { container: Phaser.GameObjects.Container; bg: Phaser.GameObjects.Graphics } {
    const container = this.add.container(x, y);
    container.setSize(60, 50);
    container.setInteractive({ useHandCursor: true });
    
    const bg = this.add.graphics();
    bg.fillStyle(0xf0f0e0, 0.8);
    bg.fillRoundedRect(-30, -25, 60, 50, 10);
    container.add(bg);
    
    const iconText = this.add.text(0, -8, icon, {
      fontSize: '20px'
    }).setOrigin(0.5);
    container.add(iconText);
    
    const labelText = this.add.text(0, 14, label, {
      fontSize: '11px',
      color: '#666'
    }).setOrigin(0.5);
    container.add(labelText);
    
    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0xe0e0d0, 0.9);
      bg.fillRoundedRect(-30, -25, 60, 50, 10);
    });
    
    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0xf0f0e0, 0.8);
      bg.fillRoundedRect(-30, -25, 60, 50, 10);
    });
    
    return { container, bg };
  }

  private showPropertyPanel(flower: FlowerData, x: number, y: number): void {
    this.hidePropertyPanel();
    
    const panelWidth = 180;
    const panelHeight = 160;
    
    let panelX = x + 60;
    let panelY = y - panelHeight / 2;
    
    const { width } = this.scale;
    if (panelX + panelWidth > width - 20) {
      panelX = x - 60 - panelWidth;
    }
    if (panelY < 20) {
      panelY = 20;
    }
    
    this.propertyPanel = this.add.container(panelX, panelY);
    
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.95);
    bg.fillRoundedRect(0, 0, panelWidth, panelHeight, 12);
    bg.lineStyle(2, 0xd4a574, 0.8);
    bg.strokeRoundedRect(0, 0, panelWidth, panelHeight, 12);
    this.propertyPanel.add(bg);
    
    const flowerG = this.add.graphics();
    drawFlower(flowerG, 45, 40, 40, flower);
    this.propertyPanel.add(flowerG);
    
    const nameText = this.add.text(90, 25, flower.colorName + flower.shapeName, {
      fontSize: '14px',
      color: '#333',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.propertyPanel.add(nameText);
    
    const stars = '⭐'.repeat(flower.rarity) + '☆'.repeat(3 - flower.rarity);
    const rarityText = this.add.text(90, 50, `稀有度: ${stars}`, {
      fontSize: '12px',
      color: '#f39c12'
    }).setOrigin(0, 0.5);
    this.propertyPanel.add(rarityText);
    
    const geneText = this.add.text(15, 80, 
      `基因型: ${flower.genes.colorGene1}/${flower.genes.colorGene2}`, {
      fontSize: '11px',
      color: '#888'
    });
    this.propertyPanel.add(geneText);
    
    const shapeText = this.add.text(15, 100, 
      `形状基因: ${flower.genes.shapeGene1}/${flower.genes.shapeGene2}`, {
      fontSize: '11px',
      color: '#888'
    });
    this.propertyPanel.add(shapeText);
    
    const spotText = this.add.text(15, 120, 
      `斑点: ${flower.hasSpots ? '有' : '无'}`, {
      fontSize: '11px',
      color: '#888'
    });
    this.propertyPanel.add(spotText);
    
    this.propertyPanel.setAlpha(0);
    this.tweens.add({
      targets: this.propertyPanel,
      alpha: 1,
      duration: 200,
      ease: 'Power2.Out'
    });
  }

  private hidePropertyPanel(): void {
    if (this.propertyPanel) {
      this.tweens.add({
        targets: this.propertyPanel,
        alpha: 0,
        duration: 150,
        onComplete: () => {
          this.propertyPanel?.destroy();
          this.propertyPanel = null;
        }
      });
    }
  }

  private drawDashedCircle(
    graphics: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    radius: number,
    color: number,
    alpha: number,
    dashSize: number,
    gapSize: number
  ): void {
    graphics.lineStyle(2, color, alpha);
    
    const circumference = 2 * Math.PI * radius;
    const totalStep = dashSize + gapSize;
    const segments = Math.ceil(circumference / totalStep);
    
    for (let i = 0; i < segments; i++) {
      const startAngle = (i * totalStep) / radius;
      const endAngle = startAngle + dashSize / radius;
      
      graphics.beginPath();
      graphics.arc(cx, cy, radius, startAngle, endAngle, false);
      graphics.strokePath();
    }
  }

  private createParticles(): void {
  }

  private spawnPetalParticles(x: number, y: number): void {
    const colors = [0xff69b4, 0xffb6c1, 0xffc0cb, 0xffd700, 0xff6347];
    
    for (let i = 0; i < 20; i++) {
      const color = Phaser.Utils.Array.GetRandom(colors);
      const size = Phaser.Math.Between(8, 15);
      const angle = Phaser.Math.Between(0, 360);
      const speed = Phaser.Math.Between(50, 150);
      
      const petal = this.add.graphics();
      petal.fillStyle(color, 0.9);
      petal.fillEllipse(0, 0, size, size * 0.7);
      
      const particle = this.add.container(x, y, [petal]);
      
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle * Math.PI / 180) * speed,
        y: y + Math.sin(angle * Math.PI / 180) * speed + 50,
        angle: angle * 3,
        alpha: 0,
        scale: 0,
        duration: 1500,
        ease: 'Power2.Out',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  private showAchievementPanel(): void {
    const panel = document.getElementById('achievementPanel');
    const grid = document.getElementById('achievementGrid');
    
    if (!panel || !grid) return;
    
    grid.innerHTML = '';
    
    const allThreeStar = getThreeStarFlowers();
    const displayCount = Math.max(6, Math.ceil(allThreeStar.length * 0.15));
    const displayFlowers = allThreeStar.slice(0, Math.min(displayCount, allThreeStar.length));
    
    for (const flower of displayFlowers) {
      const unlocked = this.unlockedFlowers.has(flower.id);
      
      const item = document.createElement('div');
      item.className = `achievement-item ${unlocked ? 'unlocked' : 'locked'}`;
      
      const icon = document.createElement('div');
      icon.className = 'achievement-icon';
      icon.style.backgroundColor = this.getFlowerColorCss(flower.color);
      icon.textContent = unlocked ? '🌸' : '❓';
      
      const name = document.createElement('div');
      name.className = 'achievement-name';
      name.textContent = unlocked ? `${flower.colorName}${flower.shapeName}` : '???';
      
      item.appendChild(icon);
      item.appendChild(name);
      grid.appendChild(item);
    }
    
    panel.classList.add('show');
  }

  private getFlowerColorCss(color: string): string {
    const colorMap: Record<string, string> = {
      red: '#e74c3c',
      yellow: '#f1c40f',
      blue: '#3498db',
      white: '#ecf0f1',
      orange: '#e67e22',
      green: '#27ae60',
      purple: '#9b59b6',
      pink: '#ff69b4',
      lightBlue: '#87ceeb',
      lightYellow: '#fffacd'
    };
    return colorMap[color] || '#ccc';
  }

  private hideAchievementPanel(): void {
    const panel = document.getElementById('achievementPanel');
    if (panel) {
      panel.classList.remove('show');
    }
  }

  private showResetConfirm(): void {
    const dialog = document.getElementById('confirmDialog');
    if (dialog) {
      dialog.classList.add('show');
    }
  }

  private hideResetConfirm(): void {
    const dialog = document.getElementById('confirmDialog');
    if (dialog) {
      dialog.classList.remove('show');
    }
  }

  private doReset(): void {
    clearProgress();
    this.unlockedFlowers.clear();
    
    for (const f of this.baseFlowers) {
      this.unlockedFlowers.set(f.id, f);
    }
    
    this.createEvolutionTree();
    this.createToolbar();
    this.hideResetConfirm();
  }

  private setupInput(): void {
    const closeBtn = document.getElementById('achievementClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideAchievementPanel();
      });
    }
    
    const panel = document.getElementById('achievementPanel');
    if (panel) {
      panel.addEventListener('click', (e) => {
        if (e.target === panel) {
          this.hideAchievementPanel();
        }
      });
    }
    
    const cancelBtn = document.getElementById('confirmCancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        this.hideResetConfirm();
      });
    }
    
    const okBtn = document.getElementById('confirmOk');
    if (okBtn) {
      okBtn.addEventListener('click', () => {
        this.doReset();
      });
    }
    
    const dialog = document.getElementById('confirmDialog');
    if (dialog) {
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          this.hideResetConfirm();
        }
      });
    }
    
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        const onFlower = this.flowerSprites.some(s => {
          const bounds = s.container.getBounds();
          return bounds.contains(pointer.x, pointer.y);
        });
        if (!onFlower) {
          this.hidePropertyPanel();
        }
      }
    });
  }

  private setupResize(): void {
    this.scale.on('resize', this.handleResize, this);
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const newWidth = gameSize.width;
    const wasMobile = this.isMobile;
    this.isMobile = newWidth < MOBILE_BREAKPOINT;
    
    if (wasMobile !== this.isMobile) {
      this.rebuildLayout();
    } else {
      this.updateLayoutPositions();
    }
  }

  private rebuildLayout(): void {
    this.createLayout();
    this.createGarden();
    this.createPotArea();
    this.createEvolutionTree();
    this.createToolbar();
  }

  private updateLayoutPositions(): void {
    this.updateLayout();
    this.createGarden();
    this.createPotArea();
    this.createEvolutionTree();
    this.createToolbar();
  }

  private runPerformanceTests(): void {
    console.log('[Performance] 运行性能测试...');
    
    perfTester.clear();
    
    perfTester.measure('培育计算时间', 500, 'ms', () => {
      if (this.baseFlowers.length >= 2) {
        crossBreed(this.baseFlowers[0], this.baseFlowers[1]);
      }
    });
    
    const drawStartTime = performance.now();
    for (let i = 0; i < 100; i++) {
      const g = this.add.graphics();
      drawFlower(g, 100, 100, 30, this.baseFlowers[0]);
      g.destroy();
    }
    const drawEndTime = performance.now();
    perfTester.addMetric('100次花绘制', drawEndTime - drawStartTime, 333, 'ms');
    
    perfTester.measure('localStorage写入', 10, 'ms', () => {
      saveProgress(Array.from(this.unlockedFlowers.values()));
    });
    
    perfTester.measure('localStorage读取', 10, 'ms', () => {
      loadProgress();
    });
    
    perfTester.printReport();
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    
    if (this.dragResponseTimes.length > 0) {
      const avg = this.dragResponseTimes.reduce((a, b) => a + b, 0) / this.dragResponseTimes.length;
      if (avg > 50) {
        console.warn(`[Performance] 拖拽响应平均延迟: ${avg.toFixed(2)}ms (超过50ms阈值)`);
      }
    }
  }
}
