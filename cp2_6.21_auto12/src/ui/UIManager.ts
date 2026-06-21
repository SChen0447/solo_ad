import { eventBus } from '../EventBus';
import { getTotalLevels } from '../game/levelData';
import type { GameScreen, GameState, SoundData } from '../types';

export class UIManager {
  private container: HTMLElement;
  private screens: Map<GameScreen, HTMLElement> = new Map();
  private unlockedLevels: number[] = [1];
  private currentScreen: GameScreen = 'start';
  private hudContainer: HTMLElement | null = null;
  private volumeBarFill: HTMLElement | null = null;
  private volumeText: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.createStars();
    this.createStartScreen();
    this.createLevelSelectScreen();
    this.createCompleteScreen();
    this.createHUD();

    this.setupEventListeners();
    this.showScreen('start');
  }

  private createStars(): void {
    const starsContainer = document.getElementById('starsContainer');
    if (!starsContainer) return;

    for (let i = 0; i < 100; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.width = `${Math.random() * 3 + 1}px`;
      star.style.height = star.style.width;
      star.style.animationDelay = `${Math.random() * 3}s`;
      starsContainer.appendChild(star);
    }
  }

  private setupEventListeners(): void {
    eventBus.on('game:stateChange', (state: GameState) => {
      this.unlockedLevels = state.unlockedLevels;
      this.currentScreen = state.currentScreen;

      if (state.currentScreen === 'levelSelect') {
        this.updateLevelSelectCards();
      }

      if (state.currentScreen === 'calibration') {
        this.hideAllScreens();
        this.hideHUD();
      } else if (state.currentScreen === 'playing') {
        this.hideAllScreens();
        this.showHUD();
      } else {
        this.showScreen(state.currentScreen);
        this.hideHUD();
      }
    });

    eventBus.on('game:levelComplete', () => {
      this.showScreen('complete');
      this.hideHUD();
    });

    eventBus.on('sound:calibrationComplete', () => {
      eventBus.emit('ui:showScreen', 'levelSelect');
    });

    eventBus.on('sound:data', (data: SoundData) => {
      this.updateHUDVolume(data.volume);
    });
  }

  private createStartScreen(): void {
    const screen = this.createScreen('start');

    const title = document.createElement('h1');
    title.textContent = '声控解谜';
    title.style.cssText = `
      font-size: 72px;
      font-weight: bold;
      color: #66FCF1;
      text-shadow: 0 0 30px rgba(102, 252, 241, 0.8), 0 0 60px rgba(102, 252, 241, 0.4);
      margin-bottom: 20px;
      letter-spacing: 8px;
    `;

    const subtitle = document.createElement('p');
    subtitle.textContent = '用声音解开谜题，到达终点';
    subtitle.style.cssText = `
      font-size: 24px;
      color: #C5C6C7;
      margin-bottom: 60px;
      letter-spacing: 2px;
    `;

    const startBtn = this.createButton('开始游戏', () => {
      eventBus.emit('ui:showScreen', 'calibration');
      eventBus.emit('ui:startCalibration');
    });

    const instructions = document.createElement('div');
    instructions.style.cssText = `
      margin-top: 60px;
      color: #C5C6C7;
      font-size: 16px;
      text-align: center;
      line-height: 2;
    `;
    instructions.innerHTML = `
      <p>🎮 <strong>操作说明</strong></p>
      <p>← → 或 A D：移动 | ↑ 或 空格：跳跃 | W：推动方块 | R：重试</p>
      <p>🎤 <strong>声音控制</strong></p>
      <p>不同频率控制平台升降，音量+频率开启门，音量推动方块</p>
    `;

    screen.appendChild(title);
    screen.appendChild(subtitle);
    screen.appendChild(startBtn);
    screen.appendChild(instructions);

    this.screens.set('start', screen);
  }

  private createLevelSelectScreen(): void {
    const screen = this.createScreen('levelSelect');

    const title = document.createElement('h2');
    title.textContent = '选择关卡';
    title.style.cssText = `
      font-size: 48px;
      font-weight: bold;
      color: #66FCF1;
      margin-bottom: 50px;
      text-shadow: 0 0 20px rgba(102, 252, 241, 0.6);
    `;

    const cardsContainer = document.createElement('div');
    cardsContainer.style.cssText = `
      display: flex;
      gap: 40px;
      margin-bottom: 40px;
    `;

    const totalLevels = getTotalLevels();
    for (let i = 1; i <= totalLevels; i++) {
      const card = this.createLevelCard(i);
      cardsContainer.appendChild(card);
    }

    const backBtn = this.createButton('返回主菜单', () => {
      eventBus.emit('ui:showScreen', 'start');
    }, true);

    screen.appendChild(title);
    screen.appendChild(cardsContainer);
    screen.appendChild(backBtn);

    this.screens.set('levelSelect', screen);
  }

  private createLevelCard(levelId: number): HTMLElement {
    const card = document.createElement('div');
    card.id = `level-card-${levelId}`;
    card.style.cssText = `
      width: 200px;
      height: 250px;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.3);
    `;

    const levelNum = document.createElement('div');
    levelNum.textContent = `${levelId}`;
    levelNum.style.cssText = `
      font-size: 64px;
      font-weight: bold;
      margin-bottom: 10px;
    `;

    const levelName = document.createElement('div');
    levelName.id = `level-name-${levelId}`;
    levelName.style.cssText = `
      font-size: 16px;
      text-align: center;
      padding: 0 10px;
    `;

    const statusText = document.createElement('div');
    statusText.id = `level-status-${levelId}`;
    statusText.style.cssText = `
      font-size: 14px;
      margin-top: 15px;
    `;

    card.appendChild(levelNum);
    card.appendChild(levelName);
    card.appendChild(statusText);

    this.updateCardStyle(card, levelId, false);

    return card;
  }

  private updateCardStyle(card: HTMLElement, levelId: number, isUnlocked: boolean): void {
    const levelNum = card.querySelector('div:first-child') as HTMLElement;
    const levelName = document.getElementById(`level-name-${levelId}`);
    const statusText = document.getElementById(`level-status-${levelId}`);

    const levelNames = ['声音初识', '组合机关', '终极挑战'];

    if (isUnlocked) {
      card.style.background = 'linear-gradient(135deg, #45A29E 0%, #66FCF1 100%)';
      card.style.opacity = '1';
      card.style.cursor = 'pointer';
      levelNum.style.color = '#0B0C10';
      if (levelName) {
        levelName.style.color = '#0B0C10';
        levelName.textContent = levelNames[levelId - 1] || `关卡 ${levelId}`;
      }
      if (statusText) {
        statusText.style.color = '#0B0C10';
        statusText.textContent = '点击开始';
      }

      card.onmouseenter = () => {
        card.style.transform = 'scale(1.05)';
        card.style.boxShadow = 'inset 0 2px 10px rgba(0, 0, 0, 0.3), 0 0 30px rgba(102, 252, 241, 0.5)';
      };

      card.onmouseleave = () => {
        card.style.transform = 'scale(1)';
        card.style.boxShadow = 'inset 0 2px 10px rgba(0, 0, 0, 0.3)';
      };

      card.onclick = () => {
        eventBus.emit('ui:levelSelected', levelId);
      };
    } else {
      card.style.background = '#2C2F33';
      card.style.opacity = '0.5';
      card.style.cursor = 'not-allowed';
      levelNum.style.color = '#666';
      if (levelName) {
        levelName.style.color = '#888';
        levelName.textContent = '???';
      }
      if (statusText) {
        statusText.style.color = '#888';
        statusText.textContent = '未解锁';
      }

      card.onmouseenter = null;
      card.onmouseleave = null;
      card.onclick = null;
    }
  }

  private updateLevelSelectCards(): void {
    const totalLevels = getTotalLevels();
    for (let i = 1; i <= totalLevels; i++) {
      const card = document.getElementById(`level-card-${i}`);
      if (card) {
        const isUnlocked = this.unlockedLevels.includes(i);
        this.updateCardStyle(card, i, isUnlocked);
      }
    }
  }

  private createCompleteScreen(): void {
    const screen = this.createScreen('complete');

    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 30px;
      position: absolute;
      top: 60%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 100;
    `;

    const nextLevelBtn = this.createButton('下一关', () => {
      eventBus.emit('ui:nextLevel');
    });
    nextLevelBtn.id = 'next-level-btn';

    const backBtn = this.createButton('返回关卡选择', () => {
      eventBus.emit('ui:backToLevelSelect');
    }, true);

    container.appendChild(nextLevelBtn);
    container.appendChild(backBtn);

    screen.appendChild(container);
    this.screens.set('complete', screen);
  }

  private createScreen(id: string): HTMLElement {
    const screen = document.createElement('div');
    screen.className = 'screen';
    screen.id = `screen-${id}`;
    return screen;
  }

  private createButton(text: string, onClick: () => void, isSecondary: boolean = false): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = text;

    if (isSecondary) {
      btn.style.background = 'linear-gradient(135deg, #2C2F33 0%, #45A29E 100%)';
      btn.style.color = '#FFFFFF';
    }

    btn.addEventListener('click', onClick);
    return btn;
  }

  private showScreen(screenName: GameScreen): void {
    this.hideAllScreens();

    const screen = this.screens.get(screenName);
    if (screen) {
      this.container.appendChild(screen);
      requestAnimationFrame(() => {
        screen.classList.add('active');
      });
    }

    if (screenName === 'complete') {
      const nextBtn = document.getElementById('next-level-btn') as HTMLButtonElement;
      if (nextBtn) {
        const hasNext = this.currentScreen === 'complete' &&
          this.unlockedLevels.includes(Math.max(...this.unlockedLevels) + 1);
        nextBtn.style.display = hasNext ? 'block' : 'none';
      }
    }
  }

  private hideAllScreens(): void {
    this.screens.forEach(screen => {
      screen.classList.remove('active');
      if (screen.parentNode) {
        screen.parentNode.removeChild(screen);
      }
    });
  }

  update(): void {
    if (this.currentScreen === 'complete') {
      const nextBtn = document.getElementById('next-level-btn') as HTMLButtonElement;
      if (nextBtn) {
        const currentLevel = Math.max(...this.unlockedLevels.filter(l =>
          this.unlockedLevels.includes(l + 1) || l === Math.max(...this.unlockedLevels)
        ));
        const hasNext = this.unlockedLevels.includes(currentLevel + 1);
        nextBtn.style.display = hasNext ? 'block' : 'none';
      }
    }
  }

  private createHUD(): void {
    this.hudContainer = document.createElement('div');
    this.hudContainer.id = 'hud-container';
    this.hudContainer.style.cssText = `
      position: fixed;
      left: 20px;
      bottom: 20px;
      z-index: 50;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    const volumeLabel = document.createElement('div');
    volumeLabel.textContent = '音量';
    volumeLabel.style.cssText = `
      color: #C5C6C7;
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 6px;
      text-shadow: 0 0 10px rgba(102, 252, 241, 0.5);
    `;

    const volumeBarContainer = document.createElement('div');
    volumeBarContainer.style.cssText = `
      width: 180px;
      height: 14px;
      background: rgba(31, 40, 51, 0.7);
      border-radius: 7px;
      overflow: hidden;
      border: 1px solid rgba(102, 252, 241, 0.3);
      backdrop-filter: blur(4px);
    `;

    this.volumeBarFill = document.createElement('div');
    this.volumeBarFill.style.cssText = `
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #45A29E 0%, #66FCF1 50%, #FFD700 80%, #FF6B6B 100%);
      border-radius: 7px;
      transition: width 0.05s ease-out;
      box-shadow: 0 0 10px rgba(102, 252, 241, 0.5);
    `;

    this.volumeText = document.createElement('div');
    this.volumeText.style.cssText = `
      color: #FFFFFF;
      font-size: 11px;
      font-weight: bold;
      margin-top: 4px;
      text-align: center;
      text-shadow: 0 0 8px rgba(102, 252, 241, 0.6);
    `;

    volumeBarContainer.appendChild(this.volumeBarFill);
    this.hudContainer.appendChild(volumeLabel);
    this.hudContainer.appendChild(volumeBarContainer);
    this.hudContainer.appendChild(this.volumeText);

    this.container.appendChild(this.hudContainer);
  }

  private showHUD(): void {
    if (this.hudContainer) {
      this.hudContainer.style.opacity = '1';
    }
  }

  private hideHUD(): void {
    if (this.hudContainer) {
      this.hudContainer.style.opacity = '0';
    }
  }

  private updateHUDVolume(volume: number): void {
    if (this.volumeBarFill && this.volumeText) {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      const percentage = Math.round(clampedVolume * 100);
      this.volumeBarFill.style.width = `${percentage}%`;
      this.volumeText.textContent = `${percentage}%`;
      
      if (percentage > 70) {
        this.volumeBarFill.style.boxShadow = '0 0 15px rgba(255, 107, 107, 0.8)';
      } else if (percentage > 40) {
        this.volumeBarFill.style.boxShadow = '0 0 12px rgba(255, 215, 0, 0.6)';
      } else {
        this.volumeBarFill.style.boxShadow = '0 0 10px rgba(102, 252, 241, 0.5)';
      }
    }
  }
}
