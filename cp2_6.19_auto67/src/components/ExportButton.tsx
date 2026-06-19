import React, { useState, useCallback } from 'react';
import type { SampleConfig } from '../types';

interface ExportButtonProps {
  samples: SampleConfig[];
}

export default React.memo(function ExportButton({ samples }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [flash, setFlash] = useState(false);

  const handleExport = useCallback(() => {
    setIsExporting(true);

    setTimeout(() => {
      const exportData = samples.map(({ id, ...rest }) => rest);
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'typography-config.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setIsExporting(false);
      setFlash(true);
      setTimeout(() => setFlash(false), 500);
    }, 300);
  }, [samples]);

  return (
    <button
      onClick={handleExport}
      style={{
        padding: '8px 16px',
        background: flash ? '#22c55e' : '#1a73e8',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        fontWeight: 700,
        fontSize: 13,
        cursor: 'pointer',
        transition: 'background 0.2s, transform 0.3s ease, box-shadow 0.2s',
        transform: isExporting ? 'scale(0.92)' : 'scale(1)',
        boxShadow: flash ? '0 0 12px rgba(34,197,94,0.5)' : '0 1px 3px rgba(0,0,0,0.1)',
      }}
      onMouseEnter={e => {
        if (!flash) e.currentTarget.style.background = '#1557b0';
      }}
      onMouseLeave={e => {
        if (!flash) e.currentTarget.style.background = '#1a73e8';
      }}
    >
      {isExporting ? '导出中...' : '导出配置'}
    </button>
  );
});
