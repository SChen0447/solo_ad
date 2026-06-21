import * as THREE from 'three';
import { ModelBuilder, DisplayMode } from './ModelBuilder';
import type { AtomData } from './moleculeData';

interface UIControllerOptions {
  modelBuilder: ModelBuilder;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: any;
  canvas: HTMLCanvasElement;
}

export class UIController {
  private modelBuilder: ModelBuilder;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: any;
  private canvas: HTMLCanvasElement;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private selectedAtomId: number | null = null;

  private infoCard: HTMLElement | null = null;
  private atomNameEl: HTMLElement | null = null;
  private atomSymbolEl: HTMLElement | null = null;
  private atomNumberEl: HTMLElement | null = null;
  private atomHybridEl: HTMLElement | null = null;
  private atomBondsEl: HTMLElement | null = null;

  private modeButtons: HTMLElement[] = [];
  private explodeSlider: HTMLInputElement | null = null;
  private explodeValue: number = 0;
  private isExploding: boolean = false;
  private isSliderDragging: boolean = false;

  private autoRotate: boolean = true;
  private autoRotateBtn: HTMLElement | null = null;

  private onModeChangeCallback: ((mode: DisplayMode) => void) | null = null;
  private onExplodeChangeCallback: ((value: number, isDragging: boolean) => void) | null = null;
  private onResetCallback: (() => void) | null = null;
  private onAutoRotateChangeCallback: ((enabled: boolean) => void) | null = null;

  constructor(options: UIControllerOptions) {
    this.modelBuilder = options.modelBuilder;
    this.camera = options.camera;
    this.renderer = options.renderer;
    this.controls = options.controls;
    this.canvas = options.canvas;

    this.initElements();
    this.initEventListeners();
  }

  private initElements(): void {
    this.infoCard = document.getElementById('info-card');
    this.atomNameEl = document.getElementById('atom-name');
    this.atomSymbolEl = document.getElementById('atom-symbol');
    this.atomNumberEl = document.getElementById('atom-number');
    this.atomHybridEl = document.getElementById('atom-hybrid');
    this.atomBondsEl = document.getElementById('atom-bonds');

    this.modeButtons = [
      document.getElementById('mode-ballstick')!,
      document.getElementById('mode-wireframe')!,
      document.getElementById('mode-spacefill')!,
    ];

    this.explodeSlider = document.getElementById('explode-slider') as HTMLInputElement;
    this.autoRotateBtn = document.getElementById('btn-autorotate');

    this.updateModeButtonStates('ballstick');
  }

