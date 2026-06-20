import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type {
  ExtractedColor,
  ColorExtractResult,
  ThemePackage,
  HistoryTheme,
} from './types';
import { useThemeHistory, useColorExtractor, useCSSVariables } from './hooks';
import { generateTheme } from './themeGenerator';
import PreviewPanel from './previewPanel';
import ExportPanel from './exportPanel';
import ColorPicker from './components/ColorPicker';
import { hexToRgb, rgbToHex, hsvToRgb, rgbToHsv, createExtractedColor } from './utils/colorUtils';

type CompareMode = 'single' | 'compare';

export default function App() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [extractResult, setExtractResult] = useState<ColorExtractResult | null>(null);
  const [theme, setTheme] = useState<ThemePackage | null>(null);
  const [compareTheme, setCompareTheme] = useState<ThemePackage | null>(null);
  const [compareMode, setCompareMode] = useState<CompareMode>('single');
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [editingColorIndex, setEditingColorIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [swatchesAnimated, setSwatchesAnimated] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const colorSwatchRefs = useRef<(HTMLDivElement | null)[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { history, addToHistory } = useThemeHistory();
  const { progress, isProcessing, extractFromImage } = useColorExtractor();
  const { applyVariables } = useCSSVariables();

  useEffect(() => {
    if (theme) {
      applyVariables(theme.variables);
      addToHistory(theme);
    }
  }, [theme, applyVariables, addToHistory]);

  useEffect(() => {
    if (extractResult) {
      const timer = setTimeout(() => setSwatchesAnimated(true), 50);
      return () => clearTimeout(timer);
    }
  }, [extractResult]);

  const handleFile = useCallback(
    async (file: File) => {
      setUploadError(null);
      setSwatchesAnimated(false);

      if (!file.type.match(/^image\/(png|jpeg)$/)) {
        setUploadError('仅支持 PNG 或 JPG 格式的图片');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setUploadError('图片大小不能超过 5MB');
        return;
      }

      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImageUrl(url);

      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);

        try {
          const result = await extractFromImage(imageData);
          setExtractResult(result);
          const newTheme = generateTheme(result.colors);
          setTheme(newTheme);
          setCompareMode('single');
          setCompareTheme(null);
          setCompareSelection([]);
        } catch (err) {
          setUploadError('颜色提取失败，请重试');
          console.error(err);
        }
      };
      img.src = url;
    },
    [extractFromImage],
  );

  const handleColorChange = useCallback(
    (index: number, newHex: string) => {
      if (!extractResult) return;

      const newColors = [...extractResult.colors];
      const rgb = hexToRgb(newHex);
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      const brightness = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
      const whiteRgb = { r: 255, g: 255, b: 255 };
      const blackRgb = { r: 0, g: 0, b: 0 };
      const contrastColor = brightness > 0.5 ? blackRgb : whiteRgb;
      const contrastR =
        (0.299 * contrastColor.r + 0.587 * contrastColor.g + 0.114 * contrastColor.b) / 255;
      const l1 = Math.max(brightness, contrastR) + 0.05;
      const l2 = Math.min(brightness, contrastR) + 0.05;

      newColors[index] = {
        hex: newHex,
        rgb,
        hsv,
        brightness,
        contrast: l1 / l2,
        percentage: newColors[index]?.percentage || 0,
      };

      const newResult: ColorExtractResult = {
        ...extractResult,
        colors: newColors,
        dominant: newColors[0],
        averageBrightness: newColors.reduce((s, c) => s + c.brightness, 0) / newColors.length,
      };

      setExtractResult(newResult);
      const newTheme = generateTheme(newColors);
      newTheme.id = theme?.id || newTheme.id;
      newTheme.timestamp = theme?.timestamp || newTheme.timestamp;
      setTheme(newTheme);
    },
    [extractResult, theme],
  );

  const handleRestoreHistory = useCallback(
    (entry: HistoryTheme) => {
      if (compareMode === 'compare') {
        if (compareSelection.includes(entry.id)) {
          setCompareSelection((prev) => prev.filter((id) => id !== entry.id));
        } else if (compareSelection.length < 2) {
          setCompareSelection((prev) => {
            const updated = [...prev, entry.id];
            if (updated.length === 2) {
              const [id1, id2] = updated;
              const e1 = history.find((h) => h.id === id1);
              const e2 = history.find((h) => h.id === id2);
              if (e1 && e2) {
                const t1 = generateTheme(e1.colors);
                const t2 = generateTheme(e2.colors);
                setTheme(t1);
                setCompareTheme(t2);
              }
            }
            return updated;
          });
        }
        return;
      }

      const restoredTheme = generateTheme(entry.colors);
      const colors = entry.colors;
      const result: ColorExtractResult = {
        colors,
        dominant: colors[0],
        averageBrightness: colors.reduce((s, c) => s + c.brightness, 0) / colors.length,
        saturation: colors.reduce((s, c) => s + c.hsv.s, 0) / colors.length,
        hueDistribution: [],
      };
      setExtractResult(result);
      setTheme(restoredTheme);
    },
    [compareMode, compareSelection, history],
  );

  const toggleCompareMode = useCallback(() => {
    if (compareMode === 'single') {
      setCompareMode('compare');
      setCompareSelection([]);
      setCompareTheme(null);
    } else {
      setCompareMode('single');
      setCompareSelection([]);
      setCompareTheme(null);
    }
  }, [compareMode]);

  const primaryColor = extractResult?.colors[0]?.hex || '#6366f1';
  const accentColor = extractResult?.colors[2]?.hex || '#8b5cf6';
  const progressGradient = `linear-gradient(90deg, ${primaryColor}, ${accentColor})`;

  const SidebarContent = (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#1a1a1a',
        borderRight: '1px solid #333',
      }}
    >
      <div
        style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid #333',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 12px ${primaryColor}40`,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#e0e0e0' }}>
            风格提取器
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '1px' }}>
            Design Theme Extractor
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              fontSize: '11px',
              color: '#666',
              marginBottom: '8px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            上传设计稿
          </div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? primaryColor : '#444'}`,
              borderRadius: '12px',
              padding: imageUrl ? '8px' : '28px 16px',
              background: isDragging ? `${primaryColor}0a` : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'center',
            }}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="uploaded"
                style={{
                  width: '100%',
                  borderRadius: '8px',
                  display: 'block',
                  maxHeight: '120px',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <>
                <svg
                  width="36"
                  height="36"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={isDragging ? primaryColor : '#666'}
                  strokeWidth="1.5"
                  style={{ margin: '0 auto 8px' }}
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <div
                  style={{
                    fontSize: '12px',
                    color: isDragging ? '#e0e0e0' : '#9e9e9e',
                    fontWeight: 500,
                  }}
                >
                  {isDragging ? '松开鼠标上传' : '拖拽或点击上传'}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: '#555',
                    marginTop: '4px',
                  }}
                >
                  支持 PNG / JPG · 最大 5MB
                </div>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
              style={{ display: 'none' }}
            />
          </div>

          {uploadError && (
            <div
              style={{
                marginTop: '8px',
                padding: '8px 12px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '8px',
                fontSize: '11px',
                color: '#ef4444',
              }}
            >
              {uploadError}
            </div>
          )}

          {isProcessing && (
            <div style={{ marginTop: '12px' }}>
              <div
                style={{
                  height: '4px',
                  borderRadius: '2px',
                  background: '#2a2a2a',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progress * 100}%`,
                    background: progressGradient,
                    borderRadius: '2px',
                    transition: 'width 0.15s ease',
                    animation: 'progressPulse 1s ease-in-out infinite',
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: '#666',
                  marginTop: '6px',
                  textAlign: 'center',
                }}
              >
                正在分析颜色... {Math.round(progress * 100)}%
              </div>
            </div>
          )}
        </div>

        {extractResult && (
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                fontSize: '11px',
                color: '#666',
                marginBottom: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>提取色板</span>
              <span style={{ fontWeight: 400, color: '#555' }}>
                点击色块可编辑
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {extractResult.colors.map((color, idx) => (
                <div
                  key={idx}
                  ref={(el) => {
                    colorSwatchRefs.current[idx] = el;
                  }}
                  onClick={() => setEditingColorIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px',
                    borderRadius: '10px',
                    background: '#1e1e1e',
                    border:
                      editingColorIndex === idx
                        ? `1px solid ${primaryColor}`
                        : '1px solid #2a2a2a',
                    cursor: 'pointer',
                    opacity: swatchesAnimated ? 1 : 0,
                    transform: swatchesAnimated ? 'translateY(0)' : 'translateY(8px)',
                    transition: `all 0.25s ease ${idx * 0.08}s`,
                  }}
                >
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '8px',
                      background: color.hex,
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: `0 2px 8px ${color.hex}30`,
                      flexShrink: 0,
                      position: 'relative',
                    }}
                  >
                    {editingColorIndex === idx && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: '7px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(0,0,0,0.4)',
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#fff"
                          strokeWidth="2"
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#e0e0e0',
                        fontFamily: "'Fira Code', 'Consolas', monospace",
                        marginBottom: '4px',
                      }}
                    >
                      {color.hex}
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        color: '#666',
                        fontFamily: "'Fira Code', 'Consolas', monospace",
                      }}
                    >
                      RGB({color.rgb.r}, {color.rgb.g}, {color.rgb.b})
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        marginTop: '6px',
                      }}
                    >
                      <div
                        style={{
                          height: '3px',
                          borderRadius: '2px',
                          flex: 1,
                          background: '#2a2a2a',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${color.percentage * 100}%`,
                            background: color.hex,
                            borderRadius: '2px',
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: '9px',
                          color: '#555',
                          width: '30px',
                          textAlign: 'right',
                        }}
                      >
                        {(color.percentage * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div>
            <div
              style={{
                fontSize: '11px',
                color: '#666',
                marginBottom: '10px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>历史记录</span>
              <button
                onClick={toggleCompareMode}
                style={{
                  fontSize: '10px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  background:
                    compareMode === 'compare'
                      ? `${primaryColor}22`
                      : 'transparent',
                  color: compareMode === 'compare' ? primaryColor : '#666',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                }}
              >
                {compareMode === 'compare'
                  ? `对比中 (${compareSelection.length}/2)`
                  : '对比模式'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {history.map((entry, idx) => {
                const isSelected = compareSelection.includes(entry.id);
                return (
                  <div
                    key={entry.id}
                    onClick={() => handleRestoreHistory(entry)}
                    style={{
                      padding: '10px',
                      borderRadius: '10px',
                      background: '#1e1e1e',
                      border: isSelected
                        ? `1px solid ${primaryColor}`
                        : '1px solid #2a2a2a',
                      cursor: 'pointer',
                      transition: 'all 0.08s ease-out',
                      animation: `slideInLeft 0.2s ease-out ${idx * 0.08}s both`,
                      opacity: compareMode === 'compare' && !isSelected ? 0.7 : 1,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        gap: '4px',
                        marginBottom: '8px',
                      }}
                    >
                      {entry.colors.slice(0, 5).map((c, ci) => (
                        <div
                          key={ci}
                          style={{
                            flex: 1,
                            height: '24px',
                            background: c.hex,
                            borderRadius:
                              ci === 0
                                ? '5px 2px 2px 5px'
                                : ci === 4
                                ? '2px 5px 5px 2px'
                                : '2px',
                          }}
                        />
                      ))}
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        color: '#555',
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>
                        {new Date(entry.timestamp).toLocaleDateString('zh-CN')}
                      </span>
                      <span>
                        {new Date(entry.timestamp).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {editingColorIndex !== null && extractResult && (
        <ColorPicker
          color={extractResult.colors[editingColorIndex].hex}
          onChange={(hex) => handleColorChange(editingColorIndex, hex)}
          onClose={() => setEditingColorIndex(null)}
          anchorRef={{
            current: colorSwatchRefs.current[editingColorIndex] || null,
          }}
        />
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );

  const MainContent = (
    <div
      style={{
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#121212',
      }}
    >
      <ExportPanel theme={theme} />

      <div
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          minHeight: 0,
        }}
      >
        {compareMode === 'compare' && theme && compareTheme ? (
          <>
            <div style={{ flex: 1, minWidth: 0, borderRight: '3px solid #333' }}>
              <div
                style={{
                  padding: '8px 16px',
                  background: '#1a1a1a',
                  borderBottom: '1px solid #333',
                  fontSize: '11px',
                  color: primaryColor,
                  fontWeight: 600,
                }}
              >
                主题 A
              </div>
              <PreviewPanel variables={theme.variables} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  padding: '8px 16px',
                  background: '#1a1a1a',
                  borderBottom: '1px solid #333',
                  fontSize: '11px',
                  color: accentColor,
                  fontWeight: 600,
                }}
              >
                主题 B
              </div>
              <PreviewPanel variables={compareTheme.variables} />
            </div>
          </>
        ) : theme ? (
          <div style={{ width: '100%', height: '100%' }}>
            <PreviewPanel variables={theme.variables} />
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '16px',
              color: '#444',
              padding: '40px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '32px',
                background: 'linear-gradient(135deg, #1a1a1a, #222)',
                border: '1px solid #333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#444"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#9e9e9e',
                  marginBottom: '8px',
                }}
              >
                上传设计稿开始提取
              </div>
              <div style={{ fontSize: '13px', color: '#555', lineHeight: 1.8 }}>
                支持拖拽或点击上传 PNG / JPG 格式的设计稿截图
                <br />
                系统将自动提取主色、辅色并生成完整的 CSS 主题变量
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                marginTop: '16px',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              {[
                { label: 'K-means聚类', desc: '智能提取5色' },
                { label: '对比度计算', desc: 'WCAG标准' },
                { label: '多格式导出', desc: 'CSS/SCSS/Tailwind' },
              ].map((f) => (
                <div
                  key={f.label}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '10px',
                    background: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                  }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#9e9e9e',
                    }}
                  >
                    {f.label}
                  </div>
                  <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>
                    {f.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        background: '#121212',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
        }
        @media (min-width: 769px) {
          .mobile-toggle { display: none !important; }
          .mobile-drawer { display: none !important; }
        }
        .preview-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-3) !important;
        }
      `}</style>

      <div
        className="desktop-sidebar"
        style={{ width: '320px', flexShrink: 0, height: '100%' }}
      >
        {SidebarContent}
      </div>

      {MainContent}

      <button
        className="mobile-toggle"
        onClick={() => setSidebarOpen(true)}
        style={{
          position: 'fixed',
          top: '12px',
          left: '12px',
          zIndex: 50,
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: '#1e1e1e',
          border: '1px solid #333',
          color: '#e0e0e0',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {sidebarOpen && (
        <>
          <div
            className="mobile-drawer"
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              zIndex: 998,
            }}
          />
          <div
            className="mobile-drawer"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '300px',
              maxWidth: '85vw',
              height: '100vh',
              zIndex: 999,
              transform: 'translateX(0)',
              animation: 'slideInLeft 0.25s ease-out',
              boxShadow: '0 0 40px rgba(0,0,0,0.5)',
            }}
          >
            {SidebarContent}
          </div>
        </>
      )}
    </div>
  );
}
