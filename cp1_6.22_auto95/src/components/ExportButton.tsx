import { useState } from 'react';

interface ExportButtonProps {
  getHtmlContent: () => string;
  fileName?: string;
}

export default function ExportButton({ getHtmlContent, fileName }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    if (loading) return;
    setLoading(true);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev >= 90 ? 90 : prev + 10));
    }, 200);

    try {
      const html = getHtmlContent();
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, fileName: fileName || 'resume' }),
      });

      if (!response.ok) {
        throw new Error('导出失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName || 'resume'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setProgress(100);
    } catch (err) {
      console.error(err);
      alert('导出失败，请重试');
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 500);
    }
  };

  const styles: Record<string, React.CSSProperties> = {
    btn: {
      position: 'relative',
      padding: '9px 22px',
      background: loading ? '#4a5568' : '#38b2ac',
      color: '#ffffff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 600,
      cursor: loading ? 'default' : 'pointer',
      overflow: 'hidden',
      transition: 'background 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    btnHover: {
      background: loading ? '#4a5568' : '#2c8f8a',
    },
    progressBar: {
      position: 'absolute',
      left: 0,
      bottom: 0,
      height: '3px',
      background: '#ffffff',
      transition: 'width 0.2s ease',
      opacity: 0.8,
    },
    spinner: {
      width: '14px',
      height: '14px',
      border: '2px solid rgba(255,255,255,0.3)',
      borderTopColor: '#ffffff',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    },
  };

  const [hovered, setHovered] = useState(false);

  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <button
        style={{
          ...styles.btn,
          ...(hovered && !loading ? styles.btnHover : {}),
        }}
        onClick={handleExport}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        disabled={loading}
      >
        {loading && <div style={styles.spinner} />}
        <span>{loading ? `导出中 ${progress}%` : '一键导出 PDF'}</span>
        {loading && (
          <div style={{ ...styles.progressBar, width: `${progress}%` }} />
        )}
      </button>
    </>
  );
}
