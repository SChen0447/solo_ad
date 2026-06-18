export interface ParticleData {
  id: string;
  position: [number, number, number];
  probability: number;
  color: string;
}

export interface CloudParams {
  nLevel: number;
  position: [number, number, number];
  coefficient: {
    s: number;
    p: number;
    d: number;
  };
}

export interface CollapseEvent {
  position: [number, number, number];
  timestamp: number;
  active: boolean;
}

export interface AnimationFrame {
  particleId: string;
  position: [number, number, number];
  opacity: number;
}
