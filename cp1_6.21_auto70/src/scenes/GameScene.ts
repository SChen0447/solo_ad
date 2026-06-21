import Phaser from 'phaser';
import { Spacecraft, TractorState } from '../entities/Spacecraft';
import { Debris, DebrisState } from '../entities/Debris';
import { PhysicsManager, CollisionEvent } from '../managers/PhysicsManager';
import { ScoreManager, ScoreEvent } from '../managers/ScoreManager';
import { HUD, HUDData } from '../ui/HUD';

interface Achievement {
  type: 'personal_best' | 'top_3' | 'top_1';
  message: string;
  rank?: number;
  previousBest?: number;
}

export class GameScene extends Phaser.Scene {
  private spacecraft!: Spacecraft;
  private physicsManager!: PhysicsManager;
  private scoreManager!: ScoreManager;
  private hud!: HUD;

  private totalTime = 90;
  private timeRemaining = 90;
  private gameRunning = false;
  private gameEnded = false;
  private paused = false;

  private spawnTimer = 0;
  private spawnInterval = 10000;
  private initialDebrisCount = 40;

  private spaceKey!: Phaser.Input.Keyboard.Key;
  private spacePressed = false;

  private starLayer!: Phaser.GameObjects.Graphics;
  private nebulaBg!: Phaser.GameObjects.Graphics[];

  private recycleCount = 0;

  private socket: any = null;
  private clientId: string = '';

  private endModalContainer: Phaser.GameObjects.Container | null = null;
  private nameInput: HTMLInputElement | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(): void {}

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.createSpaceBackground(width, height);

    this.physicsManager = new PhysicsManager(this);
    this.scoreManager = new ScoreManager(this);

    this.spacecraft = new Spacecraft(
      this,
      width / 2,
      height / 2
    );
    this.physicsManager.setShip(this.spacecraft);

    this.hud = new HUD(this);

    this.setupInput();
    this.setupEventListeners();

    this.spawnInitialDebris(width, height);

    this.gameRunning = true;
    this.timeRemaining = this.totalTime;

    this.cameras.main.fadeIn(600, 0, 0, 10);

