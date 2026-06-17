import Papa from 'papaparse';

export interface TimeDomainMetrics {
  sdnn: number;
  rmssd: number;
  pnn50: number;
}

export interface PerPointMetrics {
  sdnn: number;
  rmssd: number;
  pnn50: number;
}

export interface FrequencyBand {
  vlf: number;
  lf: number;
  hf: number;
  lfHfRatio: number;
}

export interface WindowedFrequencyData {
  windowIndex: number;
  bands: FrequencyBand;
}

export interface HRVAnalysisResult {
  rrIntervals: number[];
  timestamps?: number[];
  timeDomain: {
    overall: TimeDomainMetrics;
    perPoint: PerPointMetrics[];
  };
  frequencyDomain: WindowedFrequencyData[];
  isValid: boolean;
  errorMessage?: string;
}

export type TimeDomainMetric = 'sdnn' | 'rmssd' | 'pnn50';

const SLIDING_WINDOW_SIZE = 50;
const FREQ_WINDOW_SIZE = 128;
const DEFAULT_WINDOW_STEP = 32;

export class DataParser {
  private static validateRRIntervals(intervals: number[]): { valid: boolean; message?: string } {
    if (intervals.length < 10) {
      return { valid: false, message: '数据点不足，至少需要10个心跳间隔数据' };
    }

    const invalidValues = intervals.filter(v => isNaN(v) || v <= 0 || v > 5000);
    if (invalidValues.length > intervals.length * 0.1) {
      return { valid: false, message: `数据质量不佳，超过10%的数值异常（范围应为1-5000ms）` };
    }

    return { valid: true };
  }

  private static calculateSDNN(intervals: number[]): number {
    if (intervals.length < 2) return 0;
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const squaredDiffs = intervals.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (intervals.length - 1);
    return Math.sqrt(variance);
  }

  private static calculateRMSSD(intervals: number[]): number {
    if (intervals.length < 2) return 0;
    const successiveDiffs: number[] = [];
    for (let i = 1; i < intervals.length; i++) {
      successiveDiffs.push(Math.pow(intervals[i] - intervals[i - 1], 2));
    }
    const mean = successiveDiffs.reduce((a, b) => a + b, 0) / successiveDiffs.length;
    return Math.sqrt(mean);
  }

  private static calculatePNN50(intervals: number[]): number {
    if (intervals.length < 2) return 0;
    let count = 0;
    for (let i = 1; i < intervals.length; i++) {
      if (Math.abs(intervals[i] - intervals[i - 1]) > 50) {
        count++;
      }
    }
    return (count / (intervals.length - 1)) * 100;
  }

  private static calculateTimeDomain(intervals: number[]): {
    overall: TimeDomainMetrics;
    perPoint: PerPointMetrics[];
  } {
    const overall: TimeDomainMetrics = {
      sdnn: this.calculateSDNN(intervals),
      rmssd: this.calculateRMSSD(intervals),
      pnn50: this.calculatePNN50(intervals)
    };

    const perPoint: PerPointMetrics[] = [];
    for (let i = 0; i < intervals.length; i++) {
      const windowStart = Math.max(0, i - Math.floor(SLIDING_WINDOW_SIZE / 2));
      const windowEnd = Math.min(intervals.length, i + Math.ceil(SLIDING_WINDOW_SIZE / 2));
      const window = intervals.slice(windowStart, windowEnd);

      perPoint.push({
        sdnn: this.calculateSDNN(window),
        rmssd: this.calculateRMSSD(window),
        pnn50: this.calculatePNN50(window)
      });
    }

    return { overall, perPoint };
  }

  private static fft(data: number[]): { real: number[]; imag: number[] } {
    const n = data.length;
    if (n === 1) {
      return { real: [data[0]], imag: [0] };
    }

    const even: number[] = [];
    const odd: number[] = [];
    for (let i = 0; i < n; i += 2) {
      even.push(data[i]);
      odd.push(data[i + 1]);
    }

    const evenFFT = this.fft(even);
    const oddFFT = this.fft(odd);

    const real: number[] = new Array(n);
    const imag: number[] = new Array(n);

    for (let k = 0; k < n / 2; k++) {
      const angle = (-2 * Math.PI * k) / n;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      const tReal = oddFFT.real[k] * cos - oddFFT.imag[k] * sin;
      const tImag = oddFFT.real[k] * sin + oddFFT.imag[k] * cos;

      real[k] = evenFFT.real[k] + tReal;
      imag[k] = evenFFT.imag[k] + tImag;
      real[k + n / 2] = evenFFT.real[k] - tReal;
      imag[k + n / 2] = evenFFT.imag[k] - tImag;
    }

    return { real, imag };
  }

  private static nextPowerOf2(n: number): number {
    return Math.pow(2, Math.ceil(Math.log2(n)));
  }

  private static calculatePowerSpectrum(
    intervals: number[],
    samplingRate: number = 4
  ): FrequencyBand {
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const centered = intervals.map(v => v - mean);

    const paddedLength = this.nextPowerOf2(centered.length);
    const padded = [...centered];
    while (padded.length < paddedLength) {
      padded.push(0);
    }

    const windowed = padded.map((v, i) => {
      const window = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (padded.length - 1));
      return v * window;
    });

