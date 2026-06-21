import Phaser from 'phaser';
import { ComboEditor, ComboRule } from './ComboEditor';
import { PlayerCharacter, DEFAULT_SKILL_NAMES } from './PlayerCharacter';

interface Particle {
  gfx: Phaser.GameObjects.Graphics;
  life: number;
  maxLife: number;
  update: (dt: number, life: number) => void;
}

interface StatData {
  totalSequences: number;
  successCount: number;
  triggerTimes: number[];
  comboUsage: Map<string, number>;
  sequenceStartTime: number;
}

class SandboxScene extends Phaser.Scene {
  private player!: PlayerCharacter;
  private editor!: ComboEditor;
  private rules: ComboRule[] = [];
  private particles: Particle[] = [];
  private enemyDummy!: Phaser.GameObjects.Container;
  private enemyStaggerTimer = 0;
  private healthBarBg!: Phaser.GameObjects.Graphics;
  private healthBarFill!: Phaser.GameObjects.Graphics;
  private hp = 1000;
  private maxHp = 1000;
  private stats: StatData;
  private missTextEl!: HTMLElement;
  private keyIndicatorEl!: HTMLElement;
  private keyAFlash!: Phaser.GameObjects.Graphics;
  private keyBFlash!: Phaser.GameObjects.Graphics;
  private shockwave!: Phaser.GameObjects.Graphics;
  private shockwaveLife = 0;
  private bgGfx!: Phaser.GameObjects.Graphics;
  private floorGfx!: Phaser.GameObjects.Graphics;
  private damageTexts: { text: Phaser.GameObjects.Text; life: number; vy: number }[] = [];
  private skillNameText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'SandboxScene' });
    this.stats = {
      totalSequences: 0,
      successCount: 0,
      triggerTimes: [],
      comboUsage: new Map(),
      sequenceStartTime: 0,
    };
  }

  init(data: { editor: ComboEditor; rules: ComboRule[] }): void {
    this.editor = data.editor;
    this.rules = data.rules;
  }

  create(): void {
    this.missTextEl = document.getElementById('miss-text')!;
    this.keyIndicatorEl = document.getElementById('key-indicator')!;

    this.drawBackground();
    this.drawFloor();
    this.createHealthBar();
    this.createEnemy();
    this.createPlayer();
    this.createKeyFlashes();

    this.skillNameText = this.add.text(600, 80, '', {
      fontSize: '28px',
      fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
      color: '#ffdd44',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0).setDepth(20);

    this.input.keyboard!.on('keydown-A', () => this.handleKey('A'));
    this.input.keyboard!.on('keydown-B', () => this.handleKey('B'));

    this.updateStats();
  }

  private drawBackground(): void {
    this.bgGfx = this.add.graphics();
    const w = 1200;
    const h = 600;
    for (let y = 0; y < h; y++) {
      const t = y / h;
      const r = Math.floor(40 + t * 20);
      const g = Math.floor(50 + t * 15);
      const b = Math.floor(80 + t * 20);
      this.bgGfx.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
      this.bgGfx.fillRect(0, y, w, 1);
    }
    this.bgGfx.setDepth(0);
  }

  private drawFloor(): void {
    this.floorGfx = this.add.graphics();
    const floorY = 460;
    this.floorGfx.fillStyle(0x555566, 1);
    this.floorGfx.fillRect(0, floorY, 1200, 140);

    for (let x = 0; x < 1200; x += 60) {
      this.floorGfx.lineStyle(1, 0x444455, 0.6);
      this.floorGfx.strokeRect(x, floorY, 60, 30);
      this.floorGfx.strokeRect(x + 30, floorY + 30, 60, 30);
      for (let bx = x; bx < x + 60; bx += 20) {
        for (let by = floorY; by < floorY + 30; by += 15) {
          const shade = 0x555566 + Math.floor(Math.random() * 0x0a0a0a);
          this.floorGfx.fillStyle(shade & 0xffffff, 0.3);
          this.floorGfx.fillRect(bx + 2, by + 2, 16, 11);
        }
      }
    }
    this.floorGfx.setDepth(1);
  }

  private createHealthBar(): void {
    const hbX = 400;
    const hbY = 490;
    this.healthBarBg = this.add.graphics();
    this.healthBarBg.fillStyle(0x333333, 1);
    this.healthBarBg.fillRoundedRect(hbX, hbY, 400, 20, 4);
    this.healthBarBg.fillStyle(0x222222, 0.4);
    this.healthBarBg.fillRect(hbX + 2, hbY + 2, 396, 16);
    this.healthBarBg.setDepth(15);

    this.healthBarFill = this.add.graphics();
    this.drawHealthFill(hbX, hbY);
    this.healthBarFill.setDepth(16);
  }

  private drawHealthFill(x: number, y: number): void {
    this.healthBarFill.clear();
    const ratio = Math.max(0, this.hp / this.maxHp);
    const fillW = Math.floor(396 * ratio);
    if (fillW > 0) {
      this.healthBarFill.fillStyle(0x00ff88, 1);
      this.healthBarFill.fillRoundedRect(x + 2, y + 2, fillW, 16, 3);
      this.healthBarFill.fillStyle(0x44ffaa, 0.4);
      this.healthBarFill.fillRect(x + 4, y + 3, fillW - 4, 6);
    }
  }

  private createEnemy(): void {
    this.enemyDummy = this.add.container(800, 380);
    const bodyGfx = this.add.graphics();
    bodyGfx.fillStyle(0x8B6914, 1);
    bodyGfx.fillRoundedRect(-25, -55, 50, 110, 6);
    bodyGfx.fillStyle(0x6B4E0A, 0.5);
    for (let i = 0; i < 5; i++) {
      const lx = -20 + Math.floor(Math.random() * 40);
      const ly = -50 + Math.floor(Math.random() * 100);
      bodyGfx.fillRect(lx, ly, 8 + Math.floor(Math.random() * 10), 3);
    }
    bodyGfx.fillStyle(0x5a3a00, 1);
    bodyGfx.fillRoundedRect(-15, -70, 30, 20, 4);
    const xGfx = this.add.graphics();
    xGfx.lineStyle(3, 0xcc4444, 0.6);
    xGfx.lineBetween(-8, -64, 8, -56);
    xGfx.lineBetween(8, -64, -8, -56);

    this.enemyDummy.add([bodyGfx, xGfx]);
    this.enemyDummy.setDepth(10);
  }

  private createPlayer(): void {
    this.player = new PlayerCharacter(this, 380, 440);
    this.player.getContainer().setDepth(10);

    this.player.setOnComboHit((skillName: string, damage: number) => {
      this.onComboHit(skillName, damage);
    });

    this.player.setOnMiss(() => {
      this.onComboMiss();
    });

    this.player.setOnKeyInput((key: string) => {
      this.onKeyInput(key);
    });
  }

  private createKeyFlashes(): void {
    this.keyAFlash = this.add.graphics();
    this.keyAFlash.setDepth(25);
    this.keyAFlash.setAlpha(0);

    this.keyBFlash = this.add.graphics();
    this.keyBFlash.setDepth(25);
    this.keyBFlash.setAlpha(0);

    this.shockwave = this.add.graphics();
    this.shockwave.setDepth(9);
    this.shockwave.setAlpha(0);
  }

  private handleKey(key: string): void {
    if (this.particles.length > 30) {
      const oldest = this.particles.shift();
      if (oldest) oldest.gfx.destroy();
    }

    this.player.handleKey(key, this.rules.map(r => ({
      name: r.name,
      sequence: r.sequence,
      damage: r.damage,
    })));
  }

  private onKeyInput(key: string): void {
    const pos = this.player.getPosition();
    this.showKeyFlash(key, pos.x, pos.y + 30);
    this.showShockwave(pos.x, pos.y + 20);
    this.keyIndicatorEl.style.display = 'block';

    if (this.player.getInputBuffer().length === 1) {
      this.stats.sequenceStartTime = performance.now();
    }
  }

  private showKeyFlash(key: string, x: number, y: number): void {
    const gfx = key === 'A' ? this.keyAFlash : this.keyBFlash;
    gfx.setPosition(x, y);
    gfx.setAlpha(1);

    const particle: Particle = {
      gfx: this.add.graphics().setPosition(x, y).setDepth(25),
      life: 300,
      maxLife: 300,
      update: (dt, life) => {
        const p = 1 - life / 300;
        const scale = 1 + p * 2;
        const alpha = 1 - p;
        const g = particle.gfx;
        g.clear();
        g.fillStyle(key === 'A' ? 0x44aaff : 0xff4466, alpha);
        g.fillCircle(0, 0, 8 * scale);
        g.fillStyle(0xffffff, alpha * 0.6);
        g.fillCircle(0, 0, 3 * scale);
      },
    };
    particle.gfx.setAlpha(1);
    this.particles.push(particle);
  }

  private showShockwave(x: number, y: number): void {
    this.shockwave.clear();
    this.shockwave.setPosition(x, y);
    this.shockwaveLife = 300;
    this.shockwave.setAlpha(0.8);
  }

  private onComboHit(skillName: string, damage: number): void {
    this.stats.successCount++;
    this.stats.totalSequences++;
    const elapsed = (performance.now() - this.stats.sequenceStartTime) / 1000;
    this.stats.triggerTimes.push(elapsed);
    const usage = this.stats.comboUsage.get(skillName) || 0;
    this.stats.comboUsage.set(skillName, usage + 1);

    this.showSkillName(skillName);
    this.showHitEffect();
    this.hitEnemy(damage);
    this.updateStats();
  }

  private onComboMiss(): void {
    this.stats.totalSequences++;
    this.showMissText();
    this.updateStats();
  }

  private showSkillName(name: string): void {
    this.skillNameText.setText(name);
    this.skillNameText.setAlpha(1);
    this.tweens.add({
      targets: this.skillNameText,
      alpha: 0,
      y: 60,
      duration: 800,
      ease: 'Power2',
    });
  }

  private showHitEffect(): void {
    const hitX = this.player.getPosition().x + 50;
    const hitY = this.player.getPosition().y - 20;
    const type = Math.floor(Math.random() * 3);

    const particle: Particle = {
      gfx: this.add.graphics().setPosition(hitX, hitY).setDepth(20),
      life: 600,
      maxLife: 600,
      update: (dt, life) => {
        const p = 1 - life / 600;
        const alpha = 1 - p;
        const g = particle.gfx;
        g.clear();

        if (type === 0) {
          for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i + p * 0.5;
            const dist = 15 + p * 40;
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist;
            g.fillStyle(0xffaa33, alpha);
            g.fillCircle(px, py, 4 * (1 - p));
          }
        } else if (type === 1) {
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i;
            const len = 20 + p * 50;
            g.lineStyle(2, 0xffdd44, alpha);
            g.beginPath();
            g.moveTo(0, 0);
            g.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
            g.strokePath();
          }
        } else {
          for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = p * 45;
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist - p * 20;
            const size = 3 + Math.random() * 3;
            g.fillStyle(i % 2 === 0 ? 0xff6644 : 0xffcc44, alpha);
            g.fillRect(px - size / 2, py - size / 2, size, size);
          }
        }
      },
    };
    this.particles.push(particle);
  }

  private hitEnemy(damage: number): void {
    this.hp = Math.max(0, this.hp - damage);
    this.drawHealthFill(400, 490);

    this.enemyStaggerTimer = 300;
    this.tweens.add({
      targets: this.enemyDummy,
      angle: 15,
      duration: 150,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.enemyDummy.setAngle(0);
      },
    });

    const hitX = this.enemyDummy.x - 30;
    const hitY = this.enemyDummy.y - 40;
    const dmgVal = -(50 + Math.floor(Math.random() * 51));
    const dmgText = this.add.text(hitX, hitY, dmgVal.toString(), {
      fontSize: '22px',
      fontFamily: '"Segoe UI", "Microsoft YaHei", sans-serif',
      color: '#ffee66',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(25);

    this.damageTexts.push({ text: dmgText, life: 600, vy: -1.5 });
  }

  private showMissText(): void {
    this.missTextEl.style.display = 'block';
    let shakeCount = 0;
    const shake = () => {
      if (shakeCount >= 6) {
        this.missTextEl.style.display = 'none';
        this.missTextEl.style.transform = 'translateX(-50%)';
        return;
      }
      const offset = (shakeCount % 2 === 0 ? 4 : -4) * (1 - shakeCount / 6);
      this.missTextEl.style.transform = `translateX(calc(-50% + ${offset}px))`;
      shakeCount++;
      requestAnimationFrame(shake);
    };
    requestAnimationFrame(shake);
  }

  private updateStats(): void {
    const rate = this.stats.totalSequences > 0
      ? ((this.stats.successCount / this.stats.totalSequences) * 100).toFixed(1)
      : '0.0';
    const avgTime = this.stats.triggerTimes.length > 0
      ? (this.stats.triggerTimes.reduce((a, b) => a + b, 0) / this.stats.triggerTimes.length).toFixed(1)
      : '0.0';

    let bestCombo = '-';
    let bestCount = 0;
    this.stats.comboUsage.forEach((count, name) => {
      if (count > bestCount) {
        bestCount = count;
        bestCombo = name;
      }
    });

    document.getElementById('stat-rate')!.textContent = rate + '%';
    document.getElementById('stat-time')!.textContent = avgTime + 's';
    document.getElementById('stat-best')!.textContent = bestCombo;
  }

  update(_time: number, delta: number): void {
    this.player.update(delta);
    this.updateParticles(delta);
    this.updateShockwave(delta);
    this.updateDamageTexts(delta);
  }

  private updateParticles(delta: number): void {
    const toRemove: number[] = [];
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life -= delta;
      if (p.life <= 0) {
        p.gfx.destroy();
        toRemove.push(i);
      } else {
        p.update(delta, p.life);
      }
    }
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.particles.splice(toRemove[i], 1);
    }
    while (this.particles.length > 30) {
      const oldest = this.particles.shift();
      if (oldest) oldest.gfx.destroy();
    }
  }

  private updateShockwave(delta: number): void {
    if (this.shockwaveLife > 0) {
      this.shockwaveLife -= delta;
      const p = 1 - this.shockwaveLife / 300;
      const radius = Math.max(0.1, p * 30);
      const alpha = 0.8 * (1 - p);
      this.shockwave.clear();
      this.shockwave.lineStyle(2, 0x44aaff, alpha);
      this.shockwave.strokeCircle(0, 0, radius);
      this.shockwave.setAlpha(1);
    } else {
      this.shockwave.clear();
    }
  }

  private updateDamageTexts(delta: number): void {
    const toRemove: number[] = [];
    for (let i = 0; i < this.damageTexts.length; i++) {
      const dt = this.damageTexts[i];
      dt.life -= delta;
      dt.text.y += dt.vy;
      dt.text.setAlpha(Math.max(0, dt.life / 600));
      if (dt.life <= 0) {
        dt.text.destroy();
        toRemove.push(i);
      }
    }
    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.damageTexts.splice(toRemove[i], 1);
    }
  }
}