    this.showNotification('任务开始！回收太空垃圾', '#4fc3f7', '#01579b');
  }

  private createSpaceBackground(width: number, height: number): void {
    this.nebulaBg = [];
    const bgGraphics = this.add.graphics();

    const bgGrad = bgGraphics.createLinearGradient(0, 0, width, height);
    bgGraphics.fillGradientStyle(0x000015, 0x001028, 0x001a33, 0x000820, 1);
    bgGraphics.fillRect(0, 0, width, height);

    const nebulaColors = [
      { c: 0x1a237e, a: 0.08, x: 0.2, y: 0.3, r: 300 },
      { c: 0x311b92, a: 0.07, x: 0.8, y: 0.2, r: 350 },
      { c: 0x006064, a: 0.06, x: 0.3, y: 0.8, r: 280 },
      { c: 0x4a148c, a: 0.09, x: 0.75, y: 0.7, r: 320 },
      { c: 0x1a237e, a: 0.05, x: 0.5, y: 0.5, r: 500 },
    ];

    nebulaColors.forEach(n => {
      const g = this.add.graphics();
      for (let r = n.r; r > 0; r -= 15) {
        const rAlpha = n.a * Math.pow(r / n.r, 1.5);
        g.fillStyle(n.c, rAlpha);
        g.fillCircle(width * n.x + Math.sin(r * 0.01) * 15, height * n.y + Math.cos(r * 0.01) * 15, r);
      }
      this.nebulaBg.push(g);
      g.setDepth(-5);
    });

    bgGraphics.setDepth(-10);

    this.starLayer = this.add.graphics();
    this.starLayer.setDepth(-8);
    const starCount = 400;

    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 2 + 0.3;
      const baseAlpha = Math.random() * 0.7 + 0.3;
      const color = Math.random() > 0.88
        ? 0x81d4fa
        : (Math.random() > 0.6 ? 0xe3f2fd : 0xffffff);

      this.starLayer.fillStyle(color, baseAlpha);
      this.starLayer.fillPoint(x, y, size);
    }

    this.time.addEvent({
      delay: 100 + Math.random() * 100,
      loop: true,
      callback: () => {
        const tx = Math.random() * width;
        const ty = Math.random() * height;
        const ts = Math.random() * 1.5 + 0.5;
        this.starLayer.fillStyle(0xffffff, 1);
        this.starLayer.fillPoint(tx, ty, ts);
        this.time.delayedCall(100 + Math.random() * 200, () => {
          this.starLayer.fillStyle(0x000010, 0);
          this.starLayer.fillPoint(tx, ty, ts);
        });
      },
    });

    this.nebulaBg.forEach((g, i) => {
      this.tweens.add({
        targets: g,
        x: { from: -20 + i * 5, to: 20 - i * 5 },
        y: { from: -10 + i * 3, to: 10 - i * 3 },
        duration: 10000 + i * 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  private setupInput(): void {
    this.spaceKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE
    );

    this.spaceKey.on('down', () => {
      if (this.gameRunning && !this.gameEnded) {
        this.spacePressed = true;
        if (this.spacecraft.fireTractorBeam()) {
          // beam fired
        } else if (this.spacecraft.getTractorState() === 'depleted') {
          this.showNotification('能量不足！等待恢复...', '#ff5252', '#b71c1c', 800);
        }
      }
    });

    this.spaceKey.on('up', () => {
      this.spacePressed = false;
      this.spacecraft.releaseTractorBeam();
      this.physicsManager.getActiveDebris().forEach(d => {
        if (d.state === 'tracted') d.releaseTraction();
      });
    });

    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.gameEnded) return;
      this.paused = !this.paused;
      this.showNotification(this.paused ? '暂停 (ESC继续)' : '继续！', '#90caf9', '#1565c0', 1000);
    });
  }

  private setupEventListeners(): void {
    this.physicsManager.onCollision((event: CollisionEvent) => {
      if (event.type === 'fragment_ship') {
        this.scoreManager.breakCombo();
      }
    });

    this.scoreManager.onEvent((event: ScoreEvent) => {
      if (event.type === 'combo_break' && event.comboCount === 0) {
        // combo broken
      }
    });
  }

  private spawnInitialDebris(width: number, height: number): void {
    const count = this.initialDebrisCount;
    const margin = 100;
    const centerX = width / 2;
    const centerY = height / 2;
    const minDistFromShip = 150;

    let spawned = 0;
    let attempts = 0;
    while (spawned < count && attempts < count * 5) {
      attempts++;
      const edge = Math.floor(Math.random() * 4);
      let x = 0, y = 0;

      switch (edge) {
        case 0: x = margin + Math.random() * (width - margin * 2); y = margin + Math.random() * 200; break;
        case 1: x = width - margin - Math.random() * 200; y = margin + Math.random() * (height - margin * 2); break;
        case 2: x = margin + Math.random() * (width - margin * 2); y = height - margin - Math.random() * 200; break;
        case 3: x = margin + Math.random() * 200; y = margin + Math.random() * (height - margin * 2); break;
      }

      const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      if (dist < minDistFromShip) continue;

      const debris = new Debris(this, x, y);
      if (this.physicsManager.addDebris(debris)) {
        spawned++;
      } else {
        debris.destroy();
      }
    }
  }

  private spawnEdgeDebris(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const count = 2 + Math.floor(Math.random() * 2);
    let added = 0;

    for (let i = 0; i < count; i++) {
      const edge = Math.floor(Math.random() * 4);
      let x = 0, y = 0, vx = 0, vy = 0;
      const speed = 30 + Math.random() * 50;

      switch (edge) {
        case 0:
          x = 50 + Math.random() * (width - 100); y = -40;
          vx = (Math.random() - 0.5) * speed; vy = speed * 0.6;
          break;
        case 1:
          x = width + 40; y = 50 + Math.random() * (height - 100);
          vx = -speed * 0.6; vy = (Math.random() - 0.5) * speed;
          break;
        case 2:
          x = 50 + Math.random() * (width - 100); y = height + 40;
          vx = (Math.random() - 0.5) * speed; vy = -speed * 0.6;
          break;
        case 3:
          x = -40; y = 50 + Math.random() * (height - 100);
          vx = speed * 0.6; vy = (Math.random() - 0.5) * speed;
          break;
      }

      const debris = new Debris(this, x, y);
      debris.sprite.setVelocity(vx, vy);
      if (this.physicsManager.addDebris(debris)) {
        added++;
      } else {
        debris.destroy();
      }
    }

    if (added > 0) {
      this.showNotification(`增援垃圾 +${added}`, '#ffb74d', '#e65100', 900);
    }
  }

  update(time: number, delta: number): void {
    if (this.gameEnded || this.paused) return;
    if (!this.gameRunning) return;

    this.updateTimer(delta);
    this.spacecraft.update(delta);

    const beamInfo = this.spacecraft.getBeamInfo();
    this.physicsManager.update(delta, beamInfo);

    this.checkAndApplyTraction(beamInfo);
    this.checkRecycledDebris();

    this.scoreManager.update(delta);

    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnEdgeDebris();
    }

    this.updateHUD(delta);
    this.checkGameEnd();
  }

  private updateTimer(delta: number): void {
    this.timeRemaining = Math.max(0, this.timeRemaining - delta / 1000);
  }

  private checkAndApplyTraction(beamInfo: {
    start: { x: number; y: number };
    end: { x: number; y: number };
    angle: number;
    length: number;
    halfAngle: number;
    active: boolean;
  }): void {
    if (!beamInfo.active) return;

    const activeDebris = this.physicsManager.getActiveDebris();
    for (const debris of activeDebris) {
      if (debris.state === 'floating' && debris.checkInsideBeam(beamInfo)) {
        debris.startTraction();
      }
    }
  }

  private checkRecycledDebris(): void {
    const activeDebris = this.physicsManager.getActiveDebris();
    for (const debris of activeDebris) {
      if (debris.state === 'recycled' && !(debris as any)._scored) {
        (debris as any)._scored = true;
        this.scoreManager.addRecycledScore(debris.sprite.x, debris.sprite.y);
        this.recycleCount++;

        if (this.recycleCount === 10) {
          this.showNotification('优秀回收员！', '#ffd54f', '#ff6f00', 1800);
        } else if (this.recycleCount === 25) {
          this.showNotification('专家级回收！', '#69f0ae', '#1b5e20', 1800);
        }
      }
    }
  }

  private updateHUD(delta: number): void {
    const data: HUDData = {
      score: this.scoreManager.score,
      displayScore: this.scoreManager.displayScore,
      timeRemaining: this.timeRemaining,
      totalTime: this.totalTime,
      lives: this.spacecraft.lives,
      maxLives: this.spacecraft.maxLives,
      energy: this.spacecraft.energy,
      maxEnergy: this.spacecraft.maxEnergy,
      comboCount: this.scoreManager.comboCount,
      multiplier: this.scoreManager.multiplier,
      beamState: this.spacecraft.getTractorState(),
    };
    this.hud.update(data, delta);
  }

  private checkGameEnd(): void {
    if (this.spacecraft.isDead()) {
      this.endGame('destroyed');
    } else if (this.timeRemaining <= 0) {
      this.endGame('timeup');
    }
  }

  private endGame(reason: 'destroyed' | 'timeup'): void {
    if (this.gameEnded) return;
    this.gameEnded = true;
    this.gameRunning = false;

    this.cameras.main.fadeOut(800, 0, 0, 10);

    this.time.delayedCall(800, () => {
      this.showEndModal(reason);
    });
  }

  private showEndModal(reason: 'destroyed' | 'timeup'): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const mw = 520;
    const mh = 580;

    const modalBg = this.add.graphics();
    modalBg.fillStyle(0x000010, 0.85);
    modalBg.fillRect(0, 0, width, height);
    modalBg.setDepth(150);
    modalBg.setAlpha(0);
    this.tweens.add({ targets: modalBg, alpha: 1, duration: 400 });

    this.endModalContainer = this.add.container(width / 2, height / 2);
    this.endModalContainer.setDepth(160);
    this.endModalContainer.setScale(0);

    const panel = this.add.graphics();
    panel.fillGradientStyle(0x0a1929, 0x0d2137, 0x071520, 0x0a1929, 1);
    panel.fillRoundedRect(-mw / 2, -mh / 2, mw, mh, 18);
    panel.lineStyle(3, 0x4fc3f7, 1);
    panel.strokeRoundedRect(-mw / 2, -mh / 2, mw, mh, 18);
    panel.lineStyle(1, 0x81d4fa, 0.4);
    panel.strokeRoundedRect(-mw / 2 + 6, -mh / 2 + 6, mw - 12, mh - 12, 14);

    const titleText = this.add.text(0, -mh / 2 + 50, '', {
      fontSize: '36px',
      fontFamily: 'Courier New, monospace',
      color: '#4fc3f7',
      fontStyle: 'bold',
      letterSpacing: 4,
    }).setOrigin(0.5);

    if (reason === 'destroyed') {
      titleText.setText('任务失败');
      titleText.setColor('#ff5252');
      titleText.setStroke('#b71c1c', 4);
    } else {
      titleText.setText('任务完成');
      titleText.setColor('#69f0ae');
      titleText.setStroke('#1b5e20', 4);
    }

    const subtitleText = this.add.text(0, -mh / 2 + 95, reason === 'destroyed' ? '飞船损毁' : '时间到！', {
      fontSize: '18px',
      fontFamily: 'Courier New, monospace',
      color: '#90caf9',
      letterSpacing: 3,
    }).setOrigin(0.5);

    const scoreLabel = this.add.text(-160, -mh / 2 + 150, '最终得分', {
      fontSize: '16px',
      fontFamily: 'Courier New, monospace',
      color: '#81d4fa',
      letterSpacing: 3,
    });

    const scoreValue = this.add.text(-160, -mh / 2 + 175, this.scoreManager.score.toLocaleString(), {
      fontSize: '48px',
      fontFamily: 'Courier New, monospace',
      color: '#ffd54f',
      fontStyle: 'bold',
      stroke: '#ff6f00',
      strokeThickness: 3,
    });

    const statsY = -mh / 2 + 265;
    const statItems = [
      { label: '回收垃圾', value: `${this.recycleCount}`, color: '#69f0ae' },
      { label: '最高连击', value: `${this.scoreManager.comboCount || (this.scoreManager as any)._maxCombo || 0}`, color: '#ffd54f' },
      { label: '最高倍率', value: `x${(this.scoreManager as any)._maxMult || this.scoreManager.multiplier}`, color: '#e040fb' },
      { label: '剩余生命', value: `${this.spacecraft.lives}/${this.spacecraft.maxLives}`, color: '#4fc3f7' },
    ];

    const statContainers: Phaser.GameObjects.Container[] = [];
    statItems.forEach((s, i) => {
      const sc = this.add.container(-160 + (i % 2) * 330, statsY + Math.floor(i / 2) * 60);
      const lb = this.add.text(0, 0, s.label, {
        fontSize: '13px',
        fontFamily: 'Courier New, monospace',
        color: '#90a4ae',
        letterSpacing: 2,
      });
      const vl = this.add.text(0, 22, s.value, {
        fontSize: '22px',
        fontFamily: 'Courier New, monospace',
        color: s.color,
        fontStyle: 'bold',
      });
      sc.add([lb, vl]);
      statContainers.push(sc);
    });

    const lineG = this.add.graphics();
    lineG.lineStyle(1, 0x4fc3f7, 0.4);
    lineG.beginPath();
    lineG.moveTo(-mw / 2 + 40, 20);
    lineG.lineTo(mw / 2 - 40, 20);
    lineG.strokePath();

    const nameLabel = this.add.text(0, 50, '输入玩家名称 (最多8字符)', {
      fontSize: '15px',
      fontFamily: 'Courier New, monospace',
      color: '#90caf9',
      letterSpacing: 2,
    }).setOrigin(0.5);

    const inputDiv = document.createElement('div');
    inputDiv.style.cssText = `
      position: absolute;
      left: ${width / 2 - 140}px;
      top: ${height / 2 + 75}px;
      width: 280px;
      z-index: 9999;
    `;
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 8;
    input.placeholder = '你的称号';
    input.style.cssText = `
      width: 100%;
      padding: 14px 18px;
      font-size: 20px;
      font-family: 'Courier New', monospace;
      background: rgba(10, 25, 41, 0.95);
      color: #e3f2fd;
      border: 2px solid #4fc3f7;
      border-radius: 8px;
      outline: none;
      text-align: center;
      letter-spacing: 3px;
      box-shadow: 0 0 20px rgba(79, 195, 247, 0.3), inset 0 0 15px rgba(79, 195, 247, 0.1);
      transition: all 0.3s ease;
    `;
    input.addEventListener('focus', () => {
      input.style.borderColor = '#81d4fa';
      input.style.boxShadow = '0 0 30px rgba(79, 195, 247, 0.5), inset 0 0 20px rgba(79, 195, 247, 0.15)';
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = '#4fc3f7';
      input.style.boxShadow = '0 0 20px rgba(79, 195, 247, 0.3), inset 0 0 15px rgba(79, 195, 247, 0.1)';
    });
    inputDiv.appendChild(input);
    document.body.appendChild(inputDiv);
    this.nameInput = input;

    this.time.delayedCall(50, () => input.focus());

    const submitBtnG = this.add.graphics();
    const sbX = 0, sbY = 170, sbW = 260, sbH = 55;
    submitBtnG.fillGradientStyle(0x00e676, 0x00c853, 0x00a844, 0x00e676, 1);
    submitBtnG.lineStyle(3, 0x69f0ae, 1);
    submitBtnG.strokeRoundedRect(sbX - sbW / 2, sbY - sbH / 2, sbW, sbH, 10);
    submitBtnG.fillRoundedRect(sbX - sbW / 2, sbY - sbH / 2, sbW, sbH, 10);

    const submitBtnText = this.add.text(sbX, sbY, '📡 提交成绩', {
      fontSize: '22px',
      fontFamily: 'Courier New, monospace',
      color: '#ffffff',
      fontStyle: 'bold',
      letterSpacing: 3,
    }).setOrigin(0.5);

    const submitHitArea = this.add.zone(sbX, sbY, sbW, sbH);
    submitHitArea.setInteractive({ useHandCursor: true });

    let submitting = false;
    submitHitArea.on('pointerup', async () => {
      if (submitting) return;
      submitting = true;

      let name = (this.nameInput?.value || '').trim().slice(0, 8);
      if (!name) name = 'Pilot';

      submitBtnG.clear();
      submitBtnG.fillGradientStyle(0x757575, 0x616161, 0x424242, 0x757575, 1);
      submitBtnG.lineStyle(3, 0x9e9e9e, 1);
      submitBtnG.strokeRoundedRect(sbX - sbW / 2, sbY - sbH / 2, sbW, sbH, 10);
      submitBtnG.fillRoundedRect(sbX - sbW / 2, sbY - sbH / 2, sbW, sbH, 10);
      submitBtnText.setText('提交中...');

      const result = await this.scoreManager.syncToBackend(name, this.clientId);

      setTimeout(() => {
        if (inputDiv.parentNode) inputDiv.parentNode.removeChild(inputDiv);
        this.showResultScreen(result, name);
      }, 600);
    });

    submitHitArea.on('pointerover', () => {
      this.tweens.add({ targets: [submitBtnG, submitBtnText], scale: 1.05, duration: 150 });
    });
    submitHitArea.on('pointerout', () => {
      this.tweens.add({ targets: [submitBtnG, submitBtnText], scale: 1, duration: 150 });
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitHitArea.emit('pointerup');
    });

    const backBtnText = this.add.text(0, mh / 2 - 30, '← 返回主菜单', {
      fontSize: '15px',
      fontFamily: 'Courier New, monospace',
      color: '#90caf9',
      letterSpacing: 2,
    }).setOrigin(0.5);
    const backHitArea = this.add.zone(0, mh / 2 - 30, 200, 35);
    backHitArea.setInteractive({ useHandCursor: true });
    backHitArea.on('pointerup', () => {
      if (inputDiv.parentNode) inputDiv.parentNode.removeChild(inputDiv);
      this.returnToMenu();
    });
    backHitArea.on('pointerover', () => backBtnText.setColor('#4fc3f7'));
    backHitArea.on('pointerout', () => backBtnText.setColor('#90caf9'));

    this.endModalContainer.add([
      panel, titleText, subtitleText, scoreLabel, scoreValue,
      ...statContainers, lineG, nameLabel,
      submitBtnG, submitBtnText, submitHitArea,
      backBtnText, backHitArea,
    ]);

    this.tweens.add({
      targets: this.endModalContainer,
      scale: { from: 0, to: 1 },
      duration: 500,
      ease: 'Back.easeOut',
    });
  }

  private showResultScreen(result: any, playerName: string): void {
    if (!this.endModalContainer) return;

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const mw = 520, mh = 580;

    this.endModalContainer.removeAll(true);

    const panel = this.add.graphics();
    panel.fillGradientStyle(0x0a1929, 0x0d2137, 0x071520, 0x0a1929, 1);
    panel.fillRoundedRect(-mw / 2, -mh / 2, mw, mh, 18);
    panel.lineStyle(3, 0x4fc3f7, 1);
    panel.strokeRoundedRect(-mw / 2, -mh / 2, mw, mh, 18);

    this.endModalContainer.add(panel);

    let achievementY = -mh / 2 + 70;

    if (result.achievements && result.achievements.length > 0) {
      const achTitle = this.add.text(0, achievementY, '🏆 成就解锁', {
        fontSize: '26px',
        fontFamily: 'Courier New, monospace',
        color: '#ffd54f',
        fontStyle: 'bold',
        letterSpacing: 4,
      }).setOrigin(0.5);
      this.endModalContainer.add(achTitle);
      achievementY += 40;

      result.achievements.forEach((ach: Achievement, i: number) => {
        const achBg = this.add.graphics();
        const aw = 440, ah = 65;
        let col = 0x004d40, borderCol = 0x69f0ae;
        if (ach.type === 'top_1') { col = 0xff8f00; borderCol = 0xffd54f; }
        else if (ach.type === 'top_3') { col = 0x5d4037; borderCol = 0xffb74d; }
        else { col = 0x1a237e; borderCol = 0x7c4dff; }

        achBg.fillStyle(col, 0.6);
        achBg.lineStyle(2, borderCol, 1);
        achBg.strokeRoundedRect(-aw / 2, achievementY - ah / 2, aw, ah, 8);
        achBg.fillRoundedRect(-aw / 2, achievementY - ah / 2, aw, ah, 8);

        const achMsg = this.add.text(0, achievementY, ach.message, {
          fontSize: '19px',
          fontFamily: 'Courier New, monospace',
          color: '#ffffff',
          fontStyle: 'bold',
        }).setOrigin(0.5);

        this.endModalContainer.add([achBg, achMsg]);
        achievementY += ah + 12;

        this.time.delayedCall(i * 300, () => {
          achBg.setScale(0);
          achMsg.setScale(0);
          this.tweens.add({
            targets: [achBg, achMsg],
            scale: { from: 0, to: 1 },
            duration: 350,
            ease: 'Back.easeOut',
          });
          for (let p = 0; p < 12; p++) {
            const ang = (p / 12) * Math.PI * 2;
            const particle = this.add.graphics();
            particle.fillStyle(borderCol, 1);
            particle.fillCircle(0, 0, 3);
            particle.setPosition(width / 2, height / 2 + achievementY - ah / 2);
            particle.setDepth(170);
            this.tweens.add({
              targets: particle,
              x: width / 2 + Math.cos(ang) * 200,
              y: height / 2 + achievementY - ah / 2 + Math.sin(ang) * 100,
              alpha: 0,
              duration: 500,
              onComplete: () => particle.destroy(),
            });
          }
        });
      });
    } else {
      const noAchTitle = this.add.text(0, achievementY, result.success ? '✅ 成绩已记录' : '⚠️ 离线模式', {
        fontSize: '26px',
        fontFamily: 'Courier New, monospace',
        color: result.success ? '#69f0ae' : '#ffb74d',
        fontStyle: 'bold',
        letterSpacing: 3,
      }).setOrigin(0.5);
      this.endModalContainer.add(noAchTitle);
      achievementY += 50;
    }

    const scoreTitle = this.add.text(0, achievementY, `${playerName} 的战绩`, {
      fontSize: '18px',
      fontFamily: 'Courier New, monospace',
      color: '#90caf9',
      letterSpacing: 3,
    }).setOrigin(0.5);
    this.endModalContainer.add(scoreTitle);
    achievementY += 32;

    const bigScore = this.add.text(0, achievementY, this.scoreManager.score.toLocaleString(), {
      fontSize: '58px',
      fontFamily: 'Courier New, monospace',
      color: '#ffd54f',
      fontStyle: 'bold',
      stroke: '#ff6f00',
      strokeThickness: 4,
    }).setOrigin(0.5);
    this.endModalContainer.add(bigScore);

    if (result.leaderboard && result.leaderboard.length > 0) {
      achievementY += 75;
      const lbTitle = this.add.text(0, achievementY, '🏆 实时排行榜', {
        fontSize: '18px',
        fontFamily: 'Courier New, monospace',
        color: '#ffd54f',
        letterSpacing: 3,
      }).setOrigin(0.5);
      this.endModalContainer.add(lbTitle);
      achievementY += 30;

      const topList = result.leaderboard.slice(0, 5);
      topList.forEach((entry: any, i: number) => {
        const ey = achievementY + i * 34;
        let rankCol = '#e3f2fd';
        let prefix = `${i + 1}`;
        if (i === 0) { rankCol = '#ffd54f'; prefix = `👑 1`; }
        else if (i === 1) { rankCol = '#e0e0e0'; prefix = `🥈 2`; }
        else if (i === 2) { rankCol = '#ffb74d'; prefix = `🥉 3`; }

        const isPlayer = entry.playerName === playerName && entry.score === this.scoreManager.score;
        if (isPlayer) rankCol = '#69f0ae';

        const rankStr = this.add.text(-mw / 2 + 50, ey, prefix, {
          fontSize: '15px',
          fontFamily: 'Courier New, monospace',
          color: rankCol,
          fontStyle: 'bold',
        });

        const nameStr = this.add.text(-mw / 2 + 120, ey, entry.playerName, {
          fontSize: '15px',
          fontFamily: 'Courier New, monospace',
          color: isPlayer ? '#69f0ae' : '#ffffff',
          fontStyle: isPlayer ? 'bold' : 'normal',
        });

        const scoreStr = this.add.text(mw / 2 - 50, ey, entry.score.toLocaleString(), {
          fontSize: '15px',
          fontFamily: 'Courier New, monospace',
          color: rankCol,
          fontStyle: 'bold',
        }).setOrigin(1, 0);

        if (isPlayer) {
          const arrow = this.add.text(-mw / 2 + 20, ey, '←', {
            fontSize: '16px',
            color: '#69f0ae',
            fontStyle: 'bold',
          });
          this.endModalContainer.add(arrow);
        }

        this.endModalContainer.add([rankStr, nameStr, scoreStr]);
      });
    }

    const replayBtnG = this.add.graphics();
    const rbX = -110, rbY = mh / 2 - 70, rbW = 200, rbH = 50;
    replayBtnG.fillGradientStyle(0x29b6f6, 0x0288d1, 0x01579b, 0x29b6f6, 1);
    replayBtnG.lineStyle(3, 0x81d4fa, 1);
    replayBtnG.strokeRoundedRect(rbX - rbW / 2, rbY - rbH / 2, rbW, rbH, 10);
    replayBtnG.fillRoundedRect(rbX - rbW / 2, rbY - rbH / 2, rbW, rbH, 10);
    const replayText = this.add.text(rbX, rbY, '🔄 再来一局', {
      fontSize: '19px',
      fontFamily: 'Courier New, monospace',
      color: '#fff',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);
    const replayHit = this.add.zone(rbX, rbY, rbW, rbH);
    replayHit.setInteractive({ useHandCursor: true });
    replayHit.on('pointerup', () => this.restartGame());
    replayHit.on('pointerover', () => this.tweens.add({ targets: [replayBtnG, replayText], scale: 1.05, duration: 150 }));
    replayHit.on('pointerout', () => this.tweens.add({ targets: [replayBtnG, replayText], scale: 1, duration: 150 }));

    const menuBtnG = this.add.graphics();
    const mbX = 110, mbY = mh / 2 - 70, mbW = 200, mbH = 50;
    menuBtnG.fillGradientStyle(0x5c6bc0, 0x3949ab, 0x283593, 0x5c6bc0, 1);
    menuBtnG.lineStyle(3, 0x9fa8da, 1);
    menuBtnG.strokeRoundedRect(mbX - mbW / 2, mbY - mbH / 2, mbW, mbH, 10);
    menuBtnG.fillRoundedRect(mbX - mbW / 2, mbY - mbH / 2, mbW, mbH, 10);
    const menuText = this.add.text(mbX, mbY, '🏠 主菜单', {
      fontSize: '19px',
      fontFamily: 'Courier New, monospace',
      color: '#fff',
      fontStyle: 'bold',
      letterSpacing: 2,
    }).setOrigin(0.5);
    const menuHit = this.add.zone(mbX, mbY, mbW, mbH);
    menuHit.setInteractive({ useHandCursor: true });
    menuHit.on('pointerup', () => this.returnToMenu());
    menuHit.on('pointerover', () => this.tweens.add({ targets: [menuBtnG, menuText], scale: 1.05, duration: 150 }));
    menuHit.on('pointerout', () => this.tweens.add({ targets: [menuBtnG, menuText], scale: 1, duration: 150 }));

    this.endModalContainer.add([
      replayBtnG, replayText, replayHit,
      menuBtnG, menuText, menuHit,
    ]);
  }

  private restartGame(): void {
    this.cleanup();
    this.scene.restart();
  }

  private returnToMenu(): void {
    this.cleanup();
    this.scene.stop();
    this.scene.start('MenuScene');
  }

  private cleanup(): void {
    if (this.nameInput?.parentNode) {
      this.nameInput.parentNode.removeChild(this.nameInput);
    }
    this.spacecraft.destroy();
    this.physicsManager.destroy();
    this.scoreManager.destroy();
    this.hud.destroy();
  }

  private showNotification(msg: string, col = '#69f0ae', strokeCol = '#1b5e20', dur = 1500): void {
    this.hud.showNotification(msg, col, strokeCol, dur);
  }
}
