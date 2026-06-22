import { Particle, UpgradeParticle } from '../types';

export function getParticleStyle(particle: Particle, now: number): React.CSSProperties {
  const elapsed = now - particle.createdAt;
  const t = Math.min(elapsed / particle.duration, 1);
  const opacity = 1 - t;
  return {
    position: 'absolute',
    left: particle.x,
    top: particle.y,
    width: particle.size,
    height: particle.size,
    backgroundColor: particle.color,
    opacity,
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    transition: 'none',
  };
}

export function getUpgradeParticleStyle(particle: UpgradeParticle, now: number): React.CSSProperties {
  const elapsed = now - particle.createdAt;
  const t = Math.min(elapsed / particle.duration, 1);
  const opacity = 1 - t;
  const scale = 1 + t * 0.5;
  return {
    position: 'absolute',
    left: particle.x,
    top: particle.y,
    width: particle.size,
    height: particle.size,
    backgroundColor: particle.color,
    opacity,
    transform: `translate(-50%, -50%) scale(${scale})`,
    pointerEvents: 'none',
    borderRadius: '50%',
    transition: 'none',
  };
}
