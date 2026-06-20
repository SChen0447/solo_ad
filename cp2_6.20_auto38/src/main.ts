import { SceneRenderer } from './sceneRenderer';
import { EnemyFleet, FormationType, FORMATION_TEMPLATES } from './enemyFleet';
import { BulletSystem, BulletPattern } from './bulletSystem';

interface AppState {
  isPlaying: boolean;
  playbackSpeed: number;
  elapsedTime: number;
  maxTime: number;
  bulletPattern: BulletPattern;
  activeFormation: FormationType | null;
}

class Application {
  private renderer!: SceneRenderer;
  private enemyFleet!: EnemyFleet;
  private bulletSystem!: BulletSystem;

  private state: AppState = {
    isPlaying: true,
    playbackSpeed: 1,
    elapsedTime: 0,
    maxTime: 60,
    bulletPattern: 'fan',
    activeFormation: null
  };

  private params = {
    flightSpeed: 5,
    bulletDensity: 10,
    bulletInterval: 500,
    bulletSpread: 60,
    showCollision: false,
    collisionScale: 1.0
  };

  private DOM: Record<string, HTMLElement | null> = {};

  private isDraggingProgress: boolean = false;

  constructor() {
    this.init();
  }

  private init(): void {
    this.collectDOM();
    this.setup3D();
    this.setupFormationCards();
    this.setupToolbar();
    this.setupParamSliders();
    this.setupToggle();
    this.setupTimeline();
    this.bindKeyboard();
    this.renderer.start();
  }

  private collectDOM(): void {
    this.DOM.container = document.getElementById('canvas-container');
    this.DOM.formationList = document.getElementById('formation-list');
    this.DOM.topToolbar = document.getElementById('top-toolbar');
    this.DOM.playBtn = document.getElementById('play-btn');
    this.DOM.timestamp = document.getElementById('timestamp');
    this.DOM.progressBar = document.getElementById('progress-bar');
    this.DOM.progressFill = document.getElementById('progress-fill');
    this.DOM.progressThumb = document.getElementById('progress-thumb');
    this.DOM.collisionToggle = document.getElementById('collision-toggle');

    this.DOM.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.DOM.speedValue = document.getElementById('speed-value');
    this.DOM.densitySlider = document.getElementById('density-slider') as HTMLInputElement;
    this.DOM.densityValue = document.getElementById('density-value');
    this.DOM.intervalSlider = document.getElementById('interval-slider') as HTMLInputElement;
    this.DOM.intervalValue = document.getElementById('interval-value');
    this.DOM.spreadSlider = document.getElementById('spread-slider') as HTMLInputElement;
    this.DOM.spreadValue = document.getElementById('spread-value');
    this.DOM.collisionScaleSlider = document.getElementById('collision-scale-slider') as HTMLInputElement;
    this.DOM.collisionScaleValue = document.getElementById('collision-scale-value');
  }

  private setup3D(): void {
    const container = this.DOM.container as HTMLElement;
    this.renderer = new SceneRenderer({ container });
    this.enemyFleet = new EnemyFleet(this.renderer.scene);
    this.bulletSystem = new BulletSystem(this.renderer.scene, this.enemyFleet);

    this.renderer.onRender((delta, elapsed) => this.onRender(delta, elapsed));
  }

  private setupFormationCards(): void {
    const list = this.DOM.formationList as HTMLElement;

    FORMATION_TEMPLATES.forEach(template => {
      const card = document.createElement('div');
      card.className = 'formation-card';
      card.dataset.type = template.type;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');

      const name = document.createElement('div');
      name.className = 'formation-name';
      name.textContent = template.name;

      const preview = document.createElement('div');
      preview.className = 'formation-preview';
      preview.innerHTML = this.getPreviewSVG(template.preview);

      card.appendChild(name);
      card.appendChild(preview);

      card.addEventListener('click', () => this.selectFormation(template.type, card));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.selectFormation(template.type, card);
        }
      });

