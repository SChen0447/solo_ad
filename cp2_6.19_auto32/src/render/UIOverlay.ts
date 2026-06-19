import { GhostState } from '../game/PlayerManager';
import { GameStats } from '../game/GameManager';

export type GameView = 'menu' | 'game' | 'result';

export interface UIOverlayOptions {
  container: HTMLElement;
}

const TIPS = [
  '空格键开启透视模式，发现隐藏的猫！',
  'Q键伪装成场景物品，躲避鬼的追捕！',
  'WASD控制移动，鼠标控制视角（仅鬼）',
  '3分钟内抓到所有猫则鬼获胜！',
  '合理使用能量条，它会随时间恢复',
  '伪装后无法移动，但更难被发现'
];

export class UIOverlay {
  private container: HTMLElement;
  private uiContainer: HTMLDivElement;
  private menuScreen: HTMLDivElement;
  private gameUI: HTMLDivElement;
  private resultScreen: HTMLDivElement;
  private currentView: GameView = 'menu';
  private tipsIndex: number = 0;
  private tipsTimer: number = 0;
  private tipsElement: HTMLDivElement;
  private tipsVisible: boolean = true;
  private energyBarFill: HTMLDivElement;
  private healthBarFill: HTMLDivElement;
  private timerDisplay: HTMLDivElement;
  private catCountDisplay: HTMLDivElement;
  private perspectiveCooldownEl: HTMLDivElement;
  private bestCatchCanvas: HTMLCanvasElement;
  private onStartGame?: () => void;
  private onRestartGame?: () => void;
  private onBackToMenu?: () => void;
  private transitionActive: boolean = false;

  constructor(options: UIOverlayOptions) {
    this.container = options.container;

    this.uiContainer = document.createElement('div');
    this.uiContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: hidden;
      z-index: 100;
      font-family: 'Courier New', monospace;
    `;

    this.menuScreen = this.createMenuScreen();
    this.gameUI = this.createGameUI();
    this.resultScreen = this.createResultScreen();

    this.energyBarFill = document.createElement('div');
    this.healthBarFill = document.createElement('div');
    this.timerDisplay = document.createElement('div');
    this.catCountDisplay = document.createElement('div');
    this.tipsElement = document.createElement('div');
    this.perspectiveCooldownEl = document.createElement('div');
    this.bestCatchCanvas = document.createElement('canvas');

    this.uiContainer.appendChild(this.menuScreen);
    this.uiContainer.appendChild(this.gameUI);
    this.uiContainer.appendChild(this.resultScreen);

    this.container.appendChild(this.uiContainer);

    this.showScreen('menu');
  }

  private createMenuScreen(): HTMLDivElement {
    const screen = document.createElement('div');
    screen.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0a0a0a 0%, #111122 50%, #0a0a0a 100%);
      pointer-events: all;
      transform: translateX(0);
      transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    const title = document.createElement('h1');
    title.textContent = '赛博朋克躲猫猫';
    title.style.cssText = `
      font-size: 56px;
      color: #00ff41;
      text-shadow: 0 0 20px #00ff41, 0 0 40px #00ff41;
      margin-bottom: 20px;
      letter-spacing: 8px;
      animation: titleGlow 2s ease-in-out infinite;
    `;

    const subtitle = document.createElement('p');
    subtitle.textContent = 'CYBERPUNK HIDE & SEEK';
    subtitle.style.cssText = `
      font-size: 18px;
      color: #ff00ff;
      letter-spacing: 4px;
      margin-bottom: 60px;
      text-shadow: 0 0 10px #ff00ff;
    `;

    const startBtn = this.createButton('开始游戏', '#00ff41');
    startBtn.addEventListener('click', () => {
      if (this.onStartGame) this.onStartGame();
    });

    const instructions = document.createElement('div');
    instructions.style.cssText = `
      margin-top: 60px;
      color: #888;
      font-size: 14px;
      text-align: center;
      line-height: 2;
    `;
    instructions.innerHTML = `
      <p><span style="color: #00ff41">鬼:</span> WASD移动 | 鼠标视角 | 空格透视</p>
      <p><span style="color: #ff00ff">猫:</span> 方向键/WASD移动 | Q键伪装</p>
      <p style="margin-top: 10px; color: #666">按 Tab 键切换视角</p>
    `;

    screen.appendChild(title);
    screen.appendChild(subtitle);
    screen.appendChild(startBtn);
    screen.appendChild(instructions);

    const style = document.createElement('style');
    style.textContent = `
      @keyframes titleGlow {
        0%, 100% { text-shadow: 0 0 20px #00ff41, 0 0 40px #00ff41; }
        50% { text-shadow: 0 0 30px #00ff41, 0 0 60px #00ff41, 0 0 80px #00ff41; }
      }
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
    `;
    document.head.appendChild(style);

    return screen;
  }

  private createButton(text: string, color: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      padding: 16px 48px;
      font-size: 20px;
      font-family: 'Courier New', monospace;
      background: transparent;
      color: ${color};
      border: 2px solid ${color};
      cursor: pointer;
      letter-spacing: 4px;
      transition: all 0.2s ease;
      text-transform: uppercase;
      margin: 10px;
    `;

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.1)';
      btn.style.borderColor = '#ff00ff';
      btn.style.color = '#ff00ff';
      btn.style.boxShadow = '0 0 20px rgba(255, 0, 255, 0.5)';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
      btn.style.borderColor = color;
      btn.style.color = color;
      btn.style.boxShadow = 'none';
    });

