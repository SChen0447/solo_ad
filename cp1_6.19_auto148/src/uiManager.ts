import { Game, TowerType } from './main';

export class UIManager {
  game: Game;
  buildMenu: HTMLElement;
  coinValueEl: HTMLElement;
  waveValueEl: HTMLElement;
  lifeHeartsEl: HTMLElement;
  speedBtn: HTMLElement;

  constructor(game: Game) {
    this.game = game;
    this.buildMenu = document.getElementById('build-menu')!;
    this.coinValueEl = document.getElementById('coin-value')!;
    this.waveValueEl = document.getElementById('wave-value')!;
    this.lifeHeartsEl = document.getElementById('life-hearts')!;
    this.speedBtn = document.getElementById('speed-btn')!;
  }

  init() {
    this.renderHearts();
    this.updateCoins();
    this.updateWave();

    const towerOptions = this.buildMenu.querySelectorAll('.tower-option');
    towerOptions.forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = (opt as HTMLElement).dataset.tower as TowerType;
        if (!type) return;
        const cost = this.game.towerManager.getTowerCost(type);
        if (this.game.gameState.coins < cost) return;
        if (this.game.selectedSlot !== null) {
          this.game.buildTower(this.game.selectedSlot, type);
        }
      });
    });

    this.speedBtn.addEventListener('click', () => {
      const cur = this.game.gameState.speed;
      const next = cur >= 2 ? 1 : 2;
      this.game.setSpeed(next);
      this.speedBtn.textContent = next === 1 ? '1×' : '2×';
      if (next === 2) {
        this.speedBtn.classList.add('active');
      } else {
        this.speedBtn.classList.remove('active');
      }
    });
  }

  renderHearts() {
    this.lifeHeartsEl.innerHTML = '';
    for (let i = 0; i < this.game.gameState.maxLives; i++) {
      const h = document.createElement('span');
      h.className = 'heart';
      h.textContent = '❤';
      this.lifeHeartsEl.appendChild(h);
    }
    this.syncHearts();
  }

  syncHearts() {
    const hearts = this.lifeHeartsEl.querySelectorAll('.heart');
    hearts.forEach((h, i) => {
      if (i < this.game.gameState.lives) {
        h.classList.remove('lost');
      } else {
        h.classList.add('lost');
      }
    });
  }

  updateLives() {
    this.syncHearts();
    const hearts = this.lifeHeartsEl.querySelectorAll('.heart');
    const flashIdx = this.game.gameState.lives;
    if (flashIdx >= 0 && flashIdx < hearts.length) {
      const target = hearts[flashIdx] as HTMLElement;
      target.classList.remove('flash');
      void target.offsetWidth;
      target.classList.add('flash');
    }
  }

  updateCoins(bounce: boolean = false) {
    this.coinValueEl.textContent = String(this.game.gameState.coins);
    if (bounce) {
      this.coinValueEl.classList.remove('bounce');
      void this.coinValueEl.offsetWidth;
      this.coinValueEl.classList.add('bounce');
    }
    const options = this.buildMenu.querySelectorAll('.tower-option');
    options.forEach(opt => {
      const type = (opt as HTMLElement).dataset.tower as TowerType;
      if (!type) return;
      const cost = this.game.towerManager.getTowerCost(type);
      if (this.game.gameState.coins < cost) {
        opt.classList.add('disabled');
      } else {
        opt.classList.remove('disabled');
      }
    });
  }

  updateWave() {
    this.waveValueEl.textContent = `${this.game.gameState.wave} / ${this.game.gameState.maxWaves}`;
  }

  showBuildMenu(x: number, y: number) {
    this.buildMenu.style.display = 'block';
    const menuW = this.buildMenu.offsetWidth;
    const menuH = this.buildMenu.offsetHeight;
    let posX = x;
    let posY = y - 80;
    if (posX - menuW / 2 < 10) posX = menuW / 2 + 10;
    if (posX + menuW / 2 > window.innerWidth - 10) posX = window.innerWidth - menuW / 2 - 10;
    if (posY - menuH / 2 < 10) posY = menuH / 2 + 10;
    if (posY + menuH / 2 > window.innerHeight - 10) posY = window.innerHeight - menuH / 2 - 10;
    this.buildMenu.style.left = posX + 'px';
    this.buildMenu.style.top = posY + 'px';
    this.updateCoins();
  }

  hideBuildMenu() {
    this.buildMenu.style.display = 'none';
  }
}
