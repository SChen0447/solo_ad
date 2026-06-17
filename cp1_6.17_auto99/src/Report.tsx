import React, { useState, useCallback } from 'react';
import { FiDownload, FiCheckCircle } from 'react-icons/fi';
import type { Expression, HeadOrientation } from './faceAnalyzer';

export interface MinuteStats {
  minute: string;
  avgFocus: number;
  dominantExpression: Expression;
  headDeviationSeconds: number;
}

export interface ExpressionDistribution {
  happy: number;
  sad: number;
  surprised: number;
  angry: number;
  fearful: number;
  disgusted: number;
  neutral: number;
}

export interface HeadOrientationBreakdown {
  front: number;
  left: number;
  right: number;
  up: number;
  down: number;
}

export interface ClassReport {
  reportId: string;
  sessionStart: string;
  sessionEnd: string;
  totalDurationMinutes: number;
  overallAvgFocus: number;
  minuteStats: MinuteStats[];
  expressionDistribution: ExpressionDistribution;
  headOrientationBreakdown: HeadOrientationBreakdown;
}

interface ReportProps {
  getReportData: () => ClassReport;
}

const formatTimeStamp = () => {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

const Report: React.FC<ReportProps> = React.memo(({ getReportData }) => {
  const [toast, setToast] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleExport = useCallback(() => {
    const report = getReportData();
    const jsonStr = JSON.stringify(report, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const ts = formatTimeStamp();
    const fname = `classroom_focus_report_${ts}.json`;
    setFileName(fname);

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setToast(true);
    setTimeout(() => setToast(false), 3000);
  }, [getReportData]);

  return (
    <>
      <div style={styles.container} className="report-card">
        <div style={styles.infoRow}>
          <div style={styles.iconBox}>
            <FiDownload size={22} color="#00d4ff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={styles.title}>课堂报告导出</div>
            <div style={styles.subtitle}>生成本次会话的专注度分析报告（JSON）</div>
          </div>
        </div>
        <button style={styles.button} onClick={handleExport}>
          <FiDownload size={16} style={{ marginRight: 6 }} />
          导出报告
        </button>
      </div>

      {toast && (
        <div style={styles.toast}>
          <div style={styles.toastInner}>
            <FiCheckCircle size={20} color="#00ff88" />
            <div style={{ marginLeft: 10 }}>
              <div style={styles.toastTitle}>报告已下载</div>
              <div style={styles.toastFile}>{fileName}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

Report.displayName = 'Report';

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'linear-gradient(135deg, rgba(26,35,50,0.85), rgba(15,20,30,0.9))',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '16px',
    padding: '16px 18px',
    border: '1px solid rgba(0,212,255,0.2)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
    transition: 'box-shadow 300ms, border-color 300ms'
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '14px'
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: '12px',
    background: 'rgba(0,212,255,0.1)',
    border: '1px solid rgba(0,212,255,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  title: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: '14px',
    fontWeight: '600',
    marginBottom: '2px'
  },
  subtitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: '12px',
    lineHeight: 1.4
  },
  button: {
    width: '100%',
    padding: '11px 18px',
    borderRadius: '12px',
    border: '1px solid rgba(0,212,255,0.5)',
    background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,212,255,0.08))',
    color: '#00d4ff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    letterSpacing: '0.5px',
    transition: 'all 200ms ease-out',
    boxShadow: '0 2px 12px rgba(0,212,255,0.15)'
  },
  toast: {
    position: 'fixed',
    bottom: 32,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9999,
    animation: 'toastIn 300ms ease-out'
  },
  toastInner: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 20px',
    background: 'rgba(26,35,50,0.98)',
    border: '1px solid rgba(0,255,136,0.4)',
    borderRadius: '14px',
    boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 30px rgba(0,255,136,0.15)',
    backdropFilter: 'blur(12px)'
  },
  toastTitle: {
    color: '#00ff88',
    fontSize: '13px',
    fontWeight: '700'
  },
  toastFile: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '11px',
    marginTop: '2px'
  }
};

export default Report;
