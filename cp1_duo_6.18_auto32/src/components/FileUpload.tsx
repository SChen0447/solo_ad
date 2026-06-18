import React, { useState, useCallback, useRef } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { parseTravelCSV } from '../dataParser';
import { useTravelStore } from '../store';
import type { ParseResult } from '../types/travel';

export function FileUpload(): JSX.Element {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setTravelData = useTravelStore((state) => state.setTravelData);

  const processFile = useCallback(
    async (file: File) => {
      setIsLoading(true);
      setError(null);

      try {
        const result: ParseResult = await parseTravelCSV(file);

        if (result.success) {
          setTravelData(result.data);
          setError(null);
        } else {
          setError(result.error || '解析失败');
        }
      } catch (e) {
        setError('处理文件时发生错误，请重试');
      } finally {
        setIsLoading(false);
      }
    },
    [setTravelData]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
          processFile(file);
        } else {
          setError('请上传 CSV 格式的文件');
        }
      }
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
    },
    [processFile]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="upload-wrapper">
      <div
        className={`upload-zone ${isDragging ? 'dragging' : ''} ${
          isLoading ? 'loading' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".csv,text/csv"
          className="hidden-input"
        />

        {isLoading ? (
          <div className="upload-loading">
            <div className="spinner" />
            <span>正在解析 CSV 文件...</span>
          </div>
        ) : (
          <div className="upload-content">
            <div className="upload-icon">
              {isDragging ? <FileText size={48} /> : <Upload size={48} />}
            </div>
            <div className="upload-text">
              <div className="upload-title">
                {isDragging ? '释放以上传文件' : '拖拽 CSV 文件到此处'}
              </div>
              <div className="upload-subtitle">
                或点击选择文件，支持 lat, lng, date, photoUrl, note 格式
              </div>
              <div className="upload-hint">最大文件大小：5MB</div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="sample-data-hint">
        <details>
          <summary>查看 CSV 格式示例</summary>
          <pre className="sample-csv">
{`lat,lng,date,photoUrl,note
48.8566,2.3522,2024-01-15,https://example.com/paris.jpg,巴黎的埃菲尔铁塔真壮观！
41.9028,12.4964,2024-01-20,https://example.com/rome.jpg,罗马斗兽场的历史感扑面而来。
51.5074,-0.1278,2024-01-25,https://example.com/london.jpg,伦敦大本钟的钟声令人难忘。
40.7128,-74.0060,2024-02-01,https://example.com/nyc.jpg,纽约的摩天大楼群太震撼了！
35.6762,139.6503,2024-02-10,https://example.com/tokyo.jpg,东京的樱花季节美不胜收。`}
          </pre>
        </details>
      </div>
    </div>
  );
}
