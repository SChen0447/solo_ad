import React, { useState, useRef, useCallback } from 'react';
import AnimationPreview, { AnimationPreviewRef } from './components/AnimationPreview';
import ControlPanel from './components/ControlPanel';
import TimelineBar from './components/TimelineBar';
import { AnimationStyle, KeyframePositions } from './utils/animationEngine';

const PREVIEW_WIDTH = 400;

const App: React.FC = () => {
  const [text, setText] = useState('Hello');
  const [animationStyle, setAnimationStyle] = useState<AnimationStyle>('typewriter');
  const [duration, setDuration] = useState(3);
  const [fontSize, setFontSize] = useState(48);
  const [color, setColor] = useState('#00d2ff');
  const [waveAmplitude, setWaveAmplitude] = useState(14);
  const [isPlaying, setIsPlaying] = useState(true);
  const [keyframes, setKeyframes] = useState<KeyframePositions>({
    k0: 0,
    k25: 25,
    k50: 50,
    k100: 100,
  });
  const [isExportingGIF, setIsExportingGIF] = useState(false);
  const [isExportingMP4, setIsExportingMP4] = useState(false);

  const previewRef = useRef<AnimationPreviewRef>(null);

  const handleExportGIF = useCallback(async () => {
    if (!previewRef.current) return;
    setIsExportingGIF(true);
    try {
      await previewRef.current.exportGIF();
    } catch (err) {
      console.error('GIF export failed:', err);
      alert('GIF导出失败，请重试');
    } finally {
      setIsExportingGIF(false);
    }
  }, []);

  const handleExportMP4 = useCallback(async () => {
    if (!previewRef.current) return;
    setIsExportingMP4(true);
    try {
      await previewRef.current.exportMP4();
    } catch (err) {
      console.error('MP4 export failed:', err);
      alert('MP4导出失败，请检查浏览器是否支持MediaRecorder');
    } finally {
      setIsExportingMP4(false);
    }
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* 标题区域 */}
      <header
        style={{
          textAlign: 'center',
          marginBottom: '28px',
        }}
      >
        <h1
          style={{
            fontSize: '26px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #00d2ff 0%, #a29bfe 50%, #fd79a8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '6px',
            letterSpacing: '0.5px',
          }}
        >
          ✨ SVG Logo 动画编辑器
        </h1>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            letterSpacing: '0.3px',
          }}
        >
          输入品牌名称 · 选择动画风格 · 实时预览 · 一键导出
        </p>
      </header>

      {/* 主体区域 - 响应式布局 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row' as const,
          gap: '28px',
          width: '100%',
          maxWidth: '1200px',
          alignItems: 'flex-start',
          justifyContent: 'center',
          flexWrap: 'wrap' as const,
        }}
      >
        {/* 左侧预览区域 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            flex: '0 0 auto',
            minWidth: PREVIEW_WIDTH + 40,
          }}
        >
          <div
            style={{
              padding: '20px',
              background: 'rgba(22, 33, 62, 0.6)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <AnimationPreview
              ref={previewRef}
              text={text}
              animationStyle={animationStyle}
              duration={duration}
              fontSize={fontSize}
              color={color}
              waveAmplitude={waveAmplitude}
              keyframes={keyframes}
              isPlaying={isPlaying}
            />

            {/* 时间轴 */}
            <div style={{ marginTop: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px',
                  padding: '0 2px',
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    fontWeight: 500,
                  }}
                >
                  关键帧时间轴
                </span>
                <span style={{ fontSize: '11px', color: '#6a6a8a' }}>
                  拖动蓝色圆点调整节奏
                </span>
              </div>
              <TimelineBar
                keyframes={keyframes}
                onChange={setKeyframes}
                width={PREVIEW_WIDTH}
              />
            </div>
          </div>

          {/* 底部信息卡片 */}
          <div
            style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: 'rgba(0, 210, 255, 0.06)',
              border: '1px solid rgba(0, 210, 255, 0.15)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              maxWidth: PREVIEW_WIDTH + 40,
            }}
          >
            <span style={{ fontSize: '20px' }}>💡</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '12px', color: '#00d2ff', fontWeight: 600 }}>
                小提示
              </div>
              <div style={{ fontSize: '11px', color: '#8a8aaa', marginTop: '2px' }}>
                拖动时间轴上的50%标记到70%，可以让前半段动画更有层次感
              </div>
            </div>
          </div>
        </div>

        {/* 右侧控制面板 */}
        <div
          style={{
            flex: '0 0 320px',
            maxWidth: '320px',
            minWidth: '280px',
            maxHeight: 'calc(100vh - 160px)',
            width: '100%',
          }}
        >
          <ControlPanel
            text={text}
            onTextChange={setText}
            animationStyle={animationStyle}
            onAnimationStyleChange={setAnimationStyle}
            duration={duration}
            onDurationChange={setDuration}
            fontSize={fontSize}
            onFontSizeChange={setFontSize}
            color={color}
            onColorChange={setColor}
            waveAmplitude={waveAmplitude}
            onWaveAmplitudeChange={setWaveAmplitude}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            onExportGIF={handleExportGIF}
            onExportMP4={handleExportMP4}
            isExportingGIF={isExportingGIF}
            isExportingMP4={isExportingMP4}
          />
        </div>
      </div>

      {/* 响应式断点样式 */}
      <style>{`
        @media (max-width: 768px) {
          header h1 { font-size: 20px !important; }
          header p { font-size: 12px !important; }
        }
      `}</style>
    </div>
  );
};

export default App;
