import Phaser from 'phaser';
import { CRTEffect } from './CRTEffect';
import { SceneManager } from './SceneManager';
import { DialogSystem, DialogHistoryEntry } from './DialogSystem';

const GAME_WIDTH = 800;
const GAME_HEIGHT = 480;
const PLAYER_SPEED = 100;

class MainGameScene extends Phaser.Scene {
  private crtEffect!: CRTEffect;
  private sceneManager!: SceneManager;
  private dialogSystem!: DialogSystem;
  private player!: Phaser.GameObjects.Container;
  private playerSprite!: Phaser.GameObjects.Graphics;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private mKey!: Phaser.Input.Keyboard.Key;
  private rKey!: Phaser.Input.Keyboard.Key;
  private hKey!: Phaser.Input.Keyboard.Key;
  private playerVelocity: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  private isMoving: boolean = false;
  private audioContext: AudioContext | null = null;
  private bgmOscillator: OscillatorNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmPitch: number = 220;
  private isTransitioning: boolean = false;
  private transitionOverlay!: Phaser.GameObjects.Graphics;
  private nearbyInteractionPoint: any = null;
  private interactHint!: Phaser.GameObjects.Text;
  private debugPanel!: Phaser.GameObjects.Container;
  private debugPanelOpen: boolean = false;
  private sliderValue: number = 0;
  private sliderDisplay!: Phaser.GameObjects.Graphics;
  private sliderValueText!: Phaser.GameObjects.Text;
  private historyPanel!: Phaser.GameObjects.Container;
  private historyPanelOpen: boolean = false;
  private sceneNameLabel!: Phaser.GameObjects.Text;
  private controlsHint!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MainGameScene' });
  }

  preload(): void {
  }

  create(): void {
    this.initAudio();
    this.sceneManager = new SceneManager(this);
    this.sceneManager.generateTilesetTexture();
    this.sceneManager.loadScene('room');

    this.crtEffect = new CRTEffect(this, GAME_WIDTH, GAME_HEIGHT);

    this.dialogSystem = new DialogSystem(this);
    this.dialogSystem.setPitchShiftCallback((shift) => this.onPitchShift(shift));
    this.dialogSystem.setOnDialogCompleteCallback(() => this.onDialogComplete());

    this.createPlayer();
    this.createUI();
    this.setupInput();
    this.playBGM();
    this.startCRTPulse();
  }

  private initAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio not supported:', e);
    }
  }

  private playClickSound(): void {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const noise = ctx.createBufferSource();

    const bufferSize = ctx.sampleRate * 0.05;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    noise.buffer = noiseBuffer;

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.08, ctx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

    osc.connect(gain).connect(ctx.destination);
    noise.connect(noiseGain).connect(ctx.destination);

    osc.start(ctx.currentTime);
    noise.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
    noise.stop(ctx.currentTime + 0.06);
  }

  private playTransitionSound(): void {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(440, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(20, ctx.currentTime + 0.5);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(880, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.5);
    osc2.stop(ctx.currentTime + 0.5);
  }

  private playBGM(): void {
    if (!this.audioContext) return;
    this.stopBGM();
    const ctx = this.audioContext;

    this.bgmGain = ctx.createGain();
    this.bgmGain.gain.setValueAtTime(0.05, ctx.currentTime);

    this.bgmOscillator = ctx.createOscillator();
    this.bgmOscillator.type = 'triangle';
    this.bgmOscillator.frequency.setValueAtTime(this.bgmPitch, ctx.currentTime);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(0.3, ctx.currentTime);
    lfoGain.gain.setValueAtTime(5, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(this.bgmOscillator.frequency);
    lfo.start();

    this.bgmOscillator.connect(this.bgmGain);
    this.bgmGain.connect(ctx.destination);
    this.bgmOscillator.start();

    this.scheduleBGMNotes();
  }

  private scheduleBGMNotes(): void {
    if (!this.audioContext || !this.bgmOscillator) return;
    const ctx = this.audioContext;
    const notes = [0, 4, 7, 4, 5, 9, 7, 4];
    const noteDuration = 400;

    let step = 0;
    const playNextNote = () => {
      if (!this.bgmOscillator) return;
      const semitone = notes[step % notes.length];
      const freq = this.bgmPitch * Math.pow(2, semitone / 12);
      this.bgmOscillator.frequency.cancelScheduledValues(ctx.currentTime);
      this.bgmOscillator.frequency.setValueAtTime(freq, ctx.currentTime);
      step++;
      setTimeout(playNextNote, noteDuration);
    };
    playNextNote();
  }

  private stopBGM(): void {
    if (this.bgmOscillator) {
      try {
        this.bgmOscillator.stop();
      } catch (e) {
      }
      this.bgmOscillator.disconnect();
      this.bgmOscillator = null;
    }
    if (this.bgmGain) {
      this.bgmGain.disconnect();
      this.bgmGain = null;
    }
  }

  private onPitchShift(semitones: number): void {
    this.bgmPitch *= Math.pow(2, semitones / 12);
    if (this.audioContext && this.bgmOscillator) {
      this.bgmOscillator.frequency.setValueAtTime(this.bgmPitch, this.audioContext.currentTime);
    }
  }

  private createPlayer(): void {
    const sceneData = this.sceneManager.getCurrentSceneData();
    const startX = sceneData.playerStart.x * sceneData.tileSize + sceneData.tileSize / 2;
    const startY = sceneData.playerStart.y * sceneData.tileSize + sceneData.tileSize / 2;

    this.player = this.add.container(startX, startY);
    this.player.setDepth(100);

    this.playerSprite = this.add.graphics();
    this.drawPlayerSprite();
    this.player.add(this.playerSprite);

    this.player.setSize(sceneData.tileSize * 0.8, sceneData.tileSize * 0.9);

    this.physics.world.enable(this.player);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setSize(sceneData.tileSize * 0.6, sceneData.tileSize * 0.7);

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(
      0,
      0,
      sceneData.mapWidth * sceneData.tileSize,
      sceneData.mapHeight * sceneData.tileSize
    );
  }

  private drawPlayerSprite(): void {
    this.playerSprite.clear();
    const s = 2;
    const x = -4 * s;
    const y = -8 * s;
    this.playerSprite.fillStyle(0x5a3921, 1);
    this.playerSprite.fillRect(x + 2 * s, y + 0 * s, 4 * s, 3 * s);
    this.playerSprite.fillStyle(0xd4a574, 1);
    this.playerSprite.fillRect(x + 2 * s, y + 1 * s, 4 * s, 2 * s);
    this.playerSprite.fillStyle(0x000000, 1);
    this.playerSprite.fillRect(x + 3 * s, y + 1 * s, 1 * s, 1 * s);
    this.playerSprite.fillRect(x + 5 * s, y + 1 * s, 1 * s, 1 * s);
    this.playerSprite.fillStyle(0xcc3333, 1);
    this.playerSprite.fillRect(x + 1 * s, y + 3 * s, 6 * s, 4 * s);
    this.playerSprite.fillStyle(0xaa2222, 1);
    this.playerSprite.fillRect(x + 1 * s, y + 3 * s, 6 * s, 1 * s);
    this.playerSprite.fillStyle(0xd4a574, 1);
    this.playerSprite.fillRect(x + 0 * s, y + 4 * s, 1 * s, 2 * s);
    this.playerSprite.fillRect(x + 7 * s, y + 4 * s, 1 * s, 2 * s);
    this.playerSprite.fillStyle(0x2d2a34, 1);
    this.playerSprite.fillRect(x + 1 * s, y + 7 * s, 2 * s, 3 * s);
    this.playerSprite.fillRect(x + 5 * s, y + 7 * s, 2 * s, 3 * s);
    this.playerSprite.fillStyle(0x1a1820, 1);
    this.playerSprite.fillRect(x + 1 * s, y + 10 * s, 2 * s, 1 * s);
    this.playerSprite.fillRect(x + 5 * s, y + 10 * s, 2 * s, 1 * s);
  }

  private createUI(): void {
    this.sceneNameLabel = this.add.text(16, 16, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '12px',
      color: '#E3D088',
      backgroundColor: 'rgba(45, 42, 52, 0.85)',
      padding: { x: 10, y: 6 },
    });
    this.sceneNameLabel.setScrollFactor(0);
    this.sceneNameLabel.setDepth(900);
    this.updateSceneNameLabel();

    this.controlsHint = this.add.text(16, GAME_HEIGHT - 40, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#B8B0A0',
      backgroundColor: 'rgba(45, 42, 52, 0.7)',
      padding: { x: 8, y: 5 },
    });
    this.controlsHint.setScrollFactor(0);
    this.controlsHint.setDepth(900);
    this.updateControlsHint();

    this.interactHint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 80, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#FFD700',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      padding: { x: 12, y: 6 },
    });
    this.interactHint.setOrigin(0.5);
    this.interactHint.setScrollFactor(0);
    this.interactHint.setDepth(900);
    this.interactHint.setVisible(false);

    this.transitionOverlay = this.add.graphics();
    this.transitionOverlay.setScrollFactor(0);
    this.transitionOverlay.setDepth(2000);

    this.createDebugPanel();
    this.createHistoryPanel();
  }

  private updateSceneNameLabel(): void {
    const name = this.sceneManager.getSceneNameCn();
    this.sceneNameLabel.setText(`【${name}】`);
  }

  private updateControlsHint(): void {
    const hints = [
      '↑↓←→ 移动',
      '空格 交互',
      'M 切换CRT',
      'R 调水波',
      'H 历史',
    ];
    this.controlsHint.setText(hints.join('   |   '));
  }

  private createDebugPanel(): void {
    this.debugPanel = this.add.container(16, 56);
    this.debugPanel.setScrollFactor(0);
    this.debugPanel.setDepth(950);
    this.debugPanel.setVisible(false);

    const panelW = 160;
    const panelH = 70;

    const bg = this.add.graphics();
    bg.fillStyle(0x2d2a34, 0.85);
    bg.fillRoundedRect(0, 0, panelW, panelH, 6);
    bg.lineStyle(2, 0xe3d088, 0.8);
    bg.strokeRoundedRect(0, 0, panelW, panelH, 6);

    const title = this.add.text(8, 8, '水波强度调节', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#E3D088',
    });

    const barBg = this.add.graphics();
    barBg.fillStyle(0x1a1820, 1);
    barBg.fillRect(12, 28, 120, 8);

    this.sliderDisplay = this.add.graphics();

    this.sliderValueText = this.add.text(140, 28, '', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#87CEEB',
    });

    const leftHint = this.add.text(12, 46, '← 减小', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '7px',
      color: '#B8B0A0',
    });
    const rightHint = this.add.text(80, 46, '→ 增大', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '7px',
      color: '#B8B0A0',
    });
    const closeHint = this.add.text(12, 58, 'R 关闭面板', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '7px',
      color: '#FFD700',
    });

    this.debugPanel.add([bg, title, barBg, this.sliderDisplay, this.sliderValueText, leftHint, rightHint, closeHint]);
    this.updateSliderDisplay();
  }

  private updateSliderDisplay(): void {
    const val = Phaser.Math.Clamp(this.sliderValue, 0, 3);
    const pct = val / 3;
    const barW = Math.floor(120 * pct);

    this.sliderDisplay.clear();
    for (let i = 0; i < barW; i++) {
      const alpha = i / 120;
      const r = Math.floor(30 + alpha * 40);
      const g = Math.floor(100 + alpha * 100);
      const b = Math.floor(200 + alpha * 55);
      this.sliderDisplay.fillStyle((r << 16) | (g << 8) | b, 1);
      this.sliderDisplay.fillRect(12 + i, 28, 1, 8);
    }
    this.sliderDisplay.lineStyle(1, 0xe3d088, 0.5);
    this.sliderDisplay.strokeRect(12 + barW - 1, 26, 2, 12);

    const pct100 = Math.round(pct * 100);
    this.sliderValueText.setText(`${pct100}`);
  }

  private createHistoryPanel(): void {
    this.historyPanel = this.add.container(0, GAME_HEIGHT);
    this.historyPanel.setScrollFactor(0);
    this.historyPanel.setDepth(1500);
    this.historyPanel.setVisible(false);

    const panelH = GAME_HEIGHT * 0.35;

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRect(0, GAME_HEIGHT - panelH, GAME_WIDTH, panelH);
    bg.lineStyle(3, 0xe3d088, 0.6);
    bg.beginPath();
    bg.moveTo(0, GAME_HEIGHT - panelH);
    bg.lineTo(GAME_WIDTH, GAME_HEIGHT - panelH);
    bg.strokePath();

    const title = this.add.text(20, GAME_HEIGHT - panelH + 12, '【对话历史记录】', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '10px',
      color: '#E3D088',
    });

    const hint = this.add.text(GAME_WIDTH - 140, GAME_HEIGHT - panelH + 14, '按 H 关闭', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '8px',
      color: '#FFD700',
    });

    this.historyPanel.add([bg, title, hint]);
  }

  private refreshHistoryPanel(): void {
    const existing = this.historyPanel.list.filter((obj) => obj.type === 'Text' && (obj as Phaser.GameObjects.Text).depth === 1501);
    existing.forEach((obj) => obj.destroy());

    const history: DialogHistoryEntry[] = this.dialogSystem.getHistory();
    const panelH = GAME_HEIGHT * 0.35;
    const startY = GAME_HEIGHT - panelH + 42;

    if (history.length === 0) {
      const empty = this.add.text(20, startY, '(暂无对话记录)', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: '#888888',
      });
      empty.setScrollFactor(0);
      empty.setDepth(1501);
      this.historyPanel.add(empty);
      return;
    }

    history.forEach((entry, idx) => {
      const y = startY + idx * 28;
      const header = `[${entry.timestamp}] [${entry.sceneName}]${entry.speaker ? `【${entry.speaker}】` : ''}`;
      const headerText = this.add.text(20, y, header, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '9px',
        color: '#B8B0A0',
      });
      headerText.setScrollFactor(0);
      headerText.setDepth(1501);

      const bodyText = this.add.text(20, y + 14, entry.text.substring(0, 80) + (entry.text.length > 80 ? '...' : ''), {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: '#FFFFFF',
        wordWrap: { width: GAME_WIDTH - 40 },
      });
      bodyText.setScrollFactor(0);
      bodyText.setDepth(1501);

      this.historyPanel.add([headerText, bodyText]);
    });
  }

  private openHistoryPanel(): void {
    if (this.historyPanelOpen || this.dialogSystem.active()) return;
    this.historyPanelOpen = true;
    this.refreshHistoryPanel();
    this.historyPanel.setVisible(true);
    this.historyPanel.y = GAME_HEIGHT;

    this.tweens.add({
      targets: this.historyPanel,
      y: 0,
      duration: 200,
      ease: 'Cubic.easeOut',
    });
  }

  private closeHistoryPanel(): void {
    if (!this.historyPanelOpen) return;
    this.historyPanelOpen = false;

    this.tweens.add({
      targets: this.historyPanel,
      y: GAME_HEIGHT,
      duration: 200,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.historyPanel.setVisible(false);
      },
    });
  }

  private openDebugPanel(): void {
    if (this.debugPanelOpen || this.dialogSystem.active()) return;
    this.debugPanelOpen = true;
    this.debugPanel.setVisible(true);
    this.crtEffect.setManualMode(true);
    this.sliderValue = this.crtEffect.getWaterWaveIntensity();
    this.updateSliderDisplay();
  }

  private closeDebugPanel(): void {
    if (!this.debugPanelOpen) return;
    this.debugPanelOpen = false;
    this.debugPanel.setVisible(false);
    this.crtEffect.setManualMode(false);
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.mKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.rKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.hKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.H);

    this.spaceKey.on('down', () => this.onSpacePress());
    this.mKey.on('down', () => {
      if (!this.dialogSystem.active() && !this.isTransitioning) {
        this.crtEffect.toggleEffects();
      }
    });
    this.rKey.on('down', () => {
      if (!this.dialogSystem.active() && !this.isTransitioning) {
        if (this.debugPanelOpen) {
          this.closeDebugPanel();
        } else {
          this.openDebugPanel();
        }
      }
    });
    this.hKey.on('down', () => {
      if (!this.dialogSystem.active() && !this.isTransitioning) {
        if (this.historyPanelOpen) {
          this.closeHistoryPanel();
        } else {
          this.openHistoryPanel();
        }
      }
    });

    this.input.on('pointerdown', () => {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
    });
  }

  private onSpacePress(): void {
    if (this.isTransitioning) return;

    if (this.dialogSystem.active()) {
      this.dialogSystem.advanceOrComplete();
      this.playClickSound();
      return;
    }

    if (this.nearbyInteractionPoint) {
      this.playClickSound();
      const sceneName = this.sceneManager.getSceneNameCn();
      this.dialogSystem.startDialog(this.nearbyInteractionPoint.dialogId, sceneName);
    }
  }

  private startCRTPulse(): void {
    this.time.addEvent({
      delay: 60,
      loop: true,
      callback: () => {
        this.crtEffect.beginRender();
      },
    });
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    this.crtEffect.update(delta);
    this.dialogSystem.update(delta);

    if (!this.dialogSystem.active() && !this.isTransitioning) {
      this.updatePlayerMovement(delta);
      this.updateDebugPanelSlider();
    } else {
      this.playerVelocity.set(0, 0);
    }

    this.updateInteractionHint();
  }

  private updatePlayerMovement(delta: number): void {
    this.playerVelocity.set(0, 0);

    if (this.cursors.left.isDown) {
      this.playerVelocity.x = -1;
    } else if (this.cursors.right.isDown) {
      this.playerVelocity.x = 1;
    }

    if (this.cursors.up.isDown) {
      this.playerVelocity.y = -1;
    } else if (this.cursors.down.isDown) {
      this.playerVelocity.y = 1;
    }

    this.isMoving = this.playerVelocity.length() > 0;

    if (this.isMoving) {
      this.playerVelocity.normalize();
      this.crtEffect.resetIdleTimer();

      const sceneData = this.sceneManager.getCurrentSceneData();
      const tileSize = sceneData.tileSize;
      const mapWidth = sceneData.mapWidth * tileSize;
      const mapHeight = sceneData.mapHeight * tileSize;

      const dx = this.playerVelocity.x * PLAYER_SPEED * (delta / 1000);
      const dy = this.playerVelocity.y * PLAYER_SPEED * (delta / 1000);

      const newX = Phaser.Math.Clamp(this.player.x + dx, tileSize, mapWidth - tileSize);
      const newY = Phaser.Math.Clamp(this.player.y + dy, tileSize, mapHeight - tileSize);

      this.player.setPosition(newX, newY);
    }
  }

  private updateDebugPanelSlider(): void {
    if (!this.debugPanelOpen) return;

    let changed = false;
    if (this.cursors.left.isDown) {
      this.sliderValue = Math.max(0, this.sliderValue - 0.1);
      changed = true;
    } else if (this.cursors.right.isDown) {
      this.sliderValue = Math.min(3, this.sliderValue + 0.1);
      changed = true;
    }

    if (changed) {
      this.sliderValue = Math.round(this.sliderValue * 10) / 10;
      this.crtEffect.setManualWaterWaveIntensity(this.sliderValue);
      this.updateSliderDisplay();
    }
  }

  private updateInteractionHint(): void {
    if (this.dialogSystem.active() || this.isTransitioning) {
      this.interactHint.setVisible(false);
      this.nearbyInteractionPoint = null;
      return;
    }

    const nearby = this.sceneManager.findNearbyInteraction(this.player.x, this.player.y);
    this.nearbyInteractionPoint = nearby;

    if (nearby) {
      this.interactHint.setText(`▼ 按 [空格] 与 ${nearby.label} 交互 ▼`);
      this.interactHint.setVisible(true);
    } else {
      this.interactHint.setVisible(false);
    }
  }

  private onDialogComplete(): void {
    const nextSceneId = this.sceneManager.getNextSceneId();
    if (nextSceneId) {
      this.playTransitionSound();
      this.startTVShutdownTransition(() => {
        this.switchToScene(nextSceneId);
      });
    }
  }

  private startTVShutdownTransition(onComplete: () => void): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;
    let progress = 0;
    const duration = 500;

    this.time.addEvent({
      delay: 16,
      repeat: Math.floor(duration / 16) - 1,
      callback: () => {
        progress += 16 / duration;
        const t = this.easeInCubic(Math.min(1, progress));
        this.drawTVShutdownFrame(t, centerX, centerY, width, height);

        if (progress >= 1) {
          this.time.delayedCall(100, () => {
            onComplete();
            this.reverseTVShutdownTransition();
          });
        }
      },
    });
  }

  private drawTVShutdownFrame(t: number, cx: number, cy: number, w: number, h: number): void {
    this.transitionOverlay.clear();
    this.transitionOverlay.fillStyle(0x000000, 1);

    const shrinkX = t * 0.95;
    const shrinkY = t * 0.98;
    const currentW = w * (1 - shrinkX);
    const currentH = h * (1 - shrinkY);

    this.transitionOverlay.fillRect(0, 0, w, cy - currentH / 2);
    this.transitionOverlay.fillRect(0, cy + currentH / 2, w, h - (cy + currentH / 2));
    this.transitionOverlay.fillRect(0, cy - currentH / 2, cx - currentW / 2, currentH);
    this.transitionOverlay.fillRect(cx + currentW / 2, cy - currentH / 2, w - (cx + currentW / 2), currentH);

    const lineAlpha = 1 - t * 0.7;
    this.transitionOverlay.lineStyle(2 + (1 - t) * 3, 0xffffff, lineAlpha);
    this.transitionOverlay.strokeRect(
      cx - currentW / 2,
      cy - currentH / 2,
      currentW,
      currentH
    );

    const lineCount = 3 + Math.floor(t * 8);
    this.transitionOverlay.lineStyle(1, 0xffffff, lineAlpha * 0.4);
    for (let i = 1; i <= lineCount; i++) {
      const lineT = i / (lineCount + 1);
      const lineY = cy - currentH / 2 + currentH * lineT;
      this.transitionOverlay.beginPath();
      this.transitionOverlay.moveTo(cx - currentW / 2 + 2, lineY);
      this.transitionOverlay.lineTo(cx + currentW / 2 - 2, lineY);
      this.transitionOverlay.strokePath();
    }

    if (t > 0.7) {
      const centerAlpha = (t - 0.7) / 0.3;
      this.transitionOverlay.fillStyle(0xffffff, centerAlpha * 0.8);
      const dotSize = Math.max(1, (1 - t) * 8);
      this.transitionOverlay.fillRoundedRect(
        cx - dotSize / 2,
        cy - dotSize / 4,
        dotSize,
        dotSize / 2,
        1
      );
    }
  }

  private reverseTVShutdownTransition(): void {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;
    let progress = 1;
    const duration = 300;

    this.time.addEvent({
      delay: 16,
      repeat: Math.floor(duration / 16) - 1,
      callback: () => {
        progress -= 16 / duration;
        const t = this.easeOutCubic(Math.max(0, progress));
        this.drawTVShutdownFrame(t, centerX, centerY, width, height);

        if (progress <= 0) {
          this.transitionOverlay.clear();
          this.isTransitioning = false;
        }
      },
    });
  }

  private switchToScene(sceneId: string): void {
    this.sceneManager.loadScene(sceneId);

    const sceneData = this.sceneManager.getCurrentSceneData();
    const tileSize = sceneData.tileSize;
    const startX = sceneData.playerStart.x * tileSize + tileSize / 2;
    const startY = sceneData.playerStart.y * tileSize + tileSize / 2;
    this.player.setPosition(startX, startY);

    this.cameras.main.setBounds(
      0,
      0,
      sceneData.mapWidth * tileSize,
      sceneData.mapHeight * tileSize
    );

    this.updateSceneNameLabel();
  }

  private easeInCubic(t: number): number {
    return t * t * t;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#2D2A34',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
  },
  input: {
    keyboard: true,
    mouse: true,
  },
  scene: [MainGameScene],
};

window.addEventListener('load', () => {
  const game = new Phaser.Game(config);
});
