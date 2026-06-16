import { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { StudentScore, ParseResult } from '@/types';

const REQUIRED_FIELDS = ['studentName', 'subject', 'score', 'date'];
const FIELD_ALIASES: Record<string, string[]> = {
  studentName: ['studentName', 'name', '姓名', '学生姓名', 'student_name'],
  subject: ['subject', '科目', '学科', '课程'],
  score: ['score', '分数', '成绩', '得分'],
  date: ['date', '日期', '时间', '考试日期', 'examDate'],
};

const resolveField = (key: string): string | null => {
  const lowerKey = key.trim().toLowerCase();
  for (const [standardField, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.some((a) => a.toLowerCase() === lowerKey)) {
      return standardField;
    }
  }
  return null;
};

const validateScore = (score: unknown): number | null => {
  const num = typeof score === 'string' ? parseFloat(score) : Number(score);
  if (isNaN(num) || num < 0 || num > 100) return null;
  return Math.round(num * 100) / 100;
};

const validateDate = (dateStr: string): string | null => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
};

const parseCSV = (content: string): Array<Record<string, string>> => {
  const lines = content.replace(/\r\n/g, '\n').split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const result: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    if (values.length !== headers.length) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });
    result.push(row);
  }
  return result;
};

const processRows = (
  rows: Array<Record<string, unknown>>,
  errors: string[]
): StudentScore[] => {
  const data: StudentScore[] = [];

  rows.forEach((row, index) => {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const standardField = resolveField(key);
      if (standardField) {
        normalized[standardField] = value;
      }
    }

    const missingFields = REQUIRED_FIELDS.filter((f) => normalized[f] === undefined || normalized[f] === '');
    if (missingFields.length > 0) {
      errors.push(`第 ${index + 2} 行: 缺少字段 ${missingFields.join(', ')}`);
      return;
    }

    const score = validateScore(normalized.score);
    if (score === null) {
      errors.push(`第 ${index + 2} 行: 分数 "${normalized.score}" 无效（需0-100）`);
      return;
    }

    const date = validateDate(String(normalized.date));
    if (date === null) {
      errors.push(`第 ${index + 2} 行: 日期 "${normalized.date}" 格式无效`);
      return;
    }

    data.push({
      id: uuidv4(),
      studentName: String(normalized.studentName).trim(),
      subject: String(normalized.subject).trim(),
      score,
      date,
    });
  });

  return data;
};

export const useDataParser = () => {
  const [parseResult, setParseResult] = useState<ParseResult>({
    data: [],
    errors: [],
    isLoading: false,
  });

  const parseFile = useCallback(async (file: File): Promise<void> => {
    setParseResult({ data: [], errors: [], isLoading: true });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const errors: string[] = [];
    const fileName = file.name.toLowerCase();

    try {
      const content = await file.text();

      let rows: Array<Record<string, unknown>> = [];

      if (fileName.endsWith('.csv')) {
        rows = parseCSV(content) as Array<Record<string, unknown>>;
        if (rows.length === 0) {
          errors.push('CSV文件内容为空或格式不正确');
        }
      } else if (fileName.endsWith('.json')) {
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            rows = parsed;
          } else if (parsed.data && Array.isArray(parsed.data)) {
            rows = parsed.data;
          } else {
            errors.push('JSON文件根节点必须是数组或包含data数组');
          }
        } catch (e) {
          errors.push('JSON解析失败：' + (e as Error).message);
        }
      } else {
        errors.push('不支持的文件格式，请上传 .csv 或 .json 文件');
      }

      if (errors.length > 0) {
        setParseResult({ data: [], errors, isLoading: false });
        return;
      }

      const data = processRows(rows, errors);

      if (data.length === 0 && errors.length === 0) {
        errors.push('未解析到有效数据记录');
      }

      if (errors.length > 50) {
        const trimmed = errors.slice(0, 50);
        trimmed.push(`...还有 ${errors.length - 50} 条错误未显示`);
        setParseResult({ data, errors: trimmed, isLoading: false });
        return;
      }

      setParseResult({ data, errors, isLoading: false });
    } catch (e) {
      setParseResult({
        data: [],
        errors: ['文件读取失败：' + (e as Error).message],
        isLoading: false,
      });
    }
  }, []);

  const clearData = useCallback(() => {
    setParseResult({ data: [], errors: [], isLoading: false });
  }, []);

  return {
    ...parseResult,
    parseFile,
    clearData,
  };
};
