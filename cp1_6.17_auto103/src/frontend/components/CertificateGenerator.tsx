import { useRef, useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import type { Order } from '../types';

interface CertificateGeneratorProps {
  order: Order;
  compact?: boolean;
}

const licenseTypeLabels: Record<string, string> = {
  personal: '个人使用授权',
  commercial: '商业使用授权',
  unlimited: '无限期全用途授权'
};

const licenseScopeLabels: Record<string, string> = {
  personal: '仅限个人学习、非商业项目使用',
  commercial: '可用于商业项目，不可转售/再授权',
  unlimited: '无限期商业使用，可修改再创作'
};

export default function CertificateGenerator({ order, compact = false }: CertificateGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const dateStr = new Date(order.transactionTime).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = 800;
    const H = 565;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = compact ? '320px' : '100%';
    canvas.style.aspectRatio = `${W}/${H}`;
    ctx.scale(dpr, dpr);

    const draw = async () => {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, W, H);

      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, '#2a2a4e');
      grad.addColorStop(0.5, '#1a1a2e');
      grad.addColorStop(1, '#2a2a4e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, W - 40, H - 40);
      ctx.lineWidth = 1;
      ctx.strokeRect(30, 30, W - 60, H - 60);

      ctx.fillStyle = '#d4af37';
      ctx.font = 'bold 28px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('数 字 作 品 授 权 证 书', W / 2, 70);

      ctx.fillStyle = '#888';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText('DIGITAL ARTWORK LICENSE CERTIFICATE', W / 2, 90);

      const thumbX = W / 2 - 90;
      const thumbY = 110;
      const thumbW = 180;
      const thumbH = 120;

      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = order.workThumbnail;
        });

        ctx.save();
        ctx.beginPath();
        ctx.roundRect(thumbX, thumbY, thumbW, thumbH, 8);
        ctx.clip();
        ctx.drawImage(img, thumbX, thumbY, thumbW, thumbH);
        ctx.restore();
      } catch {
        ctx.fillStyle = '#2a2a4e';
        ctx.fillRect(thumbX, thumbY, thumbW, thumbH);
      }

      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 2;
      ctx.strokeRect(thumbX, thumbY, thumbW, thumbH);

      const infoX = 80;
      const labelX = 100;
      const valueX = 320;
      let y = 260;

      const drawRow = (label: string, value: string, gold = false) => {
        ctx.fillStyle = '#888';
        ctx.font = '13px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, labelX, y);

        ctx.fillStyle = gold ? '#d4af37' : '#fff';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.fillText(value, valueX, y);
        y += 32;
      };

      drawRow('作品名称 / Artwork:', order.workTitle, true);
      drawRow(
        '购买内容 / Content:',
        order.purchaseType === 'full'
          ? `完整版 (Full Version)`
          : `单图层 / Single Layer: ${order.layerName || 'Unknown'}`
      );
      drawRow('购买者 / Buyer:', order.buyerName);
      drawRow('购买日期 / Date:', dateStr);
      drawRow('授权类型 / License:', licenseTypeLabels[order.licenseType] || order.licenseType, true);
      drawRow('使用范围 / Scope:', licenseScopeLabels[order.licenseType] || '个人使用');
      drawRow('订单编号 / Order ID:', order.id);

      ctx.fillStyle = '#d4af37';
      ctx.font = 'bold 34px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ArtLayer', W - 120, 160);
      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = '#888';
      ctx.fillText('© Creative Marketplace', W - 120, 178);

      const sigY = H - 90;
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W - 220, sigY);
      ctx.lineTo(W - 60, sigY);
      ctx.stroke();

      ctx.fillStyle = '#888';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Creator Signature', W - 140, sigY + 18);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#666';
      ctx.font = '10px monospace';
      ctx.fillText(`Blockchain Hash: ${order.certificateHash}`, 80, H - 55);

      setImgLoaded(true);
    };

    draw();
  }, [order, compact]);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      pdf.setFillColor(26, 26, 46);
      pdf.rect(0, 0, pageW, pageH, 'F');

      pdf.setFillColor(42, 42, 78);
      pdf.rect(5, 5, pageW - 10, pageH - 10, 'F');
      pdf.setDrawColor(212, 175, 55);
      pdf.setLineWidth(0.5);
      pdf.rect(5, 5, pageW - 10, pageH - 10, 'S');

      pdf.setTextColor(212, 175, 55);
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DIGITAL ARTWORK LICENSE CERTIFICATE', pageW / 2, 18, { align: 'center' });

      pdf.setFontSize(10);
      pdf.setTextColor(150, 150, 150);
      pdf.text('数字作品授权证书', pageW / 2, 24, { align: 'center' });

      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = order.workThumbnail;
        });

        const imgCanvas = document.createElement('canvas');
        imgCanvas.width = img.width;
        imgCanvas.height = img.height;
        const imgCtx = imgCanvas.getContext('2d');
        if (imgCtx) imgCtx.drawImage(img, 0, 0);

        const imgData = imgCanvas.toDataURL('image/jpeg', 0.8);
        const thumbW = 60;
        const thumbH = (thumbW * img.height) / img.width;
        pdf.addImage(imgData, 'JPEG', pageW / 2 - thumbW / 2, 32, thumbW, thumbH);
      } catch {
        // ignore thumbnail error
      }

      pdf.setFontSize(10);
      const rows = [
        ['Artwork Title', order.workTitle],
        ['Content', order.purchaseType === 'full' ? 'Full Version' : `Single Layer: ${order.layerName || ''}`],
        ['Buyer', order.buyerName],
        ['Date', dateStr],
        ['License Type', licenseTypeLabels[order.licenseType] || order.licenseType],
        ['Scope', licenseScopeLabels[order.licenseType] || ''],
        ['Order ID', order.id],
        ['Blockchain Hash', order.certificateHash]
      ];

      let y = 100;
      rows.forEach(([label, value]) => {
        pdf.setTextColor(150, 150, 150);
        pdf.setFont('helvetica', 'normal');
        pdf.text(label + ':', 25, y);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.text(value || '-', 65, y);
        y += 7;
      });

      pdf.setTextColor(212, 175, 55);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ArtLayer', pageW - 35, pageH - 25, { align: 'right' });

      pdf.save(`certificate-${order.id}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      if (canvasRef.current) {
        const link = document.createElement('a');
        link.download = `certificate-${order.id}.png`;
        link.href = canvasRef.current.toDataURL('image/png');
        link.click();
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={compact ? styles.compactContainer : styles.container}>
      {!compact && (
        <h3 style={styles.title}>授权证书预览</h3>
      )}
      <div style={styles.canvasWrap}>
        <canvas
          ref={canvasRef}
          style={{
            ...styles.canvas,
            opacity: imgLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }}
        />
      </div>
      <div style={compact ? styles.compactHashRow : styles.hashRow}>
        <span style={styles.hashLabel}>区块链哈希:</span>
        <code style={styles.hashValue}>{order.certificateHash}</code>
      </div>
      <button
        onClick={handleDownloadPDF}
        disabled={downloading}
        style={compact ? styles.compactDownloadBtn : styles.downloadBtn}
      >
        {downloading ? (
          <>
            <span style={{
              display: 'inline-block',
              animation: 'spin 1.5s linear infinite',
              marginRight: 8
            }}>⟳</span>
            生成中...
          </>
        ) : (
          <>📥 {compact ? '证书' : '下载PDF'}</>
        )}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: 12,
    padding: 24,
    width: '100%'
  },
  compactContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 8
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 16,
    color: 'var(--accent)',
    textAlign: 'center'
  },
  canvasWrap: {
    backgroundColor: '#0a0a14',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
  },
  canvas: {
    display: 'block',
    width: '100%',
    height: 'auto'
  },
  hashRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    backgroundColor: 'var(--bg-tertiary)',
    borderRadius: 8,
    marginBottom: 16
  },
  compactHashRow: {
    display: 'none'
  },
  hashLabel: {
    fontSize: 12,
    color: 'var(--text-muted)',
    flexShrink: 0
  },
  hashValue: {
    fontSize: 11,
    color: 'var(--accent)',
    fontFamily: 'monospace',
    wordBreak: 'break-all'
  },
  downloadBtn: {
    width: '100%',
    backgroundColor: 'var(--accent)',
    color: '#fff',
    padding: '14px',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    transition: 'filter 0.2s'
  },
  compactDownloadBtn: {
    backgroundColor: 'var(--secondary)',
    color: '#fff',
    padding: '8px 14px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    transition: 'filter 0.2s'
  }
};
