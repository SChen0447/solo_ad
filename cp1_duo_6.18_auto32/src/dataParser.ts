import Papa from 'papaparse';
import type { TravelPoint, ParseResult } from './types/travel';

const REQUIRED_COLUMNS = ['lat', 'lng', 'date', 'photoUrl', 'note'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function parseTravelCSV(file: File): Promise<ParseResult> {
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      data: [],
      error: `文件大小超过限制（最大 5MB，当前 ${(file.size / 1024 / 1024).toFixed(2)}MB）`,
    };
  }

  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as Record<string, string>[];
        
        if (data.length === 0) {
          resolve({
            success: false,
            data: [],
            error: 'CSV 文件为空或没有有效数据行',
          });
          return;
        }

        const headers = Object.keys(data[0]);
        const missingColumns = REQUIRED_COLUMNS.filter(col => !headers.includes(col));
        
        if (missingColumns.length > 0) {
          resolve({
            success: false,
            data: [],
            error: `缺少必要列：${missingColumns.join(', ')}。请确保 CSV 包含以下列：${REQUIRED_COLUMNS.join(', ')}`,
          });
          return;
        }

        const travelData: TravelPoint[] = [];
        const errors: string[] = [];

        data.forEach((row, index) => {
          const lat = parseFloat(row.lat);
          const lng = parseFloat(row.lng);
          const date = row.date?.trim();
          const photoUrl = row.photoUrl?.trim();
          const note = row.note?.trim() || '';

          if (isNaN(lat) || isNaN(lng)) {
            errors.push(`第 ${index + 2} 行：经纬度格式不正确`);
            return;
          }

          if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            errors.push(`第 ${index + 2} 行：经纬度超出有效范围`);
            return;
          }

          if (!date) {
            errors.push(`第 ${index + 2} 行：日期不能为空`);
            return;
          }

          const dateObj = new Date(date);
          if (isNaN(dateObj.getTime())) {
            errors.push(`第 ${index + 2} 行：日期格式不正确，请使用 YYYY-MM-DD 格式`);
            return;
          }

          if (!photoUrl) {
            errors.push(`第 ${index + 2} 行：照片 URL 不能为空`);
            return;
          }

          travelData.push({
            lat,
            lng,
            date: dateObj.toISOString().split('T')[0],
            photoUrl,
            note,
          });
        });

        if (errors.length > 0) {
          resolve({
            success: false,
            data: [],
            error: errors.join('\n'),
          });
          return;
        }

        travelData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        resolve({
          success: true,
          data: travelData,
        });
      },
      error: (error) => {
        resolve({
          success: false,
          data: [],
          error: `CSV 解析失败：${error.message}`,
        });
      },
    });
  });
}
