import React, { useEffect, useState, useRef } from 'react';
import { Exhibit } from '../utils/api';
import QRCodeSVG from 'qrcode-svg';

interface QRCodeModalProps {
  exhibit: Exhibit;
  onClose: () => void;
}

function generateQRCodeSVG(content: string, thumbnailUrl: string): string {
  const size = 200;
  const qr = new QRCodeSVG({
    content,
    width: size,
    height: size,
    color: '#111827',
    background: '#FFFFFF',
    padding: 8,
  });
  let svgStr = qr.svg();

  const thumbSize = 32;
  const centerX = size / 2 - thumbSize / 2;
  const centerY = size / 2 - thumbSize / 2;

  const watermark = `
    <rect x="${centerX - 2}" y="${centerY - 2}" width="${thumbSize + 4}" height="${thumbSize + 4}" fill="#FFFFFF" rx="4"/>
    <image x="${centerX}" y="${centerY}" width="${thumbSize}" height="${thumbSize}" href="${thumbnailUrl}" clip-path="inset(0 0 0 0 round 2px)" preserveAspectRatio="xMidYMid slice"/>
  `;

  svgStr = svgStr.replace('</svg>', watermark + '</svg>');
  return svgStr;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ exhibit, onClose }) => {
  const [qrSVG, setQrSVG] = useState<string>('');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const content = `https://exhibit.example.com/view/${exhibit.id}`;
    const svg = generateQRCodeSVG(content, exhibit.imageUrl || '');
    setQrSVG(svg);
  }, [exhibit]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handlePreviewNewTab = () => {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
          <meta charset="UTF-8" />
          <title>展品二维码 - ${exhibit.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              width: 100vw; height: 100vh;
              display: flex; flex-direction: column;
              align-items: center; justify-content: center;
              background: #00000080;
              backdrop-filter: blur(4px);
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }
            .qr-wrap {
              background: #FFFFFF;
              padding: 24px;
              border-radius: 16px;
              box-shadow: 0 8px 32px rgba(0,0,0,0.2);
              text-align: center;
            }
            .title { font-size: 18px; color: #111827; margin-bottom: 16px; font-weight: 600; }
            .author { font-size: 14px; color: #6B7280; margin-top: 12px; }
            .download-btn {
              margin-top: 16px;
              padding: 8px 20px;
              background: #6366F1;
              color: #fff;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-size: 14px;
            }
            .download-btn:hover { background: #4F46E5; }
          </style>
        </head>
        <body>
          <div class="qr-wrap">
            <div class="title">${exhibit.name}</div>
            ${qrSVG}
            <div class="author">作者：${exhibit.author}</div>
            <button class="download-btn" onclick="downloadSVG()">下载二维码</button>
          </div>
          <script>
            document.addEventListener('keydown', function(e) { if(e.key==='Escape') window.close(); });
            function downloadSVG() {
              const svg = document.querySelector('svg');
              const blob = new Blob([svg.outerHTML], {type: 'image/svg+xml'});
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = '${exhibit.name}-QR.svg';
              a.click(); URL.revokeObjectURL(url);
            }
          <\/script>
        </body>
        </html>
      `);
      win.document.close();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      ref={modalRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#00000080',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        style={{
          background: '#FFFFFFD9',
          maxWidth: '600px',
          width: '90%',
          padding: '20px',
          borderRadius: '16px',
          position: 'relative',
          boxShadow: '0 16px 48px rgba(0,0,0,0.25)',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: '#1F2937',
            color: '#FFFFFF',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 600,
          }}
          title="关闭"
        >
          ✕
        </button>

        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <h2
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 600,
              color: '#111827',
              marginBottom: '8px',
            }}
          >
            展品二维码标签
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#6B7280', marginBottom: '20px' }}>
            {exhibit.name} · {exhibit.author}
          </p>

          <div
            style={{
              background: '#FFFFFF',
              padding: '20px',
              borderRadius: '12px',
              display: 'inline-block',
              marginBottom: '20px',
              boxShadow: 'inset 0 0 0 1px #E5E7EB',
            }}
            dangerouslySetInnerHTML={{ __html: qrSVG }}
          />

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={handlePreviewNewTab}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                background: '#6366F1',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#4F46E5';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#6366F1';
              }}
            >
              新标签页预览
            </button>
          </div>

          <p style={{ marginTop: '16px', fontSize: '12px', color: '#9CA3AF' }}>
            按 ESC 键或点击外部区域关闭
          </p>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;
