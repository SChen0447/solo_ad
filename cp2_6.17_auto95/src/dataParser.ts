import Papa from 'papaparse';

export interface HRVData {
  rrIntervals: number[];
  timestamps: number[];
  timeDomain: {
    SDNN: number;
    RMSSD: number;
    pNN50: number;
    meanRR: number;
    medianRR: number;
  };
  frequencyDomain: {
    vlfPower: number;
    lfPower: number;
    hfPower: number;
    totalPower: number;
    lfHfRatio: number;
  };
  rollingMetrics: {
    SDNN: number[];
    RMSSD: number[];
    pNN50: number[];
  };
  windowedFrequency: {
    vlf: number[];
    lf: number[];
    hf: number[];
    lfHfRatio: number[];
  };
}

const WINDOW_SIZE = 128;

export async function parseCSVFile(file: File): Promise<HRVData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const data = results.data as string[][];
          const { rrIntervals, timestamps } = extractRRIntervals(data);
          
          if (rrIntervals.length < 10) {
            reject(new Error('数据点数不足，至少需要10个心跳间隔数据'));
            return;
          }

          const timeDomain = computeTimeDomain(rrIntervals);
          const rollingMetrics = computeRollingMetrics(rrIntervals);
          const freqDomain = computeFrequencyDomain(rrIntervals);
          const windowedFrequency = computeWindowedFrequency(rrIntervals);

          resolve({
            rrIntervals,
            timestamps,
            timeDomain,
            frequencyDomain: freqDomain,
            rollingMetrics,
            windowedFrequency
          });
        } catch (error) {
          reject(error instanceof Error ? error : new Error('数据解析失败'));
        }
      },
      error: (error) => {
        reject(new Error(`CSV解析错误: ${error.message}`));
      }
    });
  });
}

function extractRRIntervals(data: string[][]): { rrIntervals: number[]; timestamps: number[] } {
  const rrIntervals: number[] = [];
  const timestamps: number[] = [];

  if (data.length === 0) {
    throw new Error('CSV文件为空');
  }

  const firstRow = data[0];
  const hasHeader = firstRow.some(cell => 
    isNaN(parseFloat(cell)) && cell.trim().length > 0
  );

  const startIndex = hasHeader ? 1 : 0;
  const colCount = firstRow.length;

  for (let i = startIndex; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    if (colCount === 1) {
      const val = parseFloat(row[0]);
      if (!isNaN(val) && val > 0 && val < 5000) {
        rrIntervals.push(val);
        timestamps.push(rrIntervals.length > 0 
          ? timestamps[timestamps.length - 1] + val 
          : 0
        );
      }
    } else if (colCount >= 2) {
      const ts = parseFloat(row[0]);
      const rr = parseFloat(row[1]);
      
      if (!isNaN(rr) && rr > 0 && rr < 5000) {
        rrIntervals.push(rr);
        if (!isNaN(ts)) {
          timestamps.push(ts);
        } else {
          timestamps.push(rrIntervals.length > 0 
            ? timestamps[timestamps.length - 1] + rr 
            : 0
          );
        }
      }
    }
  }

  if (rrIntervals.length === 0) {
    throw new Error('未找到有效的心跳间隔数据，请检查CSV格式');
  }

  return { rrIntervals, timestamps };
}

function computeTimeDomain(rrIntervals: number[]): HRVData['timeDomain'] {
  const n = rrIntervals.length;
  const meanRR = rrIntervals.reduce((a, b) => a + b, 0) / n;

  const sumSqDiff = rrIntervals.reduce((sum, val) => sum + Math.pow(val - meanRR, 2), 0);
  const SDNN = Math.sqrt(sumSqDiff / (n - 1));

  let sumDiffSq = 0;
  let nn50Count = 0;
  for (let i = 1; i < n; i++) {
    const diff = rrIntervals[i] - rrIntervals[i - 1];
    sumDiffSq += diff * diff;
    if (Math.abs(diff) > 50) nn50Count++;
  }
  const RMSSD = Math.sqrt(sumDiffSq / (n - 1));
  const pNN50 = (nn50Count / (n - 1)) * 100;

  const sorted = [...rrIntervals].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianRR = sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];

  return { SDNN, RMSSD, pNN50, meanRR, medianRR };
}

function computeRollingMetrics(rrIntervals: number[]): HRVData['rollingMetrics'] {
  const window = 30;
  const SDNN: number[] = [];
  const RMSSD: number[] = [];
  const pNN50: number[] = [];

  for (let i = 0; i < rrIntervals.length; i++) {
    const start = Math.max(0, i - window + 1);
    const end = i + 1;
    const slice = rrIntervals.slice(start, end);
    const metrics = computeTimeDomain(slice);
    
    SDNN.push(metrics.SDNN);
    RMSSD.push(metrics.RMSSD);
    pNN50.push(metrics.pNN50);
  }

  return { SDNN, RMSSD, pNN50 };
}

