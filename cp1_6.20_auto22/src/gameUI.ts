import { MazeData } from './mazeGenerator';

export class GameUI {
  private container: HTMLDivElement;
  private scoreDisplay!: HTMLDivElement;
  private hintDisplay!: HTMLDivElement;
  private minimapCanvas!: HTMLCanvasElement;
  private minimapCtx!: CanvasRenderingContext2D;
  private startScreen!: HTMLDivElement;
  private endScreen!: HTMLDivElement;
  private crosshair!: HTMLDivElement;
  private clickHint!: HTMLDivElement;
  private maze: MazeData;
  private cellSize: number;

  constructor(maze: MazeData, cellSize: number) {
    this.maze = maze;
    this.cellSize = cellSize;
    this.container = document.createElement('div');
    this.container.id = 'ui-layer';
    this.container.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 10;
      font-family: 'Courier New', monospace;
    `;

    this.createCrosshair();
    this.createScoreDisplay();
    this.createHintDisplay();
    this.createMinimap();
    this.createStartScreen();
    this.createEndScreen();
    this.createClickHint();

    document.body.appendChild(this.container);
  }

  private createCrosshair(): void {
    this.crosshair = document.createElement('div');
    this.crosshair.style.cssText = `
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 4px; height: 4px; border-radius: 50%;
      background: rgba(0,255,65,0.5); box-shadow: 0 0 6px rgba(0,255,65,0.3);
      display: none;
    `;
    this.container.appendChild(this.crosshair);
  }

  private createScoreDisplay(): void {
    this.scoreDisplay = document.createElement('div');
    this.scoreDisplay.style.cssText = `
      position: absolute; top: 20px; left: 20px;
      color: #00ff41; font-size: 18px; letter-spacing: 2px;
      text-shadow: 0 0 10px rgba(0,255,65,0.5);
      opacity: 0; transition: opacity 0.5s;
    `;
    this.scoreDisplay.textContent = '存活: 0s';
    this.container.appendChild(this.scoreDisplay);
  }

  private createHintDisplay(): void {
    this.hintDisplay = document.createElement('div');
    this.hintDisplay.style.cssText = `
      position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%);
      color: #00ff41; font-size: 16px; letter-spacing: 1px;
      text-shadow: 0 0 8px rgba(0,255,65,0.4);
      text-align: center; opacity: 0; transition: opacity 0.5s;
    `;
    this.container.appendChild(this.hintDisplay);
  }

  private createMinimap(): void {
    this.minimapCanvas = document.createElement('canvas');
    const pixelSize = 3;
    this.minimapCanvas.width = this.maze[0].length * pixelSize;
    this.minimapCanvas.height = this.maze.length * pixelSize;
    this.minimapCanvas.style.cssText = `
      position: absolute; bottom: 20px; right: 20px;
      border: 1px solid rgba(0,255,65,0.3);
      background: rgba(0,0,0,0.7);
      opacity: 0; transition: opacity 0.5s;
      image-rendering: pixelated;
    `;
    this.minimapCtx = this.minimapCanvas.getContext('2d')!;
    this.container.appendChild(this.minimapCanvas);
  }

  private createStartScreen(): void {
    this.startScreen = document.createElement('div');
    this.startScreen.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.95);
      transition: opacity 1s;
      pointer-events: auto;
    `;

    const title = document.createElement('div');
    title.style.cssText = `
      color: #00ff41; font-size: 48px; letter-spacing: 6px;
      text-shadow: 0 0 20px rgba(0,255,65,0.6), 0 0 40px rgba(0,255,65,0.3);
      margin-bottom: 30px;
    `;
    title.textContent = '暗影迷踪';

    const subtitle = document.createElement('div');
    subtitle.style.cssText = `
      color: rgba(0,255,65,0.6); font-size: 14px; letter-spacing: 3px;
      margin-bottom: 60px;
    `;
    subtitle.textContent = 'SPATIAL AUDIO HIDE & SEEK';

    const instructions = document.createElement('div');
    instructions.style.cssText = `
      color: rgba(0,255,65,0.5); font-size: 13px; line-height: 2;
      text-align: center; margin-bottom: 40px;
    `;
    instructions.innerHTML = `
      WASD - 移动 &nbsp;&nbsp; 鼠标 - 转向<br>
      听脚步声判断搜寻者位置<br>
      靠近时心跳会加速<br>
      到达出口即可逃脱
    `;

    const btn = document.createElement('div');
    btn.style.cssText = `
      color: #00ff41; font-size: 18px; letter-spacing: 3px;
      border: 1px solid rgba(0,255,65,0.4); padding: 12px 40px;
      cursor: pointer; pointer-events: auto;
      text-shadow: 0 0 10px rgba(0,255,65,0.4);
      transition: all 0.3s;
    `;
    btn.textContent = '点击开始';
    btn.addEventListener('mouseenter', () => {
      btn.style.borderColor = '#00ff41';
      btn.style.boxShadow = '0 0 20px rgba(0,255,65,0.3)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.borderColor = 'rgba(0,255,65,0.4)';
      btn.style.boxShadow = 'none';
    });

    this.startScreen.appendChild(title);
    this.startScreen.appendChild(subtitle);
    this.startScreen.appendChild(instructions);
    this.startScreen.appendChild(btn);
    this.container.appendChild(this.startScreen);

