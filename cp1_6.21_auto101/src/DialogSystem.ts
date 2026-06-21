import Phaser from 'phaser';

export interface DialogChoice {
  text: string;
  nextId: string;
  pitchShift: number;
}

export interface DialogNode {
  id: string;
  speaker?: string;
  text: string;
  choices?: DialogChoice[];
  nextId?: string;
}

export interface DialogHistoryEntry {
  text: string;
  sceneName: string;
  timestamp: string;
  speaker?: string;
}

export type DialogData = Record<string, DialogNode>;

const DEFAULT_DIALOG_DATA: DialogData = {
  room_intro: {
    id: 'room_intro',
    speaker: '???',
    text: '你醒来时发现自己身处一间陌生的房间。昏黄的灯光下，墙壁上的壁纸已经斑驳脱落...',
    nextId: 'room_choice',
  },
  room_choice: {
    id: 'room_choice',
    speaker: '旁白',
    text: '桌上有一张泛黄的纸条和一把生锈的钥匙。你要怎么做？',
    choices: [
      { text: '查看纸条', nextId: 'room_note', pitchShift: 2 },
      { text: '拿起钥匙', nextId: 'room_key', pitchShift: -2 },
    ],
  },
  room_note: {
    id: 'room_note',
    speaker: '纸条',
    text: '「若你读到这封信，请尽快离开这栋建筑。时间...正在扭曲。」 字迹潦草，像是匆忙写下的。',
    nextId: 'room_exit',
  },
  room_key: {
    id: 'room_key',
    speaker: '旁白',
    text: '钥匙入手冰凉，上面刻着一串奇怪的符号。你的脑海中闪过一段模糊的记忆...',
    nextId: 'room_exit',
  },
  room_exit: {
    id: 'room_exit',
    speaker: '旁白',
    text: '是时候离开这个房间了。你握住门把手，准备前往走廊...',
  },
  hallway_intro: {
    id: 'hallway_intro',
    speaker: '旁白',
    text: '走廊很长，两侧的墙壁上挂着褪色的肖像画。每一幅画中的人物似乎都在注视着你...',
    nextId: 'hallway_painting',
  },
  hallway_painting: {
    id: 'hallway_painting',
    speaker: '旁白',
    text: '其中一幅画吸引了你的注意——画中人的面容与你惊人地相似。',
    choices: [
      { text: '仔细观察画像', nextId: 'hallway_look', pitchShift: 2 },
      { text: '快速通过走廊', nextId: 'hallway_pass', pitchShift: -2 },
    ],
  },
  hallway_look: {
    id: 'hallway_look',
    speaker: '???',
    text: '「不要停留太久...镜子的另一面在看着你。」 一个声音在耳边低语，但周围空无一人。',
    nextId: 'hallway_exit',
  },
  hallway_pass: {
    id: 'hallway_pass',
    speaker: '旁白',
    text: '你加快脚步，脚步声在空旷的走廊中回荡。你感觉身后似乎有什么东西在跟随...',
    nextId: 'hallway_exit',
  },
  hallway_exit: {
    id: 'hallway_exit',
    speaker: '旁白',
    text: '走廊的尽头是一扇落地窗，窗外是一个被迷雾笼罩的庭院。推开门...',
  },
  outdoor_intro: {
    id: 'outdoor_intro',
    speaker: '旁白',
    text: '你踏入庭院，空气中弥漫着潮湿的青草味。雾气中隐约可见一座古老的喷泉。',
    nextId: 'outdoor_fountain',
  },
  outdoor_fountain: {
    id: 'outdoor_fountain',
    speaker: '旁白',
    text: '喷泉旁站着一个模糊的身影。当你走近时，身影缓缓转过身...',
    choices: [
      { text: '主动打招呼', nextId: 'outdoor_hello', pitchShift: 2 },
      { text: '保持警惕观察', nextId: 'outdoor_watch', pitchShift: -2 },
    ],
  },
  outdoor_hello: {
    id: 'outdoor_hello',
    speaker: '神秘人',
    text: '「你终于来了。这个世界等你很久了...记住，选择会改变一切。」 那人的声音像是从很远的地方传来。',
    nextId: 'outdoor_end',
  },
  outdoor_watch: {
    id: 'outdoor_watch',
    speaker: '神秘人',
    text: '「谨慎是好事...但有时候，必须迈出第一步。」 那人微微一笑，身影开始变得透明。',
    nextId: 'outdoor_end',
  },
  outdoor_end: {
    id: 'outdoor_end',
    speaker: '旁白',
    text: '一切开始变得模糊... 【第一章 · 完】',
  },
};

