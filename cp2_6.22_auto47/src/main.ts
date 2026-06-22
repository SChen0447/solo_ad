import { ClayEditor, type ClayData } from './clay-editor';
import { GlazeModule, type GlazeData } from './glaze-module';
import { KilnController, type FiringResult } from './kiln-controller';
import { GalleryViewer, type GalleryRecipe } from './gallery-viewer';

type ModuleName = 'clay' | 'glaze' | 'kiln' | 'gallery';

interface AppState {
  currentModule: ModuleName;
  clayData: ClayData | null;
  glazeData: GlazeData | null;
  firingResult: FiringResult | null;
  canProceed: Record<ModuleName, boolean>;
}

class PotteryApp {
  private app: HTMLElement;
  private state: AppState;

  private clayEditor: ClayEditor | null = null;
  private glazeModule: GlazeModule | null = null;
  private kilnController: KilnController | null = null;
  private galleryViewer: GalleryViewer | null = null;

  private moduleContainer: HTMLElement | null = null;

  constructor() {
    this.app = document.getElementById('app')!;
    this.state = {
      currentModule: 'clay',
      clayData: null,
      glazeData: null,
      firingResult: null,
      canProceed: { clay: true, glaze: false, kiln: false, gallery: false }
    };

    this.init();
  }

  private init(): void {
    this.renderLayout();
    this.initClayModule();
    this.updateNavButtons();
  }

