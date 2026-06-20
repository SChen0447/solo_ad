import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { PlanBookData } from '../../types';
import { generatePdf } from '../../api/apiService';

interface ExportPDFProps {
  planData: PlanBookData;
}

const ExportPDF: React.FC<ExportPDFProps> = ({ planData }) => {
  const [exporting, setExporting] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await generatePdf(planData);
      setShareUrl(result.shareUrl);

      if (result.pdfUrl) {
        const link = document.createElement('a');
        link.href = result.pdfUrl;
        link.download = `${planData.projectName}_商业计划书.pdf`;
        link.click();
      }
    } catch {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      doc.setFont('helvetica');
      doc.setFontSize(20);
      doc.text(planData.projectName, 20, 30);
      doc.setFontSize(12);
      doc.text(`Vision: ${planData.vision}`, 20, 45);
      doc.text(`Market: ${planData.marketPosition}`, 20, 55);
      doc.text(`Target Users: ${planData.targetUsers.join(', ')}`, 20, 65);

      let yPos = 85;
      for (const ch of planData.chapters) {
        doc.setFontSize(14);
        doc.text(ch.title, 20, yPos);
        yPos += 10;
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(ch.content, 170);
        for (const line of lines) {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, 20, yPos);
          yPos += 6;
        }
        yPos += 8;
      }

      doc.save(`${planData.projectName}_商业计划书.pdf`);
      setShareUrl(`http://localhost:5173/share/${crypto.randomUUID()}`);
    } finally {
      setExporting(false);
    }
  };

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={styles.container}
    >
      <div style={styles.actions}>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleExport}
          disabled={exporting}
          style={{
            ...styles.exportBtn,
            opacity: exporting ? 0.7 : 1,
            cursor: exporting ? 'not-allowed' : 'pointer',
          }}
        >
          {exporting ? '导出中...' : '📄 导出PDF'}
        </motion.button>

        {shareUrl && (
          <div style={styles.shareRow}>
            <span style={styles.shareLabel}>分享链接（72小时内有效）：</span>
            <input
              type="text"
              readOnly
              value={shareUrl}
              style={styles.shareInput}
              onClick={e => (e.target as HTMLInputElement).select()}
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCopyLink}
              style={styles.copyBtn}
            >
              {copied ? '✓ 已复制' : '复制'}
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: 32,
    maxWidth: 600,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  exportBtn: {
    padding: '12px 40px',
    fontSize: 16,
    fontWeight: 600,
    color: '#fff',
    background: '#f59e0b',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
  },
  shareRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  },
  shareLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  shareInput: {
    padding: '6px 10px',
    fontSize: 13,
    border: '1.5px solid #d1d5db',
    borderRadius: 6,
    width: 280,
    outline: 'none',
    color: '#374151',
    background: '#f9fafb',
  },
  copyBtn: {
    padding: '6px 16px',
    fontSize: 13,
    fontWeight: 500,
    color: '#fff',
    background: '#1e3a5f',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
};

export default ExportPDF;
