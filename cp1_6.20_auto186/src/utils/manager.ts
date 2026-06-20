import type { ImageItem, ProcessResult } from '../types';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILE_COUNT = 10;
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: `文件 "${file.name}" 格式不支持，仅支持 PNG 和 JPG 格式` };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `文件 "${file.name}" 超过 5MB 限制` };
  }
  return { valid: true };
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

export function sortImages(files: File[]): File[] {
  return [...files].sort((a, b) => {
    const numA = extractNumberSuffix(a.name);
    const numB = extractNumberSuffix(b.name);
    if (numA !== null && numB !== null) {
      return numA - numB;
    }
    if (numA !== null) return -1;
    if (numB !== null) return 1;
    return a.name.localeCompare(b.name);
  });
}

function extractNumberSuffix(filename: string): number | null {
  const match = filename.match(/(\d+)(?=\.[^.]+$)|(\d+)/g);
  if (match && match.length > 0) {
    const lastNum = parseInt(match[match.length - 1], 10);
    if (!isNaN(lastNum)) return lastNum;
  }
  return null;
}

export function generateStepName(index: number): string {
  return `步骤${index + 1}`;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export async function processFiles(fileList: FileList): Promise<ProcessResult> {
  const files = Array.from(fileList);
  const errors: string[] = [];
  const validFiles: File[] = [];

  if (files.length > MAX_FILE_COUNT) {
    return {
      success: false,
      images: [],
      errors: [`最多只能上传 ${MAX_FILE_COUNT} 张图片，当前选择了 ${files.length} 张`],
    };
  }

  for (const file of files) {
    const result = validateFile(file);
    if (result.valid) {
      validFiles.push(file);
    } else if (result.error) {
      errors.push(result.error);
    }
  }

  if (validFiles.length === 0) {
    return {
      success: false,
      images: [],
      errors: errors.length > 0 ? errors : ['没有有效的图片文件'],
    };
  }

  const sortedFiles = sortImages(validFiles);
  const images: ImageItem[] = [];

  for (let i = 0; i < sortedFiles.length; i++) {
    const file = sortedFiles[i];
    try {
      const url = await fileToBase64(file);
      images.push({
        id: generateId(),
        name: file.name,
        url,
        stepName: generateStepName(i),
        order: i,
      });
    } catch {
      errors.push(`文件 "${file.name}" 处理失败`);
    }
  }

  return {
    success: images.length > 0,
    images,
    errors,
  };
}
