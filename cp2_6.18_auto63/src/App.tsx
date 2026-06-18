import React, { useState, useRef, useCallback, useEffect } from 'react';
import PuzzleCanvas, { ImageItem, BorderStyle, LayoutMode } from './components/PuzzleCanvas';
import Toolbar from './components/Toolbar';
import { canvasToBase64 } from './utils/imageHelper';
import { copyLinkToClipboard, copyImageToClipboard, generateShareLink } from './utils/shareHelper';

const App: React.FC = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [backgroundColor, setBackgroundColor] = useState('#f3f4f6');
  const [borderStyle, setBorderStyle] = useState<BorderStyle>('none');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('compact');

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copyLinkStatus, setCopyLinkStatus] = useState<'idle' | 'success'>('idle');
  const [copyImageStatus, setCopyImageStatus] = useState<'idle' | 'success'>('idle');
  const [showPreview, setShowPreview] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  }, []);

  useEffect(() => {
    if (copyLinkStatus === 'success') {
      const timer = setTimeout(() => setCopyLinkStatus('idle'), 1500);
      return () => clearTimeout(timer);
    }
  }, [copyLinkStatus]);

  useEffect(() => {
    if (copyImageStatus === 'success') {
      const timer = setTimeout(() => setCopyImageStatus('idle'), 1500);
      return () => clearTimeout(timer);
    }
  }, [copyImageStatus]);

  const handleGeneratePreview = useCallback(async () => {
    if (images.length === 0) {
      showToast('请先添加至少一张图片');
      return;
    }

    if (!canvasRef.current) return;

    setIsGenerating(true);
    setShowPreview(true);
    setPreviewImage(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      const base64 = await canvasToBase64(canvasRef.current, 1200);
      setPreviewImage(base64);
      const link = generateShareLink();
      setShareLink(link);
    } catch (err) {
      console.error('生成预览失败:', err);
      showToast('生成预览失败，请重试');
      setShowPreview(false);
    } finally {
      setIsGenerating(false);
    }
  }, [images.length, showToast]);

  const handleCopyLink = useCallback(async () => {
    if (!shareLink) return;
    const success = await copyLinkToClipboard(shareLink);
    if (success) {
      setCopyLinkStatus('success');
    } else {
      showToast('复制链接失败，请手动复制');
    }
  }, [shareLink, showToast]);

  const handleCopyImage = useCallback(async () => {
    if (!previewImage) return;
    const success = await copyImageToClipboard(previewImage);
    if (success) {
      setCopyImageStatus('success');
    } else {
      showToast('您的浏览器不支持直接复制图片，请右键保存');
    }
  }, [previewImage, showToast]);

  const handleDownloadImage = useCallback(() => {
    if (!previewImage) return;
    const link = document.createElement('a');
    link.download = `puzzle-collage-${Date.now()}.png`;
    link.href = previewImage;
    link.click();
  }, [previewImage]);

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#fafafa',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <header
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: '16px 32px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1f2937' }}>
              图片拼贴与社交分享板
            </h1>
            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
              创意拼贴，一键分享
            </p>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 32px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 240px',
            gap: '24px',
            alignItems: 'start',
          }}
          className="main-layout"
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <PuzzleCanvas
              images={images}
              backgroundColor={backgroundColor}
              borderStyle={borderStyle}
              layoutMode={layoutMode}
              onImagesChange={setImages}
              canvasRef={canvasRef}
            />

            <div
              style={{
                marginTop: '16px',
                width: '100%',
                maxWidth: '1000px',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
                    分享拼图
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
                    生成高清预览图，快速分享到社交平台
                  </p>
                </div>
                <button
                  onClick={handleGeneratePreview}
                  disabled={isGenerating || images.length === 0}
                  style={{
                    padding: '12px 28px',
                    backgroundColor: images.length === 0 ? '#d1d5db' : '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: images.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  onMouseEnter={(e) => {
                    if (images.length > 0) e.currentTarget.style.backgroundColor = '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    if (images.length > 0) e.currentTarget.style.backgroundColor = '#3b82f6';
                  }}
                >
                  {isGenerating ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                        <path d="M12 2a10 10 0 0 1 10 10" />
                      </svg>
                      生成中...
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                      </svg>
                      生成分享预览
                    </>
                  )}
                </button>
              </div>

              {showPreview && (
                <div
                  style={{
                    borderTop: '1px solid #e5e7eb',
                    paddingTop: '20px',
                    animation: 'fadeIn 0.3s ease-out',
                  }}
                >
                  <div
                    style={{
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      padding: '16px',
                      marginBottom: '16px',
                      display: 'flex',
                      justifyContent: 'center',
                      minHeight: previewImage ? 'auto' : '200px',
                      alignItems: 'center',
                      overflow: 'auto',
                    }}
                  >
                    {isGenerating ? (
                      <div style={{ textAlign: 'center', color: '#6b7280' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }}>
                          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                          <path d="M12 2a10 10 0 0 1 10 10" />
                        </svg>
                        <p style={{ marginTop: '8px', fontSize: '13px' }}>正在生成高清预览图...</p>
                      </div>
                    ) : previewImage ? (
                      <img
                        src={previewImage}
                        alt="拼图预览"
                        style={{
                          maxWidth: '100%',
                          height: 'auto',
                          borderRadius: '4px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        }}
                      />
                    ) : null}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    <button
                      onClick={handleCopyLink}
                      disabled={!shareLink}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: copyLinkStatus === 'success' ? '#10b981' : '#ffffff',
                        color: copyLinkStatus === 'success' ? '#fff' : '#374151',
                        border: `1px solid ${copyLinkStatus === 'success' ? '#10b981' : '#d1d5db'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (copyLinkStatus !== 'success') {
                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                          e.currentTarget.style.borderColor = '#9ca3af';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (copyLinkStatus !== 'success') {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.borderColor = '#d1d5db';
                        }
                      }}
                    >
                      {copyLinkStatus === 'success' ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          已复制
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                          </svg>
                          复制链接
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleCopyImage}
                      disabled={!previewImage}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: copyImageStatus === 'success' ? '#10b981' : '#ffffff',
                        color: copyImageStatus === 'success' ? '#fff' : '#374151',
                        border: `1px solid ${copyImageStatus === 'success' ? '#10b981' : '#d1d5db'}`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (copyImageStatus !== 'success') {
                          e.currentTarget.style.backgroundColor = '#f3f4f6';
                          e.currentTarget.style.borderColor = '#9ca3af';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (copyImageStatus !== 'success') {
                          e.currentTarget.style.backgroundColor = '#ffffff';
                          e.currentTarget.style.borderColor = '#d1d5db';
                        }
                      }}
                    >
                      {copyImageStatus === 'success' ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          已复制
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                          复制图片
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleDownloadImage}
                      disabled={!previewImage}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      下载图片
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Toolbar
            backgroundColor={backgroundColor}
            borderStyle={borderStyle}
            layoutMode={layoutMode}
            onBackgroundColorChange={setBackgroundColor}
            onBorderStyleChange={setBorderStyle}
            onLayoutModeChange={setLayoutMode}
          />
        </div>
      </main>

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#1f2937',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            zIndex: 1000,
            animation: 'slideUp 0.3s ease-out',
          }}
        >
          {toast}
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 1024px) {
          .main-layout {
            grid-template-columns: 1fr !important;
          }
          .main-layout > div:last-child {
            order: -1;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