    const { real, imag } = this.fft(windowed);

    const powerSpectrum: number[] = [];
    for (let i = 0; i < real.length / 2; i++) {
      const magnitude = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
      powerSpectrum.push((magnitude * magnitude) / padded.length);
    }

    const freqResolution = samplingRate / padded.length;

    let vlf = 0, lf = 0, hf = 0;

    for (let i = 0; i < powerSpectrum.length; i++) {
      const freq = i * freqResolution;
      const power = powerSpectrum[i];

      if (freq >= 0 && freq < 0.04) {
        vlf += power * freqResolution;
      } else if (freq >= 0.04 && freq < 0.15) {
        lf += power * freqResolution;
      } else if (freq >= 0.15 && freq < 0.4) {
        hf += power * freqResolution;
      }
    }

    const lfHfRatio = hf > 0 ? lf / hf : 0;

    return { vlf, lf, hf, lfHfRatio };
  }

  private static calculateFrequencyDomain(
    intervals: number[],
    windowStep: number = DEFAULT_WINDOW_STEP
  ): WindowedFrequencyData[] {
    const result: WindowedFrequencyData[] = [];
    const maxWindows = 5;
    let windowIndex = 0;

    for (
      let start = Math.max(0, intervals.length - FREQ_WINDOW_SIZE);
      start >= 0 && windowIndex < maxWindows;
      start -= windowStep
    ) {
      const window = intervals.slice(start, start + FREQ_WINDOW_SIZE);
      if (window.length >= FREQ_WINDOW_SIZE * 0.8) {
        const bands = this.calculatePowerSpectrum(window);
        result.unshift({
          windowIndex: maxWindows - 1 - windowIndex,
          bands
        });
        windowIndex++;
      }
    }

    return result;
  }

  public static async parseCSVFile(
    file: File,
    windowStep: number = DEFAULT_WINDOW_STEP
  ): Promise<HRVAnalysisResult> {
    return new Promise((resolve) => {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as string[][];

          const rrIntervals: number[] = [];
          const timestamps: number[] = [];

          for (const row of data) {
            if (row.length === 0) continue;

            if (row.length === 1) {
              const val = parseFloat(row[0].trim());
              if (!isNaN(val)) {
                rrIntervals.push(val);
              }
            } else if (row.length >= 2) {
              const val1 = parseFloat(row[0].trim());
              const val2 = parseFloat(row[1].trim());

              if (!isNaN(val1) && !isNaN(val2)) {
                if (val1 > val2) {
                  timestamps.push(val1);
                  rrIntervals.push(val2);
                } else {
                  timestamps.push(val1);
                  rrIntervals.push(val2);
                }
              } else if (!isNaN(val1)) {
                rrIntervals.push(val1);
              } else if (!isNaN(val2)) {
                rrIntervals.push(val2);
              }
            }
          }

          const validation = this.validateRRIntervals(rrIntervals);

          if (!validation.valid) {
            resolve({
              rrIntervals: [],
              timeDomain: {
                overall: { sdnn: 0, rmssd: 0, pnn50: 0 },
                perPoint: []
              },
              frequencyDomain: [],
              isValid: false,
              errorMessage: validation.message
            });
            return;
          }

          const timeDomain = this.calculateTimeDomain(rrIntervals);
          const frequencyDomain = this.calculateFrequencyDomain(rrIntervals, windowStep);

          resolve({
            rrIntervals,
            timestamps: timestamps.length > 0 ? timestamps : undefined,
            timeDomain,
            frequencyDomain,
            isValid: true
          });
        },
        error: (error) => {
          resolve({
            rrIntervals: [],
            timeDomain: {
              overall: { sdnn: 0, rmssd: 0, pnn50: 0 },
              perPoint: []
            },
            frequencyDomain: [],
            isValid: false,
            errorMessage: `文件解析失败: ${error.message}`
          });
        }
      });
    });
  }

  public static async parseCSVContent(
    content: string,
    windowStep: number = DEFAULT_WINDOW_STEP
  ): Promise<HRVAnalysisResult> {
    const blob = new Blob([content], { type: 'text/csv' });
    const file = new File([blob], 'data.csv', { type: 'text/csv' });
    return this.parseCSVFile(file, windowStep);
  }

  public static generateDemoData(count: number = 500): HRVAnalysisResult {
    const rrIntervals: number[] = [];
    const baseRR = 800;

    for (let i = 0; i < count; i++) {
      const noise = Math.sin(i * 0.05) * 30 + Math.sin(i * 0.02) * 20 + Math.random() * 15 - 7.5;
      rrIntervals.push(baseRR + noise);
    }

    const timeDomain = this.calculateTimeDomain(rrIntervals);
    const frequencyDomain = this.calculateFrequencyDomain(rrIntervals);

    return {
      rrIntervals,
      timeDomain,
      frequencyDomain,
      isValid: true
    };
  }
}
