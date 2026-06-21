const WAVE_SAMPLE_COUNT = 64;

function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hannWindow(i: number, n: number): number {
  const t = i / (n - 1);
  return 0.5 * (1 - Math.cos(2 * Math.PI * t));
}

export function generateWaveData(
  showName: string,
  episodeTitle: string,
  guestName: string,
  sampleCount: number = WAVE_SAMPLE_COUNT
): number[] {
  const combined = `${showName}||${episodeTitle}||${guestName}`;
  const hash = djb2Hash(combined || 'default_podcast_wave_seed');
  const random = mulberry32(hash);

  const lambda1 = 12 + random() * 10;
  const lambda2 = 6 + random() * 6;
  const phase1 = random() * Math.PI * 2;
  const phase2 = random() * Math.PI * 2;
  const noiseAmp = 0.15 + random() * 0.1;
  const amp1 = 0.35 + random() * 0.15;
  const amp2 = 0.2 + random() * 0.15;

  const values: number[] = [];

  for (let i = 0; i < sampleCount; i++) {
    const x = i;
    const wave1 = Math.sin((2 * Math.PI * x) / lambda1 + phase1);
    const wave2 = Math.sin((2 * Math.PI * x) / lambda2 + phase2);
    const noise = (random() * 2 - 1);
    let val = amp1 * wave1 + amp2 * wave2 + noiseAmp * noise;
    val *= hannWindow(i, sampleCount);
    if (val > 1) val = 1;
    if (val < -1) val = -1;
    values.push(val);
  }

  return values;
}
