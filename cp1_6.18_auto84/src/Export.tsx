import React, { useState } from 'react';
import JSZip from 'jszip';
import { Variant, TemplateType, DiffResult } from './types';
import { useStore } from './store';
import { generateHTML } from './utils/htmlGenerator';
import { captureElement } from './utils/screenshot';
import { computeDiff } from './utils/diff';

interface ExportProps {
  previewRef: React.RefObject<HTMLDivElement | null>;
}

interface VariantExportData {
  id: string;
  name: string;
  variant: Variant;
  html: string;
  screenshot: string;
}

interface DiffReport {
  generatedAt: string;
  template: TemplateType;
  variants: Array<{
    id: string;
    name: string;
    data: Variant;
  }>;
  comparisons: Array<{
    variants: [string, string];
    diffs: DiffResult[];
  }>;
  screenshots: Record<string, string>;
}

export const Export: React.FC<ExportProps> = React.memo(({ previewRef }) => {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const variants = useStore((state) => state.variants);
  const template = useStore((state) => state.template);

  const handleExport = async () => {
    if (exporting || variants.length === 0) return;

    setExporting(true);
    setProgress(0);

    try {
      const zip = new JSZip();
      const variantData: VariantExportData[] = [];

      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        const html = generateHTML(variant, template, variant.name);
        const screenshot = await captureElement(previewRef?.current ?? null);

        variantData.push({
          id: variant.id,
          name: variant.name,
          variant,
          html,
          screenshot,
        });

        setProgress(Math.round(((i + 1) / variants.length) * 70));
      }

      const htmlFolder = zip.folder('pages');
      variantData.forEach((data) => {
        if (htmlFolder) {
          htmlFolder.file(`${data.name.replace(/[^a-zA-Z0-9]/g, '')}.html`, data.html);
        }
      });

      const screenshotsFolder = zip.folder('screenshots');
      variantData.forEach((data) => {
        if (screenshotsFolder && data.screenshot) {
          const base64Data = data.screenshot.split(',')[1];
          if (base64Data) {
            screenshotsFolder.file(`${data.name.replace(/[^a-zA-Z0-9]/g, '')}.png`, base64Data, { base64: true });
          }
        }
      });

      setProgress(80);

      const comparisons: DiffReport['comparisons'] = [];
      for (let i = 0; i < variants.length; i++) {
        for (let j = i + 1; j < variants.length; j++) {
          const diffs = computeDiff(variants[i], variants[j]);
          comparisons.push({
            variants: [variants[i].id, variants[j].id],
            diffs,
          });
        }
      }

      const report: DiffReport = {
        generatedAt: new Date().toISOString(),
        template,
        variants: variantData.map((d) => ({
          id: d.id,
          name: d.name,
          data: d.variant,
        })),
        comparisons,
        screenshots: variantData.reduce((acc, d) => {
          acc[d.id] = d.screenshot;
          return acc;
        }, {} as Record<string, string>),
      };

      zip.file('diff-report.json', JSON.stringify(report, null, 2));

      setProgress(90);

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ab-test-variants-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setProgress(100);
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试');
    } finally {
      setTimeout(() => {
        setExporting(false);
        setProgress(0);
      }, 500);
    }
  };

  return (
    <div className="export-wrapper">
      <button
        className="export-btn"
        onClick={handleExport}
        disabled={exporting || variants.length === 0}
      >
        {exporting ? (
          <>
            <span className="export-spinner" />
            导出中 {progress}%
          </>
        ) : (
          <>
            <span className="export-icon">📦</span>
            导出版本快照
          </>
        )}
      </button>
      {exporting && (
        <div className="export-progress">
          <div
            className="export-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
});

Export.displayName = 'Export';
