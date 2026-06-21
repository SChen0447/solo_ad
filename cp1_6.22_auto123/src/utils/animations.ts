import * as THREE from 'three';

export const easeOutQuad = (t: number): number => t * (2 - t);

export const easeInOutQuad = (t: number): number => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);

export const pingPong = (t: number): number => {
  const normalized = t % 2;
  return normalized < 1 ? normalized : 2 - normalized;
};

export const getHeadTurnRotation = (elapsed: number, duration: number): number => {
  const progress = (elapsed % duration) / duration;
  const angle = Math.PI / 6;
  return Math.sin(progress * Math.PI * 2) * angle;
};

export const getArmRaiseRotation = (elapsed: number, duration: number): number => {
  const progress = Math.min(elapsed / duration, 1);
  const eased = easeOutQuad(progress);
  return -eased * Math.PI * 0.5;
};

export const getSideBendRotation = (elapsed: number, duration: number): number => {
  const progress = (elapsed % duration) / duration;
  const angle = Math.PI / 12;
  return Math.sin(progress * Math.PI * 2) * angle;
};

export const damp = (
  current: number,
  target: number,
  smoothing: number,
  dt: number,
): number => {
  return THREE.MathUtils.damp(current, target, smoothing, dt);
};

export const lerp = (a: number, b: number, t: number): number => {
  return THREE.MathUtils.lerp(a, b, t);
};