  private renderLayout(): void {
    this.app.innerHTML = `
      <header class="app-header">
        <h1 class="app-title">🏺 陶艺工坊模拟器</h1>
        <p class="app-subtitle">捏塑 · 上釉 · 烧制 · 典藏</p>
      </header>

      <nav class="module-nav" id="moduleNav">
        <button class="nav-btn active" data-module="clay">
          <span class="nav-step-num">1</span>捏塑成形
        </button>
        <button class="nav-btn" data-module="glaze">
          <span class="nav-step-num">2</span>釉色涂抹
        </button>
        <button class="nav-btn" data-module="kiln">
          <span class="nav-step-num">3</span>入窑烧制
        </button>
        <button class="nav-btn" data-module="gallery">
          <span class="nav-step-num">4</span>成品展示
        </button>
      </nav>

      <div class="module-container" id="moduleContainer"></div>
    `;

    this.moduleContainer = document.getElementById('moduleContainer');

    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const module = (btn as HTMLElement).dataset.module as ModuleName;
        if (this.canNavigateTo(module)) {
          this.switchModule(module);
        }
      });
    });
  }

  private canNavigateTo(module: ModuleName): boolean {
    if (module === 'clay') return true;
    if (module === 'glaze') return this.state.canProceed.glaze;
    if (module === 'kiln') return this.state.canProceed.kiln;
    if (module === 'gallery') return this.state.canProceed.gallery;
    return false;
  }

  private updateNavButtons(): void {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      const module = (btn as HTMLElement).dataset.module as ModuleName;
      const canGo = this.canNavigateTo(module);
      (btn as HTMLButtonElement).disabled = !canGo;
      btn.classList.toggle('active', module === this.state.currentModule);
    });
  }

  private switchModule(module: ModuleName): void {
    if (this.state.currentModule === module) return;

    this.destroyCurrentModule();
    this.state.currentModule = module;
    this.updateNavButtons();

    switch (module) {
      case 'clay':
        this.initClayModule();
        break;
      case 'glaze':
        this.initGlazeModule();
        break;
      case 'kiln':
        this.initKilnModule();
        break;
      case 'gallery':
        this.initGalleryModule();
        break;
    }
  }

  private destroyCurrentModule(): void {
    if (this.clayEditor) {
      this.clayEditor.destroy();
      this.clayEditor = null;
    }
    if (this.glazeModule) {
      this.glazeModule.destroy();
      this.glazeModule = null;
    }
    if (this.kilnController) {
      this.kilnController.destroy();
      this.kilnController = null;
    }
    if (this.galleryViewer) {
      this.galleryViewer.destroy();
      this.galleryViewer = null;
    }
  }

  // ==================== 捏塑模块 ====================
  private initClayModule(): void {
    if (!this.moduleContainer) return;

    this.moduleContainer.innerHTML = `
      <div class="card module-panel">
        <h2 class="card-title">捏塑成形</h2>
        <div class="clay-section">
          <div class="canvas-wrapper" id="clayCanvasWrapper">
            <div class="canvas-tip">👆 按住并拖动粘土表面进行捏塑</div>
          </div>
          <div class="side-panel">
            <div class="tool-group">
              <div class="tool-group-title">捏塑工具</div>
              <div class="tool-buttons">
                <button class="tool-btn active" data-tool="pinch">
                  <span>✋</span> 挤压塑形
                </button>
                <button class="tool-btn" data-tool="stretch">
                  <span>👐</span> 拉伸扩展
                </button>
              </div>
            </div>
            <div class="tool-group">
              <div class="tool-group-title">笔触大小</div>
              <div class="slider-label">
                <span>精细</span>
                <span id="brushSizeLabel">40px</span>
                <span>粗犷</span>
              </div>
              <input type="range" min="15" max="80" value="40" class="brush-size-slider" id="brushSlider">
            </div>
            <button class="action-btn secondary" id="resetClayBtn" style="width:100%">
              ↺ 重置粘土
            </button>
            <button class="action-btn primary" id="toGlazeBtn" style="width:100%">
              完成捏塑 →
            </button>
          </div>
        </div>
      </div>
    `;

    const wrapper = document.getElementById('clayCanvasWrapper')!;
    this.clayEditor = new ClayEditor(wrapper);

    this.clayEditor.setOnDataChange((data) => {
      this.state.clayData = data;
    });

    this.state.clayData = this.clayEditor.getData();

    document.querySelectorAll('[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-tool]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tool = (btn as HTMLElement).dataset.tool as 'pinch' | 'stretch';
        this.clayEditor?.setToolMode(tool);
      });
    });

    const brushSlider = document.getElementById('brushSlider') as HTMLInputElement;
    const brushLabel = document.getElementById('brushSizeLabel')!;
    brushSlider.addEventListener('input', () => {
      const v = parseInt(brushSlider.value);
      brushLabel.textContent = `${v}px`;
      this.clayEditor?.setBrushRadius(v);
    });

    document.getElementById('resetClayBtn')?.addEventListener('click', () => {
      this.clayEditor?.reset();
    });

    document.getElementById('toGlazeBtn')?.addEventListener('click', () => {
      if (this.clayEditor) {
        this.state.clayData = this.clayEditor.getData();
        this.state.canProceed.glaze = true;
        this.switchModule('glaze');
      }
    });
  }

  // ==================== 上釉模块 ====================
  private initGlazeModule(): void {
    if (!this.moduleContainer || !this.state.clayData) return;

    const clayData = this.state.clayData;

    this.moduleContainer.innerHTML = `
      <div class="card module-panel">
        <h2 class="card-title">釉色涂抹</h2>
        <div class="glaze-section">
          <div class="palette-panel">
            <div class="tool-group-title" style="margin-bottom:14px">🎨 釉色盘 (12色)</div>
            <div id="paletteGrid"></div>
            <div id="glazeInfo"></div>
            <div style="margin-top:20px;display:flex;flex-direction:column;gap:10px">
              <button class="action-btn secondary" id="backToClayBtn" style="width:100%">
                ← 返回捏塑
              </button>
              <button class="action-btn primary" id="toKilnBtn" style="width:100%">
                完成上釉 →
              </button>
            </div>
          </div>
          <div class="canvas-wrapper" id="glazeCanvasWrapper"
               style="background:#D4B896;border-radius:16px;display:flex;justify-content:center;align-items:center;">
          </div>
        </div>
      </div>
    `;

    const wrapper = document.getElementById('glazeCanvasWrapper')!;
    const paletteGrid = document.getElementById('paletteGrid')!;
    const glazeInfo = document.getElementById('glazeInfo')!;

    this.glazeModule = new GlazeModule(wrapper, paletteGrid, glazeInfo, clayData);

    if (this.state.glazeData) {
      // 如果之前有数据可以考虑恢复，当前逻辑简化
    }

    this.glazeModule.updateClayData(clayData);

    this.glazeModule.setOnDataChange((data) => {
      this.state.glazeData = data;
    });

    document.getElementById('backToClayBtn')?.addEventListener('click', () => {
      this.switchModule('clay');
    });

    document.getElementById('toKilnBtn')?.addEventListener('click', () => {
      if (this.glazeModule) {
        this.state.glazeData = this.glazeModule.getData();
        this.state.canProceed.kiln = true;
        this.switchModule('kiln');
      }
    });
  }

  // ==================== 烧制模块 ====================
  private initKilnModule(): void {
    if (!this.moduleContainer || !this.state.clayData || !this.state.glazeData) return;

    const clayData = this.state.clayData;
    const glazeData = this.state.glazeData;

    this.moduleContainer.innerHTML = `
      <div class="card module-panel">
        <h2 class="card-title">入窑烧制</h2>
        <div class="kiln-section">
          <div class="kiln-visual" id="kilnVisual">
            <div class="temp-display">
              <span class="temp-value" id="tempDisplay">0</span>
              <span class="temp-unit">°C</span>
            </div>
            <div class="kiln-pottery-wrapper" id="kilnPotteryWrapper"></div>
          </div>
          <div class="kiln-controls" id="kilnControls"></div>
        </div>
        <div style="margin-top:24px;display:flex;gap:12px;justify-content:flex-end">
          <button class="action-btn secondary" id="backToGlazeBtn">
            ← 返回上釉
          </button>
          <button class="action-btn primary" id="toGalleryBtn" disabled>
            查看成品 →
          </button>
        </div>
      </div>
    `;

    const potteryWrapper = document.getElementById('kilnPotteryWrapper')!;
    const controls = document.getElementById('kilnControls')!;

    this.kilnController = new KilnController(potteryWrapper, controls, clayData, glazeData);

    if (this.state.firingResult) {
      // 可考虑恢复状态
    }

    this.kilnController.updateData(clayData, glazeData);

    this.kilnController.setOnComplete((result) => {
      this.state.firingResult = result;
      this.state.canProceed.gallery = true;
      const btn = document.getElementById('toGalleryBtn') as HTMLButtonElement;
      if (btn) btn.disabled = false;

      // 微光动画
      const visual = document.getElementById('kilnVisual');
      if (visual) {
        visual.classList.add('glow-animation');
        setTimeout(() => visual.classList.remove('glow-animation'), 600);
      }
    });

    document.getElementById('backToGlazeBtn')?.addEventListener('click', () => {
      this.switchModule('glaze');
    });

    document.getElementById('toGalleryBtn')?.addEventListener('click', () => {
      if (this.state.firingResult) {
        this.switchModule('gallery');
      }
    });
  }

  // ==================== 展示模块 ====================
  private initGalleryModule(): void {
    if (!this.moduleContainer || !this.state.clayData || !this.state.firingResult || !this.state.glazeData) return;

    this.moduleContainer.innerHTML = `
      <div class="card module-panel">
        <h2 class="card-title">成品展示</h2>
        <div class="gallery-section">
          <div id="threeContainer">
            <div class="gallery-hint">🖱 拖拽旋转查看 · 滚轮缩放 (0.8x ~ 2.0x)</div>
          </div>
          <div class="recipe-card" id="recipeCard"></div>
        </div>
        <div style="margin-top:24px;display:flex;gap:12px;justify-content:space-between;flex-wrap:wrap">
          <div style="display:flex;gap:12px">
            <button class="action-btn secondary" id="backToKilnBtn">
              ← 返回烧制
            </button>
            <button class="action-btn secondary" id="resetViewBtn">
              ⟳ 重置视角
            </button>
          </div>
          <button class="action-btn primary" id="restartBtn">
            🏺 重新创作
          </button>
        </div>
      </div>
    `;

    const container = document.getElementById('threeContainer')!;
    const recipe: GalleryRecipe = {
      temperature: this.state.firingResult.temperature,
      duration: this.state.firingResult.duration,
      glazes: this.state.glazeData.appliedGlazes
    };

    this.galleryViewer = new GalleryViewer(
      container,
      this.state.clayData,
      this.state.firingResult,
      recipe
    );

    document.getElementById('backToKilnBtn')?.addEventListener('click', () => {
      this.switchModule('kiln');
    });

    document.getElementById('resetViewBtn')?.addEventListener('click', () => {
      this.galleryViewer?.resetView();
    });

    document.getElementById('restartBtn')?.addEventListener('click', () => {
      this.restart();
    });
  }

  private restart(): void {
    this.destroyCurrentModule();
    this.state = {
      currentModule: 'clay',
      clayData: null,
      glazeData: null,
      firingResult: null,
      canProceed: { clay: true, glaze: false, kiln: false, gallery: false }
    };
    this.initClayModule();
    this.updateNavButtons();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PotteryApp();
});
