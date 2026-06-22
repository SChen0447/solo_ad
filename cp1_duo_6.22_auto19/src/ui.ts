import { Pet } from './pet';

interface ButtonConfig {
  id: string;
  label: string;
  action: (pet: Pet) => void;
}

const BUTTONS: ButtonConfig[] = [
  { id: 'feed', label: '喂食', action: (pet) => pet.feed() },
  { id: 'play', label: '玩耍', action: (pet) => pet.play() },
  { id: 'sleep', label: '睡觉', action: (pet) => pet.sleep() },
  { id: 'heal', label: '治疗', action: (pet) => pet.heal() }
];

function triggerRelease(btn: HTMLButtonElement, action: () => void): void {
  if (!btn.classList.contains('pressed')) return;
  btn.classList.remove('pressed');
  btn.classList.add('releasing');
  action();
  setTimeout(() => {
    btn.classList.remove('releasing');
  }, 200);
}

export function initUI(pet: Pet): void {
  const panel = document.getElementById('button-panel');
  if (!panel) return;

  BUTTONS.forEach(({ id, label, action }) => {
    const btn = document.createElement('button');
    btn.id = `btn-${id}`;
    btn.className = 'pet-btn';
    btn.textContent = label;

    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      btn.classList.add('pressed');
      btn.classList.remove('releasing');
    });

    btn.addEventListener('mouseup', () => {
      triggerRelease(btn, () => action(pet));
    });

    btn.addEventListener('mouseleave', () => {
      if (btn.classList.contains('pressed')) {
        btn.classList.remove('pressed');
      }
    });

    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      btn.classList.add('pressed');
      btn.classList.remove('releasing');
    }, { passive: false });

    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      triggerRelease(btn, () => action(pet));
    });

    btn.addEventListener('touchcancel', () => {
      btn.classList.remove('pressed');
    });

    panel.appendChild(btn);
  });
}
