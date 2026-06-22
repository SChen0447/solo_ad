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

export function initUI(pet: Pet): void {
  const panel = document.getElementById('button-panel');
  if (!panel) return;

  BUTTONS.forEach(({ id, label, action }) => {
    const btn = document.createElement('button');
    btn.id = `btn-${id}`;
    btn.className = 'pet-btn';
    btn.textContent = label;

    btn.addEventListener('mousedown', () => {
      btn.style.transform = 'translateY(2px)';
    });

    btn.addEventListener('mouseup', () => {
      btn.style.transform = '';
      action(pet);
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
    });

    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      btn.style.transform = 'translateY(2px)';
    }, { passive: false });

    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      btn.style.transform = '';
      action(pet);
    });

    panel.appendChild(btn);
  });
}
