export interface WindInput {
  windLevel: number;
  time: number;
  isDragging: boolean;
  releaseTime: number | null;
}

export interface NodeOffset {
  bendAngleX: number;
  bendAngleZ: number;
  swayOffsetX: number;
  swayOffsetZ: number;
  leafFlutter: number;
  leafTwist: number;
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function calculateWindOffsets(
  input: WindInput,
  nodeHeightNormalized: number,
  randomSeed: number = 0
): NodeOffset {
  const { windLevel, time, isDragging, releaseTime } = input;

  let effectiveWind = windLevel;
  if (!isDragging && releaseTime !== null) {
    const elapsed = (time - releaseTime) / 800;
    const damping = Math.max(0, 1 - easeOutQuad(Math.min(elapsed, 1)));
    effectiveWind = windLevel * damping;
  }

  const normalizedWind = effectiveWind / 10;
  const t = time / 1000;
  const heightFactor = Math.pow(nodeHeightNormalized, 1.5);

  const baseFreq = 0.8 + normalizedWind * 2.0;
  const amp = normalizedWind * 0.5 * heightFactor;

  const noise1 = Math.sin(t * baseFreq + randomSeed * 1.7) * 0.6;
  const noise2 = Math.sin(t * baseFreq * 1.7 + randomSeed * 3.2) * 0.3;
  const noise3 = Math.sin(t * baseFreq * 0.5 + randomSeed * 0.9) * 0.1;

  const combinedSway = noise1 + noise2 + noise3;

  const bendAngleX = combinedSway * amp * 0.6;
  const bendAngleZ = Math.sin(t * baseFreq * 1.3 + randomSeed * 2.1) * amp * 0.35;

  const swayOffsetX = combinedSway * amp * 0.25 * nodeHeightNormalized;
  const swayOffsetZ = Math.sin(t * baseFreq * 0.9 + randomSeed * 1.1) * amp * 0.15 * nodeHeightNormalized;

  const flutterFreq = baseFreq * 4.0 + randomSeed;
  const leafFlutter = Math.sin(t * flutterFreq) * normalizedWind * 0.15 * (0.5 + nodeHeightNormalized * 0.5);
  const leafTwist = Math.sin(t * flutterFreq * 0.7 + randomSeed) * normalizedWind * 0.1 * heightFactor;

  return {
    bendAngleX,
    bendAngleZ,
    swayOffsetX,
    swayOffsetZ,
    leafFlutter,
    leafTwist,
  };
}

export function getWindReleaseTime(isDragging: boolean, prevRelease: number | null, time: number): number | null {
  if (isDragging) return null;
  if (prevRelease !== null) return prevRelease;
  return time;
}