  private initEventListeners(): void {
    this.canvas.addEventListener('click', this.onCanvasClick.bind(this));
    this.canvas.addEventListener('mousemove', this.onCanvasMouseMove.bind(this));

    this.modeButtons.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const modes: DisplayMode[] = ['ballstick', 'wireframe', 'spacefill'];
        this.switchMode(modes[index]);
      });
    });

    const resetBtn = document.getElementById('btn-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetView();
      });
    }

    if (this.autoRotateBtn) {
      this.autoRotateBtn.addEventListener('click', () => {
        this.toggleAutoRotate();
      });
    }

    const screenshotBtn = document.getElementById('btn-screenshot');
    if (screenshotBtn) {
      screenshotBtn.addEventListener('click', () => {
        this.takeScreenshot();
      });
    }

    if (this.explodeSlider) {
      this.explodeSlider.addEventListener('mousedown', () => {
        this.isSliderDragging = true;
        this.isExploding = true;
      });

      this.explodeSlider.addEventListener('input', () => {
        if (this.explodeSlider) {
          this.explodeValue = parseInt(this.explodeSlider.value) / 100;
          this.modelBuilder.setExplodeValue(this.explodeValue);
          if (this.onExplodeChangeCallback) {
            this.onExplodeChangeCallback(this.explodeValue, true);
          }
        }
      });

      this.explodeSlider.addEventListener('mouseup', () => {
        this.isSliderDragging = false;
        this.isExploding = false;
        this.modelBuilder.setExplodeValue(0);
        if (this.explodeSlider) {
          this.animateSliderBack();
        }
        if (this.onExplodeChangeCallback) {
          this.onExplodeChangeCallback(0, false);
        }
      });

      this.explodeSlider.addEventListener('mouseleave', () => {
        if (this.isSliderDragging) {
          this.isSliderDragging = false;
          this.isExploding = false;
          this.modelBuilder.setExplodeValue(0);
          if (this.explodeSlider) {
            this.animateSliderBack();
          }
          if (this.onExplodeChangeCallback) {
            this.onExplodeChangeCallback(0, false);
          }
        }
      });
    }

    this.addParticleEffects();
  }

  private addParticleEffects(): void {
    const buttons = document.querySelectorAll('.tool-btn, .mode-btn');
    buttons.forEach(btn => {
      btn.addEventListener('mouseenter', (e) => {
        this.createParticles(e.target as HTMLElement);
      });
    });
  }

  private createParticles(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const particleCount = 6;

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = rect.left + rect.width / 2 + 'px';
      particle.style.top = rect.top + rect.height / 2 + 'px';
      document.body.appendChild(particle);

      const angle = (i / particleCount) * Math.PI * 2;
      const distance = 30 + Math.random() * 20;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;

      particle.style.transform = `translate(0, 0) scale(1)`;
      particle.style.opacity = '0.8';

      requestAnimationFrame(() => {
        particle.style.transition = 'all 0.6s ease-out';
        particle.style.transform = `translate(${dx}px, ${dy}px) scale(0)`;
        particle.style.opacity = '0';
      });

      setTimeout(() => {
        particle.remove();
      }, 600);
    }
  }

  private animateSliderBack(): void {
    if (!this.explodeSlider) return;

    const startValue = parseInt(this.explodeSlider.value);
    const startTime = performance.now();
    const duration = 800;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const bounceProgress = 1 - Math.pow(1 - progress, 3);

      if (this.explodeSlider) {
        this.explodeSlider.value = String(startValue * (1 - bounceProgress));
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  private onCanvasClick(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const atomMeshes = this.modelBuilder.getAtomMeshes();
    const intersects = this.raycaster.intersectObjects(atomMeshes);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object;
      const atomId = clickedMesh.userData.atomId;

      if (atomId !== undefined) {
        this.selectAtom(atomId);
        return;
      }
    }

    this.deselectAtom();
  }

  private onCanvasMouseMove(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const atomMeshes = this.modelBuilder.getAtomMeshes();
    const intersects = this.raycaster.intersectObjects(atomMeshes);

    if (intersects.length > 0) {
      this.canvas.style.cursor = 'pointer';
    } else {
      this.canvas.style.cursor = 'grab';
    }
  }

  private selectAtom(atomId: number): void {
    if (this.selectedAtomId === atomId) return;
    this.selectedAtomId = atomId;
    this.modelBuilder.highlightAtom(atomId);

    const atomData = this.modelBuilder.getAtomData(atomId);
    if (atomData && this.infoCard) {
      this.showInfoCard(atomData);
    }
  }

  private deselectAtom(): void {
    if (this.selectedAtomId === null) return;
    this.selectedAtomId = null;
    this.modelBuilder.highlightAtom(null);
    this.hideInfoCard();
  }

  private showInfoCard(atomData: AtomData): void {
    if (!this.infoCard) return;

    if (this.atomNameEl) this.atomNameEl.textContent = atomData.name;
    if (this.atomSymbolEl) this.atomSymbolEl.textContent = atomData.symbol;
    if (this.atomNumberEl) this.atomNumberEl.textContent = String(atomData.atomicNumber);
    if (this.atomHybridEl) this.atomHybridEl.textContent = atomData.hybridization;
    if (this.atomBondsEl) this.atomBondsEl.textContent = String(atomData.bondCount);

    this.infoCard.style.display = 'block';
    this.infoCard.style.opacity = '0';
    this.infoCard.style.transform = 'translateX(-20px)';

    requestAnimationFrame(() => {
      if (this.infoCard) {
        this.infoCard.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        this.infoCard.style.opacity = '1';
        this.infoCard.style.transform = 'translateX(0)';
      }
    });
  }

  private hideInfoCard(): void {
    if (!this.infoCard) return;

    this.infoCard.style.opacity = '0';
    this.infoCard.style.transform = 'translateX(-20px)';

    setTimeout(() => {
      if (this.infoCard) {
        this.infoCard.style.display = 'none';
      }
    }, 300);
  }

  private switchMode(mode: DisplayMode): void {
    this.modelBuilder.switchMode(mode);
    this.updateModeButtonStates(mode);

    if (this.onModeChangeCallback) {
      this.onModeChangeCallback(mode);
    }
  }

  private updateModeButtonStates(activeMode: DisplayMode): void {
    const modes: DisplayMode[] = ['ballstick', 'wireframe', 'spacefill'];
    this.modeButtons.forEach((btn, index) => {
      if (modes[index] === activeMode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private resetView(): void {
    if (this.controls && this.controls.reset) {
      this.controls.reset();
    }

    if (this.onResetCallback) {
      this.onResetCallback();
    }
  }

  private toggleAutoRotate(): void {
    this.autoRotate = !this.autoRotate;

    if (this.autoRotateBtn) {
      if (this.autoRotate) {
        this.autoRotateBtn.classList.add('active');
        this.autoRotateBtn.textContent = '自动旋转: 开';
      } else {
        this.autoRotateBtn.classList.remove('active');
        this.autoRotateBtn.textContent = '自动旋转: 关';
      }
    }

    if (this.onAutoRotateChangeCallback) {
      this.onAutoRotateChangeCallback(this.autoRotate);
    }
  }

  private takeScreenshot(): void {
    this.renderer.render(this.renderer.info as any, this.camera);

    const link = document.createElement('a');
    link.download = 'molecule-screenshot.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  public isAutoRotateEnabled(): boolean {
    return this.autoRotate;
  }

  public getIsExploding(): boolean {
    return this.isExploding;
  }

  public getExplodeValue(): number {
    return this.explodeValue;
  }

  public onModeChange(callback: (mode: DisplayMode) => void): void {
    this.onModeChangeCallback = callback;
  }

  public onExplodeChange(callback: (value: number, isDragging: boolean) => void): void {
    this.onExplodeChangeCallback = callback;
  }

  public onReset(callback: () => void): void {
    this.onResetCallback = callback;
  }

  public onAutoRotateChange(callback: (enabled: boolean) => void): void {
    this.onAutoRotateChangeCallback = callback;
  }

  public dispose(): void {
    this.canvas.removeEventListener('click', this.onCanvasClick.bind(this));
    this.canvas.removeEventListener('mousemove', this.onCanvasMouseMove.bind(this));
  }
}
