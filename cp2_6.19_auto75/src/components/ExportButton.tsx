import { useState, useCallback } from 'react';
import { useTypographyStore } from '@/store/typographyStore';

export default function ExportButton() {
  const samples = useTypographyStore((s) => s.samples);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const handleExport = useCallback(() => {
    if (exporting) return;
    setExporting(true);

    setTimeout(() => {
      const data = JSON.stringify(samples, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'typography-config.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExporting(false);
      setExported(true);
      setTimeout(() => setExported(false), 500);
    }, 300);
  }, [samples, exporting]);

  return (
    <button
      onClick={handleExport}
      className={`toolbar-btn ${exported ? 'toolbar-btn-success' : ''} ${exporting ? 'toolbar-btn-exporting' : ''}`}
      disabled={exporting}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      <span>Export</span>
    </button>
  );
}
