import Phaser from 'phaser';

const TURN_TIME_LIMIT = 2000;

function getHpColor(percent: number): number {
  const clamped = Math.max(0, Math.min(1, percent));
  let r: number, g: number, b: number;
  if (clamped >= 0.5) {
    const t = (clamped - 0.5) * 2;
    r = Math.round(255 * (1 - t));
    g = 255;
    b = 0;
  } else {
    const t = clamped * 2;
    r = 255;
    g = Math.round(255 * t);
    b = 0;
  }
  return (r << 16) | (g << 8) | b;
}

interface BattleData {
  playerHp: number;
  playerMaxHp: number;
  playerAttack: number;
  monsterHp: number;
  monsterMaxHp: number;
  monsterAttack: number;
  monsterIndex: number;
}

type BattlePhase = 'player_turn' | 'player_attack' | 'enemy_turn' | 'enemy_attack' | 'battle_end';

export class BattleScene extends Phaser.Scene {
  private battleData!: BattleData;
  private playerHp = 0;
  private playerMaxHp = 0;
  private playerAttack = 0;
  private monsterHp = 0;
  private monsterMaxHp = 0;
  private monsterAttack = 0;
  private monsterIndex = -1;

  private phase: BattlePhase = 'player_turn';
  private playerDefending = false;

  private playerSprite!: Phaser.GameObjects.Container;
  private monsterSprite!: Phaser.GameObjects.Container;
  private playerHpBar!: Phaser.GameObjects.Rectangle;
  private monsterHpBar!: Phaser.GameObjects.Rectangle;
  private playerHpText!: Phaser.GameObjects.Text;
  private monsterHpText!: Phaser.GameObjects.Text;
  private actionMenu!: Phaser.GameObjects.Container;
  private battleLog!: Phaser.GameObjects.Text;
  private turnIndicator!: Phaser.GameObjects.Text;

  private fadeOverlay!: Phaser.GameObjects.Rectangle;

  private turnTimer: Phaser.Time.TimerEvent | null = null;
  private turnTimerBar!: Phaser.GameObjects.Rectangle;
  private turnTimerBg!: Phaser.GameObjects.Rectangle;
  private turnTimerText!: Phaser.GameObjects.Text;
  private turnStartTime = 0;

  constructor() {
    super('BattleScene');
  }

  init(data: BattleData): void {
    this.battleData = data;
    this.playerHp = data.playerHp;
    this.playerMaxHp = data.playerMaxHp;
    this.playerAttack = data.playerAttack;
    this.monsterHp = data.monsterHp;
    this.monsterMaxHp = data.monsterMaxHp;
    this.monsterAttack = data.monsterAttack;
    this.monsterIndex = data.monsterIndex;
    this.phase = 'player_turn';
    this.playerDefending = false;
    this.turnTimer = null;
    this.turnStartTime = 0;
  }

  create(): void {
    const { width, height } = this.scale;

    this.fadeOverlay = this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x000000,
      1
    );
    this.fadeOverlay.setDepth(1000);

    this.tweens.add({
      targets: this.fadeOverlay,
      alpha: 0,
      duration: 300,
      ease: 'Linear',
      onComplete: () => {
        this.fadeOverlay.setVisible(false);
      }
    });

    this.createBattleBackground();

    this.createMonsterSprite();
    this.createPlayerSprite();

    this.createHPBars();
    this.createTurnTimer();
    this.createActionMenu();
    this.createBattleLog();

