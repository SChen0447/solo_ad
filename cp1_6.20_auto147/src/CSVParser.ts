import Papa from 'papaparse';
import { ParsedData } from './types';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function parseCSV(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE) {
      reject(new Error('文件大小超过5MB限制'));
      return;
    }

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          const errorMsg = results.errors
            .map((e) => `行${e.row}: ${e.message}`)
            .join('; ');
          reject(new Error(`CSV解析错误: ${errorMsg}`));
          return;
        }

        const rows = results.data as Record<string, string | number>[];
        if (rows.length === 0) {
          reject(new Error('CSV文件为空'));
          return;
        }

        const headers = Object.keys(rows[0]);
        const columns = headers.filter((h) => {
          const vals = rows.map((r) => r[h]).filter((v) => v != null && v !== '');
          return vals.some((v) => typeof v === 'number' || !isNaN(Number(v)));
        });

        resolve({ rows, columns, headers });
      },
      error: (error) => {
        reject(new Error(`CSV解析失败: ${error.message}`));
      },
    });
  });
}

export function getNumericColumns(data: ParsedData): string[] {
  return data.columns;
}

export function getTimeColumns(data: ParsedData): string[] {
  return data.headers.filter((h) => {
    const vals = data.rows.map((r) => r[h]).filter((v) => v != null && v !== '');
    if (vals.length === 0) return false;
    const uniqueVals = [...new Set(vals)];
    return uniqueVals.length <= Math.max(50, data.rows.length * 0.3);
  });
}
