import Phaser from 'phaser';
import { eventBus, GameEvents } from '../utils/EventBus';
import { chaptersManager, StoryNode, Choice, GameState } from '../data/Chapters';
import { COMBINATION_RULES, ITEMS, findCombination } from '../data/Items';

const STORY_KEY = 'StoryScene';

interface ChoiceButton {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  lockIcon: Phaser.GameObjects.Text;
  choice: Choice;
  index: number;
  isHovered: boolean;
  isLocked: boolean;
}

export class StoryScene extends Phaser.Scene {
  private chapterLabel!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private dialogueBoxBg!: Phaser.GameObjects.Graphics;
  private dialogueText!: Phaser.GameObjects.Text;
  private choiceButtons: ChoiceButton[] = [];
  private dropZone!: Phaser.GameObjects.Graphics;
  private dropZoneText!: Phaser.GameObjects.Text;
  private dropZoneActive = false;
  private currentNode!: StoryNode;
  private audioContext: AudioContext | null = null;
  private typewriterTimer: Phaser.Time.TimerEvent | null = null;
  private textPrinting = false;
  private currentTextIndex = 0;
  private targetText = '';
  private particles!: Phaser.GameObjects.Particles.ParticleEmitterManager;
  private transitionOverlay!: Phaser.GameObjects.Graphics;
  private filmScratches!: Phaser.GameObjects.Graphics;
  private filmGrain!: Phaser.GameObjects.RenderTexture;
  private noiseTimer: Phaser.Time.TimerEvent | null = null;
  private themeColor = '#DAA520';
  private isTransitioning = false;
  private dropZoneTween: Phaser.Tweens.Tween | null = null;
  private endingContainer!: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: STORY_KEY });
  }

  create(): void {
    this.initAudio();
    this.createParticleSystem();
    this.createVisualLayers();
    this.createUI();
    this.registerEventListeners();
    this.startStory();
  }

  private initAudio(): void {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
    } catch (e) {
      this.audioContext = null;
    }
  }

  private playTypewriterSound(): void {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(60 + Math.random() * 30, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.035);
  }

  private playSuccessSound(): void {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + i * 0.08;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  }

  private createParticleSystem(): void {
    this.particles = this.add.particles(0, 0, undefined, {
      lifespan: 900,
      speed: { min: 80, max: 220 },
      scaleX: { start: 0.7, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
      quantity: 0,
      emitting: false,
    });
    this.particles.setDepth(500);
  }

  private createVisualLayers(): void {
    const { width, height } = this.scale;

    this.transitionOverlay = this.add.graphics();
    this.transitionOverlay.fillStyle(0x000000, 1);
    this.transitionOverlay.fillRect(0, 0, width, height);
    this.transitionOverlay.setDepth(800);
    this.tweens.add({
      targets: this.transitionOverlay,
      alpha: 0,
      duration: 600,
      ease: 'Cubic.easeInOut',
      onComplete: () => { this.transitionOverlay.setVisible(false); },
    });

    this.filmScratches = this.add.graphics();
    this.filmScratches.setDepth(780);
    this.filmScratches.setScrollFactor(0);

    this.filmGrain = this.add.renderTexture(0, 0, width, height);
    this.filmGrain.setDepth(775);
    this.filmGrain.setScrollFactor(0);
    this.filmGrain.setAlpha(0.05);
  }

  private createUI(): void {
    const { width, height } = this.scale;

    const bgGraphics = this.add.graphics();
    this.drawParchmentGradient(bgGraphics, width, height);
    bgGraphics.setDepth(0);
    bgGraphics.setScrollFactor(0);

    const topBarY = Math.max(30, height * 0.04);
    this.chapterLabel = this.add.text(
      width * 0.05,
      topBarY,
      '',
      {
        fontFamily: 'Georgia, SimSun, serif',
        fontSize: `${this.getFontSize(14, 22)}px`,
        color: '#d4a853',
        fontStyle: 'bold',
        letterSpacing: 2,
      }
    );
    this.chapterLabel.setDepth(100);
    this.chapterLabel.setScrollFactor(0);

    this.titleText = this.add.text(
      width / 2,
      topBarY + height * 0.18,
      '',
      {
        fontFamily: 'Georgia, SimSun, serif',
        fontSize: `${this.getFontSize(20, 32)}px`,
        color: '#f5e6d0',
        fontStyle: 'bold',
        align: 'center',
      }
    );
    this.titleText.setOrigin(0.5);
    this.titleText.setDepth(100);
    this.titleText.setScrollFactor(0);

    this.createDialogueBox();
    this.createDropZone();
    this.startFilmEffects();
  }

  private getFontSize(min: number, max: number): number {
    const { width } = this.scale;
    return Math.max(min, Math.min(max, width * (max / 1920)));
  }

  private drawParchmentGradient(graphics: Phaser.GameObjects.Graphics, w: number, h: number): void {
    const grad = this.textures.createCanvas('parchmentBg', w, h);
    const ctx = grad.getContext();
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#2a2335');
    gradient.addColorStop(0.3, '#3a3045');
    gradient.addColorStop(0.5, '#42364a');
    gradient.addColorStop(0.7, '#3a3045');
    gradient.addColorStop(1, '#1f1a28');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = `rgba(212, 197, 169, ${0.005 + Math.random() * 0.015})`;
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, 0.5 + Math.random() * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    grad.refresh();
    const img = this.add.image(w / 2, h / 2, 'parchmentBg');
    img.setDisplaySize(w, h);
    img.setDepth(0);
    img.setScrollFactor(0);
  }

  private createDialogueBox(): void {
    const { width, height } = this.scale;
    const panelWidth = width * 0.8;
    const panelHeight = Math.min(220, height * 0.24);
    const panelX = (width - panelWidth) / 2;
    const panelY = height * 0.55;

    this.dialogueBoxBg = this.add.graphics();
    this.drawDialogueBackground(panelX, panelY, panelWidth, panelHeight);
    this.dialogueBoxBg.setDepth(200);
    this.dialogueBoxBg.setScrollFactor(0);

    const textX = panelX + panelWidth * 0.05;
    const textY = panelY + panelHeight * 0.12;
    const textWidth = panelWidth * 0.9;
    this.dialogueText = this.add.text(textX, textY, '', {
      fontFamily: 'Georgia, SimSun, serif',
      fontSize: `${this.getFontSize(14, 18)}px`,
      color: '#2a1810',
      lineSpacing: 6,
      wordWrap: { width: textWidth },
    });
    this.dialogueText.setDepth(210);
    this.dialogueText.setScrollFactor(0);
  }

  private drawDialogueBackground(x: number, y: number, w: number, h: number): void {
    const g = this.dialogueBoxBg;
    g.clear();

    g.fillStyle(0x000000, 0.3);
    this.drawRoundedRect(g, x + 4, y + 6, w, h, 18);

    const grad = this.textures.createCanvas(`dialogueBg_${Date.now()}`, w, h);
    const ctx = grad.getContext();
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#f8efe0');
    gradient.addColorStop(0.4, '#f0e3ca');
    gradient.addColorStop(0.7, '#ead8b8');
    gradient.addColorStop(1, '#e2cfac');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = `rgba(139, 90, 43, ${0.02 + Math.random() * 0.06})`;
      ctx.beginPath();
      const sx = Math.random() * w;
      const sy = Math.random() * h;
      ctx.ellipse(sx, sy, 1 + Math.random() * 3, 0.5 + Math.random() * 1.5, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = `rgba(160, 110, 60, 0.08)`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, (h / 6) * i + Math.random() * 10);
      for (let x = 0; x < w; x += 10) {
        ctx.lineTo(x, (h / 6) * i + Math.sin(x * 0.02) * 3 + Math.random() * 4);
      }
      ctx.stroke();
    }

    grad.refresh();
    const key = grad.key;
    const bgImg = this.add.image(x + w / 2, y + h / 2, key);
    bgImg.setDisplaySize(w, h);
    bgImg.setDepth(199);
    bgImg.setScrollFactor(0);

    g.lineStyle(2.5, 0x8b5a2b, 0.6);
    this.drawRoundedRect(g, x, y, w, h, 18);
    g.lineStyle(1, 0x6b4423, 0.35);
    this.drawRoundedRect(g, x + 3, y + 3, w - 6, h - 6, 16);
  }

  private createDropZone(): void {
    const { width, height } = this.scale;
    const dzWidth = Math.min(200, width * 0.2);
    const dzHeight = 50;
    const dzX = (width - dzWidth) / 2;
    const dzY = height * 0.55 - 80;

    this.dropZone = this.add.graphics();
    this.drawDropZoneBorder(dzX, dzY, dzWidth, dzHeight, false);
    this.dropZone.setDepth(250);
    this.dropZone.setScrollFactor(0);
    this.dropZone.setVisible(false);

    this.dropZoneText = this.add.text(
      width / 2,
      dzY + dzHeight / 2,
      '将物品拖放到此处',
      {
        fontFamily: 'Georgia, SimSun, serif',
        fontSize: `${this.getFontSize(12, 15)}px`,
        color: '#a0a0c0',
        fontStyle: 'italic',
      }
    );
    this.dropZoneText.setOrigin(0.5);
    this.dropZoneText.setDepth(251);
    this.dropZoneText.setScrollFactor(0);
    this.dropZoneText.setVisible(false);

    this.dropZone.setInteractive(
      new Phaser.Geom.Rectangle(dzX, dzY, dzWidth, dzHeight),
      Phaser.Geom.Rectangle.Contains
    );
  }

  private drawDropZoneBorder(x: number, y: number, w: number, h: number, success: boolean): void {
    const g = this.dropZone;
    g.clear();
    const color = success ? 0x2ecc71 : 0x8080a0;
    const alpha = success ? 0.95 : 0.7;
    g.lineStyle(2.5, color, alpha);

    const dash = 10;
    const gap = 6;
    const drawDashedLine = (x1: number, y1: number, x2: number, y2: number) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const total = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.floor(total / (dash + gap));
      for (let i = 0; i < steps; i++) {
        const t0 = (i * (dash + gap)) / total;
        const t1 = (i * (dash + gap) + dash) / total;
        const sx = x1 + dx * t0;
        const sy = y1 + dy * t0;
        const ex = x1 + dx * t1;
        const ey = y1 + dy * t1;
        g.beginPath();
        g.moveTo(sx, sy);
        g.lineTo(ex, ey);
        g.strokePath();
      }
    };

    drawDashedLine(x, y, x + w, y);
    drawDashedLine(x + w, y, x + w, y + h);
    drawDashedLine(x + w, y + h, x, y + h);
    drawDashedLine(x, y + h, x, y);

    if (success) {
      g.fillStyle(0x2ecc71, 0.12);
      this.drawRoundedRect(g, x, y, w, h, 8);
    }
  }

  private showDropZone(active: boolean): void {
    this.dropZoneActive = active;
    this.dropZone.setVisible(active);
    this.dropZoneText.setVisible(active);

    if (active) {
      if (this.dropZoneTween) this.dropZoneTween.stop();
      this.dropZoneTween = this.tweens.add({
        targets: this.dropZone,
        alpha: { from: 0.4, to: 1 },
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      if (this.dropZoneTween) {
        this.dropZoneTween.stop();
        this.dropZoneTween = null;
      }
    }
  }

  private registerEventListeners(): void {
    eventBus.on(GameEvents.ITEM_DRAG_START, this.onItemDragStart.bind(this));
    eventBus.on(GameEvents.ITEM_DRAG_END, this.onItemDragEnd.bind(this));
    eventBus.on(GameEvents.ITEM_DROP_ZONE, this.onItemDropZone.bind(this));
    eventBus.on(GameEvents.ITEM_COMBINED, this.onItemCombined.bind(this));
    eventBus.on(GameEvents.CLUE_UNLOCKED, this.onClueUnlocked.bind(this));
    this.scale.on('resize', this.handleResize, this);
  }

  private onItemDragStart(data: { itemId: string; pointer: Phaser.Input.Pointer }): void {
    const node = this.currentNode;
    if (node && node.dropZoneItem && node.dropZoneClueId) {
      const hasClue = chaptersManager.hasClue(node.dropZoneClueId);
      if (!hasClue && (data.itemId === node.dropZoneItem || this.isItemForCombination(node.dropZoneItem, data.itemId))) {
        this.showDropZone(true);
      }
    }
  }

  private isItemForCombination(a: string, b: string): boolean {
    return findCombination(a, b) !== null;
  }

  private onItemDragEnd(data: { itemId: string; pointer: Phaser.Input.Pointer; dragging?: boolean }): void {
    if (data.dragging !== false) return;
    this.showDropZone(false);
  }

  private onItemDropZone(data: any): boolean {
    const node = this.currentNode;
    if (!node || !node.dropZoneItem || !node.dropZoneClueId) return false;
    if (!data.pointer) return false;

    const { width, height } = this.scale;
    const dzWidth = Math.min(200, width * 0.2);
    const dzHeight = 50;
    const dzX = (width - dzWidth) / 2;
    const dzY = height * 0.55 - 80;

    const worldPoint = this.cameras.main.getWorldPoint(data.pointer.x, data.pointer.y);
    const inZone =
      worldPoint.x >= dzX && worldPoint.x <= dzX + dzWidth &&
      worldPoint.y >= dzY && worldPoint.y <= dzY + dzHeight;

    if (!inZone) return false;

    const rule = findCombination(node.dropZoneItem, data.itemId);
    const isCorrectItem = data.itemId === node.dropZoneItem || rule !== null;
    const hasClue = chaptersManager.hasClue(node.dropZoneClueId);

    if (!isCorrectItem || hasClue) return false;

    this.onDropSuccess(dzX + dzWidth / 2, dzY + dzHeight / 2);
    chaptersManager.unlockClue(node.dropZoneClueId, node.dropZoneSuccessNode || node.id);

    return true;
  }

  private onItemCombined(rule: any): void {
    const resultId: string = rule.result;
    chaptersManager.collectItem(resultId);
    if (rule.clueId) {
      chaptersManager.unlockClue(rule.clueId);
    }
    this.cameras.main.flash(400, 255, 255, 180, true);
    this.playSuccessSound();
    this.showFloatingMessage(rule.message, 3200);
  }

  private onClueUnlocked(clueId: string): void {
    this.showFloatingMessage('🔍 新线索解锁！', 2000);
    this.renderChoices();
  }

  private onDropSuccess(x: number, y: number): void {
    this.drawDropZoneBorder(this.dropZone.x, this.dropZone.y, Math.min(200, this.scale.width * 0.2), 50, true);
    this.particles.emitParticleAt(x, y, 15, {
      speed: { min: 80, max: 220 },
      lifespan: { min: 500, max: 900 },
      angle: { min: 0, max: 360 },
      scaleX: { start: 0.7, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0x2ecc71, 0xffffff, 0x90ee90],
    } as any);
    this.playSuccessSound();
    this.time.delayedCall(800, () => this.showDropZone(false));
  }

  private startFilmEffects(): void {
    this.noiseTimer = this.time.addEvent({
      delay: 60,
      loop: true,
      callback: this.updateFilmGrain,
      callbackScope: this,
    });

    this.time.addEvent({
      delay: 4000 + Math.random() * 3000,
      loop: true,
      callback: this.playFilmScratch,
      callbackScope: this,
    });
  }

  private updateFilmGrain(): void {
    if (!this.filmGrain || !this.filmGrain.active) return;
    const { width, height } = this.scale;
    this.filmGrain.clear();
    const points: any[] = [];
    for (let i = 0; i < 180; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const a = 0.15 + Math.random() * 0.35;
      points.push({ x, y, a });
    }
    this.filmGrain.beginDraw();
    points.forEach((p) => {
      const color = Math.random() > 0.5 ? 0xffffff : 0x000000;
      this.filmGrain.draw(
        this.add.rectangle(p.x, p.y, 1, 1, color, p.a).setVisible(false)
      );
    });
    this.filmGrain.endDraw();
  }

  private playFilmScratch(): void {
    const { width, height } = this.scale;
    this.filmScratches.clear();
    const scratchCount = 1 + Math.floor(Math.random() * 3);
    const animDuration = 600;

    for (let i = 0; i < scratchCount; i++) {
      const startX = width + 50 + Math.random() * 100;
      const y = Math.random() * height;
      const scratchLen = 100 + Math.random() * 250;
      const alpha = 0.2 + Math.random() * 0.5;
      const thickness = 0.8 + Math.random() * 1.2;

      let curX = startX;
      const startTime = this.time.now;
      const scratchLine = () => {
        const elapsed = this.time.now - startTime;
        if (elapsed > animDuration) return;
        const t = elapsed / animDuration;
        const easeT = 1 - Math.pow(1 - t, 3);
        curX = startX - (scratchLen + startX + 50) * easeT;
        this.filmScratches.lineStyle(thickness, 0xffffff, alpha * (1 - Math.abs(t - 0.5) * 2));
        this.filmScratches.beginPath();
        this.filmScratches.moveTo(curX, y - 30 + Math.sin(curX * 0.04) * 20);
        this.filmScratches.lineTo(curX + scratchLen, y + 30 + Math.cos(curX * 0.03) * 20);
        this.filmScratches.strokePath();
        if (t < 1) requestAnimationFrame(scratchLine);
      };
      scratchLine();
    }

    this.time.delayedCall(animDuration + 200, () => {
      if (this.filmScratches?.active) this.filmScratches.clear();
    });
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const { width, height } = gameSize;

    const bg = this.children.list.find((c) => (c as any).texture?.key?.startsWith?.('parchmentBg'));
    if (bg) {
      (bg as Phaser.GameObjects.Image).setPosition(width / 2, height / 2);
      (bg as Phaser.GameObjects.Image).setDisplaySize(width, height);
    }

    this.recreateAllUI();
  }

  private recreateAllUI(): void {
    const keepNode = this.currentNode;
    const keepText = this.dialogueText?.text || '';

    this.chapterLabel?.destroy();
    this.titleText?.destroy();
    this.dialogueBoxBg?.destroy();
    this.dialogueText?.destroy();
    this.dropZone?.destroy();
    this.dropZoneText?.destroy();
    this.clearChoiceButtons();

    this.createUI();
    this.currentNode = keepNode;
    this.themeColor = chaptersManager.getChapter(keepNode.chapter)?.themeColor || this.themeColor;
    this.updateChapterLabel();
    this.updateTitle(keepNode.title);
    this.dialogueText.setText(keepText);
    this.renderChoices();
    this.showDropZone(!!keepNode.dropZoneItem && keepNode.dropZoneClueId && !chaptersManager.hasClue(keepNode.dropZoneClueId));
  }

  private startStory(): void {
    chaptersManager.reset();
    this.currentNode = chaptersManager.getCurrentNode();
    this.themeColor = chaptersManager.getCurrentChapter()?.themeColor || this.themeColor;
    this.updateChapterLabel();
    this.updateTitle(this.currentNode.title);
    this.printDialogue(this.currentNode.text);
    this.showDropZone(false);
  }

  private updateChapterLabel(): void {
    const ch = chaptersManager.getCurrentChapter();
    if (ch) {
      this.chapterLabel.setText(ch.name);
      this.chapterLabel.setColor(ch.themeColor);
    }
  }

  private updateTitle(title: string): void {
    this.titleText.setAlpha(0);
    this.titleText.setText(title);
    this.tweens.add({
      targets: this.titleText,
      alpha: 1,
      duration: 500,
      ease: 'Cubic.easeOut',
      delay: 100,
    });
  }

  private printDialogue(text: string): void {
    this.stopTyping();
    this.clearChoiceButtons();
    this.dialogueText.setText('');
    this.targetText = text;
    this.currentTextIndex = 0;
    this.textPrinting = true;

    const duration = 30;
    this.typewriterTimer = this.time.addEvent({
      delay: duration,
      loop: true,
      callback: () => {
        if (this.currentTextIndex < this.targetText.length) {
          this.dialogueText.setText(this.targetText.slice(0, this.currentTextIndex + 1));
          this.currentTextIndex++;
          if (this.currentTextIndex % 2 === 0) this.playTypewriterSound();
        } else {
          this.stopTyping();
          this.onDialogueComplete();
        }
      },
    });
  }

  private stopTyping(): void {
    if (this.typewriterTimer) {
      this.typewriterTimer.remove(false);
      this.typewriterTimer = null;
    }
    this.textPrinting = false;
  }

  private skipTyping(): void {
    if (!this.textPrinting) return;
    this.stopTyping();
    this.dialogueText.setText(this.targetText);
    this.onDialogueComplete();
  }

  private onDialogueComplete(): void {
    if (this.currentNode.isEnding) {
      this.showEnding();
    } else {
      this.renderChoices();
      const showDZ = !!this.currentNode.dropZoneItem &&
        !!this.currentNode.dropZoneClueId &&
        !chaptersManager.hasClue(this.currentNode.dropZoneClueId);
      this.showDropZone(showDZ);
    }
  }

  private renderChoices(): void {
    this.clearChoiceButtons();
    const choices = this.currentNode.choices;
    if (!choices.length) return;

    const { width, height } = this.scale;
    const baseY = height * 0.55 + Math.min(220, height * 0.24) + 35;
    const btnHeight = Math.max(40, Math.min(56, height * 0.07));
    const btnWidth = Math.max(260, Math.min(440, width * 0.38));
    const gap = 14;
    const totalHeight = choices.length * btnHeight + (choices.length - 1) * gap;
    const startY = baseY;

    choices.forEach((choice, index) => {
      const isLocked = choice.requiredClue ? !chaptersManager.hasClue(choice.requiredClue) : false;
      const y = startY + index * (btnHeight + gap);
      this.createChoiceButton(choice, index, (width - btnWidth) / 2, y, btnWidth, btnHeight, isLocked);
    });
  }

  private createChoiceButton(
    choice: Choice,
    index: number,
    x: number,
    y: number,
    w: number,
    h: number,
    locked: boolean
  ): void {
    const container = this.add.container(x, y);
    container.setDepth(300);
    container.setScrollFactor(0);

    const bg = this.add.graphics();
    container.add(bg);

    const colorStr = locked ? '#4a4a5a' : '#3a3a4a';
    const tweenColorStr = locked ? '#4a4a5a' : this.themeColor;

    this.drawChoiceBackground(bg, w, h, colorStr, 1, 0);

    const padX = 20;
    const fontSz = this.getFontSize(13, 18);
    const text = this.add.text(
      -w / 2 + padX,
      0,
      locked && choice.lockedText ? choice.lockedText : choice.text,
      {
        fontFamily: 'Georgia, SimSun, serif',
        fontSize: `${fontSz}px`,
        color: locked ? '#808090' : '#f5e6d0',
        wordWrap: { width: w - padX * 2 - (locked ? 24 : 0) },
        align: 'left',
      }
    );
    text.setOrigin(0, 0.5);
    container.add(text);

    let lockIcon: Phaser.GameObjects.Text = this.add.text(0, 0, '');
    if (locked) {
      lockIcon = this.add.text(w / 2 - 28, 0, '🔒', {
        fontSize: `${fontSz}px`,
      });
      lockIcon.setOrigin(0.5);
      container.add(lockIcon);
    }

    container.setSize(w, h);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      Phaser.Geom.Rectangle.Contains
    );
    container.input.cursor = locked ? 'not-allowed' : 'pointer';

    const btnData: ChoiceButton = {
      container,
      bg,
      text,
      lockIcon,
      choice,
      index,
      isHovered: false,
      isLocked: locked,
    };
    this.choiceButtons.push(btnData);

    container.on('pointerover', () => {
      if (this.isTransitioning) return;
      btnData.isHovered = true;
      this.tweens.add({
        targets: container,
        scale: 1.02,
        x: container.x - 4,
        duration: 90,
        ease: 'Quad.easeOut',
      });
      this.animateChoiceBg(btnData, w, h, tweenColorStr, 0.85);
    });

    container.on('pointerout', () => {
      btnData.isHovered = false;
      this.tweens.add({
        targets: container,
        scale: 1,
        x: x,
        duration: 90,
        ease: 'Quad.easeOut',
      });
      this.animateChoiceBg(btnData, w, h, colorStr, 1, 0);
    });

    container.on('pointerdown', () => {
      if (this.isTransitioning || btnData.isLocked) return;
      this.tweens.add({
        targets: container,
        scale: 0.98,
        duration: 60,
        ease: 'Quad.easeIn',
      });
    });

    container.on('pointerup', () => {
      if (this.isTransitioning || btnData.isLocked) return;
      this.tweens.add({
        targets: container,
        scale: 1.02,
        duration: 60,
        ease: 'Quad.easeOut',
      });
      this.onChoiceSelected(choice);
    });
  }

  private drawChoiceBackground(
    g: Phaser.GameObjects.Graphics,
    w: number,
    h: number,
    fillHex: string,
    fillAlpha: number,
    glowAmount: number
  ): void {
    g.clear();
    const fillNum = this.hexToNum(fillHex);

    if (glowAmount > 0) {
      const t = 0.4 + glowAmount * 0.6;
      g.lineStyle(3, fillNum, t * 0.7);
      this.drawRoundedRect(g, -w / 2 - 3, -h / 2 - 3, w + 6, h + 6, h / 2 + 3);
    }

    g.fillStyle(0x000000, 0.35 * fillAlpha);
    this.drawRoundedRect(g, -w / 2 + 2, -h / 2 + 4, w, h, h / 2);

    const grad = this.textures.createCanvas(`btnGrad_${Date.now()}_${Math.random()}`, w, h);
    const ctx = grad.getContext();
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, this.hexToRgba(fillHex, 0.9 * fillAlpha));
    gradient.addColorStop(0.5, this.hexToRgba(fillHex, fillAlpha));
    gradient.addColorStop(1, this.hexToRgba(this.darkenHex(fillHex, 0.15), fillAlpha));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(210, 180, 140, ${0.01 + Math.random() * 0.04})`;
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, 0.3 + Math.random() * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    grad.refresh();
    const img = this.add.image(0, 0, grad.key);
    img.setDisplaySize(w, h);
    img.setOrigin(0.5);
    g.addAt(img, 0);

    g.lineStyle(1.5, this.hexToNum(this.lightenHex(fillHex, 0.25)), 0.55 * fillAlpha);
    this.drawRoundedRect(g, -w / 2, -h / 2, w, h, h / 2);
  }

  private animateChoiceBg(btn: ChoiceButton, w: number, h: number, targetHex: string, targetFillAlpha: number, glowAmount = 0): void {
    const frames = 8;
    const startColor = this.tintToRgb(btn.bg.list.length > 0 ? (btn.bg.list[0] as any)?.tint || 0x3a3a4a : 0x3a3a4a);
    const endColor = this.hexToRgb(targetHex);
    let f = 0;
    const tween = this.time.addEvent({
      delay: 10,
      repeat: frames,
      callback: () => {
        if (!btn.bg.active) { tween.remove(); return; }
        const t = f / frames;
        const r = Math.round(startColor.r + (endColor.r - startColor.r) * t);
        const g = Math.round(startColor.g + (endColor.g - startColor.g) * t);
        const b = Math.round(startColor.b + (endColor.b - startColor.b) * t);
        const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
        this.drawChoiceBackground(btn.bg, w, h, hex, 1, glowAmount);
        f++;
      },
    });
  }

  private clearChoiceButtons(): void {
    this.choiceButtons.forEach((btn) => btn.container.destroy());
    this.choiceButtons = [];
  }

  private onChoiceSelected(choice: Choice): void {
    if (this.textPrinting) {
      this.skipTyping();
      return;
    }
    if (this.isTransitioning) return;

    this.playFilmScratch();
    this.playPageFlipTransition(() => {
      const nextNode = chaptersManager.makeChoice(choice.id);
      if (nextNode) {
        this.currentNode = nextNode;
        this.themeColor = chaptersManager.getCurrentChapter()?.themeColor || this.themeColor;
        this.updateChapterLabel();
        this.updateTitle(nextNode.title);
        this.printDialogue(nextNode.text);
      }
    });
  }

  private playPageFlipTransition(onComplete: () => void): void {
    this.isTransitioning = true;
    const { width, height } = this.scale;

    this.transitionOverlay.setVisible(true);
    this.transitionOverlay.setAlpha(0);

    const overlay = this.add.graphics();
    overlay.setDepth(790);
    overlay.setScrollFactor(0);

    const duration = 800;
    const startTime = this.time.now;

    const animate = () => {
      const elapsed = this.time.now - startTime;
      const t = Math.min(1, elapsed / duration);
      overlay.clear();

      const easeIn = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      const flapWidth = width * (1 - easeIn);
      const shadowX = width - flapWidth;
      const shadowAlpha = easeIn * 0.5;

      overlay.fillStyle(0x000000, shadowAlpha * 0.6);
      overlay.fillRect(0, 0, shadowX, height);

      if (flapWidth > 0) {
        overlay.fillStyle(0x1a1a2e, 0.8 + easeIn * 0.2);
        const skew = Math.sin(easeIn * Math.PI) * 0.08;
        const x1 = shadowX;
        const x2 = shadowX + flapWidth;
        const ySkewTop = height * skew * 0.3;
        const ySkewBot = -height * skew * 0.3;

        overlay.beginPath();
        overlay.moveTo(x1, 0 + ySkewTop);
        overlay.lineTo(x2, 0 - ySkewTop);
        overlay.lineTo(x2, height - ySkewBot);
        overlay.lineTo(x1, height + ySkewBot);
        overlay.closePath();
        overlay.fillPath();

        overlay.lineStyle(1.5, 0x5a4a6a, 0.3 + (1 - easeIn) * 0.5);
        overlay.strokePath();
      }

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        overlay.destroy();
        this.transitionOverlay.setAlpha(0);
        this.transitionOverlay.setVisible(false);
        this.isTransitioning = false;
        onComplete();
      }
    };

    requestAnimationFrame(animate);
  }

  private showEnding(): void {
    this.clearChoiceButtons();
    this.showDropZone(false);
    const evaluation = chaptersManager.getEndingEvaluation();

    if (this.endingContainer) {
      this.endingContainer.destroy();
      this.endingContainer = null;
    }

    const { width, height } = this.scale;

    this.endingContainer = this.add.container(width / 2, height / 2);
    this.endingContainer.setDepth(600);
    this.endingContainer.setScrollFactor(0);
    this.endingContainer.setAlpha(0);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0);
    bg.fillRect(-width, -height, width * 2, height * 2);
    this.endingContainer.add(bg);

    this.tweens.add({
      targets: bg,
      fillAlpha: 0.92,
      duration: 1500,
      ease: 'Cubic.easeIn',
      delay: 0,
    });

    const titleColor = evaluation.type === 'victory' ? '#ffd700' : evaluation.type === 'normal' ? '#a0d8ef' : '#d06060';
    const titleFont = this.getFontSize(24, 42);
    const titleText = this.add.text(0, -height * 0.28, evaluation.title, {
      fontFamily: 'Georgia, SimSun, serif',
      fontSize: `${titleFont}px`,
      color: titleColor,
      fontStyle: 'bold',
      align: 'center',
    });
    titleText.setOrigin(0.5);
    titleText.setAlpha(0);
    this.endingContainer.add(titleText);

    this.tweens.add({
      targets: titleText,
      alpha: 1,
      y: '-=15',
      duration: 1000,
      ease: 'Cubic.easeOut',
      delay: 1200,
    });

    const lineFontSize = this.getFontSize(13, 20);
    evaluation.lines.forEach((line, idx) => {
      const lineText = this.add.text(
        0,
        -height * 0.14 + idx * (lineFontSize * 1.8),
        line,
        {
          fontFamily: 'Georgia, SimSun, serif',
          fontSize: `${lineFontSize}px`,
          color: '#f5e6d0',
          align: 'center',
        }
      );
      lineText.setOrigin(0.5);
      lineText.setAlpha(0);
      this.endingContainer.add(lineText);

      this.tweens.add({
        targets: lineText,
        alpha: 1,
        y: '-=8',
        duration: 600,
        ease: 'Cubic.easeOut',
        delay: 1800 + idx * 200,
      });
    });

    const btnW = Math.min(220, width * 0.3);
    const btnH = Math.max(44, Math.min(56, height * 0.06));
    const restartBtn = this.add.container(0, height * 0.28);
    restartBtn.setAlpha(0);
    this.endingContainer.add(restartBtn);

    const restartBg = this.add.graphics();
    restartBg.fillStyle(0x5a4a7a, 0.9);
    this.drawRoundedRect(restartBg, -btnW / 2, -btnH / 2, btnW, btnH, btnH / 2);
    restartBg.lineStyle(2, 0xd4a853, 0.7);
    this.drawRoundedRect(restartBg, -btnW / 2, -btnH / 2, btnW, btnH, btnH / 2);
    restartBtn.add(restartBg);

    const restartText = this.add.text(0, 0, '🔄 重新开始冒险', {
      fontFamily: 'Georgia, SimSun, serif',
      fontSize: `${this.getFontSize(14, 18)}px`,
      color: '#f5e6d0',
      fontStyle: 'bold',
    });
    restartText.setOrigin(0.5);
    restartBtn.add(restartText);

    restartBtn.setSize(btnW, btnH);
    restartBtn.setInteractive(
      new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH),
      Phaser.Geom.Rectangle.Contains
    );
    restartBtn.input.cursor = 'pointer';

    restartBtn.on('pointerover', () => {
      this.tweens.add({ targets: restartBtn, scale: 1.05, duration: 100, ease: 'Quad.easeOut' });
    });
    restartBtn.on('pointerout', () => {
      this.tweens.add({ targets: restartBtn, scale: 1, duration: 100, ease: 'Quad.easeOut' });
    });
    restartBtn.on('pointerdown', () => {
      this.tweens.add({ targets: restartBtn, scale: 0.97, duration: 60 });
    });
    restartBtn.on('pointerup', () => {
      this.tweens.add({ targets: restartBtn, scale: 1.05, duration: 60 });
      this.restartGame();
    });

    this.tweens.add({
      targets: restartBtn,
      alpha: 1,
      duration: 800,
      delay: 1800 + evaluation.lines.length * 200 + 500,
      ease: 'Cubic.easeOut',
    });

    eventBus.emit(GameEvents.GAME_ENDING, evaluation);
  }

  private restartGame(): void {
    if (this.endingContainer) {
      this.tweens.add({
        targets: this.endingContainer,
        alpha: 0,
        duration: 600,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          this.endingContainer?.destroy();
          this.endingContainer = null;
          this.startStory();
        },
      });
    } else {
      this.startStory();
    }
  }

  private messageContainer!: Phaser.GameObjects.Container | null = null;

  private showFloatingMessage(text: string, duration = 2500): void {
    if (this.messageContainer) {
      this.messageContainer.destroy();
    }
    const { width, height } = this.scale;
    this.messageContainer = this.add.container(width / 2, height * 0.3);
    this.messageContainer.setDepth(550);
    this.messageContainer.setScrollFactor(0);
    this.messageContainer.setAlpha(0);

    const fontSize = this.getFontSize(13, 18);
    const padX = 24;
    const padY = 14;
    const tmp = this.add.text(0, 0, text, { fontSize: `${fontSize}px`, wordWrap: { width: width * 0.5 } });
    const w = tmp.width + padX * 2;
    const h = tmp.height + padY * 2;
    tmp.destroy();

    const g = this.add.graphics();
    g.fillStyle(0x1a1a2e, 0.92);
    this.drawRoundedRect(g, -w / 2, -h / 2, w, h, 14);
    g.lineStyle(2, 0xd4a853, 0.7);
    this.drawRoundedRect(g, -w / 2, -h / 2, w, h, 14);
    this.messageContainer.add(g);

    const msg = this.add.text(0, 0, text, {
      fontFamily: 'Georgia, SimSun, serif',
      fontSize: `${fontSize}px`,
      color: '#f5e6d0',
      align: 'center',
      wordWrap: { width: width * 0.5 - padX * 2 },
    });
    msg.setOrigin(0.5);
    this.messageContainer.add(msg);

    this.tweens.add({
      targets: this.messageContainer,
      alpha: 1,
      y: height * 0.3 - 10,
      duration: 300,
      ease: 'Back.easeOut',
    });

    this.time.delayedCall(duration, () => {
      if (this.messageContainer) {
        this.tweens.add({
          targets: this.messageContainer,
          alpha: 0,
          y: height * 0.3 - 20,
          duration: 400,
          ease: 'Cubic.easeIn',
          onComplete: () => {
            this.messageContainer?.destroy();
            this.messageContainer = null;
          },
        });
      }
    });
  }

  private hexToNum(hex: string): number {
    const clean = hex.replace('#', '');
    return parseInt(clean.length === 3
      ? clean.split('').map((c) => c + c).join('')
      : clean, 16);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const num = this.hexToNum(hex);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  private hexToRgba(hex: string, alpha: number): string {
    const { r, g, b } = this.hexToRgb(hex);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  private tintToRgb(tint: number): { r: number; g: number; b: number } {
    return { r: (tint >> 16) & 255, g: (tint >> 8) & 255, b: tint & 255 };
  }

  private lightenHex(hex: string, amt: number): string {
    const { r, g, b } = this.hexToRgb(hex);
    const nr = Math.min(255, Math.round(r + (255 - r) * amt));
    const ng = Math.min(255, Math.round(g + (255 - g) * amt));
    const nb = Math.min(255, Math.round(b + (255 - b) * amt));
    return `#${[nr, ng, nb].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  }

  private darkenHex(hex: string, amt: number): string {
    const { r, g, b } = this.hexToRgb(hex);
    const nr = Math.max(0, Math.round(r * (1 - amt)));
    const ng = Math.max(0, Math.round(g * (1 - amt)));
    const nb = Math.max(0, Math.round(b * (1 - amt)));
    return `#${[nr, ng, nb].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  }

  private drawRoundedRect(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    const r = Math.min(radius, width / 2, height / 2);
    graphics.beginPath();
    graphics.moveTo(x + r, y);
    graphics.lineTo(x + width - r, y);
    graphics.arc(x + width - r, y + r, r, -Math.PI / 2, 0);
    graphics.lineTo(x + width, y + height - r);
    graphics.arc(x + width - r, y + height - r, r, 0, Math.PI / 2);
    graphics.lineTo(x + r, y + height);
    graphics.arc(x + r, y + height - r, r, Math.PI / 2, Math.PI);
    graphics.lineTo(x, y + r);
    graphics.arc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
  }
}

export { STORY_KEY as STORY_SCENE_KEY };
