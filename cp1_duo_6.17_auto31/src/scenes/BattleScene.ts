import Phaser from 'phaser';
import { monsterGenerator } from '../managers/MonsterGenerator';
import { gameState } from '../store/GameState';
import { MonsterData, MaterialData } from '../models/TypeDefinitions';
import axios from 'axios';

const STEP_TRIGGER = 3;

export class BattleScene extends Phaser.Scene {
  private currentMonster: MonsterData | null = null;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private monsterIconContainer!: Phaser.GameObjects.Container;
  private monsterIconSprite!: Phaser.GameObjects.Sprite;
  private monsterHalo!: Phaser.GameObjects.Sprite;
  private monsterParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private monsterOrbitParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private playerHpBar!: Phaser.GameObjects.Graphics;
  private monsterHpBar!: Phaser.GameObjects.Graphics;
  private playerHpText!: Phaser.GameObjects.Text;
  private monsterHpText!: Phaser.GameObjects.Text;
  private monsterNameText!: Phaser.GameObjects.Text;
  private attackBtn!: Phaser.GameObjects.Container;
  private forgeBtn!: Phaser.GameObjects.Container;
  private codexBtn!: Phaser.GameObjects.Container;
  private exploreBtn!: Phaser.GameObjects.Container;
  private isPlayerTurn: boolean = true;
  private isAnimating: boolean = false;
  private stepCounter: number = 0;
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private torchGlows: Phaser.GameObjects.Sprite[] = [];
  private bottomPanel!: Phaser.GameObjects.Graphics;
  private battleActive: boolean = false;
  private dropItems: Phaser.GameObjects.Container[] = [];
  private playerYBase: number = 0;
  private monsterYBase: number = 0;

  constructor() {
    super({ key: 'BattleScene' });
  }

  create() {
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.drawBackground();
    this.createPlayer();
    this.createUI();
    this.startExplore();

    this.scale.on('resize', this.handleResize, this);
  }

  private handleResize() {
    this.drawBackground();
    this.repositionElements();
  }

  private drawBackground() {
    if (this.bgGraphics) this.bgGraphics.destroy();
    this.bgGraphics = this.add.graphics();

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.bgGraphics.fillGradientStyle(0x2a1a0a, 0x2a1a0a, 0x1a0a2a, 0x1a0a2a, 1);
    this.bgGraphics.fillRect(0, 0, w, h);

    this.bgGraphics.lineStyle(1, 0x3a2a1a, 0.3);
    for (let x = 0; x < w; x += 48) {
      this.bgGraphics.lineBetween(x, 0, x, h);
    }
    for (let y = 0; y < h; y += 48) {
      this.bgGraphics.lineBetween(0, y, w, y);
    }

    this.drawTorchGlows(w, h);

    this.bgGraphics.fillStyle(0x1a0a0a, 0.6);
    this.bgGraphics.fillRect(0, h * 0.65, w, 4);
  }

