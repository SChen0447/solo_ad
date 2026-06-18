import React, { useState, useRef, useCallback } from 'react';
import { parseCSV, CSVData } from '../utils/csvParser';
import { useDashboardStore } from '../store/dashboardStore';

const UploadModal: React.FC = () => {
  const { isUploadModalOpen, closeUploadModal, setData } = useDashboardStore();
  const [isDragging, setIsDragging] = useState(false);
  const [previewData, setPreviewData] = useState<CSVData | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('请上传CSV文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setPreviewData(parsed);
      setFileName(file.name);
    };
    reader.readAsText(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleConfirm = useCallback(() => {
    if (previewData) {
      setData(previewData);
      closeUploadModal();
      setPreviewData(null);
      setFileName('');
    }
  }, [previewData, setData, closeUploadModal]);

  const handleClose = useCallback(() => {
    closeUploadModal();
    setPreviewData(null);
    setFileName('');
  }, [closeUploadModal]);

  if (!isUploadModalOpen) return null;

  const previewRows = previewData?.rows.slice(0, 5) || [];

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>上传CSV文件</h2>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>

        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleFileInput}
          />
          <div className="drop-icon">📁</div>
          <p className="drop-text">拖拽文件到此处，或 <span className="highlight">点击选择文件</span></p>
          <p className="drop-hint">支持CSV格式文件</p>
          {fileName && <p className="file-name">已选择: {fileName}</p>}
        </div>

        {previewData && (
          <div className="preview-section">
            <h3>数据预览（前5行）</h3>
            <div className="preview-table-wrapper">
              <table className="preview-table">
                <thead>
                  <tr>
                    {previewData.columns.map((col, i) => (
                      <th key={i}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="preview-info">
              共 {previewData.rows.length} 行数据，{previewData.columns.length} 列
            </p>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleClose}>
            取消
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={!previewData}
          >
            确认上传
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: #2a2a3e;
          border-radius: 12px;
          width: 90%;
          max-width: 700px;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .modal-header h2 {
          margin: 0;
          color: #e0e0e0;
          font-size: 20px;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 28px;
          color: #e0e0e0;
          cursor: pointer;
          line-height: 1;
          transition: transform 0.15s ease;
        }

        .close-btn:hover {
          transform: scale(1.1);
        }

        .close-btn:active {
          transform: scale(0.95);
        }

        .drop-zone {
          margin: 24px;
          padding: 40px;
          border: 2px dashed #4f46e5;
          border-radius: 12px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          background: rgba(79, 70, 229, 0.05);
        }

        .drop-zone.dragging {
          border-color: #06b6d4;
          background: rgba(6, 182, 212, 0.1);
        }

        .drop-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .drop-text {
          color: #e0e0e0;
          margin: 0 0 8px 0;
          font-size: 16px;
        }

        .drop-text .highlight {
          color: #4f46e5;
          font-weight: 600;
        }

        .drop-hint {
          color: #888;
          margin: 0;
          font-size: 14px;
        }

        .file-name {
          color: #06b6d4;
          margin-top: 12px;
          font-size: 14px;
        }

        .preview-section {
          padding: 0 24px 16px 24px;
          flex: 1;
          overflow: auto;
        }

        .preview-section h3 {
          color: #e0e0e0;
          margin: 0 0 12px 0;
          font-size: 16px;
        }

        .preview-table-wrapper {
          max-height: 200px;
          overflow: auto;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .preview-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .preview-table th {
          background: #1e1e2e;
          color: #e0e0e0;
          padding: 10px 12px;
          text-align: left;
          position: sticky;
          top: 0;
          font-weight: 600;
          border-bottom: 2px solid #4f46e5;
        }

        .preview-table td {
          padding: 8px 12px;
          color: #c0c0c0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .preview-table tbody tr:hover {
          background: rgba(79, 70, 229, 0.1);
        }

        .preview-info {
          color: #888;
          margin-top: 12px;
          font-size: 13px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .btn {
          padding: 10px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn:active {
          transform: scale(0.95);
        }

        .btn-primary {
          background: #4f46e5;
          color: white;
        }

        .btn-primary:hover {
          background: #4338ca;
        }

        .btn-primary:disabled {
          background: #555;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: transparent;
          color: #e0e0e0;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </div>
  );
};

export default UploadModal;