export class DialogSystem {
  private scene: Phaser.Scene;
  private dialogData: DialogData;
  private currentNodeId: string | null = null;
  private dialogContainer!: Phaser.GameObjects.Container;
  private dialogPanel!: Phaser.GameObjects.Graphics;
  private dialogText!: Phaser.GameObjects.Text;
  private noiseTexture!: Phaser.GameObjects.Graphics;
  private choiceButtons: Phaser.GameObjects.Container[] = [];
  private currentText: string = '';
  private displayText: string = '';
  private charIndex: number = 0;
  private charTimer: number = 0;
  private readonly CHAR_INTERVAL: number = 50;
  private readonly PUNCTUATION_PAUSE: number = 200;
  private isTyping: boolean = false;
  private isActive: boolean = false;
  private history: DialogHistoryEntry[] = [];
  private readonly MAX_HISTORY: number = 5;
  private currentSceneName: string = '';
  private gameStartTime: number = 0;
  private pitchShiftCallback: ((shift: number) => void) | null = null;
  private onDialogCompleteCallback: (() => void) | null = null;

  constructor(scene: Phaser.Scene, customData?: DialogData) {
    this.scene = scene;
    this.dialogData = customData || DEFAULT_DIALOG_DATA;
    this.gameStartTime = scene.time.now;
    this.createDialogUI();
  }

  private createDialogUI(): void {
    const { width, height } = this.scene.scale;
    const panelHeight = height * 0.2;
    const panelY = height - panelHeight - 10;

    this.dialogContainer = this.scene.add.container(0, 0);
    this.dialogContainer.setDepth(1000);
    this.dialogContainer.setVisible(false);

    this.dialogPanel = this.scene.add.graphics();
    this.drawDialogPanel(10, panelY, width - 20, panelHeight);

    this.noiseTexture = this.scene.add.graphics();
    this.drawNoiseTexture(14, panelY + 4, width - 28, panelHeight - 8);

    this.dialogText = this.scene.add.text(30, panelY + 20, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#3D2B1F',
      wordWrap: { width: width - 80 },
      lineSpacing: 8,
    });

