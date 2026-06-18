import type { DataPoint, AnomalyRecord, Statistics, AnomalyAlgorithm } from '../types';

export function computeStatistics(
  points: DataPoint[],
  zThreshold: number = 3,
  iqrThreshold: number = 1.5
): Statistics {
  const n = points.length;
  const values = points.map(p => p.y).sort((a, b) => a - b);

  if (n === 0) {
    return {
      mean: 0, stdDev: 0, q1: 0, q3: 0, iqr: 0,
      min: 0, max: 0, median: 0,
      zThreshold, iqrThreshold,
      lowerBound: 0, upperBound: 0,
      totalCount: 0, anomalyCount: 0, anomalyRatio: 0
    };
  }

  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  const min = values[0];
  const max = values[n - 1];
  const median = percentile(values, 50);
  const q1 = percentile(values, 25);
  const q3 = percentile(values, 75);
  const iqr = q3 - q1;

  const lowerBound = q1 - iqrThreshold * iqr;
  const upperBound = q3 + iqrThreshold * iqr;

  return {
    mean, stdDev, q1, q3, iqr, min, max, median,
    zThreshold, iqrThreshold, lowerBound, upperBound,
    totalCount: n, anomalyCount: 0, anomalyRatio: 0
  };
}

function percentile(sorted: number[], p: number): number {
  const n = sorted.length;
  const idx = (p / 100) * (n - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function detectAnomalies(
  points: DataPoint[],
  stats: Statistics,
  algorithm: AnomalyAlgorithm
): { indices: Set<number>; records: AnomalyRecord[] } {
  const indices = new Set<number>();
  const records: AnomalyRecord[] = [];

  for (const p of points) {
    let deviation = 0;
    let isAnomaly = false;

    if (algorithm === 'zscore') {
      if (stats.stdDev > 0) {
        deviation = Math.abs((p.y - stats.mean) / stats.stdDev);
        isAnomaly = deviation > stats.zThreshold;
      }
    } else {
      const lowerDev = (stats.q1 - p.y) / (stats.iqr || 1);
      const upperDev = (p.y - stats.q3) / (stats.iqr || 1);
      deviation = Math.max(lowerDev, upperDev, 0) / stats.iqrThreshold;
      isAnomaly = p.y < stats.lowerBound || p.y > stats.upperBound;
    }

    if (isAnomaly) {
      indices.add(p.index);
      records.push({
        index: p.index,
        rowIndex: p.index,
        value: p.y,
        deviation: Number(deviation.toFixed(3)),
        source: 'auto'
      });
    }
  }

  records.sort((a, b) => a.rowIndex - b.rowIndex);
  return { indices, records };
}

export function computeManualAnomalies(
  points: DataPoint[],
  selectedIndices: number[],
  stats: Statistics,
  algorithm: AnomalyAlgorithm
): AnomalyRecord[] {
  const records: AnomalyRecord[] = [];

  for (const idx of selectedIndices) {
    const p = points.find(pt => pt.index === idx);
    if (!p) continue;

    let deviation = 0;
    if (algorithm === 'zscore' && stats.stdDev > 0) {
      deviation = Math.abs((p.y - stats.mean) / stats.stdDev);
    } else {
      const lowerDev = (stats.q1 - p.y) / (stats.iqr || 1);
      const upperDev = (p.y - stats.q3) / (stats.iqr || 1);
      deviation = Math.max(lowerDev, upperDev, 0) / Math.max(stats.iqrThreshold, 1e-9);
    }

    records.push({
      index: p.index,
      rowIndex: p.index,
      value: p.y,
      deviation: Number(deviation.toFixed(3)),
      source: 'manual'
    });
  }

  records.sort((a, b) => a.rowIndex - b.rowIndex);
  return records;
}

export function exportAnomaliesCSV(records: AnomalyRecord[]): string {
  const headers = ['row_index', 'value', 'deviation', 'source'];
  const rows = records.map(r => [
    String(r.rowIndex),
    String(r.value),
    String(r.deviation),
    r.source
  ]);
  const csv = [headers, ...rows].map(row => row.map(escapeCSV).join(',')).join('\n');
  return csv;
}

function escapeCSV(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export function triggerDownload(csv: string, filename: string = 'anomalies.csv') {
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