    btn.addEventListener('click', () => {
      this.onStartClick();
    });
  }

  private createEndScreen(): void {
    this.endScreen = document.createElement('div');
    this.endScreen.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: rgba(0,0,0,0); pointer-events: none;
      transition: background 1s; opacity: 0;
    `;

    const title = document.createElement('div');
    title.id = 'end-title';
    title.style.cssText = `
      color: #00ff41; font-size: 42px; letter-spacing: 4px;
      text-shadow: 0 0 20px rgba(0,255,65,0.6);
      margin-bottom: 20px;
    `;

    const timeDisplay = document.createElement('div');
    timeDisplay.id = 'end-time';
    timeDisplay.style.cssText = `
      color: rgba(0,255,65,0.7); font-size: 20px; letter-spacing: 2px;
      margin-bottom: 40px;
    `;

    const restartBtn = document.createElement('div');
    restartBtn.id = 'end-restart';
    restartBtn.style.cssText = `
      color: #00ff41; font-size: 16px; letter-spacing: 2px;
      border: 1px solid rgba(0,255,65,0.4); padding: 10px 30px;
      cursor: pointer; pointer-events: auto;
      transition: all 0.3s;
    `;
    restartBtn.textContent = '再来一次';
    restartBtn.addEventListener('click', () => {
      window.location.reload();
    });

    this.endScreen.appendChild(title);
    this.endScreen.appendChild(timeDisplay);
    this.endScreen.appendChild(restartBtn);
    this.container.appendChild(this.endScreen);
  }

  private createClickHint(): void {
    this.clickHint = document.createElement('div');
    this.clickHint.style.cssText = `
      position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%);
      color: rgba(0,255,65,0.5); font-size: 13px; letter-spacing: 2px;
      display: none;
    `;
    this.clickHint.textContent = '点击画面锁定鼠标';
    this.container.appendChild(this.clickHint);
  }

  private onStartClick: () => void = () => {};

  onStart(callback: () => void): void {
    this.onStartClick = callback;
  }

  showGameUI(): void {
    this.scoreDisplay.style.opacity = '1';
    this.hintDisplay.style.opacity = '1';
    this.minimapCanvas.style.opacity = '1';
    this.crosshair.style.display = 'block';
  }

  showClickHint(): void {
    this.clickHint.style.display = 'block';
  }

  hideClickHint(): void {
    this.clickHint.style.display = 'none';
  }

  hideStartScreen(): void {
    this.startScreen.style.opacity = '0';
    setTimeout(() => {
      this.startScreen.style.display = 'none';
    }, 1000);
  }

  updateScore(seconds: number): void {
    this.scoreDisplay.textContent = `存活: ${Math.floor(seconds)}s`;
  }

  updateHint(distanceCells: number): void {
    let text = '';
    let color = '#00ff41';
    if (distanceCells < 2) {
      text = '⚠ 就在身后！';
      color = '#ff0000';
    } else if (distanceCells < 4) {
      text = '搜寻者很接近了...';
      color = '#ff6600';
    } else if (distanceCells < 7) {
      text = '脚步声越来越近';
      color = '#ffaa00';
    } else if (distanceCells < 12) {
      text = '能听到远处的脚步声';
      color = '#88cc00';
    } else {
      text = '搜寻者远了';
      color = '#00ff41';
    }
    this.hintDisplay.textContent = text;
    this.hintDisplay.style.color = color;
  }

  updateMinimap(
    playerRow: number,
    playerCol: number,
    hunterRow: number,
    hunterCol: number,
    exitRow: number,
    exitCol: number
  ): void {
    const ctx = this.minimapCtx;
    const ps = 3;
    const rows = this.maze.length;
    const cols = this.maze[0].length;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, this.minimapCanvas.width, this.minimapCanvas.height);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (this.maze[r][c] === 1) {
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(c * ps, r * ps, ps, ps);
        }
      }
    }

    ctx.fillStyle = '#00ff41';
    ctx.fillRect(exitCol * ps, exitRow * ps, ps, ps);

    const hunterDist = Math.sqrt(
      (hunterRow - playerRow) ** 2 + (hunterCol - playerCol) ** 2
    );
    if (hunterDist < 15) {
      const alpha = Math.max(0.3, 1 - hunterDist / 15);
      ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
      ctx.fillRect(hunterCol * ps, hunterRow * ps, ps, ps);
    }

    ctx.fillStyle = '#00ff41';
    ctx.fillRect(playerCol * ps, playerRow * ps, ps, ps);
  }

  showEndScreen(won: boolean, time: number): void {
    this.endScreen.style.pointerEvents = 'auto';
    this.endScreen.style.background = 'rgba(0,0,0,0.9)';
    this.endScreen.style.opacity = '1';
    this.crosshair.style.display = 'none';

    const title = document.getElementById('end-title')!;
    const timeDisplay = document.getElementById('end-time')!;

    if (won) {
      title.textContent = '逃脱成功';
      title.style.color = '#00ff41';
      title.style.textShadow = '0 0 20px rgba(0,255,65,0.6)';
      timeDisplay.textContent = `用时: ${time.toFixed(1)}s`;
    } else {
      title.textContent = '被抓住了';
      title.style.color = '#ff0000';
      title.style.textShadow = '0 0 20px rgba(255,0,0,0.6)';
      timeDisplay.textContent = `存活: ${time.toFixed(1)}s`;
    }
  }

  destroy(): void {
    this.container.remove();
  }
}
