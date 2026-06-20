import confetti from 'canvas-confetti';

export const fireGoldConfetti = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  const x = (rect.left + rect.width / 2) / window.innerWidth;
  const y = (rect.top + rect.height / 2) / window.innerHeight;

  confetti({
    particleCount: 30,
    spread: 360,
    origin: { x, y },
    colors: ['#FFD700', '#FFA500', '#FFE4B5', '#FFEC8B'],
    shapes: ['circle', 'square'],
    scalar: 0.8,
    gravity: 1.2,
    ticks: 60,
    startVelocity: 25
  });
};
