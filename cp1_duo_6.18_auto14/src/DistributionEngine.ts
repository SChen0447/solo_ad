export type DistributionType = 'normal' | 'uniform' | 'exponential' | 'poisson' | 'binomial';

export interface DistributionParams {
  normal: { mean: number; std: number };
  uniform: { a: number; b: number };
  exponential: { lambda: number };
  poisson: { mu: number };
  binomial: { n: number; p: number };
}

export interface DensityPoint {
  x: number;
  z: number;
  y: number;
}

export interface SurfaceData {
  type: 'surface';
  points: DensityPoint[];
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
  gridSizeX: number;
  gridSizeZ: number;
  maxDensity: number;
}

export interface BarData {
  type: 'bars';
  bars: DensityPoint[];
  barWidth: number;
  barDepth: number;
  maxDensity: number;
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
}

export type DistributionData = SurfaceData | BarData;

const factorial = (n: number): number => {
  if (n < 0) return 0;
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
};

const normalPdf = (x: number, mean: number, std: number): number => {
  return (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / std, 2));
};

const uniformPdf = (x: number, a: number, b: number): number => {
  if (x >= a && x <= b) {
    return 1 / (b - a);
  }
  return 0;
};

const exponentialPdf = (x: number, lambda: number): number => {
  if (x < 0) return 0;
  return lambda * Math.exp(-lambda * x);
};

const poissonPmf = (k: number, mu: number): number => {
  if (k < 0 || !Number.isInteger(k)) return 0;
  return (Math.pow(mu, k) * Math.exp(-mu)) / factorial(k);
};

const binomialPmf = (k: number, n: number, p: number): number => {
  if (k < 0 || k > n || !Number.isInteger(k)) return 0;
  const comb = factorial(n) / (factorial(k) * factorial(n - k));
  return comb * Math.pow(p, k) * Math.pow(1 - p, n - k);
};

export const generateSurfaceData = (
  type: 'normal' | 'uniform' | 'exponential',
  params: DistributionParams[typeof type],
  xMin: number = -4,
  xMax: number = 4,
  zMin: number = -4,
  zMax: number = 4,
  gridSize: number = 60
): SurfaceData => {
  const points: DensityPoint[] = [];
  let maxDensity = 0;

  const stepX = (xMax - xMin) / (gridSize - 1);
  const stepZ = (zMax - zMin) / (gridSize - 1);

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const x = xMin + i * stepX;
      const z = zMin + j * stepZ;
      let densityX: number;
      let densityZ: number;

      switch (type) {
        case 'normal': {
          const p = params as DistributionParams['normal'];
          densityX = normalPdf(x, p.mean, p.std);
          densityZ = normalPdf(z, p.mean, p.std);
          break;
        }
        case 'uniform': {
          const p = params as DistributionParams['uniform'];
          densityX = uniformPdf(x, p.a, p.b);
          densityZ = uniformPdf(z, p.a, p.b);
          break;
        }
        case 'exponential': {
          const p = params as DistributionParams['exponential'];
          densityX = exponentialPdf(Math.abs(x), p.lambda);
          densityZ = exponentialPdf(Math.abs(z), p.lambda);
          break;
        }
        default:
          densityX = 0;
          densityZ = 0;
      }

      const y = densityX * densityZ;
      if (y > maxDensity) maxDensity = y;
      points.push({ x, z, y });
    }
  }

  return {
    type: 'surface',
    points,
    xMin,
    xMax,
    zMin,
    zMax,
    gridSizeX: gridSize,
    gridSizeZ: gridSize,
    maxDensity
  };
};

export const generateBarData = (
  type: 'poisson' | 'binomial',
  params: DistributionParams[typeof type]
): BarData => {
  const bars: DensityPoint[] = [];
  let maxDensity = 0;
  const barWidth = 0.3;
  const barDepth = 0.3;
  const spacing = 0.2;
  const step = barWidth + spacing;

  let maxVal: number;
  if (type === 'poisson') {
    maxVal = Math.min(Math.ceil((params as { mu: number }).mu * 3) + 2, 30);
  } else {
    maxVal = (params as { n: number; p: number }).n;
  }

  const range = maxVal;
  const offset = -range / 2;

  for (let i = 0; i <= range; i++) {
    for (let j = 0; j <= range; j++) {
      const xVal = i;
      const zVal = j;
      let pmfX: number;
      let pmfZ: number;

      if (type === 'poisson') {
        const mu = (params as { mu: number }).mu;
        pmfX = poissonPmf(xVal, mu);
        pmfZ = poissonPmf(zVal, mu);
      } else {
        const { n, p } = params as { n: number; p: number };
        pmfX = binomialPmf(xVal, n, p);
        pmfZ = binomialPmf(zVal, n, p);
      }

      const y = pmfX * pmfZ;
      if (y > maxDensity) maxDensity = y;

      const x = offset + i * step;
      const z = offset + j * step;
      bars.push({ x, z, y });
    }
  }

  return {
    type: 'bars',
    bars,
    barWidth,
    barDepth,
    maxDensity,
    xMin: offset - barWidth / 2,
    xMax: offset + range * step + barWidth / 2,
    zMin: offset - barDepth / 2,
    zMax: offset + range * step + barDepth / 2
  };
};

export const generateDistributionData = (
  type: DistributionType,
  params: DistributionParams[DistributionType]
): DistributionData => {
  switch (type) {
    case 'normal':
      return generateSurfaceData('normal', params as DistributionParams['normal']);
    case 'uniform':
      return generateSurfaceData('uniform', params as DistributionParams['uniform']);
    case 'exponential':
      return generateSurfaceData('exponential', params as DistributionParams['exponential']);
    case 'poisson':
      return generateBarData('poisson', params as DistributionParams['poisson']);
    case 'binomial':
      return generateBarData('binomial', params as DistributionParams['binomial']);
    default:
      return generateSurfaceData('normal', { mean: 0, std: 1 });
  }
};

export const isDiscreteDistribution = (type: DistributionType): boolean => {
  return type === 'poisson' || type === 'binomial';
};

export const getDefaultParams = (type: DistributionType): DistributionParams[DistributionType] => {
  switch (type) {
    case 'normal':
      return { mean: 0, std: 1 };
    case 'uniform':
      return { a: -2, b: 2 };
    case 'exponential':
      return { lambda: 1 };
    case 'poisson':
      return { mu: 5 };
    case 'binomial':
      return { n: 10, p: 0.5 };
    default:
      return { mean: 0, std: 1 };
  }
};

export const distributionNames: Record<DistributionType, string> = {
  normal: '正态分布',
  uniform: '均匀分布',
  exponential: '指数分布',
  poisson: '泊松分布',
  binomial: '二项分布'
};
