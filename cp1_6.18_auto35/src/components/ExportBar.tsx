import React from 'react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useResumeStore } from '../store/resumeStore';

export const ExportBar: React.FC = () => {
  const navigate = useNavigate();
  const {
    resume,
    setExporting,
    isExporting,
    generateShareLink,
    addToast,
    toggleMobileMenu,
  } = useResumeStore();

  const exportToPDF = async () => {
    setExporting(true);
    try {
      const canvasArea = document.querySelector('.canvas-area') as HTMLElement;
      if (!canvasArea) {
        addToast({ message: '找不到简历内容', type: 'error' });
        setExporting(false);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(canvasArea, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      const fileName = (resume.title || '我的简历')
        .replace(/[^a-zA-Z0-9\u4e00-\u9fa5-_]/g, '_')
        .replace(/_+/g, '_');
      pdf.save(`${fileName}.pdf`);

      addToast({
        message: 'PDF 导出成功！',
        type: 'success',
      });
    } catch (err) {
      console.error('PDF导出失败:', err);
      addToast({
        message: 'PDF 导出失败，请重试',
        type: 'error',
      });
    } finally {
      setExporting(false);
    }
  };

  const copyShareLink = async () => {
    try {
      const link = generateShareLink();
      await navigator.clipboard.writeText(link);
      addToast({
        message: '链接已复制到剪贴板！',
        type: 'success',
      });
    } catch (err) {
      const link = generateShareLink();
      const textarea = document.createElement('textarea');
      textarea.value = link;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      addToast({
        message: '链接已复制到剪贴板！',
        type: 'success',
      });
    }
  };

  const goToPreview = () => {
    navigate(`/preview/${resume.id}`);
  };

  return (
    <>
      <header className="top-bar">
        <div className="top-bar-left">
          <button
            className="mobile-menu-btn"
            onClick={() => toggleMobileMenu()}
            title="菜单"
          >
            ☰
          </button>
          <div className="logo">📄 简历生成器</div>
        </div>
        <div className="export-actions">
          <button
            className="btn btn-secondary"
            onClick={goToPreview}
            title="预览简历"
          >
            <span>👁</span> 预览
          </button>
          <button
            className="btn btn-secondary"
            onClick={copyShareLink}
            title="复制分享链接"
          >
            <span>🔗</span> 分享
          </button>
          <button
            className="btn btn-primary"
            onClick={exportToPDF}
            disabled={isExporting}
            title="导出PDF"
          >
            <span>📥</span> 导出 PDF
          </button>
        </div>
      </header>

      {isExporting && (
        <div className="export-overlay">
          <div className="export-modal">
            <div className="spinner export-spinner" />
            <div className="export-text">正在生成 PDF...</div>
          </div>
        </div>
      )}
    </>
  );
};
