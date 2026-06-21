export interface WorkerInput {
  originalPositions: Float32Array;
  leftHand: {
    gesture: 'pinch' | 'open' | 'knead' | 'fist' | 'unknown';
    fingertipX: number[];
    fingertipY: number[];
  } | null;
  rightHand: {
    gesture: 'pinch' | 'open' | 'knead' | 'fist' | 'unknown';
    fingertipX: number[];
    fingertipY: number[];
  } | null;
  kneadPhase: number;
  amplitude: number;
}

export interface WorkerOutput {
  targetPositions: Float32Array;
}

const FINGERTIP_INDICES = [0, 1, 2, 3, 4];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function calculateBilinearWeight(
  vx: number, vy: number, vz: number,
  tipX: number, tipY: number,
  side: 'left' | 'right'
): number {
  const len = Math.sqrt(vx * vx + vy * vy + vz * vz);
  if (len === 0) return 0;

  const nx = vx / len;
  const ny = vy / len;

  let mappedVertexX: number;
  let mappedVertexY: number;
  let mappedTipX: number;
  let mappedTipY: number;

  if (side === 'left') {
    mappedVertexX = -nx;
    mappedVertexY = ny;
    mappedTipX = -tipX;
    mappedTipY = tipY;
  } else {
    mappedVertexX = nx;
    mappedVertexY = -ny;
    mappedTipX = tipX;
    mappedTipY = -tipY;
  }

  const xWeight = Math.max(0, 1 - Math.abs(mappedVertexX - mappedTipX) / 1.2);
  const yWeight = Math.max(0, 1 - Math.abs(mappedVertexY - mappedTipY) / 1.2);
  const bilinearWeight = xWeight * yWeight;

  const euclideanDist = Math.sqrt(
    Math.pow(mappedVertexX - mappedTipX, 2) +
    Math.pow(mappedVertexY - mappedTipY, 2)
  );
  const distanceWeight = Math.max(0, 1 - euclideanDist / 1.0);

  const finalWeight = bilinearWeight * 0.6 + distanceWeight * distanceWeight * 0.4;

  return finalWeight * finalWeight;
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const data = e.data;
  const originalPositions = new Float32Array(data.originalPositions);
  const leftHand = data.leftHand;
  const rightHand = data.rightHand;
  const kneadPhase = data.kneadPhase;
  const amplitude = data.amplitude;

  const vertexCount = originalPositions.length / 3;
  const targetPositions = new Float32Array(originalPositions.length);

  for (let i = 0; i < originalPositions.length; i++) {
    targetPositions[i] = originalPositions[i];
  }

  for (let vi = 0; vi < vertexCount; vi++) {
    const ox = originalPositions[vi * 3];
    const oy = originalPositions[vi * 3 + 1];
    const oz = originalPositions[vi * 3 + 2];

    const len = Math.sqrt(ox * ox + oy * oy + oz * oz);
    if (len === 0) continue;

    const nx = ox / len;
    const ny = oy / len;
    const nz = oz / len;

    let totalOffset = 0;

    const isLeftArea = ox < 0 && oy > 0;
    const isRightArea = ox > 0 && oy < 0;

    if (isLeftArea && leftHand) {
      for (let i = 0; i < FINGERTIP_INDICES.length; i++) {
        const tipX = (leftHand.fingertipX[i] - 0.5) * 2;
        const tipY = -(leftHand.fingertipY[i] - 0.5) * 2;
        const weight = calculateBilinearWeight(ox, oy, oz, tipX, tipY, 'left');

        if (leftHand.gesture === 'pinch' && i < 2) {
          totalOffset -= weight * amplitude * 0.3;
        }
        if (leftHand.gesture === 'knead') {
          const wave = Math.sin(kneadPhase + tipX * 5 + tipY * 5);
          totalOffset += weight * amplitude * 0.2 * (0.5 + 0.5 * wave);
        }
      }
    }

    if (isRightArea && rightHand) {
      for (let i = 0; i < FINGERTIP_INDICES.length; i++) {
        const tipX = (rightHand.fingertipX[i] - 0.5) * 2;
        const tipY = -(rightHand.fingertipY[i] - 0.5) * 2;
        const weight = calculateBilinearWeight(ox, oy, oz, tipX, tipY, 'right');

        if (rightHand.gesture === 'pinch' && i < 2) {
          totalOffset -= weight * amplitude * 0.3;
        }
        if (rightHand.gesture === 'knead') {
          const wave = Math.sin(kneadPhase + tipX * 5 + tipY * 5);
          totalOffset += weight * amplitude * 0.2 * (0.5 + 0.5 * wave);
        }
      }
    }

    totalOffset = clamp(totalOffset, -0.5, 0.5);

    targetPositions[vi * 3] = ox + nx * totalOffset;
    targetPositions[vi * 3 + 1] = oy + ny * totalOffset;
    targetPositions[vi * 3 + 2] = oz + nz * totalOffset;
  }

  const output: WorkerOutput = { targetPositions };
  self.postMessage(output, [targetPositions.buffer]);
};

export {};
