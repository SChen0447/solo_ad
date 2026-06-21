import './style.css';
import { SceneManager } from './core/SceneManager';
import { MazeGrid } from './core/MazeGrid';
import { Editor } from './modules/Editor';
import { Preview } from './modules/Preview';
import { ScorePanel } from './modules/ScorePanel';

class App {
  private sceneManager: SceneManager;
  private mazeGrid: MazeGrid;
  private editor: Editor;
  private preview: Preview;
  private scorePanel: ScorePanel;
  private isEditMode: boolean = true;
  private noPathToast: HTMLElement;

  constructor() {
    const app = document.getElementById('app')!;
    this.buildUI(app);

    const canvas = document.getElementById('mazeCanvas') as HTMLCanvasElement;
    this.noPathToast = document.getElementById('noPathToast') as HTMLElement;

    this.sceneManager = new SceneManager();
    this.mazeGrid = new MazeGrid(10);
    this.editor = new Editor(this.sceneManager, this.mazeGrid);
    this.preview = new Preview(this.sceneManager, this.mazeGrid, {
      onNoPath: () => this.showNoPathToast()
    });

    const scoreContainer = document.getElementById('scorePanel') as HTMLElement;
    this.scorePanel = new ScorePanel(scoreContainer);

    this.sceneManager.init(canvas);
    this.bindControls();
    window.addEventListener('resize', () => this.sceneManager.onResize());
  }

  private buildUI(app: HTMLElement): void {
    app.innerHTML = `
      <div class="scene-container">
        <canvas id="mazeCanvas"></canvas>
        <div class="no-path-toast" id="noPathToast">当前迷宫无解，请调整墙壁布局</div>
      </div>
      <div class="controls-panel">
        <div>
          <div class="panel-title">3D 迷宫设计器</div>
          <div class="panel-subtitle">Maze Level Designer</div>
        </div>

        <div class="control-group">
          <div class="control-label">
            <span>当前模式</span>
            <div class="toggle-switch active" id="modeToggle">
              <div class="toggle-knob"></div>
            </div>
          </div>
          <div class="control-label" style="margin-bottom:0;">
            <span id="modeLabel" style="color:#60a5fa;font-weight:600;">编辑模式</span>
          </div>
        </div>

        <div class="control-group">
          <div class="control-label">
            <span>小球速度</span>
            <span class="control-value" id="speedValue">2</span>
          </div>
          <div class="slider-container">
            <input type="range" id="speedSlider" min="1" max="5" step="0.5" value="2">
          </div>
        </div>

        <div class="control-group">
          <div class="btn-row">
            <button class="btn btn-primary" id="scoreBtn">评分</button>
            <button class="btn btn-secondary" id="clearBtn">清空</button>
          </div>
        </div>

        <div class="control-group score-panel" id="scorePanel">
        </div>

        <div class="hint-box">
          <strong>操作说明：</strong><br>
          鼠标点击网格放置/移除墙壁<br>
          <strong>WASD</strong> 平移视角<br>
          <strong>Q/E</strong> 旋转视角45°
        </div>
      </div>
    `;
  }

  private bindControls(): void {
    const modeToggle = document.getElementById('modeToggle') as HTMLDivElement;
    const modeLabel = document.getElementById('modeLabel') as HTMLElement;
    const speedSlider = document.getElementById('speedSlider') as HTMLInputElement;
    const speedValue = document.getElementById('speedValue') as HTMLElement;
    const scoreBtn = document.getElementById('scoreBtn') as HTMLButtonElement;
    const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;

    modeToggle.addEventListener('click', () => {
      this.isEditMode = !this.isEditMode;
      modeToggle.classList.toggle('active', this.isEditMode);

      if (this.isEditMode) {
        modeLabel.textContent = '编辑模式';
        modeLabel.style.color = '#60a5fa';
        this.editor.setActive(true);
        this.preview.stop();
      } else {
        modeLabel.textContent = '预览模式';
        modeLabel.style.color = '#a78bfa';
        this.editor.setActive(false);
        this.preview.start();
      }
    });

    speedSlider.addEventListener('input', () => {
      const speed = parseFloat(speedSlider.value);
      speedValue.textContent = speed.toFixed(speed % 1 === 0 ? 0 : 1);
      this.preview.setSpeed(speed);
    });

    scoreBtn.addEventListener('click', () => {
      this.scorePanel.update(this.mazeGrid);
    });

    clearBtn.addEventListener('click', () => {
      this.editor.clearAllWalls();
      this.preview.stop();
      this.scorePanel.reset();
      if (!this.isEditMode) {
        modeToggle.click();
      }
    });
  }

  private showNoPathToast(): void {
    this.noPathToast.classList.add('show');
    setTimeout(() => {
      this.noPathToast.classList.remove('show');
    }, 2500);
  }
}

new App();