  private drawTorchGlows(w: number, h: number) {
    this.torchGlows.forEach(t => t.destroy());
    this.torchGlows = [];

    const positions = [
      { x: 60, y: h * 0.25 },
      { x: w - 60, y: h * 0.25 },
      { x: w * 0.5, y: h * 0.12 },
    ];

    for (const pos of positions) {
      const glow = this.add.sprite(pos.x, pos.y, 'torch_glow')
        .setAlpha(0.4)
        .setDepth(1);
      this.torchGlows.push(glow);

      this.tweens.add({
        targets: glow,
        alpha: 0.2,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 1500 + Math.random() * 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private createPlayer() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const isNarrow = w < 768;

    if (isNarrow) {
      this.playerYBase = h * 0.5;
    } else {
      this.playerYBase = h * 0.4;
    }
    const playerX = isNarrow ? w * 0.5 : w * 0.2;

    this.playerSprite = this.add.sprite(playerX, this.playerYBase, 'player_sprite')
      .setScale(2)
      .setDepth(5);

    this.tweens.add({
      targets: this.playerSprite,
      y: this.playerYBase - 6,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createMonsterSprite() {
    if (!this.currentMonster) return;

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const isNarrow = w < 768;

    if (this.monsterIconContainer) {
      this.monsterIconContainer.destroy();
    }
    if (this.monsterParticles) {
      (this.monsterParticles as any).emitter?.stop();
      this.monsterParticles = null;
    }
    if (this.monsterOrbitParticles) {
      (this.monsterOrbitParticles as any).emitter?.stop();
      this.monsterOrbitParticles = null;
    }

    const iconSize = 180;
    const monsterAreaX = isNarrow ? w * 0.5 : w * 0.75;
    const monsterAreaY = isNarrow ? h * 0.28 : h * 0.38;
    this.monsterYBase = monsterAreaY;

    const textureKey = monsterGenerator.createMonsterTexture(this, this.currentMonster, iconSize);

    this.monsterIconContainer = this.add.container(monsterAreaX, monsterAreaY).setDepth(5);
    this.monsterIconContainer.setAlpha(0);

    const particleColor = parseInt(this.currentMonster.particleColor.replace('#', ''), 16);

    const haloG = this.make.graphics({ x: 0, y: 0, add: false });
    const haloSize = iconSize * 1.4;
    for (let i = 8; i >= 0; i--) {
      const r = (haloSize / 2) * (i / 8);
      const alpha = (1 - i / 8) * 0.25;
      haloG.fillStyle(particleColor, alpha);
      haloG.beginPath();
      haloG.arc(haloSize / 2, haloSize / 2, r, 0, Math.PI * 2, false);
      haloG.fill();
      haloG.closePath();
    }
    const haloKey = `halo_${this.currentMonster.id}`;
    haloG.generateTexture(haloKey, haloSize, haloSize);
    haloG.destroy();

    this.monsterHalo = this.add.sprite(0, 0, haloKey).setDepth(4);
    this.monsterIconContainer.add(this.monsterHalo);

    this.monsterIconSprite = this.add.sprite(0, 0, textureKey).setDepth(6);
    this.monsterIconContainer.add(this.monsterIconSprite);

    this.tweens.add({
      targets: this.monsterHalo,
      scaleX: 1.15,
      scaleY: 1.15,
      alpha: 0.7,
      duration: 2000 + Math.random() * 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: this.monsterIconContainer,
      alpha: 1,
      duration: 700,
      ease: 'Power2',
    });

    this.tweens.add({
      targets: this.monsterIconContainer,
      y: monsterAreaY - 8,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const particleKey = this.getParticleKeyForAffix(this.currentMonster.affixes[0]?.id);
    const emitter = this.add.particles(monsterAreaX, monsterAreaY + 40, particleKey, {
      speed: { min: 10, max: 50 },
      lifespan: { min: 500, max: 1100 },
      quantity: 2,
      frequency: 180,
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.7, end: 0 },
      tint: particleColor,
      blendMode: 'ADD',
      emitting: true,
    });
    emitter.setDepth(4);
    this.monsterParticles = emitter as unknown as Phaser.GameObjects.Particles.ParticleEmitter;

    this.createOrbitParticles(monsterAreaX, monsterAreaY, particleColor);
  }

  private createOrbitParticles(cx: number, cy: number, color: number) {
    if (!this.currentMonster) return;

    const orbitRadius = 95;
    const particles = this.add.particles(cx, cy, 'particle_dot', {
      lifespan: 2000,
      speed: { min: 0, max: 0 },
      quantity: 0,
      scale: { start: 0.3, end: 0.1 },
      alpha: { start: 0.6, end: 0 },
      tint: color,
      blendMode: 'ADD',
    });

    const count = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i;
      const px = cx + Math.cos(angle) * orbitRadius;
      const py = cy + Math.sin(angle) * orbitRadius;

      const p = particles.createEmitter({
        on: true,
        frequency: 300 + Math.random() * 400,
        quantity: 1,
        x: px,
        y: py,
        speed: { min: 5, max: 15 },
        scale: { start: 0.25, end: 0 },
        alpha: { start: 0.7, end: 0 },
        tint: color,
      });

      this.tweens.add({
        targets: p,
        x: px + Math.cos(angle + Math.PI * 2) * 10,
        y: py + Math.sin(angle + Math.PI * 2) * 10,
        duration: 3000 + Math.random() * 2000,
        repeat: -1,
        ease: 'Sine.easeInOut',
        yoyo: true,
      });
    }

    this.monsterOrbitParticles = particles as unknown as Phaser.GameObjects.Particles.ParticleEmitter;
  }

  private getParticleKeyForAffix(affixId?: string): string {
    const map: Record<string, string> = {
      fire: 'fire_particle',
      ice: 'ice_particle',
      thunder: 'particle_dot',
    };
    return map[affixId || ''] || 'particle_dot';
  }

  private createUI() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.drawBottomPanel(w, h);
    this.drawHpBars(w, h);
    this.createButtons(w, h);
    this.createNavButtons(w, h);
  }

  private drawBottomPanel(w: number, h: number) {
    if (this.bottomPanel) this.bottomPanel.destroy();
    this.bottomPanel = this.add.graphics();
    this.bottomPanel.fillStyle(0x0d0d0d, 0.85);
    this.bottomPanel.fillRect(0, h - 140, w, 140);
    this.bottomPanel.lineStyle(2, 0x3a2a1a, 0.8);
    this.bottomPanel.lineBetween(0, h - 140, w, h - 140);
    this.bottomPanel.setDepth(10);
  }

  private drawHpBars(w: number, h: number) {
    if (this.playerHpBar) this.playerHpBar.destroy();
    if (this.monsterHpBar) this.monsterHpBar.destroy();
    if (this.playerHpText) this.playerHpText.destroy();
    if (this.monsterHpText) this.monsterHpText.destroy();
    if (this.monsterNameText) this.monsterNameText.destroy();

    this.playerHpBar = this.add.graphics().setDepth(8);
    this.monsterHpBar = this.add.graphics().setDepth(8);

    const barWidth = 200;
    const barHeight = 18;
    const isNarrow = w < 768;

    const playerBarX = isNarrow ? w * 0.5 - barWidth / 2 : w * 0.1;
    const playerBarY = isNarrow ? h * 0.45 : h * 0.55;
    this.playerHpText = this.add.text(playerBarX + barWidth / 2, playerBarY - 22,
      `勇者  ${gameState.player.hp}/${gameState.player.maxHp}`, {
        fontSize: '13px', color: '#ffd700', fontFamily: 'monospace',
      }).setDepth(8).setOrigin(0.5);

    const monsterBarX = isNarrow ? w * 0.5 - barWidth / 2 : w * 0.65;
    const monsterBarY = isNarrow ? h * 0.42 : h * 0.55;
    this.monsterHpText = this.add.text(monsterBarX + barWidth / 2, monsterBarY + 22,
      this.currentMonster ? `${this.currentMonster.hp}/${this.currentMonster.maxHp}` : '???', {
        fontSize: '13px', color: '#ff4444', fontFamily: 'monospace',
      }).setDepth(8).setOrigin(0.5);
    this.monsterNameText = this.add.text(monsterBarX + barWidth / 2, monsterBarY + 40,
      this.currentMonster?.name || '???', {
        fontSize: '16px', color: '#ff8844', fontFamily: 'serif', stroke: '#000', strokeThickness: 2,
      }).setDepth(8).setOrigin(0.5);

    this.updateHpBars();
  }

  private updateHpBars() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const barWidth = 200;
    const barHeight = 18;
    const isNarrow = w < 768;

    const playerBarX = isNarrow ? w * 0.5 - barWidth / 2 : w * 0.1;
    const playerBarY = isNarrow ? h * 0.45 : h * 0.55;
    this.playerHpBar.clear();
    this.playerHpBar.fillStyle(0x333333, 0.8);
    this.playerHpBar.fillRoundedRect(playerBarX, playerBarY, barWidth, barHeight, 4);
    const playerRatio = gameState.player.hp / gameState.player.maxHp;
    const playerColor = playerRatio > 0.5 ? 0x44cc44 : playerRatio > 0.25 ? 0xccaa44 : 0xcc4444;
    this.playerHpBar.fillStyle(playerColor, 1);
    this.playerHpBar.fillRoundedRect(playerBarX, playerBarY, barWidth * playerRatio, barHeight, 4);
    this.playerHpText.setText(`勇者  ${gameState.player.hp}/${gameState.player.maxHp}`);

    if (this.currentMonster) {
      const monsterBarX = isNarrow ? w * 0.5 - barWidth / 2 : w * 0.65;
      const monsterBarY = isNarrow ? h * 0.42 : h * 0.55;
      this.monsterHpBar.clear();
      this.monsterHpBar.fillStyle(0x333333, 0.8);
      this.monsterHpBar.fillRoundedRect(monsterBarX, monsterBarY, barWidth, barHeight, 4);
      const monsterRatio = this.currentMonster.hp / this.currentMonster.maxHp;
      const gradientR = Math.round(255 * (1 - monsterRatio));
      const gradientColor = (gradientR << 16) | (Math.round(60 * monsterRatio) << 8);
      this.monsterHpBar.fillStyle(gradientColor, 1);
      this.monsterHpBar.fillRoundedRect(monsterBarX, monsterBarY, barWidth * monsterRatio, barHeight, 4);
      this.monsterHpText.setText(`${this.currentMonster.hp}/${this.currentMonster.maxHp}`);
      this.monsterNameText.setText(this.currentMonster.name);
    }
  }

  private createButtons(w: number, h: number) {
    if (this.attackBtn) this.attackBtn.destroy();

    const btnY = h - 70;
    const btnW = 140;
    const btnH = 44;

    const btnBg = this.add.rectangle(0, 0, btnW, btnH, 0x8b0000)
      .setStrokeStyle(2, 0xffd700)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add.text(0, 0, '⚔ 攻击', {
      fontSize: '18px', fontFamily: 'serif', color: '#ffd700',
    }).setOrigin(0.5);

    this.attackBtn = this.add.container(w * 0.5, btnY, [btnBg, btnText]).setDepth(15);

    btnBg.on('pointerover', () => btnBg.setFillStyle(0xaa2222));
    btnBg.on('pointerout', () => btnBg.setFillStyle(0x8b0000));
    btnBg.on('pointerdown', () => {
      if (!this.isAnimating && this.isPlayerTurn && this.battleActive) {
        this.performAttack();
      }
    });

    const ripple = this.add.circle(0, 0, 4, 0xff4444, 0.6).setDepth(16).setVisible(false);
    this.attackBtn.add(ripple);
    btnBg.on('pointerdown', () => {
      ripple.setPosition(0, 0).setVisible(true).setAlpha(0.6).setScale(1);
      this.tweens.add({
        targets: ripple,
        scaleX: 8, scaleY: 8, alpha: 0,
        duration: 200,
        onComplete: () => ripple.setVisible(false),
      });
    });
  }

  private createNavButtons(w: number, h: number) {
    if (this.forgeBtn) this.forgeBtn.destroy();
    if (this.codexBtn) this.codexBtn.destroy();
    if (this.exploreBtn) this.exploreBtn.destroy();

    const navY = h - 70;
    const smallW = 100;
    const smallH = 36;

    const makeNav = (x: number, label: string, color: number, callback: () => void) => {
      const bg = this.add.rectangle(0, 0, smallW, smallH, color)
        .setStrokeStyle(1, 0xffd700)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.text(0, 0, label, {
        fontSize: '13px', color: '#ffd700', fontFamily: 'serif',
      }).setOrigin(0.5);
      const container = this.add.container(x, navY, [bg, txt]).setDepth(15);
      bg.on('pointerover', () => bg.setFillStyle(color + 0x222222));
      bg.on('pointerout', () => bg.setFillStyle(color));
      bg.on('pointerdown', callback);
      return container;
    };

    this.exploreBtn = makeNav(w * 0.2, '🗺 探索', 0x2a2a4a, () => this.startExplore());
    this.forgeBtn = makeNav(w * 0.35, '🔨 锻造', 0x4a2a0a, () => this.scene.start('ForgeScene'));
    this.codexBtn = makeNav(w * 0.8, '📖 图鉴', 0x1a2a1a, () => this.scene.start('CodexScene'));
  }

  private startExplore() {
    if (this.battleActive) return;

    this.clearActionLog();
    this.addLogEntry('你向前探索地牢...');
    this.stepCounter++;

    if (this.stepCounter >= STEP_TRIGGER) {
      this.stepCounter = 0;
      this.triggerEncounter();
    } else {
      this.addLogEntry(`还需要 ${STEP_TRIGGER - this.stepCounter} 步遭遇怪物`);
      this.time.delayedCall(600, () => {
        const healAmt = Math.round(gameState.player.maxHp * 0.05);
        gameState.heal(healAmt);
        this.updateHpBars();
        this.addLogEntry(`探索中恢复了 ${healAmt} 点生命`);
      });
    }
  }

  private async triggerEncounter() {
    await gameState.refreshUnlocks();
    const monster = monsterGenerator.generateMonster(gameState.unlocks.unlockedAffixes);
    this.currentMonster = monster;
    this.battleActive = true;
    this.isPlayerTurn = true;

    this.addLogEntry(`遭遇了【${monster.name}】！`);

    this.createMonsterSprite();
    this.drawHpBars(this.cameras.main.width, this.cameras.main.height);

    const affixNames = monster.affixes.map(a => a.name).join('·');
    this.addLogEntry(`词条：${affixNames} | HP:${monster.hp} ATK:${monster.attack} DEF:${monster.defense}`);
  }

  private performAttack() {
    if (!this.currentMonster || this.isAnimating) return;
    this.isAnimating = true;

    const slash = this.add.sprite(
      this.monsterIconContainer.x,
      this.monsterIconContainer.y,
      'slash_effect'
    ).setDepth(20).setAlpha(0).setScale(2);

    this.tweens.add({
      targets: slash,
      alpha: { from: 0, to: 1 },
      angle: { from: -30, to: 30 },
      duration: 120,
      yoyo: true,
      onComplete: () => slash.destroy(),
    });

    this.cameras.main.shake(200, 0.005);

    const rawDmg = gameState.player.attack - Math.floor(this.currentMonster.defense * 0.5);
    const crit = Math.random() < (gameState.player.equippedWeapon?.critRate || 0.05);
    const damage = Math.max(1, crit ? Math.round(rawDmg * 1.5) : rawDmg);

    this.currentMonster.hp = Math.max(0, this.currentMonster.hp - damage);
    this.updateHpBars();

    const critText = crit ? ' 暴击！' : '';
    this.addLogEntry(`你对【${this.currentMonster.name}】造成 ${damage} 点伤害${critText}`);

    this.flashSprite(this.monsterIconSprite, 0xffffff);

    this.time.delayedCall(400, () => {
      if (this.currentMonster && this.currentMonster.hp <= 0) {
        this.onMonsterDefeated();
      } else {
        this.monsterTurn();
      }
    });
  }

  private monsterTurn() {
    if (!this.currentMonster) return;

    this.isPlayerTurn = false;

    const rawDmg = this.currentMonster.attack - Math.floor(gameState.player.defense * 0.4);
    const damage = Math.max(1, rawDmg + Math.floor(Math.random() * 5));

    gameState.takeDamage(damage);
    this.updateHpBars();

    this.addLogEntry(`【${this.currentMonster.name}】对你造成 ${damage} 点伤害`);
    this.flashSprite(this.playerSprite, 0xff0000);
    this.cameras.main.shake(150, 0.003);

    this.time.delayedCall(600, () => {
      if (gameState.player.hp <= 0) {
        this.onPlayerDefeated();
      } else {
        this.isPlayerTurn = true;
        this.isAnimating = false;
      }
    });
  }

  private flashSprite(sprite: Phaser.GameObjects.Sprite, color: number) {
    sprite.setTint(color);
    this.time.delayedCall(150, () => {
      sprite.clearTint();
    });
  }

  private onMonsterDefeated() {
    if (!this.currentMonster) return;

    this.battleActive = false;
    this.isAnimating = false;

    this.addLogEntry(`击败了【${this.currentMonster.name}】！`);

    if (this.monsterParticles) {
      (this.monsterParticles as any).emitter?.stop();
    }

    const drops = this.currentMonster.drops.slice(0, 1 + Math.floor(Math.random() * 3));
    const dropNames = drops.map(d => d.name).join('、');
    this.addLogEntry(`获得材料：${dropNames}`);
    gameState.addMaterials(drops);

    this.tweens.add({
      targets: this.monsterIconContainer,
      alpha: 0,
      scaleX: 0.4,
      scaleY: 0.4,
      y: this.monsterIconContainer.y + 30,
      duration: 600,
      ease: 'Power2',
    });

    if (this.monsterOrbitParticles) {
      (this.monsterOrbitParticles as any).emitter?.stop();
    }

    this.showDropAnimation(drops);

    axios.post('/api/collection/monster', {
      name: this.currentMonster.name,
      affixes: this.currentMonster.affixes.map(a => a.id),
      hp: this.currentMonster.maxHp,
      attack: this.currentMonster.attack,
      defense: this.currentMonster.defense,
      drops: this.currentMonster.drops,
    }).catch(() => {});

    gameState.heal(Math.round(gameState.player.maxHp * 0.15));
    this.updateHpBars();

    this.time.delayedCall(2000, () => {
      this.currentMonster = null;
      this.addLogEntry('继续探索地牢...');
    });
  }

  private showDropAnimation(drops: MaterialData[]) {
    this.dropItems.forEach(c => c.destroy());
    this.dropItems = [];

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    drops.forEach((drop, i) => {
      const icon = this.add.sprite(0, 0, 'material_icon').setTint(0xffd700).setScale(0.8);
      const label = this.add.text(0, 16, drop.name, {
        fontSize: '10px', color: '#ffd700', fontFamily: 'serif',
      }).setOrigin(0.5);

      const container = this.add.container(w * 0.5 + (i - (drops.length - 1) / 2) * 70, h * 0.65, [icon, label])
        .setDepth(20)
        .setAlpha(0);

      this.tweens.add({
        targets: container,
        alpha: 1,
        y: h * 0.6,
        duration: 400,
        delay: i * 200,
        ease: 'Back.easeOut',
      });

      this.tweens.add({
        targets: container,
        alpha: 0,
        y: h * 0.55,
        duration: 300,
        delay: 1500 + i * 200,
      });

      this.dropItems.push(container);
    });
  }

  private onPlayerDefeated() {
    this.battleActive = false;
    this.isAnimating = false;

    this.addLogEntry('你被击败了...');

    this.cameras.main.fadeOut(1000, 0, 0, 0);
    this.time.delayedCall(1500, () => {
      gameState.player.hp = gameState.player.maxHp;
      gameState.player.materials = [];
      this.currentMonster = null;
      this.cameras.main.fadeIn(500, 0, 0, 0);
      this.addLogEntry('你在地牢入口苏醒，材料已丢失...');
    });
  }

  private addLogEntry(text: string) {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const isNarrow = w < 768;

    const logX = isNarrow ? w * 0.5 : w * 0.5;
    const logY = isNarrow ? h * 0.72 : h * 0.35;

    const entry = this.add.text(logX, logY, text, {
      fontSize: '12px',
      color: '#ccbb99',
      fontFamily: 'serif',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(12).setAlpha(0);

    this.tweens.add({
      targets: entry,
      alpha: 1,
      duration: 200,
    });

    this.actionLog.push(entry);

    if (this.actionLog.length > 5) {
      const old = this.actionLog.shift()!;
      this.tweens.add({
        targets: old,
        alpha: 0,
        duration: 200,
        onComplete: () => old.destroy(),
      });
    }

    this.actionLog.forEach((e, i) => {
      this.tweens.add({
        targets: e,
        y: logY - (this.actionLog.length - 1 - i) * 18,
        duration: 150,
      });
    });
  }

  private clearActionLog() {
    for (const entry of this.actionLog) {
      entry.destroy();
    }
    this.actionLog = [];
  }

  private repositionElements() {
    this.drawBottomPanel(this.cameras.main.width, this.cameras.main.height);
    this.drawHpBars(this.cameras.main.width, this.cameras.main.height);
    this.createButtons(this.cameras.main.width, this.cameras.main.height);
    this.createNavButtons(this.cameras.main.width, this.cameras.main.height);
  }
}