function fft(real: number[], imag: number[]): void {
  const n = real.length;
  if (n <= 1) return;

  const log2n = Math.log2(n);
  if (Math.floor(log2n) !== log2n) {
    return;
  }

  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len / 2;
    const ang = -2 * Math.PI / len;
    const wR = Math.cos(ang);
    const wI = Math.sin(ang);

    for (let i = 0; i < n; i += len) {
      let r = 1;
      let im = 0;
      for (let j = 0; j < halfLen; j++) {
        const tR = r * real[i + j + halfLen] - im * imag[i + j + halfLen];
        const tI = r * imag[i + j + halfLen] + im * real[i + j + halfLen];
        
        real[i + j + halfLen] = real[i + j] - tR;
        imag[i + j + halfLen] = imag[i + j] - tI;
        real[i + j] += tR;
        imag[i + j] += tI;

        const tempR = r;
        r = tempR * wR - im * wI;
        im = tempR * wI + im * wR;
      }
    }
  }
}

function computePowerSpectrum(rrIntervals: number[]): { freqs: number[]; power: number[] } {
  let n = 1;
  while (n < rrIntervals.length) {
    n <<= 1;
  }

  const meanRR = rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length;
  const fs = 1000 / meanRR;

  const real = new Array(n).fill(0);
  const imag = new Array(n).fill(0);

  for (let i = 0; i < rrIntervals.length; i++) {
    real[i] = rrIntervals[i] - meanRR;
    real[i] *= 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (rrIntervals.length - 1));
  }

  fft(real, imag);

  const freqs: number[] = [];
  const power: number[] = [];

  for (let i = 0; i <= n / 2; i++) {
    const freq = (i * fs) / n;
    const pwr = (real[i] * real[i] + imag[i] * imag[i]) / n;
    freqs.push(freq);
    power.push(pwr);
  }

  return { freqs, power };
}

function computeFrequencyDomain(rrIntervals: number[]): HRVData['frequencyDomain'] {
  const { freqs, power } = computePowerSpectrum(rrIntervals);

  let vlfPower = 0;
  let lfPower = 0;
  let hfPower = 0;
  let totalPower = 0;

  for (let i = 0; i < freqs.length; i++) {
    const f = freqs[i];
    const p = power[i];
    totalPower += p;

    if (f >= 0.003 && f < 0.04) {
      vlfPower += p;
    } else if (f >= 0.04 && f < 0.15) {
      lfPower += p;
    } else if (f >= 0.15 && f < 0.4) {
      hfPower += p;
    }
  }

  const lfHfRatio = hfPower > 0 ? lfPower / hfPower : 0;

  return { vlfPower, lfPower, hfPower, totalPower, lfHfRatio };
}

function computeWindowedFrequency(rrIntervals: number[]): HRVData['windowedFrequency'] {
  const vlf: number[] = [];
  const lf: number[] = [];
  const hf: number[] = [];
  const lfHfRatio: number[] = [];

  const step = 32;
  const numWindows = Math.max(1, Math.floor((rrIntervals.length - WINDOW_SIZE) / step) + 1);

  for (let w = 0; w < numWindows; w++) {
    const start = w * step;
    const end = Math.min(start + WINDOW_SIZE, rrIntervals.length);
    const windowData = rrIntervals.slice(start, end);

    if (windowData.length >= 32) {
      const freq = computeFrequencyDomain(windowData);
      vlf.push(freq.vlfPower);
      lf.push(freq.lfPower);
      hf.push(freq.hfPower);
      lfHfRatio.push(freq.lfHfRatio);
    }
  }

  if (vlf.length === 0) {
    const freq = computeFrequencyDomain(rrIntervals);
    return {
      vlf: [freq.vlfPower],
      lf: [freq.lfPower],
      hf: [freq.hfPower],
      lfHfRatio: [freq.lfHfRatio]
    };
  }

  return { vlf, lf, hf, lfHfRatio };
}

export function recomputeWindowedFrequency(rrIntervals: number[], step: number): HRVData['windowedFrequency'] {
  const vlf: number[] = [];
  const lf: number[] = [];
  const hf: number[] = [];
  const lfHfRatio: number[] = [];

  const numWindows = Math.max(1, Math.floor((rrIntervals.length - WINDOW_SIZE) / step) + 1);

  for (let w = 0; w < numWindows; w++) {
    const start = w * step;
    const end = Math.min(start + WINDOW_SIZE, rrIntervals.length);
    const windowData = rrIntervals.slice(start, end);

    if (windowData.length >= 32) {
      const freq = computeFrequencyDomain(windowData);
      vlf.push(freq.vlfPower);
      lf.push(freq.lfPower);
      hf.push(freq.hfPower);
      lfHfRatio.push(freq.lfHfRatio);
    }
  }

  if (vlf.length === 0) {
    const freq = computeFrequencyDomain(rrIntervals);
    return {
      vlf: [freq.vlfPower],
      lf: [freq.lfPower],
      hf: [freq.hfPower],
      lfHfRatio: [freq.lfHfRatio]
    };
  }

  return { vlf, lf, hf, lfHfRatio };
}