const GAME_W = 1200;
const GAME_H = 600;

function calcCanvasScale(): number {
  const editorW = 360;
  const availW = window.innerWidth - editorW - 20;
  const availH = window.innerHeight;
  const scaleX = availW / GAME_W;
  const scaleY = availH / GAME_H;
  return Math.min(scaleX, scaleY, 1);
}

let phaserGame: Phaser.Game | null = null;
let currentEditor: ComboEditor;

function initEditor(): void {
  currentEditor = new ComboEditor();

  currentEditor.setOnRulesChanged((rules: ComboRule[]) => {
    // rules updated
  });

  currentEditor.setOnEnterSandbox(() => {
    enterSandbox();
  });

  const btnBack = document.getElementById('btn-back-editor')!;
  btnBack.addEventListener('click', () => exitSandbox());

  const statsPanel = document.getElementById('stats-panel')!;
  const btnExport = document.getElementById('btn-export')!;
  const jsonOutput = document.getElementById('json-output')!;

  btnExport.addEventListener('click', () => {
    const json = currentEditor.exportJSON();
    jsonOutput.textContent = json;
    jsonOutput.style.display = 'block';
    const range = document.createRange();
    range.selectNodeContents(jsonOutput);
    const sel = window.getSelection();
    sel!.removeAllRanges();
    sel!.addRange(range);
  });

  btnBack.addEventListener('click', () => {
    statsPanel.classList.remove('active');
    jsonOutput.style.display = 'none';
  });
}

