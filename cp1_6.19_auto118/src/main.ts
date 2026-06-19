import { GameCore } from './gameCore';
import { CONFIG } from './config';

function animateNumber(
  el: HTMLElement,
  from: number,
  to: number,
  duration: number = 400,
  suffix: string = ''
): void {
  const start = performance.now();
  const diff = to - from;

  const step = (time: number) => {
    const progress = Math.min(1, (time - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(from + diff * eased);
    el.textContent = `${current}${suffix}`;
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };

  if (diff !== 0) {
    el.classList.add('bump');
    setTimeout(() => el.classList.remove('bump'), 150);
    requestAnimationFrame(step);
  } else {
    el.textContent = `${to}${suffix}`;
  }
}

class NumberAnimator {
  private el: HTMLElement;
  private currentValue: number;
  private suffix: string;

  constructor(el: HTMLElement, initial: number, suffix: string = '') {
    this.el = el;
    this.currentValue = initial;
    this.suffix = suffix;
    this.el.textContent = `${initial}${suffix}`;
  }

  set(value: number): void {
    if (value !== this.currentValue) {
      animateNumber(this.el, this.currentValue, value, 400, this.suffix);
      this.currentValue = value;
    }
  }
}

class JoystickController {
  private wrapper: HTMLElement;
  private knob: HTMLElement;
  private active: boolean = false;
  private centerX: number = 0;
  private centerY: number = 0;
  private radius: number = 0;
  private onChange: (x: number, y: number, active: boolean) => void;
  private currentX: number = 0;
  private currentY: number = 0;

  constructor(
    wrapper: HTMLElement,
    knob: HTMLElement,
    onChange: (x: number, y: number, active: boolean) => void
  ) {
    this.wrapper = wrapper;
    this.knob = knob;
    this.onChange = onChange;
    this.bindEvents();
  }

  private bindEvents(): void {
    const start = (e: TouchEvent | MouseEvent) => {
      e.preventDefault();
      this.active = true;
      const rect = this.wrapper.getBoundingClientRect();
      this.centerX = rect.left + rect.width / 2;
      this.centerY = rect.top + rect.height / 2;
      this.radius = rect.width / 2 - 30;
      this.updatePosition(e);
    };

    const move = (e: TouchEvent | MouseEvent) => {
      if (!this.active) return;
      e.preventDefault();
      this.updatePosition(e);
    };

    const end = (e: TouchEvent | MouseEvent) => {
      if (!this.active) return;
      e.preventDefault();
      this.active = false;
      this.currentX = 0;
      this.currentY = 0;
      this.knob.style.left = '50%';
      this.knob.style.top = '50%';
      this.onChange(0, 0, false);
    };

    this.wrapper.addEventListener('touchstart', start, { passive: false });
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end);

    this.wrapper.addEventListener('mousedown', start);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
  }

  private updatePosition(e: TouchEvent | MouseEvent): void {
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0]?.clientX ?? this.centerX;
      clientY = e.touches[0]?.clientY ?? this.centerY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    let dx = clientX - this.centerX;
    let dy = clientY - this.centerY;
    const dist = Math.hypot(dx, dy);

    if (dist > this.radius) {
      dx = (dx / dist) * this.radius;
      dy = (dy / dist) * this.radius;
    }

    this.currentX = dx / this.radius;
    this.currentY = dy / this.radius;

    this.knob.style.left = `${50 + (dx / this.radius) * 35}%`;
    this.knob.style.top = `${50 + (dy / this.radius) * 35}%`;

    this.onChange(this.currentX, this.currentY, true);
  }
}

function init(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const oxygenText = document.getElementById('oxygen-text') as HTMLElement;
  const oxygenBar = document.getElementById('oxygen-bar') as HTMLElement;
  const coinCount = document.getElementById('coin-count') as HTMLElement;
  const explorePercent = document.getElementById('explore-percent') as HTMLElement;
  const gameOverPanel = document.getElementById('game-over-panel') as HTMLElement;
  const finalTime = document.getElementById('final-time') as HTMLElement;
  const finalCoins = document.getElementById('final-coins') as HTMLElement;
  const restartBtn = document.getElementById('restart-btn') as HTMLElement;

  const oxygenAnimator = new NumberAnimator(oxygenText, 100, '%');
  const coinAnimator = new NumberAnimator(coinCount, 0, '');
  const exploreAnimator = new NumberAnimator(explorePercent, 0, '%');

  let lastOxygen = 100;

  const game = new GameCore(canvas, {
    onOxygenChange: (percent: number) => {
      if (percent !== lastOxygen) {
        oxygenAnimator.set(percent);
        oxygenBar.style.width = `${percent}%`;
        if (percent <= CONFIG.OXYGEN.LOW_THRESHOLD) {
          oxygenBar.classList.add('low');
        } else {
          oxygenBar.classList.remove('low');
        }
        lastOxygen = percent;
      }
    },
    onCoinsChange: (coins: number) => {
      coinAnimator.set(coins);
    },
    onExploreChange: (percent: number) => {
      exploreAnimator.set(percent);
    },
    onGameOver: (time: number, coins: number) => {
      finalTime.textContent = `${time}s`;
      finalCoins.textContent = `${coins}`;
      setTimeout(() => {
        gameOverPanel.classList.add('show');
      }, 300);
    }
  });

  restartBtn.addEventListener('click', () => {
    gameOverPanel.classList.remove('show');
    setTimeout(() => {
      game.restart();
    }, 300);
  });

  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.matchMedia('(hover: none) and (pointer: coarse)').matches;

  const mobileControls = document.getElementById('mobile-controls') as HTMLElement;
  const keyHint = document.getElementById('key-hint') as HTMLElement;

  if (isMobile) {
    mobileControls.classList.add('show');
    if (keyHint) keyHint.style.display = 'none';

    const joystickWrapper = document.getElementById('joystick-wrapper') as HTMLElement;
    const joystickKnob = document.getElementById('joystick-knob') as HTMLElement;
    const actionBtn = document.getElementById('action-btn') as HTMLElement;

    new JoystickController(joystickWrapper, joystickKnob, (x, y, active) => {
      game.setJoystick(x, y, active);
    });

    const triggerAction = (e: Event) => {
      e.preventDefault();
      game.triggerInteract();
    };
    actionBtn.addEventListener('touchstart', triggerAction, { passive: false });
    actionBtn.addEventListener('mousedown', triggerAction);
  }

  game.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
