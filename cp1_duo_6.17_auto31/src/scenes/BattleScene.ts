import Phaser from 'phaser';
import { monsterGenerator } from '../managers/MonsterGenerator';
import { gameState } from '../store/GameState';
import { MonsterData, MaterialData, SkillState, SkillData } from '../models/TypeDefinitions';
import { skillManager } from '../managers/SkillManager';
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
  private skillStates: SkillState[] = [];
  private skillButtons: Phaser.GameObjects.Container[] = [];
  private skillPanel!: Phaser.GameObjects.Graphics;
  private monsterShield: number = 0;
  private playerShield: number = 0;
  private monsterArmorBreak: number = 0;
  private playerArmorBreak: number = 0;
  private monsterBurnTurns: number = 0;
  private monsterBurnDamage: number = 0;
  private monsterStunTurns: number = 0;
  private damageNumberPool: Phaser.GameObjects.Text[] = [];
  private showSkills: boolean = false;

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
    this.createSkillPanel(w, h);
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

  private createSkillPanel(w: number, h: number) {
    if (this.skillPanel) this.skillPanel.destroy();
    this.skillButtons.forEach(b => b.destroy());
    this.skillButtons = [];

    const panelX = 20;
    const panelY = h - 130;
    const panelW = 60;
    const panelH = 110;

    this.skillPanel = this.add.graphics().setDepth(12);
    this.skillPanel.fillStyle(0x0d0d0d, 0.9);
    this.skillPanel.fillRoundedRect(panelX, panelY, panelW, panelH, 8);
    this.skillPanel.lineStyle(2, 0xffd700, 0.6);
    this.skillPanel.strokeRoundedRect(panelX, panelY, panelW, panelH, 8);

    const toggleBtn = this.add.rectangle(panelX + panelW / 2, panelY + 22, 48, 32, 0x2a2a4a)
      .setStrokeStyle(1, 0xffd700)
      .setInteractive({ useHandCursor: true })
      .setDepth(13);

    const toggleText = this.add.text(panelX + panelW / 2, panelY + 22, '技能', {
      fontSize: '13px', color: '#ffd700', fontFamily: 'serif',
    }).setOrigin(0.5).setDepth(13);

    toggleBtn.on('pointerover', () => toggleBtn.setFillStyle(0x3a3a6a));
    toggleBtn.on('pointerout', () => toggleBtn.setFillStyle(0x2a2a4a));
    toggleBtn.on('pointerdown', () => this.toggleSkillPanel());

    const skillBtnSize = 48;
    const skillStartY = panelY + 60;
    const skillSpacing = 55;

    for (let i = 0; i < 3; i++) {
      const skillY = skillStartY + i * skillSpacing;
      const skillX = panelX + panelW / 2;

      const container = this.add.container(skillX, skillY).setDepth(13);

      const bgCircle = this.add.circle(0, 0, skillBtnSize / 2, 0x222222)
        .setStrokeStyle(2, 0xffd700, 0.5);
      container.add(bgCircle);

      const iconText = this.add.text(0, -2, '?', {
        fontSize: '22px', color: '#ffffff', fontFamily: 'serif',
      }).setOrigin(0.5);
      container.add(iconText);

      const nameText = this.add.text(0, skillBtnSize / 2 + 8, '', {
        fontSize: '10px', color: '#cccccc', fontFamily: 'serif',
      }).setOrigin(0.5);
      container.add(nameText);

      const cooldownMask = this.add.circle(0, 0, skillBtnSize / 2, 0x000000, 0.7);
      cooldownMask.setVisible(false);
      container.add(cooldownMask);

      const cooldownText = this.add.text(0, 0, '', {
        fontSize: '20px', color: '#ffffff', fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(1);
      cooldownText.setVisible(false);
      container.add(cooldownText);

      container.setData('bgCircle', bgCircle);
      container.setData('iconText', iconText);
      container.setData('nameText', nameText);
      container.setData('cooldownMask', cooldownMask);
      container.setData('cooldownText', cooldownText);
      container.setData('index', i);

      bgCircle.setInteractive({ useHandCursor: true });
      bgCircle.on('pointerover', () => {
        const state = this.skillStates[i];
        if (state && state.currentCooldown === 0 && this.battleActive && this.isPlayerTurn && !this.isAnimating) {
          bgCircle.setStrokeStyle(3, 0xffffff, 1);
          bgCircle.setScale(1.1);
        }
      });
      bgCircle.on('pointerout', () => {
        bgCircle.setStrokeStyle(2, 0xffd700, 0.5);
        bgCircle.setScale(1);
      });
      bgCircle.on('pointerdown', () => {
        if (this.battleActive && this.isPlayerTurn && !this.isAnimating) {
          this.useSkill(i);
        }
      });

      this.skillButtons.push(container);
    }

    this.refreshSkillButtons();
    this.updateSkillPanelVisibility();
  }

  private toggleSkillPanel() {
    this.showSkills = !this.showSkills;
    this.updateSkillPanelVisibility();
  }

  private updateSkillPanelVisibility() {
    this.skillButtons.forEach((btn, i) => {
      const visible = this.showSkills && i < this.skillStates.length;
      btn.setVisible(visible);
    });
  }

  private refreshSkillButtons() {
    this.skillButtons.forEach((btn, i) => {
      const state = this.skillStates[i];
      const bgCircle = btn.get('bgCircle') as Phaser.GameObjects.Arc;
      const iconText = btn.get('iconText') as Phaser.GameObjects.Text;
      const nameText = btn.get('nameText') as Phaser.GameObjects.Text;
      const cooldownMask = btn.get('cooldownMask') as Phaser.GameObjects.Arc;
      const cooldownText = btn.get('cooldownText') as Phaser.GameObjects.Text;

      if (state) {
        const color = parseInt(state.skill.iconColor.replace('#', ''), 16);
        bgCircle.fillColor = color;
        iconText.setText(state.skill.iconSymbol);
        nameText.setText(state.skill.name);

        if (state.currentCooldown > 0) {
          cooldownMask.setVisible(true);
          cooldownText.setVisible(true);
          cooldownText.setText(String(state.currentCooldown));
        } else {
          cooldownMask.setVisible(false);
          cooldownText.setVisible(false);
        }
      } else {
        bgCircle.fillColor = 0x222222;
        iconText.setText('?');
        nameText.setText('');
        cooldownMask.setVisible(false);
        cooldownText.setVisible(false);
      }
    });
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

    this.monsterShield = 0;
    this.playerShield = 0;
    this.monsterArmorBreak = 0;
    this.playerArmorBreak = 0;
    this.monsterBurnTurns = 0;
    this.monsterBurnDamage = 0;
    this.monsterStunTurns = 0;

    const randomSkills = skillManager.getRandomSkills(3);
    this.skillStates = skillManager.createSkillStates(randomSkills);
    this.refreshSkillButtons();
    this.showSkills = true;
    this.updateSkillPanelVisibility();

    this.addLogEntry(`遭遇了【${monster.name}】！`);

    this.createMonsterSprite();
    this.drawHpBars(this.cameras.main.width, this.cameras.main.height);

    const affixNames = monster.affixes.map(a => a.name).join('·');
    this.addLogEntry(`词条：${affixNames} | HP:${monster.hp} ATK:${monster.attack} DEF:${monster.defense}`);

    const skillNames = this.skillStates.map(s => s.skill.name).join('、');
    this.addLogEntry(`可用技能：${skillNames}`);
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

    const rawDmg = gameState.player.attack - Math.floor(this.currentMonster.defense * (1 - this.monsterArmorBreak) * 0.5);
    const crit = Math.random() < (gameState.player.equippedWeapon?.critRate || 0.05);
    let damage = Math.max(1, crit ? Math.round(rawDmg * 1.5) : rawDmg);

    if (this.monsterShield > 0) {
      const shieldAbsorb = Math.min(this.monsterShield, damage);
      this.monsterShield -= shieldAbsorb;
      damage -= shieldAbsorb;
      if (damage < 0) damage = 0;
    }

    this.currentMonster.hp = Math.max(0, this.currentMonster.hp - damage);
    this.updateHpBars();

    if (damage > 0) {
      this.showDamageNumber(this.monsterIconContainer.x, this.monsterIconContainer.y - 20, damage, crit);
    }

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

  private useSkill(index: number) {
    if (!this.currentMonster || this.isAnimating || !this.isPlayerTurn) return;

    const state = this.skillStates[index];
    if (!state || state.currentCooldown > 0) return;

    this.isAnimating = true;
    const skill = state.skill;
    let endsTurn = true;

    this.addLogEntry(`使用技能【${skill.name}】！`);

    switch (skill.effectType) {
      case 'damage': {
        const rawDmg = gameState.player.attack * skill.damageMultiplier - Math.floor(this.currentMonster.defense * (1 - this.monsterArmorBreak) * 0.5);
        const crit = Math.random() < (gameState.player.equippedWeapon?.critRate || 0.05);
        let damage = Math.max(1, crit ? Math.round(rawDmg * 1.5) : Math.round(rawDmg));

        if (this.monsterShield > 0) {
          const shieldAbsorb = Math.min(this.monsterShield, damage);
          this.monsterShield -= shieldAbsorb;
          damage -= shieldAbsorb;
          if (damage < 0) damage = 0;
        }

        this.currentMonster.hp = Math.max(0, this.currentMonster.hp - damage);
        this.showDamageNumber(this.monsterIconContainer.x, this.monsterIconContainer.y - 20, damage, crit);
        this.flashSprite(this.monsterIconSprite, parseInt(skill.iconColor.replace('#', ''), 16));
        this.addLogEntry(`对【${this.currentMonster.name}】造成 ${damage} 点伤害`);

        if (skill.healPercent > 0) {
          const healAmt = Math.round(damage * skill.healPercent);
          gameState.heal(healAmt);
          this.showDamageNumber(this.playerSprite.x, this.playerSprite.y - 20, healAmt, false, true);
          this.addLogEntry(`恢复了 ${healAmt} 点生命`);
        }

        if (skill.armorBreakPercent < 0) {
          this.playerArmorBreak = Math.min(0.5, this.playerArmorBreak + Math.abs(skill.armorBreakPercent));
          this.addLogEntry(`自身防御降低 ${Math.round(Math.abs(skill.armorBreakPercent) * 100)}%`);
        }

        this.playSkillEffect(this.monsterIconContainer.x, this.monsterIconContainer.y, skill.iconColor, 'slash');
        this.cameras.main.shake(250, 0.008);
        break;
      }
      case 'heal': {
        const healAmt = Math.round(gameState.player.maxHp * skill.healPercent);
        gameState.heal(healAmt);
        this.showDamageNumber(this.playerSprite.x, this.playerSprite.y - 20, healAmt, false, true);
        this.addLogEntry(`恢复了 ${healAmt} 点生命`);
        this.playSkillEffect(this.playerSprite.x, this.playerSprite.y, skill.iconColor, 'heal');
        endsTurn = false;
        break;
      }
      case 'armorBreak': {
        const rawDmg = gameState.player.attack * skill.damageMultiplier - Math.floor(this.currentMonster.defense * (1 - this.monsterArmorBreak) * 0.5);
        let damage = Math.max(1, Math.round(rawDmg));

        if (this.monsterShield > 0) {
          const shieldAbsorb = Math.min(this.monsterShield, damage);
          this.monsterShield -= shieldAbsorb;
          damage -= shieldAbsorb;
          if (damage < 0) damage = 0;
        }

        this.currentMonster.hp = Math.max(0, this.currentMonster.hp - damage);
        this.monsterArmorBreak = Math.min(0.8, this.monsterArmorBreak + skill.armorBreakPercent);
        this.showDamageNumber(this.monsterIconContainer.x, this.monsterIconContainer.y - 20, damage, false);
        this.flashSprite(this.monsterIconSprite, parseInt(skill.iconColor.replace('#', ''), 16));
        this.addLogEntry(`对【${this.currentMonster.name}】造成 ${damage} 点伤害，防御降低 ${Math.round(skill.armorBreakPercent * 100)}%`);
        this.playSkillEffect(this.monsterIconContainer.x, this.monsterIconContainer.y, skill.iconColor, 'armorBreak');
        this.cameras.main.shake(200, 0.006);
        break;
      }
      case 'stun': {
        const rawDmg = gameState.player.attack * skill.damageMultiplier - Math.floor(this.currentMonster.defense * (1 - this.monsterArmorBreak) * 0.5);
        let damage = Math.max(1, Math.round(rawDmg));

        if (this.monsterShield > 0) {
          const shieldAbsorb = Math.min(this.monsterShield, damage);
          this.monsterShield -= shieldAbsorb;
          damage -= shieldAbsorb;
          if (damage < 0) damage = 0;
        }

        this.currentMonster.hp = Math.max(0, this.currentMonster.hp - damage);
        this.monsterStunTurns = Math.max(this.monsterStunTurns, skill.stunDuration);
        this.showDamageNumber(this.monsterIconContainer.x, this.monsterIconContainer.y - 20, damage, false);
        this.flashSprite(this.monsterIconSprite, parseInt(skill.iconColor.replace('#', ''), 16));
        this.addLogEntry(`对【${this.currentMonster.name}】造成 ${damage} 点伤害，眩晕 ${skill.stunDuration} 回合`);
        this.playSkillEffect(this.monsterIconContainer.x, this.monsterIconContainer.y, skill.iconColor, 'stun');
        this.cameras.main.shake(300, 0.01);
        break;
      }
      case 'burn': {
        const rawDmg = gameState.player.attack * skill.damageMultiplier - Math.floor(this.currentMonster.defense * (1 - this.monsterArmorBreak) * 0.5);
        let damage = Math.max(1, Math.round(rawDmg));

        if (this.monsterShield > 0) {
          const shieldAbsorb = Math.min(this.monsterShield, damage);
          this.monsterShield -= shieldAbsorb;
          damage -= shieldAbsorb;
          if (damage < 0) damage = 0;
        }

        this.currentMonster.hp = Math.max(0, this.currentMonster.hp - damage);
        this.monsterBurnTurns = Math.max(this.monsterBurnTurns, skill.burnDuration);
        this.monsterBurnDamage = Math.max(this.monsterBurnDamage, skill.burnDamage);
        this.showDamageNumber(this.monsterIconContainer.x, this.monsterIconContainer.y - 20, damage, false);
        this.flashSprite(this.monsterIconSprite, parseInt(skill.iconColor.replace('#', ''), 16));
        this.addLogEntry(`对【${this.currentMonster.name}】造成 ${damage} 点伤害，灼烧 ${skill.burnDuration} 回合`);
        this.playSkillEffect(this.monsterIconContainer.x, this.monsterIconContainer.y, skill.iconColor, 'burn');
        this.cameras.main.shake(200, 0.006);
        break;
      }
      case 'shield': {
        this.playerShield += skill.shieldAmount;
        this.addLogEntry(`获得 ${skill.shieldAmount} 点护盾`);
        this.playSkillEffect(this.playerSprite.x, this.playerSprite.y, skill.iconColor, 'shield');
        endsTurn = false;
        break;
      }
    }

    state.currentCooldown = skill.cooldown;
    this.refreshSkillButtons();
    this.updateHpBars();

    const delay = endsTurn ? 600 : 300;
    this.time.delayedCall(delay, () => {
      if (this.currentMonster && this.currentMonster.hp <= 0) {
        this.onMonsterDefeated();
      } else if (endsTurn) {
        this.monsterTurn();
      } else {
        this.isAnimating = false;
      }
    });
  }

  private playSkillEffect(x: number, y: number, colorHex: string, type: string) {
    const color = parseInt(colorHex.replace('#', ''), 16);

    if (type === 'heal') {
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        const dist = 30;
        const particle = this.add.circle(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, 6, color, 0.8).setDepth(22);
        this.tweens.add({
          targets: particle,
          x: x,
          y: y,
          alpha: 0,
          scale: 0.5,
          duration: 500,
          ease: 'Cubic.Out',
          onComplete: () => particle.destroy(),
        });
      }
    } else if (type === 'shield') {
      const shieldRing = this.add.circle(x, y, 50, color, 0.2).setStrokeStyle(3, color, 0.8).setDepth(22);
      this.tweens.add({
        targets: shieldRing,
        scale: { from: 0.3, to: 1.2 },
        alpha: { from: 1, to: 0 },
        duration: 600,
        ease: 'Cubic.Out',
        onComplete: () => shieldRing.destroy(),
      });
    } else if (type === 'burn') {
      for (let i = 0; i < 12; i++) {
        const particle = this.add.circle(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40, 4 + Math.random() * 4, color, 0.9).setDepth(22);
        this.tweens.add({
          targets: particle,
          y: y - 60 - Math.random() * 30,
          alpha: 0,
          scale: 0.3,
          duration: 600 + Math.random() * 300,
          ease: 'Cubic.Out',
          onComplete: () => particle.destroy(),
        });
      }
    } else if (type === 'stun') {
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 / 6) * i;
        const particle = this.add.circle(x + Math.cos(angle) * 40, y + Math.sin(angle) * 20, 5, color, 0.9).setDepth(22);
        this.tweens.add({
          targets: particle,
          y: y - 40,
          x: x + Math.cos(angle + 0.5) * 30,
          alpha: 0,
          duration: 500,
          ease: 'Cubic.Out',
          onComplete: () => particle.destroy(),
        });
      }
    } else if (type === 'armorBreak') {
      for (let i = 0; i < 6; i++) {
        const particle = this.add.rectangle(x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 40, 8, 3, color, 0.8).setDepth(22);
        const angle = Math.random() * Math.PI;
        particle.setRotation(angle);
        this.tweens.add({
          targets: particle,
          x: x + Math.cos(angle) * 50,
          y: y + Math.sin(angle) * 50,
          alpha: 0,
          duration: 500,
          ease: 'Cubic.Out',
          onComplete: () => particle.destroy(),
        });
      }
    } else {
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        const particle = this.add.circle(x, y, 5, color, 0.8).setDepth(22);
        this.tweens.add({
          targets: particle,
          x: x + Math.cos(angle) * 50,
          y: y + Math.sin(angle) * 50,
          alpha: 0,
          scale: 0.3,
          duration: 400,
          ease: 'Cubic.Out',
          onComplete: () => particle.destroy(),
        });
      }
    }
  }

  private monsterTurn() {
    if (!this.currentMonster) return;

    this.isPlayerTurn = false;

    if (this.monsterBurnTurns > 0) {
      const burnDmg = this.monsterBurnDamage;
      this.currentMonster.hp = Math.max(0, this.currentMonster.hp - burnDmg);
      this.monsterBurnTurns--;
      this.showDamageNumber(this.monsterIconContainer.x, this.monsterIconContainer.y - 10, burnDmg, false);
      this.addLogEntry(`【${this.currentMonster.name}】受到灼烧伤害 ${burnDmg} 点`);
      this.flashSprite(this.monsterIconSprite, 0xff6600);
      this.updateHpBars();

      if (this.currentMonster.hp <= 0) {
        this.time.delayedCall(400, () => this.onMonsterDefeated());
        return;
      }
    }

    if (this.monsterStunTurns > 0) {
      this.monsterStunTurns--;
      this.addLogEntry(`【${this.currentMonster.name}】被眩晕，无法行动！`);
      this.flashSprite(this.monsterIconSprite, 0xffff44);

      this.time.delayedCall(500, () => {
        this.endMonsterTurn();
      });
      return;
    }

    const monsterStartX = this.monsterIconContainer.x;
    const dashTargetX = this.playerSprite.x + 60;

    const dashParticles = this.add.particles(this.monsterIconContainer.x, this.monsterIconContainer.y, 'particle_dot', {
      speed: { min: 50, max: 150 },
      angle: { min: 160, max: 200 },
      lifespan: 400,
      quantity: 3,
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.8, end: 0 },
      tint: 0xff4444,
      blendMode: 'ADD',
      emitting: false,
    }).setDepth(4);

    this.tweens.add({
      targets: this.monsterIconContainer,
      x: dashTargetX,
      duration: 200,
      ease: 'Cubic.In',
      onStart: () => {
        dashParticles.start();
      },
      onComplete: () => {
        dashParticles.stop();

        const impactParticles = this.add.particles(this.playerSprite.x, this.playerSprite.y, 'particle_dot', {
          speed: { min: 80, max: 200 },
          angle: { min: 0, max: 360 },
          lifespan: 500,
          quantity: 15,
          scale: { start: 0.8, end: 0 },
          alpha: { start: 1, end: 0 },
          tint: 0xff6644,
          blendMode: 'ADD',
          emitting: false,
        }).setDepth(20);
        impactParticles.explode(15, this.playerSprite.x, this.playerSprite.y);
        this.time.delayedCall(500, () => impactParticles.destroy());

        this.cameras.main.shake(300, 0.012);

        const rawDmg = this.currentMonster.attack - Math.floor(gameState.player.defense * (1 - this.playerArmorBreak) * 0.4);
        let damage = Math.max(1, rawDmg + Math.floor(Math.random() * 5));

        if (this.playerShield > 0) {
          const shieldAbsorb = Math.min(this.playerShield, damage);
          this.playerShield -= shieldAbsorb;
          damage -= shieldAbsorb;
          if (damage < 0) damage = 0;
          this.addLogEntry(`护盾抵消了 ${shieldAbsorb} 点伤害`);
        }

        if (damage > 0) {
          gameState.takeDamage(damage);
          this.showDamageNumber(this.playerSprite.x, this.playerSprite.y - 20, damage, false);
          this.addLogEntry(`【${this.currentMonster.name}】对你造成 ${damage} 点伤害`);
          this.flashSprite(this.playerSprite, 0xff0000);
        }
        this.updateHpBars();

        this.tweens.add({
          targets: this.monsterIconContainer,
          x: monsterStartX,
          duration: 250,
          ease: 'Cubic.Out',
          onComplete: () => {
            if (gameState.player.hp <= 0) {
              this.onPlayerDefeated();
            } else {
              this.endMonsterTurn();
            }
          },
        });
      },
    });
  }

  private endMonsterTurn() {
    skillManager.reduceCooldowns(this.skillStates);
    this.refreshSkillButtons();

    this.isPlayerTurn = true;
    this.isAnimating = false;
  }

  private flashSprite(sprite: Phaser.GameObjects.Sprite, color: number) {
    sprite.setTint(color);
    this.time.delayedCall(150, () => {
      sprite.clearTint();
    });
  }

  private showDamageNumber(x: number, y: number, damage: number, isCrit: boolean, isHeal?: boolean) {
    let text = this.damageNumberPool.find(t => !t.active);
    if (!text) {
      text = this.add.text(x, y, '', {
        fontSize: '18px',
        fontFamily: 'monospace',
        fontStyle: 'bold',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(25);
      this.damageNumberPool.push(text);
    } else {
      text.setPosition(x, y).setActive(true).setVisible(true);
    }

    const displayValue = isHeal ? `+${damage}` : `-${damage}`;
    text.setText(displayValue);

    if (isHeal) {
      text.setColor('#44ff44');
      text.setFontSize('18px');
    } else if (isCrit) {
      text.setColor('#ffdd44');
      text.setFontSize('28px');
    } else {
      text.setColor('#ffffff');
      text.setFontSize('18px');
    }

    text.setAlpha(1);
    text.setScale(isCrit ? 1.5 : 1);

    this.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.Out',
      onComplete: () => {
        text.setActive(false).setVisible(false);
      },
    });

    if (isCrit) {
      this.tweens.add({
        targets: text,
        scaleX: { from: 0.5, to: 1.2 },
        scaleY: { from: 0.5, to: 1.2 },
        duration: 200,
        ease: 'Back.Out',
      });
    }
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
    this.createSkillPanel(this.cameras.main.width, this.cameras.main.height);
  }
}