function enterSandbox(): void {
  const panel = document.getElementById('editor-panel')!;
  panel.classList.add('collapsed');

  const btnBack = document.getElementById('btn-back-editor')!;
  btnBack.style.display = 'block';

  const statsPanel = document.getElementById('stats-panel')!;
  statsPanel.classList.add('active');

  const keyInd = document.getElementById('key-indicator')!;
  keyInd.style.display = 'block';

  if (phaserGame) {
    phaserGame.destroy(true);
  }

  const scale = calcCanvasScale();

  phaserGame = new Phaser.Game({
    type: Phaser.AUTO,
    width: GAME_W,
    height: GAME_H,
    parent: 'game-container',
    backgroundColor: '#2a2a4a',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [SandboxScene],
    input: {
      keyboard: true,
    },
    fps: {
      target: 60,
      forceSetTimeOut: false,
    },
    physics: {
      default: 'arcade',
    },
  });

  phaserGame.scene.start('SandboxScene', {
    editor: currentEditor,
    rules: currentEditor.getRules(),
  });
}

function exitSandbox(): void {
  const panel = document.getElementById('editor-panel')!;
  panel.classList.remove('collapsed');

  const btnBack = document.getElementById('btn-back-editor')!;
  btnBack.style.display = 'none';

  const statsPanel = document.getElementById('stats-panel')!;
  statsPanel.classList.remove('active');

  const keyInd = document.getElementById('key-indicator')!;
  keyInd.style.display = 'none';

  const missEl = document.getElementById('miss-text')!;
  missEl.style.display = 'none';

  const jsonOutput = document.getElementById('json-output')!;
  jsonOutput.style.display = 'none';

  if (phaserGame) {
    phaserGame.destroy(true);
    phaserGame = null;
  }
}

initEditor();