      list.appendChild(card);
    });
  }

  private getPreviewSVG(type: string): string {
    const colors = {
      dot: '#22c55e',
      line: 'rgba(34, 197, 94, 0.3)'
    };

    const makeDots = (positions: Array<[number, number]>) => {
      return positions.map(([x, y]) =>
        `<circle cx="${x}" cy="${y}" r="3" fill="${colors.dot}"/>`
      ).join('');
    };

    switch (type) {
      case 'v':
        return `<svg viewBox="0 0 200 80">
          ${makeDots([[100, 15], [75, 30], [125, 30], [50, 45], [150, 45], [25, 60], [175, 60]])}
          <line x1="100" y1="15" x2="25" y2="60" stroke="${colors.line}" stroke-width="1"/>
          <line x1="100" y1="15" x2="175" y2="60" stroke="${colors.line}" stroke-width="1"/>
        </svg>`;
      case 'line':
        return `<svg viewBox="0 0 200 80">
          ${makeDots([[25, 40], [55, 40], [85, 40], [115, 40], [145, 40], [175, 40]])}
          <line x1="25" y1="40" x2="175" y2="40" stroke="${colors.line}" stroke-width="1"/>
        </svg>`;
      case 'wave':
        return `<svg viewBox="0 0 200 80">
          <path d="M20,55 Q50,20 85,40 T150,35 T180,50" fill="none" stroke="${colors.line}" stroke-width="1"/>
          ${makeDots([[20, 55], [50, 25], [85, 40], [120, 30], [155, 35], [180, 50]])}
        </svg>`;
      case 'circle': {
        const cx = 100, cy = 40, r = 25;
        const points = [];
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
          points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r] as [number, number]);
        }
        return `<svg viewBox="0 0 200 80">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colors.line}" stroke-width="1"/>
          ${makeDots(points)}
        </svg>`;
      }
      case 'diamond':
        return `<svg viewBox="0 0 200 80">
          ${makeDots([[100, 15], [65, 40], [135, 40], [100, 65], [100, 40]])}
          <line x1="100" y1="15" x2="65" y2="40" stroke="${colors.line}" stroke-width="1"/>
          <line x1="100" y1="15" x2="135" y2="40" stroke="${colors.line}" stroke-width="1"/>
          <line x1="65" y1="40" x2="100" y2="65" stroke="${colors.line}" stroke-width="1"/>
          <line x1="135" y1="40" x2="100" y2="65" stroke="${colors.line}" stroke-width="1"/>
        </svg>`;
      default:
        return '';
    }
  }

  private selectFormation(type: FormationType, card: HTMLElement): void {
    document.querySelectorAll('.formation-card').forEach(el => {
      el.classList.remove('active');
    });
    card.classList.add('active');

    this.state.activeFormation = type;
    this.state.elapsedTime = 0;
    this.enemyFleet.setFormation(type, 'sine');
    this.enemyFleet.setFlightSpeed(this.params.flightSpeed);
    this.bulletSystem.clearBullets();
  }

  private setupToolbar(): void {
    const toolbar = this.DOM.topToolbar as HTMLElement;
    const buttons = toolbar.querySelectorAll('.bullet-btn');

    buttons.forEach(btn => {
      const pattern = btn.getAttribute('data-pattern') as BulletPattern;

      if (pattern === this.state.bulletPattern) {
        btn.classList.add('active');
      }

      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.state.bulletPattern = pattern;
        this.bulletSystem.setPattern(pattern);
      });
    });
  }

  private setupParamSliders(): void {
    this.bindSlider('speedSlider', 'speedValue', (v) => {
      this.params.flightSpeed = v;
      this.enemyFleet.setFlightSpeed(v);
      return `${v.toFixed(1)} 单位/秒`;
    });

    this.bindSlider('densitySlider', 'densityValue', (v) => {
      this.params.bulletDensity = Math.round(v);
      this.bulletSystem.setParams({ density: this.params.bulletDensity });
      return `${Math.round(v)} 颗/波`;
    });

    this.bindSlider('intervalSlider', 'intervalValue', (v) => {
      this.params.bulletInterval = Math.round(v);
      this.bulletSystem.setParams({ interval: this.params.bulletInterval });
      return `${Math.round(v)} ms`;
    });

    this.bindSlider('spreadSlider', 'spreadValue', (v) => {
      this.params.bulletSpread = Math.round(v);
      this.bulletSystem.setParams({ spreadAngle: this.params.bulletSpread });
      return `${Math.round(v)} °`;
    });

    this.bindSlider('collisionScaleSlider', 'collisionScaleValue', (v) => {
      this.params.collisionScale = Number(v.toFixed(2));
      this.enemyFleet.setCollisionScale(this.params.collisionScale);
      this.bulletSystem.setCollisionScale(this.params.collisionScale);
      return v.toFixed(2);
    });
  }

  private bindSlider(
    sliderKey: string,
    valueKey: string,
    onChange: (value: number) => string
  ): void {
    const slider = this.DOM[sliderKey] as HTMLInputElement;
    const valueDisplay = this.DOM[valueKey] as HTMLElement;
    if (!slider || !valueDisplay) return;

    const update = () => {
      const v = parseFloat(slider.value);
      const text = onChange(v);
      valueDisplay.style.transform = 'scale(1.08)';
      valueDisplay.textContent = text;
      setTimeout(() => {
        valueDisplay.style.transform = 'scale(1)';
      }, 100);
      valueDisplay.style.transition = 'transform 0.1s ease';
    };

    slider.addEventListener('input', update);
  }

  private setupToggle(): void {
    const toggle = this.DOM.collisionToggle as HTMLInputElement;
    toggle.addEventListener('change', () => {
      this.params.showCollision = toggle.checked;
      this.enemyFleet.setShowCollisionBoxes(toggle.checked);
      this.bulletSystem.setShowCollisionBoxes(toggle.checked);
    });
  }

  private setupTimeline(): void {
    const playBtn = this.DOM.playBtn as HTMLElement;
    playBtn.addEventListener('click', () => this.togglePlay());
    playBtn.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.togglePlay();
      }
    });

    const speedGroup = document.querySelector('.speed-group') as HTMLElement;
    speedGroup.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        speedGroup.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.state.playbackSpeed = parseFloat(btn.getAttribute('data-speed') || '1');
      });
    });

    const progressBar = this.DOM.progressBar as HTMLElement;
    progressBar.addEventListener('mousedown', this.onProgressMouseDown);
  }

  private onProgressMouseDown = (e: MouseEvent): void => {
    this.isDraggingProgress = true;
    window.addEventListener('mousemove', this.onProgressMouseMove);
    window.addEventListener('mouseup', this.onProgressMouseUp);
    this.updateProgressFromMouse(e);
  };

  private onProgressMouseMove = (e: MouseEvent): void => {
    if (!this.isDraggingProgress) return;
    this.updateProgressFromMouse(e);
  };

  private onProgressMouseUp = (): void => {
    this.isDraggingProgress = false;
    window.removeEventListener('mousemove', this.onProgressMouseMove);
    window.removeEventListener('mouseup', this.onProgressMouseUp);
  };

  private updateProgressFromMouse(e: MouseEvent): void {
    const bar = this.DOM.progressBar as HTMLElement;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    this.state.elapsedTime = ratio * this.state.maxTime;

    if (this.state.activeFormation) {
      this.enemyFleet.setFormation(this.state.activeFormation, 'sine');
    }
    this.bulletSystem.clearBullets();
  }

  private togglePlay(): void {
    this.state.isPlaying = !this.state.isPlaying;
    const btn = this.DOM.playBtn as HTMLElement;
    btn.style.transform = 'scale(0.9)';
    setTimeout(() => {
      btn.style.transform = 'scale(1)';
    }, 100);
    btn.style.transition = 'transform 0.1s ease';
    btn.textContent = this.state.isPlaying ? '⏸' : '▶';
  }

  private bindKeyboard(): void {
    document.addEventListener('keydown', e => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.togglePlay();
      }
    });
  }

  private onRender(delta: number, _elapsed: number): void {
    if (this.isDraggingProgress) return;

    const scaledDelta = delta * this.state.playbackSpeed;

    if (this.state.isPlaying) {
      this.state.elapsedTime += scaledDelta;
      if (this.state.elapsedTime >= this.state.maxTime) {
        this.state.elapsedTime = 0;
        if (this.state.activeFormation) {
          this.enemyFleet.setFormation(this.state.activeFormation, 'sine');
        }
        this.bulletSystem.clearBullets();
      }
    }

    this.enemyFleet.update(scaledDelta, this.state.elapsedTime);
    this.bulletSystem.update(scaledDelta, this.state.elapsedTime);
    this.updateTimelineUI();
  }

  private updateTimelineUI(): void {
    const t = this.state.elapsedTime;
    const minutes = Math.floor(t / 60);
    const seconds = Math.floor(t % 60);
    const ms = Math.floor((t % 1) * 1000);
    const timestamp = this.DOM.timestamp as HTMLElement;
    timestamp.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;

    const ratio = this.state.elapsedTime / this.state.maxTime;
    const percent = (ratio * 100).toFixed(2);
    const fill = this.DOM.progressFill as HTMLElement;
    const thumb = this.DOM.progressThumb as HTMLElement;
    fill.style.width = `${percent}%`;
    thumb.style.left = `${percent}%`;
  }

  public dispose(): void {
    this.bulletSystem.dispose();
    this.enemyFleet.dispose();
    this.renderer.dispose();
  }
}

let app: Application | null = null;

document.addEventListener('DOMContentLoaded', () => {
  app = new Application();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});
