import React, { useCallback, useState } from 'react';
import Papa from 'papaparse';
import type { Column, DataRow } from '../types';

interface DataUploadProps {
  onDataParsed: (columns: Column[], data: DataRow[]) => void;
}

const inferColumnType = (values: unknown[]): Column['type'] => {
  const nonNull = values.filter((v) => v != null && v !== '');
  if (nonNull.length === 0) return 'string';

  let numCount = 0;
  let dateCount = 0;

  for (const v of nonNull) {
    const str = String(v);
    if (!isNaN(Number(str)) && str.trim() !== '') {
      numCount++;
    } else if (!isNaN(Date.parse(str)) && str.length > 4) {
      dateCount++;
    }
  }

  const total = nonNull.length;
  if (numCount / total > 0.8) return 'number';
  if (dateCount / total > 0.8) return 'date';
  return 'string';
};

const parseData = (raw: DataRow[]): { columns: Column[]; data: DataRow[] } => {
  if (raw.length === 0) return { columns: [], data: [] };

  const keys = Object.keys(raw[0]);
  const columns: Column[] = keys.map((key) => {
    const values = raw.map((row) => row[key]);
    const type = inferColumnType(values);

    const col: Column = { name: key, type };

    if (type === 'number') {
      const nums = values
        .map((v) => Number(v))
        .filter((n) => !isNaN(n));
      col.min = nums.length > 0 ? Math.min(...nums) : undefined;
      col.max = nums.length > 0 ? Math.max(...nums) : undefined;
    }

    const uniqueSet = new Set(values.map((v) => String(v)));
    col.uniqueValues = uniqueSet.size;

    col.sample = values
      .filter((v) => v != null && v !== '')
      .slice(0, 5)
      .map((v) => String(v));

    return col;
  });

  return { columns, data: raw };
};

const DataUpload: React.FC<DataUploadProps> = ({ onDataParsed }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;

          if (file.name.endsWith('.json')) {
            const json = JSON.parse(text);
            const arr = Array.isArray(json) ? json : [json];
            const result = parseData(arr as DataRow[]);
            onDataParsed(result.columns, result.data);
          } else {
            const parsed = Papa.parse(text, {
              header: true,
              dynamicTyping: false,
              skipEmptyLines: true,
            });
            if (parsed.errors.length > 0 && parsed.data.length === 0) {
              setError('CSV 解析失败，请检查文件格式');
              return;
            }
            const result = parseData(parsed.data as DataRow[]);
            onDataParsed(result.columns, result.data);
          }
        } catch {
          setError('文件解析失败，请检查文件格式');
        }
      };
      reader.readAsText(file);
    },
    [onDataParsed],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (
          file.name.endsWith('.csv') ||
          file.name.endsWith('.json') ||
          file.name.endsWith('.tsv')
        ) {
          handleFile(file);
        } else {
          setError('仅支持 CSV、JSON 或 TSV 文件');
        }
      }
    },
    [handleFile],
  );

  const handleClick = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.json,.tsv';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFile(file);
    };
    input.click();
  }, [handleFile]);

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        border: isDragging ? '2px dashed #3B82F6' : '2px dashed #D1D5DB',
        borderRadius: '12px',
        padding: '40px 24px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        background: isDragging
          ? '#EFF6FF'
          : '#F9FAFB',
        animation: isDragging ? 'borderBlink 0.2s ease-in-out' : 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          fontSize: '48px',
          marginBottom: '12px',
          opacity: isDragging ? 1 : 0.4,
          transition: 'opacity 0.2s ease',
        }}
      >
        {isDragging ? '📥' : '📂'}
      </div>
      <div
        style={{
          fontSize: '15px',
          fontWeight: 600,
          color: isDragging ? '#3B82F6' : '#6B7280',
          marginBottom: '6px',
          transition: 'color 0.2s ease',
        }}
      >
        {isDragging ? '释放文件以上传' : '拖拽文件到此处，或点击上传'}
      </div>
      <div style={{ fontSize: '13px', color: '#9CA3AF' }}>
        支持 CSV、JSON、TSV 格式
      </div>
      {fileName && !error && (
        <div
          style={{
            marginTop: '12px',
            fontSize: '13px',
            color: '#10B981',
            fontWeight: 500,
          }}
        >
          ✓ 已加载: {fileName}
        </div>
      )}
      {error && (
        <div
          style={{
            marginTop: '12px',
            fontSize: '13px',
            color: '#EF4444',
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

export default React.memo(DataUpload);
