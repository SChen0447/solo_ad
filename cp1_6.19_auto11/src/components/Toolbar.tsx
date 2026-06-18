import React from 'react';
import { useDashboardStore } from '../store/dashboardStore';

const Toolbar: React.FC = () => {
  const { data, resetLayout, openUploadModal } = useDashboardStore();

  const handleExportPDF = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const gridElement = document.querySelector('.dashboard-grid');
      if (!gridElement) return;

      const canvas = await html2canvas(gridElement as HTMLElement, {
        backgroundColor: '#1e1e2e',
        scale: 2,
        useCORS: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

      const x = (pdfWidth - imgWidth * ratio) / 2;
      const y = (pdfHeight - imgHeight * ratio) / 2;

      pdf.addImage(imgData, 'PNG', x, y, imgWidth * ratio, imgHeight * ratio);
      pdf.save('dashboard.pdf');
    } catch (error) {
      console.error('导出PDF失败:', error);
      alert('导出PDF失败，请重试');
    }
  };

  const handleExportImage = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { saveAs } = await import('file-saver');

      const gridElement = document.querySelector('.dashboard-grid');
      if (!gridElement) return;

      const canvas = await html2canvas(gridElement as HTMLElement, {
        backgroundColor: '#1e1e2e',
        scale: 2,
        useCORS: true
      });

      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, 'dashboard.png');
        }
      });
    } catch (error) {
      console.error('导出图片失败:', error);
      alert('导出图片失败，请重试');
    }
  };

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <h1 className="app-title">数据仪表盘</h1>
        {data && (
          <span className="data-info">
            {data.columns.length} 列 · {data.rows.length} 行
          </span>
        )}
      </div>
      <div className="toolbar-right">
        <button className="toolbar-btn" onClick={openUploadModal}>
          📁 上传CSV
        </button>
        <button
          className="toolbar-btn"
          onClick={handleExportImage}
          disabled={!data}
        >
          🖼️ 导出图片
        </button>
        <button
          className="toolbar-btn"
          onClick={handleExportPDF}
          disabled={!data}
        >
          📄 导出PDF
        </button>
        <button
          className="toolbar-btn"
          onClick={resetLayout}
          disabled={!data}
        >
          🔄 重置布局
        </button>
      </div>

      <style>{`
        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 24px;
          height: 60px;
          background: #2a2a3e;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .toolbar-left {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .app-title {
          margin: 0;
          color: #e0e0e0;
          font-size: 20px;
          font-weight: 700;
          background: linear-gradient(135deg, #4f46e5, #06b6d4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .data-info {
          color: #888;
          font-size: 13px;
        }

        .toolbar-right {
          display: flex;
          gap: 10px;
        }

        .toolbar-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #e0e0e0;
          border-radius: 8px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s ease;
          font-family: Inter, sans-serif;
        }

        .toolbar-btn:hover:not(:disabled) {
          background: rgba(79, 70, 229, 0.2);
          border-color: #4f46e5;
        }

        .toolbar-btn:active:not(:disabled) {
          transform: scale(0.95);
        }

        .toolbar-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default Toolbar;
