import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  private titleCharacters: Phaser.GameObjects.Text[] = [];
  private startButton!: Phaser.GameObjects.Text;
  private helpButton!: Phaser.GameObjects.Text;
  private helpPanel!: Phaser.GameObjects.Container;
  private isHelpVisible: boolean = false;

  constructor() {
    super({ key: 'MenuScene' });
  }

  public create(): void {
    this.cameras.main.setBackgroundColor('#0B3D91');
    this.createTitle();
    this.createButtons();
    this.createHelpPanel();
    this.animateTitle();
  }

  private createTitle(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2 - 100;
    const chars = ['极', '速', '拍', '档'];
    const spacing = 70;
    const startX = centerX - (spacing * (chars.length - 1)) / 2;

    chars.forEach((char, i) => {
      const text = this.add.text(startX + i * spacing, centerY - 200, char, {
        fontFamily: 'sans-serif',
        fontSize: '64px',
        color: '#FFFFFF',
        fontStyle: 'bold'
      });
      text.setOrigin(0.5);
      text.setAlpha(0);
      text.setShadow(0, 0, 10, 0xffffff, true, true);
      this.titleCharacters.push(text);
    });
  }

  private animateTitle(): void {
    this.titleCharacters.forEach((char, i) => {
      this.tweens.add({
        targets: char,
        y: this.cameras.main.height / 2 - 100,
        alpha: 1,
        duration: 500,
        delay: i * 150,
        ease: 'Bounce.easeOut'
      });
    });
  }

  private createButtons(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2 + 40;

    this.startButton = this.add.text(centerX, centerY, '开始游戏', {
      fontFamily: 'sans-serif',
      fontSize: '32px',
      color: '#FF6F00',
      fontStyle: 'bold',
      backgroundColor: 'transparent'
    });
    this.startButton.setOrigin(0.5);
    this.startButton.setInteractive({ useHandCursor: true });

    this.startButton.on('pointerover', () => {
      this.startButton.setColor('#FF9800');
      this.startButton.setScale(1.05);
    });
    this.startButton.on('pointerout', () => {
      this.startButton.setColor('#FF6F00');
      this.startButton.setScale(1);
    });
    this.startButton.on('pointerdown', () => {
      this.tweens.add({
        targets: this.startButton,
        scale: 0.9,
        duration: 100,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: this.startButton,
            scale: 1,
            duration: 100,
            ease: 'Cubic.easeIn',
            onComplete: () => this.scene.start('GameScene')
          });
        }
      });
    });

    this.helpButton = this.add.text(centerX, centerY + 60, '操作说明', {
      fontFamily: 'sans-serif',
      fontSize: '28px',
      color: '#757575',
      fontStyle: 'bold'
    });
    this.helpButton.setOrigin(0.5);
    this.helpButton.setInteractive({ useHandCursor: true });

    this.helpButton.on('pointerover', () => {
      this.helpButton.setColor('#FFFFFF');
      this.helpButton.setScale(1.05);
    });
    this.helpButton.on('pointerout', () => {
      this.helpButton.setColor('#757575');
      this.helpButton.setScale(1);
    });
    this.helpButton.on('pointerdown', () => {
      this.tweens.add({
        targets: this.helpButton,
        scale: 0.9,
        duration: 100,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: this.helpButton,
            scale: 1,
            duration: 100,
            ease: 'Cubic.easeIn',
            onComplete: () => this.toggleHelp()
          });
        }
      });
    });
  }

  private createHelpPanel(): void {
    this.helpPanel = this.add.container(this.cameras.main.width / 2, this.cameras.main.height / 2);
    this.helpPanel.setVisible(false);
    this.helpPanel.setDepth(10);

    const bg = this.add.rectangle(0, 0, 500, 400, 0x000000, 0.85);
    bg.setStrokeStyle(2, 0xffffff, 0.5);

    const title = this.add.text(0, -160, '操作说明', {
      fontFamily: 'sans-serif',
      fontSize: '28px',
      color: '#FFFFFF',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);

    const p1Label = this.add.text(-150, -100, '玩家1 (蓝色)', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#3498DB',
      fontStyle: 'bold'
    });
    p1Label.setOrigin(0, 0.5);

    const p1Keys = this.add.text(-150, -60, 'W: 跳跃\nA: 左移\nD: 右移\nS: 下移', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#FFFFFF'
    });
    p1Keys.setOrigin(0, 0);

    const p2Label = this.add.text(50, -100, '玩家2 (红色)', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#E74C3C',
      fontStyle: 'bold'
    });
    p2Label.setOrigin(0, 0.5);

    const p2Keys = this.add.text(50, -60, '↑: 跳跃\n←: 左移\n→: 右移\n↓: 下移', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#FFFFFF'
    });
    p2Keys.setOrigin(0, 0);

    const tipsTitle = this.add.text(0, 40, '游戏道具', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold'
    });
    tipsTitle.setOrigin(0.5);

    const tips = this.add.text(-220, 70,
      '★ 金色星星: 3秒无敌，可击杀敌人\n⚡ 闪电: 3秒移动速度+50%\n🛡 盾牌: 抵挡一次伤害',
      {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#CCCCCC'
      }
    );
    tips.setOrigin(0, 0);

    const closeText = this.add.text(0, 170, '点击任意处关闭', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#AAAAAA'
    });
    closeText.setOrigin(0.5);

    this.helpPanel.add([bg, title, p1Label, p1Keys, p2Label, p2Keys, tipsTitle, tips, closeText]);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => this.toggleHelp());
  }

  private toggleHelp(): void {
    this.isHelpVisible = !this.isHelpVisible;
    this.helpPanel.setVisible(this.isHelpVisible);
    if (this.isHelpVisible) {
      this.helpPanel.setScale(0.8);
      this.tweens.add({
        targets: this.helpPanel,
        scale: 1,
        alpha: 1,
        duration: 200,
        ease: 'Cubic.easeOut'
      });
    }
  }
}