    this.updateHpBars();
    this.setPhase('player_turn');
  }

  private createBattleBackground(): void {
    const { width, height } = this.scale;

    const bg = this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x1a0a2e
    );

    const gradient = this.add.graphics();
    gradient.fillGradientStyle(
      0x2a0a3e,
      0x2a0a3e,
      0x120220,
      0x120220,
      1
    );
    gradient.fillRect(0, 0, width, height);

    for (let i = 0; i < 30; i++) {
      const star = this.add.circle(
        Math.random() * width,
        Math.random() * height * 0.6,
        Math.random() * 2 + 1,
        0x39ff14,
        Math.random() * 0.5 + 0.2
      );
    }

    const ground = this.add.rectangle(
      width / 2,
      height - 80,
      width,
      160,
      0x2d1840
    );
    ground.setStrokeStyle(4, 0x4a2860);

    const groundLines = this.add.graphics();
    groundLines.lineStyle(2, 0x3d1252, 0.5);
    for (let i = 0; i < 8; i++) {
      const y = height - 140 + i * 20;
      groundLines.beginPath();
      groundLines.moveTo(0, y);
      groundLines.lineTo(width, y);
      groundLines.strokePath();
    }
  }

  private createPlayerSprite(): void {
    const { width, height } = this.scale;
    const x = width / 4;
    const y = height / 2 - 40;

    this.playerSprite = this.add.container(x, y);

    const body = this.add.rectangle(0, 20, 60, 80, 0x4169e1);
    body.setStrokeStyle(4, 0x1e90ff);
    this.playerSprite.add(body);

    const head = this.add.rectangle(0, -40, 45, 40, 0xffdbac);
    head.setStrokeStyle(4, 0x8b7355);
    this.playerSprite.add(head);

    const hair = this.add.rectangle(0, -60, 50, 18, 0x4a2511);
    hair.setStrokeStyle(2, 0x2d1810);
    this.playerSprite.add(hair);

    const eye1 = this.add.rectangle(-12, -40, 8, 10, 0xffffff);
    const eye2 = this.add.rectangle(12, -40, 8, 10, 0xffffff);
    this.playerSprite.add([eye1, eye2]);

    const pupil1 = this.add.rectangle(-12, -38, 4, 6, 0x000000);
    const pupil2 = this.add.rectangle(12, -38, 4, 6, 0x000000);
    this.playerSprite.add([pupil1, pupil2]);

    const mouth = this.add.rectangle(0, -20, 16, 4, 0x8b4513);
    this.playerSprite.add(mouth);

    const armorPlate = this.add.rectangle(0, 10, 40, 30, 0x2f4f8f);
    armorPlate.setStrokeStyle(3, 0x1e90ff);
    this.playerSprite.add(armorPlate);

    const shield = this.add.rectangle(-45, 20, 25, 50, 0x8b0000);
    shield.setStrokeStyle(4, 0xffd700);
    this.playerSprite.add(shield);

    const shieldEmblem = this.add.rectangle(-45, 20, 12, 20, 0xffd700);
    this.playerSprite.add(shieldEmblem);

    const swordBlade = this.add.rectangle(48, -20, 10, 80, 0xc0c0c0);
    swordBlade.setStrokeStyle(2, 0x808080);
    this.playerSprite.add(swordBlade);

    const swordHilt = this.add.rectangle(48, 28, 24, 10, 0x8b4513);
    this.playerSprite.add(swordHilt);

    const swordGuard = this.add.rectangle(48, 22, 30, 6, 0xffd700);
    this.playerSprite.add(swordGuard);

    const leg1 = this.add.rectangle(-18, 75, 18, 40, 0x2f2f4f);
    const leg2 = this.add.rectangle(18, 75, 18, 40, 0x2f2f4f);
    this.playerSprite.add([leg1, leg2]);

    const boot1 = this.add.rectangle(-18, 100, 22, 12, 0x3d1252);
    const boot2 = this.add.rectangle(18, 100, 22, 12, 0x3d1252);
    this.playerSprite.add([boot1, boot2]);
  }

  private createMonsterSprite(): void {
    const { width, height } = this.scale;
    const x = (width * 3) / 4;
    const y = height / 2 - 30;

    this.monsterSprite = this.add.container(x, y);

    const body = this.add.rectangle(0, 20, 80, 90, 0x8b0000);
    body.setStrokeStyle(4, 0xff4444);
    this.monsterSprite.add(body);

    const belly = this.add.rectangle(0, 30, 50, 50, 0x5c0000);
    this.monsterSprite.add(belly);

    const head = this.add.rectangle(0, -45, 60, 50, 0x8b0000);
    head.setStrokeStyle(4, 0xff4444);
    this.monsterSprite.add(head);

    const horn1 = this.add.rectangle(-25, -78, 12, 28, 0x2f0000);
    const horn2 = this.add.rectangle(25, -78, 12, 28, 0x2f0000);
    this.monsterSprite.add([horn1, horn2]);

    const eye1 = this.add.rectangle(-18, -45, 14, 14, 0xffff00);
    const eye2 = this.add.rectangle(18, -45, 14, 14, 0xffff00);
    this.monsterSprite.add([eye1, eye2]);

    const pupil1 = this.add.rectangle(-18, -45, 6, 8, 0x000000);
    const pupil2 = this.add.rectangle(18, -45, 6, 8, 0x000000);
    this.monsterSprite.add([pupil1, pupil2]);

    const mouth = this.add.rectangle(0, -20, 36, 14, 0x000000);
    this.monsterSprite.add(mouth);

    const tooth1 = this.add.rectangle(-10, -16, 6, 10, 0xffffff);
    const tooth2 = this.add.rectangle(10, -16, 6, 10, 0xffffff);
    this.monsterSprite.add([tooth1, tooth2]);

    const arm1 = this.add.rectangle(-55, 10, 20, 60, 0x8b0000);
    arm1.setStrokeStyle(3, 0xff4444);
    const arm2 = this.add.rectangle(55, 10, 20, 60, 0x8b0000);
    arm2.setStrokeStyle(3, 0xff4444);
    this.monsterSprite.add([arm1, arm2]);

    const claw1 = this.add.rectangle(-55, 50, 24, 14, 0x2f0000);
    const claw2 = this.add.rectangle(55, 50, 24, 14, 0x2f0000);
    this.monsterSprite.add([claw1, claw2]);

    const leg1 = this.add.rectangle(-25, 80, 24, 50, 0x8b0000);
    const leg2 = this.add.rectangle(25, 80, 24, 50, 0x8b0000);
    this.monsterSprite.add([leg1, leg2]);

    const foot1 = this.add.rectangle(-25, 108, 32, 14, 0x2f0000);
    const foot2 = this.add.rectangle(25, 108, 32, 14, 0x2f0000);
    this.monsterSprite.add([foot1, foot2]);
  }

  private createHPBars(): void {
    const { width } = this.scale;

    const playerHpBg = this.add.rectangle(
      width / 4,
      80,
      200,
      40,
      0x1a0528
    );
    playerHpBg.setStrokeStyle(3, 0x39ff14);

    this.playerHpBar = this.add.rectangle(
      width / 4 - 97,
      80,
      194,
      34,
      0x39ff14
    );
    this.playerHpBar.setOrigin(0, 0.5);

    this.playerHpText = this.add.text(
      width / 4,
      80,
      'HP: 100/100',
      {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    );
    this.playerHpText.setOrigin(0.5);

    const playerLabel = this.add.text(
      width / 4,
      50,
      '勇者',
      {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#39ff14',
        fontStyle: 'bold'
      }
    );
    playerLabel.setOrigin(0.5);

    const monsterHpBg = this.add.rectangle(
      (width * 3) / 4,
      80,
      200,
      40,
      0x1a0528
    );
    monsterHpBg.setStrokeStyle(3, 0xff4444);

    this.monsterHpBar = this.add.rectangle(
      (width * 3) / 4 - 97,
      80,
      194,
      34,
      0xff4444
    );
    this.monsterHpBar.setOrigin(0, 0.5);

    this.monsterHpText = this.add.text(
      (width * 3) / 4,
      80,
      'HP: 80/80',
      {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    );
    this.monsterHpText.setOrigin(0.5);

    const monsterLabel = this.add.text(
      (width * 3) / 4,
      50,
      '地牢怪物',
      {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#ff4444',
        fontStyle: 'bold'
      }
    );
    monsterLabel.setOrigin(0.5);

    this.turnIndicator = this.add.text(
      width / 2,
      130,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#ffd700',
        fontStyle: 'bold'
      }
    );
    this.turnIndicator.setOrigin(0.5);
    this.turnIndicator.setStroke('#2a0a3e', 4);
  }

  private createTurnTimer(): void {
    const { width, height } = this.scale;

    this.turnTimerBg = this.add.rectangle(
      width / 2,
      155,
      300,
      20,
      0x1a0528
    );
    this.turnTimerBg.setStrokeStyle(2, 0x39ff14);

    this.turnTimerBar = this.add.rectangle(
      width / 2 - 148,
      155,
      296,
      16,
      0x39ff14
    );
    this.turnTimerBar.setOrigin(0, 0.5);

    this.turnTimerText = this.add.text(
      width / 2,
      155,
      '',
      {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    );
    this.turnTimerText.setOrigin(0.5);

    this.turnTimerBar.setVisible(false);
    this.turnTimerBg.setVisible(false);
    this.turnTimerText.setVisible(false);
  }

  private createActionMenu(): void {
    const { width, height } = this.scale;
    const menuX = width / 2;
    const menuY = height - 120;

    this.actionMenu = this.add.container(menuX, menuY);

    const menuBg = this.add.rectangle(
      0,
      0,
      500,
      100,
      0x1a0528
    );
    menuBg.setStrokeStyle(4, 0x39ff14);
    this.actionMenu.add(menuBg);

    const attackBtn = this.createActionButton(-160, 0, '攻击', () => this.playerAttackAction());
    const defendBtn = this.createActionButton(0, 0, '防御', () => this.playerDefendAction());
    const itemBtn = this.createActionButton(160, 0, '物品', () => this.playerItemAction());

    this.actionMenu.add([attackBtn, defendBtn, itemBtn]);
  }

  private createActionButton(
    x: number,
    y: number,
    text: string,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const btnBg = this.add.rectangle(0, 0, 120, 50, 0x2a0a3e);
    btnBg.setStrokeStyle(3, 0x39ff14);
    btnBg.setName('btnBg');
    container.add(btnBg);

    const btnText = this.add.text(0, 0, text, {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#39ff14',
      fontStyle: 'bold'
    });
    btnText.setOrigin(0.5);
    btnText.setName('btnText');
    container.add(btnText);

    container.setSize(120, 50);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      btnBg.setStrokeStyle(3, 0xff6600);
      btnText.setColor('#ff6600');
    });

    container.on('pointerout', () => {
      btnBg.setStrokeStyle(3, 0x39ff14);
      btnText.setColor('#39ff14');
    });

    container.on('pointerdown', () => {
      if (this.phase === 'player_turn') {
        callback();
      }
    });

    return container;
  }

  private createBattleLog(): void {
    const { width, height } = this.scale;

    const logBg = this.add.rectangle(
      width / 2,
      height - 220,
      500,
      60,
      0x0a0215
    );
    logBg.setStrokeStyle(3, 0x39ff14);

    this.battleLog = this.add.text(
      width / 2,
      height - 220,
      '战斗开始！',
      {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#39ff14'
      }
    );
    this.battleLog.setOrigin(0.5);
  }

  private setPhase(phase: BattlePhase): void {
    this.phase = phase;

    switch (phase) {
      case 'player_turn':
        this.turnIndicator.setText('你的回合');
        this.turnIndicator.setColor('#39ff14');
        this.actionMenu.setVisible(true);
        this.startTurnTimer();
        break;
      case 'player_attack':
      case 'enemy_turn':
      case 'enemy_attack':
        this.actionMenu.setVisible(false);
        this.stopTurnTimer();
        break;
      case 'battle_end':
        this.actionMenu.setVisible(false);
        this.stopTurnTimer();
        break;
    }
  }

  private startTurnTimer(): void {
    this.turnStartTime = this.time.now;
    this.turnTimerBar.setVisible(true);
    this.turnTimerBg.setVisible(true);
    this.turnTimerText.setVisible(true);
    this.turnTimerBar.width = 296;
    this.turnTimerBar.setFillStyle(0x39ff14);

    if (this.turnTimer) {
      this.turnTimer.remove();
    }

    this.turnTimer = this.time.delayedCall(TURN_TIME_LIMIT, () => {
      if (this.phase === 'player_turn') {
        this.playerAttackAction();
      }
    });
  }

  private stopTurnTimer(): void {
    if (this.turnTimer) {
      this.turnTimer.remove();
      this.turnTimer = null;
    }
    this.turnTimerBar.setVisible(false);
    this.turnTimerBg.setVisible(false);
    this.turnTimerText.setVisible(false);
  }

  private updateHpBars(): void {
    const playerPercent = Math.max(0, this.playerHp / this.playerMaxHp);
    this.playerHpBar.width = Math.max(0, 194 * playerPercent);
    this.playerHpText.setText(`HP: ${Math.max(0, this.playerHp)}/${this.playerMaxHp}`);
    this.playerHpBar.setFillStyle(getHpColor(playerPercent));

    const monsterPercent = Math.max(0, this.monsterHp / this.monsterMaxHp);
    this.monsterHpBar.width = Math.max(0, 194 * monsterPercent);
    this.monsterHpText.setText(`HP: ${Math.max(0, this.monsterHp)}/${this.monsterMaxHp}`);
    this.monsterHpBar.setFillStyle(getHpColor(monsterPercent));
  }

  private playerAttackAction(): void {
    if (this.phase !== 'player_turn') return;

    this.setPhase('player_attack');
    this.battleLog.setText('你发动了攻击！');
    this.playerDefending = false;

    const originalX = this.playerSprite.x;

    this.tweens.add({
      targets: this.playerSprite,
      x: originalX + 100,
      duration: 200,
      ease: 'Power2.in',
      onComplete: () => {
        this.tweens.add({
          targets: this.playerSprite,
          x: originalX,
          duration: 200,
          ease: 'Bounce.Out'
        });

        const damage = 10 + Math.floor(Math.random() * 11) + Math.floor(this.playerAttack / 3);
        this.monsterHp -= damage;

        this.tweens.add({
          targets: this.monsterSprite,
          x: this.monsterSprite.x + 20,
          duration: 80,
          yoyo: true,
          repeat: 3,
          ease: 'Linear'
        });

        this.showDamageText(this.monsterSprite.x, this.monsterSprite.y, damage, '#ff6600');

        this.time.delayedCall(500, () => {
          this.updateHpBars();

          if (this.monsterHp <= 0) {
            this.monsterHp = 0;
            this.updateHpBars();
            this.endBattle(true);
          } else {
            this.time.delayedCall(500, () => {
              this.enemyTurn();
            });
          }
        });
      }
    });
  }

  private playerDefendAction(): void {
    if (this.phase !== 'player_turn') return;

    this.setPhase('player_attack');
    this.battleLog.setText('你进入了防御姿态！');
    this.playerDefending = true;

    const shieldGlow = this.add.rectangle(
      this.playerSprite.x - 45,
      this.playerSprite.y + 20,
      30,
      55,
      0x00ffff,
      0.5
    );
    shieldGlow.setStrokeStyle(3, 0x00ffff);

    this.tweens.add({
      targets: shieldGlow,
      alpha: 0,
      duration: 500,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        shieldGlow.destroy();
        this.time.delayedCall(300, () => {
          this.enemyTurn();
        });
      }
    });
  }

  private playerItemAction(): void {
    if (this.phase !== 'player_turn') return;

    this.setPhase('player_attack');
    this.battleLog.setText('使用了治疗药水！');
    this.playerDefending = false;

    const heal = 20 + Math.floor(Math.random() * 15);
    const oldHp = this.playerHp;
    this.playerHp = Math.min(this.playerMaxHp, this.playerHp + heal);
    const actualHeal = this.playerHp - oldHp;

    this.showDamageText(this.playerSprite.x, this.playerSprite.y - 50, actualHeal, '#39ff14');

    const healEffect = this.add.rectangle(
      this.playerSprite.x,
      this.playerSprite.y,
      60,
      100,
      0x39ff14,
      0.3
    );

    this.tweens.add({
      targets: healEffect,
      alpha: 0,
      y: healEffect.y - 30,
      duration: 600,
      onComplete: () => {
        healEffect.destroy();
      }
    });

    this.time.delayedCall(500, () => {
      this.updateHpBars();
      this.time.delayedCall(300, () => {
        this.enemyTurn();
      });
    });
  }

  private enemyTurn(): void {
    this.setPhase('enemy_turn');
    this.turnIndicator.setText('敌人回合');
    this.turnIndicator.setColor('#ff4444');

    this.battleLog.setText('怪物准备攻击...');

    this.time.delayedCall(800, () => {
      this.enemyAttack();
    });
  }

  private enemyAttack(): void {
    this.setPhase('enemy_attack');
    this.battleLog.setText('怪物发动了攻击！');

    const originalX = this.monsterSprite.x;

    this.tweens.add({
      targets: this.monsterSprite,
      x: originalX - 100,
      duration: 200,
      ease: 'Power2.in',
      onComplete: () => {
        this.tweens.add({
          targets: this.monsterSprite,
          x: originalX,
          duration: 200,
          ease: 'Bounce.Out'
        });

        let damage = 8 + Math.floor(Math.random() * 8) + Math.floor(this.monsterAttack / 3);

        if (this.playerDefending) {
          damage = Math.floor(damage * 0.5);
          this.battleLog.setText(`防御成功！受到 ${damage} 点伤害`);
        } else {
          this.battleLog.setText(`受到 ${damage} 点伤害！`);
        }

        this.playerHp -= damage;

        this.tweens.add({
          targets: this.playerSprite,
          x: this.playerSprite.x - 20,
          duration: 80,
          yoyo: true,
          repeat: 3,
          ease: 'Linear'
        });

        this.showDamageText(this.playerSprite.x, this.playerSprite.y, damage, '#ff4444');

        this.time.delayedCall(500, () => {
          this.updateHpBars();

          if (this.playerHp <= 0) {
            this.playerHp = 0;
            this.updateHpBars();
            this.endBattle(false);
          } else {
            this.time.delayedCall(500, () => {
              this.playerDefending = false;
              this.setPhase('player_turn');
            });
          }
        });
      }
    });
  }

  private showDamageText(x: number, y: number, value: number, color: string): void {
    const dmgText = this.add.text(x, y - 30, `-${value}`, {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: color,
      fontStyle: 'bold'
    });
    dmgText.setOrigin(0.5);
    dmgText.setStroke('#000000', 4);

    this.tweens.add({
      targets: dmgText,
      y: y - 80,
      alpha: 0,
      duration: 1000,
      ease: 'Power2.out',
      onComplete: () => {
        dmgText.destroy();
      }
    });
  }

  private endBattle(victory: boolean): void {
    this.setPhase('battle_end');

    if (victory) {
      this.battleLog.setText('战斗胜利！');
      this.turnIndicator.setText('胜利！');
      this.turnIndicator.setColor('#ffd700');

      this.tweens.add({
        targets: this.monsterSprite,
        alpha: 0,
        y: this.monsterSprite.y + 50,
        scale: 0.5,
        duration: 800,
        ease: 'Power2.in'
      });
    } else {
      this.battleLog.setText('战斗失败...');
      this.turnIndicator.setText('失败...');
      this.turnIndicator.setColor('#ff4444');

      this.tweens.add({
        targets: this.playerSprite,
        alpha: 0,
        angle: 90,
        y: this.playerSprite.y + 50,
        duration: 800,
        ease: 'Power2.in'
      });
    }

    this.time.delayedCall(1500, () => {
      this.fadeOverlay.setVisible(true);
      this.fadeOverlay.setAlpha(0);

      this.tweens.add({
        targets: this.fadeOverlay,
        alpha: 1,
        duration: 300,
        ease: 'Linear',
        onComplete: () => {
          const gameScene = this.scene.get('GameScene');
          gameScene.events.emit('battleEnd', {
            victory: victory,
            playerHp: Math.max(0, this.playerHp),
            monsterIndex: this.monsterIndex
          });
        }
      });
    });
  }

  update(): void {
    if (this.phase === 'player_turn' && this.turnTimerBar.visible) {
      const elapsed = this.time.now - this.turnStartTime;
      const remaining = Math.max(0, TURN_TIME_LIMIT - elapsed);
      const percent = remaining / TURN_TIME_LIMIT;

      this.turnTimerBar.width = Math.max(0, 296 * percent);
      this.turnTimerBar.setFillStyle(getHpColor(percent));

      const secondsLeft = Math.ceil(remaining / 1000);
      this.turnTimerText.setText(`${secondsLeft}s`);
    }
  }
}
