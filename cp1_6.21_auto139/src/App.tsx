import React, { useState, useCallback, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import ControlPanel, { type TypographyParams } from './ControlPanel';
import TypographyPreview from './TypographyPreview';
import { useFontLoader } from './useFontLoader';

const DEFAULT_TEXT = `Typography is the art and technique of arranging type to make written language legible, readable and appealing when displayed. The arrangement of type involves selecting typefaces, point sizes, line lengths, line-spacing, and letter-spacing, and adjusting the space between pairs of letters.

排印是一种安排字体的艺术与技术，使书写语言在展示时具有可读性、易读性与吸引力。字体的安排涉及选择字体、字号、行宽、行间距、字间距，以及调整字母对之间的间距。

Type design is closely related to typography, and most type designers are considered typographers as well. The term typography is also applied to the style, arrangement, and appearance of the letters, numbers, and symbols created by the process.

字体设计与排印密切相关，大多数字体设计师也被认为是排印师。排印一词也适用于由该过程创建的字母、数字和符号的风格、排列和外观。

现代排印涵盖了广泛的应用场景，从书籍、杂志、报纸的传统出版，到网页设计、用户界面和数字产品的屏幕显示。优秀的排印不仅能提升内容的传达效率，还能营造独特的视觉氛围和情感体验。`;

const DEFAULT_PARAMS_A: TypographyParams = {
  font: "'Noto Sans SC', sans-serif",
  fontSize: 16,
  lineHeight: 1.6,
  letterSpacing: 0,
  color: '#212529',
  backgroundColor: '#ffffff',
};

const DEFAULT_PARAMS_B: TypographyParams = {
  font: "'Playfair Display', serif",
  fontSize: 16,
  lineHeight: 1.8,
  letterSpacing: 0.02,
  color: '#343a40',
  backgroundColor: '#fffbf5',
};

const App: React.FC = () => {
  const { fonts, loading, error, addLocalFont } = useFontLoader();
  const [text, setText] = useState(DEFAULT_TEXT);
  const [paramsA, setParamsA] = useState<TypographyParams>(DEFAULT_PARAMS_A);
  const [paramsB, setParamsB] = useState<TypographyParams>(DEFAULT_PARAMS_B);
  const [lockB, setLockB] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [exporting, setExporting] = useState(false);

  const previewRefA = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(50);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleParamsAChange = useCallback((newParams: TypographyParams) => {
    setParamsA(newParams);
    if (!lockB) {
      setParamsB(newParams);
    }
  }, [lockB]);

  const handleParamsBChange = useCallback((newParams: TypographyParams) => {
    setParamsB(newParams);
  }, []);

  const handleToggleLock = useCallback(() => {
    setLockB((prev) => !prev);
  }, []);

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    dragStartX.current = clientX;
    dragStartWidth.current = leftPanelWidth;
  }, [leftPanelWidth]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const delta = clientX - dragStartX.current;
      const deltaPercent = (delta / rect.width) * 100;
      const newWidth = Math.min(85, Math.max(15, dragStartWidth.current + deltaPercent));
      setLeftPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  const handleExportScreenshot = useCallback(async () => {
    if (!previewRefA.current || exporting) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(previewRefA.current, {
        backgroundColor: paramsA.backgroundColor,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `typography-preview-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('导出失败:', err);
      alert('导出截图失败，请重试');
    } finally {
      setExporting(false);
    }
  }, [paramsA.backgroundColor, exporting]);

  const panelContent = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      height: '100%',
      overflowY: 'auto',
      paddingRight: '4px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 4px',
      }}>
        <div>
          <h1 style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#212529',
            margin: 0,
            letterSpacing: '-0.3px',
          }}>
            Typography Preview
          </h1>
          <p style={{
            fontSize: '12px',
            color: '#868e96',
            margin: '4px 0 0 0',
          }}>
            字体排印预览与对比工具
          </p>
        </div>
        <button
          onClick={handleExportScreenshot}
          disabled={exporting}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 500,
            border: 'none',
            borderRadius: '6px',
            backgroundColor: exporting ? '#ced4da' : '#212529',
            color: 'white',
            cursor: exporting ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
        >
          <span>{exporting ? '⏳' : '📸'}</span>
          <span>{exporting ? '导出中...' : '导出截图'}</span>
        </button>
      </div>

      <div>
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 500,
          color: '#495057',
          marginBottom: '6px',
        }}>
          预览文本（支持多行）
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="在此输入或粘贴文本内容..."
          style={{
            width: '100%',
            height: '120px',
            padding: '10px 12px',
            fontSize: '13px',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            backgroundColor: '#fafbfc',
            color: '#212529',
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#868e96';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(134, 142, 150, 0.1)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#dee2e6';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      </div>

      <ControlPanel
        title="左侧面板 - 参数设置"
        params={paramsA}
        onChange={handleParamsAChange}
        fonts={fonts}
        loading={loading}
        addLocalFont={addLocalFont}
      />

      <ControlPanel
        title="右侧面板 - 对比设置"
        params={paramsB}
        onChange={handleParamsBChange}
        fonts={fonts}
        loading={loading}
        addLocalFont={addLocalFont}
        showFontUpload={false}
        locked={lockB}
        onToggleLock={handleToggleLock}
      />

      {error && (
        <div style={{
          padding: '10px 12px',
          backgroundColor: '#fff5f5',
          border: '1px solid #ffa8a8',
          borderRadius: '6px',
          color: '#c92a2a',
          fontSize: '12px',
        }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{
        marginTop: 'auto',
        padding: '8px 4px',
        fontSize: '11px',
        color: '#adb5bd',
        textAlign: 'center',
        borderTop: '1px solid #f1f3f5',
      }}>
        提示：拖动中间分隔线可调整面板宽度比例
      </div>
    </div>
  );

  return (
    <div style={{
      display: 'flex',
      width: '100%',
      height: '100%',
      backgroundColor: '#f8f9fa',
      borderRadius: '12px',
      border: '1px solid #dee2e6',
      boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
      overflow: 'hidden',
      transition: 'all 0.2s ease',
    }}>
      {!isMobile && (
        <div style={{
          width: '320px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #dee2e6',
          backgroundColor: 'white',
          padding: '16px',
          transition: 'all 0.2s ease',
        }}>
          {panelContent}
        </div>
      )}

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}>
        {isMobile && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: 'white',
            borderBottom: '1px solid #dee2e6',
            flexShrink: 0,
          }}>
            <h1 style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#212529',
              margin: 0,
            }}>
              Typography Preview
            </h1>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleExportScreenshot}
                disabled={exporting}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: exporting ? '#ced4da' : '#212529',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                {exporting ? '导出中...' : '📸 导出'}
              </button>
              <button
                onClick={() => setShowMobilePanel(!showMobilePanel)}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  color: '#495057',
                  cursor: 'pointer',
                }}
              >
                {showMobilePanel ? '收起' : '设置'} ⚙️
              </button>
            </div>
          </div>
        )}

        {isMobile && showMobilePanel && (
          <div style={{
            maxHeight: '50vh',
            overflowY: 'auto',
            borderBottom: '1px solid #dee2e6',
            padding: '12px',
            backgroundColor: 'white',
            transition: 'all 0.2s ease',
          }}>
            {panelContent}
          </div>
        )}

        <div
          ref={containerRef}
          style={{
            flex: 1,
            display: 'flex',
            position: 'relative',
            minHeight: 0,
            userSelect: isDragging ? 'none' : 'auto',
          }}
        >
          <div style={{
            width: `${leftPanelWidth}%`,
            height: '100%',
            borderRight: '1px solid #dee2e6',
            transition: isDragging ? 'none' : 'width 0.2s ease',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <TypographyPreview
              ref={previewRefA}
              text={text}
              params={paramsA}
              label="当前设置"
            />
          </div>

          <div
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            style={{
              width: isDragging ? '2px' : '6px',
              cursor: 'col-resize',
              flexShrink: 0,
              position: 'relative',
              zIndex: 100,
              backgroundColor: isDragging ? 'rgba(25, 113, 194, 0.4)' : 'transparent',
              transition: isDragging ? 'none' : 'background-color 0.2s ease',
              margin: '0 -3px',
            }}
          >
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '24px',
              height: '40px',
              borderRadius: '4px',
              backgroundColor: isDragging ? '#1971c2' : 'rgba(255,255,255,0.9)',
              border: isDragging ? 'none' : '1px solid #dee2e6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              boxShadow: isDragging ? '0 2px 8px rgba(25,113,194,0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
              transition: isDragging ? 'none' : 'all 0.2s ease',
            }}>
              <div style={{
                width: '2px',
                height: '16px',
                borderRadius: '1px',
                backgroundColor: isDragging ? 'white' : '#adb5bd',
              }} />
              <div style={{
                width: '2px',
                height: '16px',
                borderRadius: '1px',
                backgroundColor: isDragging ? 'white' : '#adb5bd',
              }} />
            </div>
          </div>

          <div style={{
            flex: 1,
            height: '100%',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <TypographyPreview
              text={text}
              params={paramsB}
              label={lockB ? '对比设置 🔒' : '对比设置'}
            />
          </div>

          {isDragging && (
            <div style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${leftPanelWidth}%`,
              width: '2px',
              backgroundColor: 'rgba(25, 113, 194, 0.5)',
              pointerEvents: 'none',
              zIndex: 200,
              transform: 'translateX(-1px)',
            }} />
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(App);
