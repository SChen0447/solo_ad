import { useEffect, useMemo } from 'react';
import QRCodeSVG from 'qrcode-svg';
import { Exhibit } from '../utils/api';

interface Props {
  exhibit: Exhibit;
  onClose: () => void;
}

function generateQRCode(content: string, size: number = 200): string {
  const qr = new QRCodeSVG({
    content,
    width: size,
    height: size,
    color: '#111827',
    background: '#ffffff',
    padding: 0,
  });
  return qr.svg();
}

export default function QRCodeModal({ exhibit, onClose }: Props) {
  const qrContent = useMemo(
    () =>
      JSON.stringify({
        exhibitId: exhibit.id,
        name: exhibit.name,
        author: exhibit.author,
        url: `${window.location.origin}/exhibit/${exhibit.id}`,
      }),
    [exhibit]
  );

  const qrSvgString = useMemo(() => generateQRCode(qrContent, 200), [qrContent]);

  const thumbnailDataUri = useMemo(() => {
    const lightColors = ['#FEE2E2', '#FED7AA', '#FEF3C7', '#D1FAE5', '#DBEAFE', '#EDE9FE', '#FCE7F3'];
    let hash = 0;
    for (let i = 0; i < exhibit.id.length; i++) {
      hash = exhibit.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const bg = lightColors[Math.abs(hash) % lightColors.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="${bg}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="14" font-weight="bold" fill="#1F2937" font-family="Arial, sans-serif">${exhibit.name.charAt(0)}</text></svg>`;
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  }, [exhibit]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  function handleOpenNewTab() {
    const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>展品二维码 - ${exhibit.name}</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .qr-wrap {
      background: #fff;
      padding: 24px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 4px 24px rgba(0,0,0,0.15);
    }
    .qr-title { font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 4px; }
    .qr-author { font-size: 14px; color: #6B7280; margin-bottom: 16px; }
    .qr-svg-container { position: relative; width: 200px; height: 200px; margin: 0 auto; }
    .qr-thumb {
      position: absolute;
      left: 50%; top: 50%;
      transform: translate(-50%, -50%);
      width: 32px; height: 32px;
      background: #fff;
      border-radius: 4px;
      padding: 2px;
      box-sizing: border-box;
    }
    .hint { margin-top: 12px; font-size: 12px; color: #9CA3AF; }
  </style>
</head>
<body>
  <div class="qr-wrap">
    <div class="qr-title">${exhibit.name}</div>
    <div class="qr-author">作者：${exhibit.author}</div>
    <div class="qr-svg-container">
      ${qrSvgString}
      <img class="qr-thumb" src="${thumbnailDataUri}" alt="thumb"/>
    </div>
    <div class="hint">按 ESC 关闭此窗口</div>
  </div>
  <script>
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') window.close();
    });
  </script>
</body>
</html>`;
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    backgroundColor: '#00000080',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease-out',
  };

  const contentStyle: React.CSSProperties = {
    background: '#FFFFFFD9',
    backdropFilter: 'blur(8px)',
    borderRadius: '16px',
    padding: '20px',
    maxWidth: '600px',
    width: '90%',
    position: 'relative',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    textAlign: 'center',
  };

  const closeBtnStyle: React.CSSProperties = {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#1F2937',
    color: '#FFFFFF',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 700,
  };

  const qrContainerStyle: React.CSSProperties = {
    position: 'relative',
    width: '200px',
    height: '200px',
    margin: '24px auto',
    background: '#fff',
    padding: '4px',
    borderRadius: '8px',
  };

  const thumbStyle: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: '32px',
    height: '32px',
    background: '#fff',
    borderRadius: '4px',
    padding: '2px',
    boxSizing: 'border-box',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 600,
    color: '#111827',
    margin: '8px 0 4px',
  };

  const authorStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#6B7280',
    margin: 0,
    marginBottom: '8px',
  };

  const openBtnStyle: React.CSSProperties = {
    marginTop: '16px',
    padding: '10px 24px',
    backgroundColor: '#6366F1',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  };

  const hintStyle: React.CSSProperties = {
    marginTop: '12px',
    fontSize: '12px',
    color: '#9CA3AF',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      <div style={contentStyle} onClick={(e) => e.stopPropagation()}>
        <button
          style={closeBtnStyle}
          onClick={onClose}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#111827')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1F2937')}
          aria-label="关闭"
        >
          ×
        </button>

        <h3 style={titleStyle}>{exhibit.name}</h3>
        <p style={authorStyle}>作者：{exhibit.author}</p>

        <div style={qrContainerStyle}>
          <div dangerouslySetInnerHTML={{ __html: qrSvgString }} />
          <img style={thumbStyle} src={thumbnailDataUri} alt="" />
        </div>

        <button
          style={openBtnStyle}
          onClick={handleOpenNewTab}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#4F46E5')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#6366F1')}
        >
          新标签页预览
        </button>

        <p style={hintStyle}>点击空白区域或按 ESC 键关闭</p>
      </div>
    </div>
  );
}
