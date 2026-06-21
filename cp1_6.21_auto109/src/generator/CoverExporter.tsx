import React, { useState, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { saveAs } from 'file-saver';
import { Download, Loader2 } from 'lucide-react';
import type { CoverExporterProps } from '@/types';

const CoverExporter: React.FC<CoverExporterProps> = ({
  targetRef,
  fileName = 'podcast-cover',
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!targetRef.current || isExporting) return;
    setIsExporting(true);
    try {
      const node = targetRef.current;
      const dataUrl = await toPng(node, {
        width: 400,
        height: 400,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: undefined,
        style: {
          transform: 'none',
        },
      });
      const base64Data = dataUrl.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      saveAs(blob, `${fileName}.png`);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setTimeout(() => setIsExporting(false), 400);
    }
  }, [targetRef, fileName, isExporting]);

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      aria-live="polite"
      className="export-button"
    >
      {isExporting ? (
        <>
          <Loader2 className="export-spinner" size={18} />
          <span>生成中...</span>
        </>
      ) : (
        <>
          <Download size={18} />
          <span>下载 PNG</span>
        </>
      )}
    </button>
  );
};

export default CoverExporter;
