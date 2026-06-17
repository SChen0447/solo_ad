import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { useFeedbackStore } from '../stores/feedbackStore';
import type { ExportReport } from '../types';

export const ReportExport: React.FC = () => {
  const emotionStats = useFeedbackStore((state) => state.emotionStats);
  const themeDistribution = useFeedbackStore((state) => state.themeDistribution);
  const trendData = useFeedbackStore((state) => state.trendData);
  const feedbackList = useFeedbackStore((state) => state.feedbackList);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExport = () => {
    if (isExporting) return;

    setIsExporting(true);
    setProgress(0);

    const startTime = Date.now();
    const duration = 1000;

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (newProgress < 100) {
        requestAnimationFrame(updateProgress);
      } else {
        const report: ExportReport = {
          exportedAt: new Date().toISOString(),
          emotionStats,
          themeDistribution,
          trendData,
          totalFeedbacks: feedbackList.length,
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `feedback-report-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setTimeout(() => {
          setIsExporting(false);
          setProgress(0);
        }, 300);
      }
    };

    requestAnimationFrame(updateProgress);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={handleExport}
        disabled={isExporting}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          background: 'linear-gradient(135deg, #00d4aa, #0099ff)',
          border: 'none',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '14px',
          fontWeight: 500,
          cursor: isExporting ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease-out',
          opacity: isExporting ? 0.8 : 1,
          minWidth: '120px',
          justifyContent: 'center',
        }}
        className="export-btn"
      >
        <Download size={18} />
        {isExporting ? '导出中...' : '导出报告'}
      </button>

      {isExporting && (
        <div
          style={{
            position: 'absolute',
            bottom: '-4px',
            left: 0,
            right: 0,
            height: '3px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #00d4aa, #0099ff)',
              width: `${progress}%`,
              transition: 'width 0.05s linear',
            }}
          />
        </div>
      )}

      <style>{`
        .export-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(0, 212, 170, 0.4);
        }
        .export-btn:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
};