    this.dialogContainer.add([this.dialogPanel, this.noiseTexture, this.dialogText]);
  }

  private drawDialogPanel(x: number, y: number, w: number, h: number): void {
    this.dialogPanel.clear();
    this.dialogPanel.lineStyle(4, 0x3d2b1f, 1);
    this.dialogPanel.fillStyle(0xe3d088, 1);
    this.dialogPanel.fillRoundedRect(x, y, w, h, 6);
    this.dialogPanel.strokeRoundedRect(x, y, w, h, 6);

    this.dialogPanel.lineStyle(2, 0x3d2b1f, 0.15);
    for (let ly = y + 4; ly < y + h - 4; ly += 4) {
      this.dialogPanel.lineBetween(x + 4, ly, x + w - 4, ly);
    }
  }

  private drawNoiseTexture(x: number, y: number, w: number, h: number): void {
    this.noiseTexture.clear();
    this.noiseTexture.fillStyle(0x000000, 0.04);
    for (let i = 0; i < 80; i++) {
      const nx = x + Math.random() * w;
      const ny = y + Math.random() * h;
      this.noiseTexture.fillRect(nx, ny, 1, 1);
    }
  }

  startDialog(nodeId: string, sceneName: string): void {
    this.currentSceneName = sceneName;
    this.currentNodeId = nodeId;
    this.isActive = true;
    this.dialogContainer.setVisible(true);
    this.loadNode(nodeId);
  }

  private loadNode(nodeId: string): void {
    const node = this.dialogData[nodeId];
    if (!node) {
      this.endDialog();
      return;
    }

    this.currentNodeId = nodeId;
    this.clearChoices();
    this.currentText = node.speaker ? `【${node.speaker}】${node.text}` : node.text;
    this.displayText = '';
    this.charIndex = 0;
    this.charTimer = 0;
    this.isTyping = true;
    this.dialogText.setText('');

    this.addToHistory(node.text, node.speaker);
  }

  update(delta: number): void {
    if (!this.isActive) return;

    if (this.isTyping) {
      this.charTimer += delta;
      const interval = this.isPunctuation(this.currentText[this.charIndex - 1])
        ? this.PUNCTUATION_PAUSE
        : this.CHAR_INTERVAL;

      while (this.charTimer >= interval && this.charIndex < this.currentText.length) {
        this.displayText += this.currentText[this.charIndex];
        this.dialogText.setText(this.displayText);
        this.charIndex++;
        this.charTimer -= interval;
      }

      if (this.charIndex >= this.currentText.length) {
        this.isTyping = false;
        this.showChoices();
      }
    }
  }

  private showChoices(): void {
    const node = this.dialogData[this.currentNodeId!];
    if (!node) return;

    if (node.choices && node.choices.length > 0) {
      const { width, height } = this.scene.scale;
      const panelHeight = height * 0.2;
      const startY = height - panelHeight - 10;

      node.choices.forEach((choice, index) => {
        this.createChoiceButton(choice, index, width, startY + panelHeight + 10);
      });
    }
  }

  private createChoiceButton(choice: DialogChoice, index: number, screenWidth: number, startY: number): void {
    const btnWidth = Math.min(400, screenWidth - 80);
    const btnHeight = 36;
    const btnX = (screenWidth - btnWidth) / 2;
    const btnY = startY + index * (btnHeight + 8);

    const container = this.scene.add.container(0, 0);
    container.setDepth(1001);

    const bg = this.scene.add.graphics();
    const drawBg = (hovered: boolean) => {
      bg.clear();
      bg.lineStyle(3, 0x3d2b1f, 1);
      bg.fillStyle(hovered ? 0xf5a65c : 0xe3d088, 1);
      bg.fillRoundedRect(btnX, btnY, btnWidth, btnHeight, 4);
      bg.strokeRoundedRect(btnX, btnY, btnWidth, btnHeight, 4);

      bg.lineStyle(1, 0x3d2b1f, 0.12);
      for (let ly = btnY + 2; ly < btnY + btnHeight - 2; ly += 3) {
        bg.lineBetween(btnX + 2, ly, btnX + btnWidth - 2, ly);
      }
    };
    drawBg(false);

    const text = this.scene.add.text(btnX + 16, btnY + 12, choice.text, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#3D2B1F',
    });

    container.add([bg, text]);
    container.setSize(btnWidth, btnHeight);
    container.setInteractive(
      new Phaser.Geom.Rectangle(btnX, btnY, btnWidth, btnHeight),
      Phaser.Geom.Rectangle.Contains
    );

    container.on('pointerover', () => drawBg(true));
    container.on('pointerout', () => drawBg(false));
    container.on('pointerup', () => {
      if (this.pitchShiftCallback) {
        this.pitchShiftCallback(choice.pitchShift);
      }
      this.loadNode(choice.nextId);
    });

    this.scene.input.keyboard!.once(`keydown-${index + 1}`, () => {
      if (this.isActive && !this.isTyping) {
        if (this.pitchShiftCallback) {
          this.pitchShiftCallback(choice.pitchShift);
        }
        this.loadNode(choice.nextId);
      }
    });

    this.choiceButtons.push(container);
  }

  private clearChoices(): void {
    this.choiceButtons.forEach((btn) => btn.destroy());
    this.choiceButtons = [];
  }

  advanceOrComplete(): void {
    if (!this.isActive) return;

    if (this.isTyping) {
      this.isTyping = false;
      this.charIndex = this.currentText.length;
      this.displayText = this.currentText;
      this.dialogText.setText(this.displayText);
      this.showChoices();
      return;
    }

    const node = this.dialogData[this.currentNodeId!];
    if (!node) {
      this.endDialog();
      return;
    }

    if (node.choices && node.choices.length > 0) {
      return;
    }

    if (node.nextId) {
      this.loadNode(node.nextId);
    } else {
      this.endDialog();
    }
  }

  private endDialog(): void {
    this.isActive = false;
    this.isTyping = false;
    this.clearChoices();
    this.dialogContainer.setVisible(false);

    if (this.onDialogCompleteCallback) {
      this.onDialogCompleteCallback();
    }
  }

  private addToHistory(text: string, speaker?: string): void {
    const entry: DialogHistoryEntry = {
      text,
      speaker,
      sceneName: this.currentSceneName,
      timestamp: this.formatTimestamp(),
    };

    this.history.unshift(entry);
    if (this.history.length > this.MAX_HISTORY) {
      this.history.pop();
    }
  }

  private formatTimestamp(): string {
    const elapsed = (this.scene.time.now - this.gameStartTime) / 1000;
    const minutes = Math.floor(elapsed / 60);
    const seconds = Math.floor(elapsed % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  getHistory(): DialogHistoryEntry[] {
    return [...this.history];
  }

  active(): boolean {
    return this.isActive;
  }

  typing(): boolean {
    return this.isTyping;
  }

  setPitchShiftCallback(callback: (shift: number) => void): void {
    this.pitchShiftCallback = callback;
  }

  setOnDialogCompleteCallback(callback: () => void): void {
    this.onDialogCompleteCallback = callback;
  }

  private isPunctuation(char: string | undefined): boolean {
    if (!char) return false;
    return ['。', '，', '！', '？', '.', ',', '!', '?', '；', '：', ';', ':'].includes(char);
  }

  destroy(): void {
    this.clearChoices();
    if (this.dialogContainer) {
      this.dialogContainer.destroy();
    }
  }
}