    return btn;
  }

  private createGameUI(): HTMLDivElement {
    const ui = document.createElement('div');
    ui.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      transform: translateX(-100%);
      transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    const statusPanel = document.createElement('div');
    statusPanel.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(10, 10, 10, 0.8);
      border: 1px solid #00ff41;
      border-radius: 8px;
      padding: 15px 20px;
      min-width: 200px;
      box-shadow: 0 0 20px rgba(0, 255, 65, 0.2);
    `;

    const playerLabel = document.createElement('div');
    playerLabel.textContent = '鬼玩家';
    playerLabel.style.cssText = `
      color: #00ff41;
      font-size: 14px;
      margin-bottom: 10px;
      letter-spacing: 2px;
    `;

    const healthLabel = document.createElement('div');
    healthLabel.textContent = '生命值';
    healthLabel.style.cssText = `
      color: #888;
      font-size: 11px;
      margin-bottom: 4px;
    `;

    this.healthBarFill = document.createElement('div');
    this.healthBarFill.style.cssText = `
      height: 100%;
      width: 100%;
      background: linear-gradient(90deg, #ff0044, #ff6600, #00ff41);
      transition: width 0.3s ease;
      border-radius: 2px;
    `;

    const healthBarBg = document.createElement('div');
    healthBarBg.style.cssText = `
      width: 100%;
      height: 12px;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid #444;
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 12px;
    `;
    healthBarBg.appendChild(this.healthBarFill);

    const energyLabel = document.createElement('div');
    energyLabel.textContent = '能量';
    energyLabel.style.cssText = `
      color: #888;
      font-size: 11px;
      margin-bottom: 4px;
    `;

    this.energyBarFill = document.createElement('div');
    this.energyBarFill.style.cssText = `
      height: 100%;
      width: 100%;
      background: linear-gradient(90deg, #00ff41, #00ffff);
      transition: width 0.1s linear;
      border-radius: 2px;
      box-shadow: 0 0 10px rgba(0, 255, 65, 0.5);
    `;

    const energyBarBg = document.createElement('div');
    energyBarBg.style.cssText = `
      width: 100%;
      height: 12px;
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid #444;
      border-radius: 3px;
      overflow: hidden;
    `;
    energyBarBg.appendChild(this.energyBarFill);

    this.perspectiveCooldownEl = document.createElement('div');
    this.perspectiveCooldownEl.style.cssText = `
      margin-top: 8px;
      font-size: 10px;
      color: #ff00ff;
      text-align: center;
      height: 14px;
    `;

    statusPanel.appendChild(playerLabel);
    statusPanel.appendChild(healthLabel);
    statusPanel.appendChild(healthBarBg);
    statusPanel.appendChild(energyLabel);
    statusPanel.appendChild(energyBarBg);
    statusPanel.appendChild(this.perspectiveCooldownEl);

    const timerPanel = document.createElement('div');
    timerPanel.style.cssText = `
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      text-align: center;
    `;

    this.timerDisplay = document.createElement('div');
    this.timerDisplay.textContent = '03:00';
    this.timerDisplay.style.cssText = `
      font-size: 48px;
      font-weight: bold;
      color: #00ff41;
      text-shadow: 0 0 20px #00ff41;
      letter-spacing: 4px;
      font-variant-numeric: tabular-nums;
    `;

    this.catCountDisplay = document.createElement('div');
    this.catCountDisplay.textContent = '剩余猫咪: 3';
    this.catCountDisplay.style.cssText = `
      font-size: 14px;
      color: #ff00ff;
      margin-top: 5px;
      letter-spacing: 2px;
    `;

    timerPanel.appendChild(this.timerDisplay);
    timerPanel.appendChild(this.catCountDisplay);

    const tipsPanel = document.createElement('div');
    tipsPanel.style.cssText = `
      position: absolute;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      text-align: center;
    `;

    this.tipsElement = document.createElement('div');
    this.tipsElement.textContent = TIPS[0];
    this.tipsElement.style.cssText = `
      font-size: 16px;
      color: #aaa;
      background: rgba(10, 10, 10, 0.7);
      padding: 10px 30px;
      border: 1px solid #333;
      border-radius: 20px;
      transition: opacity 1s ease;
      opacity: 1;
    `;

    tipsPanel.appendChild(this.tipsElement);

    const crosshair = document.createElement('div');
    crosshair.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 20px;
      height: 20px;
      pointer-events: none;
    `;
    crosshair.innerHTML = `
      <div style="position: absolute; top: 50%; left: 0; width: 100%; height: 1px; background: rgba(0, 255, 65, 0.5); transform: translateY(-50%);"></div>
      <div style="position: absolute; left: 50%; top: 0; width: 1px; height: 100%; background: rgba(0, 255, 65, 0.5); transform: translateX(-50%);"></div>
    `;

    ui.appendChild(statusPanel);
    ui.appendChild(timerPanel);
    ui.appendChild(tipsPanel);
    ui.appendChild(crosshair);

    return ui;
  }

  private createResultScreen(): HTMLDivElement {
    const screen = document.createElement('div');
    screen.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(10, 10, 10, 0.95);
      pointer-events: all;
      transform: translateX(100%);
      transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    const title = document.createElement('h1');
    title.id = 'result-title';
    title.textContent = '游戏结束';
    title.style.cssText = `
      font-size: 48px;
      margin-bottom: 30px;
      letter-spacing: 6px;
    `;

    const statsContainer = document.createElement('div');
    statsContainer.style.cssText = `
      display: flex;
      gap: 60px;
      margin-bottom: 30px;
    `;

    const ghostStats = document.createElement('div');
    ghostStats.style.cssText = `
      text-align: center;
      padding: 20px 40px;
      border: 2px solid #00ff41;
      border-radius: 10px;
      background: rgba(0, 255, 65, 0.05);
    `;
    ghostStats.innerHTML = `
      <h2 style="color: #00ff41; margin-bottom: 15px; font-size: 24px;">鬼</h2>
      <p style="color: #fff; font-size: 32px; margin-bottom: 10px;" id="ghost-score">0</p>
      <p style="color: #888; font-size: 14px;">得分</p>
      <p style="color: #00ff41; margin-top: 15px; font-size: 16px;" id="cats-caught">抓到 0 只猫</p>
    `;

    const catStats = document.createElement('div');
    catStats.style.cssText = `
      text-align: center;
      padding: 20px 40px;
      border: 2px solid #ff00ff;
      border-radius: 10px;
      background: rgba(255, 0, 255, 0.05);
    `;
    catStats.innerHTML = `
      <h2 style="color: #ff00ff; margin-bottom: 15px; font-size: 24px;">猫</h2>
      <p style="color: #fff; font-size: 32px; margin-bottom: 10px;" id="cat-score">0</p>
      <p style="color: #888; font-size: 14px;">得分</p>
      <p style="color: #ff00ff; margin-top: 15px; font-size: 16px;" id="disguise-count">伪装 0 次</p>
    `;

    statsContainer.appendChild(ghostStats);
    statsContainer.appendChild(catStats);

    const replayLabel = document.createElement('div');
    replayLabel.textContent = '最佳扣杀回放';
    replayLabel.style.cssText = `
      color: #888;
      font-size: 14px;
      margin-bottom: 10px;
      letter-spacing: 2px;
    `;

    const canvasContainer = document.createElement('div');
    canvasContainer.style.cssText = `
      width: 400px;
      height: 225px;
      border: 2px solid #333;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 30px;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    this.bestCatchCanvas = document.createElement('canvas');
    this.bestCatchCanvas.width = 400;
    this.bestCatchCanvas.height = 225;
    this.bestCatchCanvas.style.cssText = `
      max-width: 100%;
      max-height: 100%;
    `;

    const noReplayText = document.createElement('span');
    noReplayText.id = 'no-replay';
    noReplayText.textContent = '暂无记录';
    noReplayText.style.cssText = `
      color: #444;
      font-size: 14px;
    `;

    canvasContainer.appendChild(noReplayText);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 20px;
    `;

    const restartBtn = this.createButton('再来一局', '#00ff41');
    restartBtn.addEventListener('click', () => {
      if (this.onRestartGame) this.onRestartGame();
    });

    const menuBtn = this.createButton('返回菜单', '#ff00ff');
    menuBtn.addEventListener('click', () => {
      if (this.onBackToMenu) this.onBackToMenu();
    });

    buttonContainer.appendChild(restartBtn);
    buttonContainer.appendChild(menuBtn);

    screen.appendChild(title);
    screen.appendChild(statsContainer);
    screen.appendChild(replayLabel);
    screen.appendChild(canvasContainer);
    screen.appendChild(buttonContainer);

    return screen;
  }

  setOnStartGame(callback: () => void): void {
    this.onStartGame = callback;
  }

  setOnRestartGame(callback: () => void): void {
    this.onRestartGame = callback;
  }

  setOnBackToMenu(callback: () => void): void {
    this.onBackToMenu = callback;
  }

  showScreen(view: GameView): void {
    if (this.transitionActive) return;
    this.transitionActive = true;

    this.menuScreen.style.transform = view === 'menu' ? 'translateX(0)' : 'translateX(-100%)';
    this.gameUI.style.transform = view === 'game' ? 'translateX(0)' : (view === 'menu' ? 'translateX(100%)' : 'translateX(-100%)');
    this.resultScreen.style.transform = view === 'result' ? 'translateX(0)' : 'translateX(100%)';

    this.currentView = view;

    setTimeout(() => {
      this.transitionActive = false;
    }, 600);
  }

  getCurrentView(): GameView {
    return this.currentView;
  }

  updateGhostStatus(ghost: GhostState): void {
    this.energyBarFill.style.width = `${ghost.energy}%`;

    if (ghost.perspectiveCooldown > 0) {
      this.perspectiveCooldownEl.textContent = `透视冷却: ${ghost.perspectiveCooldown.toFixed(1)}s`;
    } else if (ghost.isPerspectiveMode) {
      this.perspectiveCooldownEl.textContent = '透视模式开启中...';
    } else {
      this.perspectiveCooldownEl.textContent = '按空格开启透视';
    }

    if (ghost.isPerspectiveMode) {
      this.energyBarFill.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.8)';
    } else {
      this.energyBarFill.style.boxShadow = '0 0 10px rgba(0, 255, 65, 0.5)';
    }
  }

  updateTimer(remainingTime: number): void {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = Math.floor(remainingTime % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    this.timerDisplay.textContent = timeStr;

    if (remainingTime <= 10) {
      this.timerDisplay.style.color = '#ff0044';
      this.timerDisplay.style.textShadow = '0 0 20px #ff0044, 0 0 40px #ff0044';
      this.timerDisplay.style.animation = 'blink 0.5s ease-in-out infinite';
    } else {
      this.timerDisplay.style.color = '#00ff41';
      this.timerDisplay.style.textShadow = '0 0 20px #00ff41';
      this.timerDisplay.style.animation = 'none';
    }
  }

  updateCatCount(count: number): void {
    this.catCountDisplay.textContent = `剩余猫咪: ${count}`;
  }

  updateTips(deltaTime: number): void {
    this.tipsTimer += deltaTime;
    if (this.tipsTimer >= 5) {
      this.tipsTimer = 0;
      this.tipsVisible = !this.tipsVisible;
      this.tipsElement.style.opacity = this.tipsVisible ? '1' : '0';

      if (!this.tipsVisible) {
        setTimeout(() => {
          this.tipsIndex = (this.tipsIndex + 1) % TIPS.length;
          this.tipsElement.textContent = TIPS[this.tipsIndex];
        }, 1000);
      }
    }
  }

  showResult(stats: GameStats, bestCatchImage?: ImageData): void {
    const titleEl = this.resultScreen.querySelector('#result-title') as HTMLHeadingElement;
    const ghostScoreEl = this.resultScreen.querySelector('#ghost-score') as HTMLParagraphElement;
    const catScoreEl = this.resultScreen.querySelector('#cat-score') as HTMLParagraphElement;
    const catsCaughtEl = this.resultScreen.querySelector('#cats-caught') as HTMLParagraphElement;
    const disguiseCountEl = this.resultScreen.querySelector('#disguise-count') as HTMLParagraphElement;
    const noReplayEl = this.resultScreen.querySelector('#no-replay') as HTMLSpanElement;

    if (stats.winner === 'ghost') {
      titleEl.textContent = '鬼获胜!';
      titleEl.style.color = '#00ff41';
      titleEl.style.textShadow = '0 0 30px #00ff41';
    } else {
      titleEl.textContent = '猫获胜!';
      titleEl.style.color = '#ff00ff';
      titleEl.style.textShadow = '0 0 30px #ff00ff';
    }

    ghostScoreEl.textContent = stats.ghostScore.toString();
    catScoreEl.textContent = stats.catScore.toString();
    catsCaughtEl.textContent = `抓到 ${stats.catsCaught}/${stats.totalCats} 只猫`;
    disguiseCountEl.textContent = `伪装 ${stats.totalDisguises} 次`;

    if (bestCatchImage) {
      noReplayEl.style.display = 'none';
      const ctx = this.bestCatchCanvas.getContext('2d');
      if (ctx) {
        const scale = Math.min(
          this.bestCatchCanvas.width / bestCatchImage.width,
          this.bestCatchCanvas.height / bestCatchImage.height
        );
        const drawWidth = bestCatchImage.width * scale;
        const drawHeight = bestCatchImage.height * scale;
        const offsetX = (this.bestCatchCanvas.width - drawWidth) / 2;
        const offsetY = (this.bestCatchCanvas.height - drawHeight) / 2;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = bestCatchImage.width;
        tempCanvas.height = bestCatchImage.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.putImageData(bestCatchImage, 0, 0);
          ctx.drawImage(tempCanvas, offsetX, offsetY, drawWidth, drawHeight);
        }
      }
      this.bestCatchCanvas.style.display = 'block';
    } else {
      noReplayEl.style.display = 'block';
      this.bestCatchCanvas.style.display = 'none';
    }
  }

  destroy(): void {
    if (this.uiContainer.parentNode) {
      this.uiContainer.parentNode.removeChild(this.uiContainer);
    }
  }
}
