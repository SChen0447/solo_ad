import Papa from 'papaparse';
import type { ColumnInfo, DataPoint } from '../types';

export const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function parseCSVFile(file: File): Promise<{
  data: Record<string, unknown>[];
  columns: ColumnInfo[];
}> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE) {
      reject(new Error('文件大小不能超过 5MB'));
      return;
    }

    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        const data = results.data;
        if (data.length === 0) {
          reject(new Error('CSV 文件为空或格式错误'));
          return;
        }

        const headers = Object.keys(data[0]);
        const columns: ColumnInfo[] = headers.map(name => ({
          name,
          numeric: isColumnNumeric(data, name)
        }));

        resolve({ data, columns });
      },
      error: (err) => reject(new Error(`CSV 解析失败: ${err.message}`))
    });
  });
}

function isColumnNumeric(data: Record<string, unknown>[], column: string): boolean {
  let numericCount = 0;
  let totalCount = 0;
  const sampleSize = Math.min(data.length, 100);

  for (let i = 0; i < sampleSize; i++) {
    const val = data[i][column];
    if (val === null || val === undefined || val === '') continue;
    totalCount++;
    if (!isNaN(Number(val))) numericCount++;
  }

  return totalCount > 0 && numericCount / totalCount >= 0.8;
}

export function buildDataPoints(
  data: Record<string, unknown>[],
  yColumn: string,
  xColumn?: string | null
): DataPoint[] {
  const points: DataPoint[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rawY = row[yColumn];
    const y = Number(rawY);

    if (rawY === undefined || rawY === null || rawY === '' || isNaN(y)) continue;

    let x: number;
    let rawX: string | number | undefined;

    if (xColumn) {
      rawX = row[xColumn] as string | number;
      const parsedX = Number(rawX);
      x = !isNaN(parsedX) ? parsedX : i;
    } else {
      x = i;
    }

    points.push({
      index: i,
      x,
      y,
      rawX,
      rawY: rawY as string | number
    });
  }

  return points;
}
