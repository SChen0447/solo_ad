import React, { useState, useEffect, useRef, useCallback } from 'react';
import InputPanel from './components/InputPanel';
import PreviewPanel from './components/PreviewPanel';
import AdjustPanel from './components/AdjustPanel';
import {
  StyleInfo,
  SizeInfo,
  GeneratedImage,
  Adjustments,
  getStyles,
  getSizes,
  generateImages,
  adjustImage,
} from './services/api';

const STYLE_DEFAULTS: Record<string, { titleColor: string; bgColor: string }> = {
  minimal_white: { titleColor: '#333333', bgColor: '#FFFFFF' },
  gradient_neon: { titleColor: '#FFFFFF', bgColor: '#667EEA' },
  vintage_newspaper: { titleColor: '#2C2C2C', bgColor: '#F5EFE0' },
  dark_tech: { titleColor: '#FFFFFF', bgColor: '#0D0D0D' },
};

const App: React.FC = () => {
  const [theme, setTheme] = useState('春季促销 - 全场八折');
  const [style, setStyle] = useState('minimal_white');
  const [sizes, setSizes] = useState<string[]>(['instagram', 'twitter', 'linkedin']);
  const [styles, setStyles] = useState<StyleInfo[]>([]);
  const [sizesList, setSizesList] = useState<SizeInfo[]>([]);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [selectedImageKey, setSelectedImageKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressComplete, setProgressComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState<'input' | 'preview' | 'adjust'>('preview');

  const [adjustments, setAdjustments] = useState<Adjustments>({
    title_size: 0,
    title_color: '#333333',
    bg_color: '#FFFFFF',
    decoration_density: 1,
  });

  const progressTimerRef = useRef<number | null>(null);
  const adjustTimerRef = useRef<number | null>(null);
  const prevBlobsRef = useRef<string[]>([]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const [s, sz] = await Promise.all([getStyles(), getSizes()]);
        setStyles(s);
        setSizesList(sz);
      } catch (e) {
        setError('无法连接到后端服务，请确认后端已启动');
        console.error(e);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const defaults = STYLE_DEFAULTS[style] || STYLE_DEFAULTS.minimal_white;
    setAdjustments((prev) => ({
      ...prev,
      title_color: defaults.titleColor,
      bg_color: defaults.bgColor,
    }));
  }, [style]);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
      if (adjustTimerRef.current) window.clearTimeout(adjustTimerRef.current);
      prevBlobsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const selectedImage =
    images.find((img) => img.id === selectedImageKey) || null;

  const defaultColors =
    STYLE_DEFAULTS[style] || STYLE_DEFAULTS.minimal_white;

  const handleGenerate = async () => {
    setLoading(true);
    setProgress(0);
    setProgressComplete(false);
    setError(null);
    setSelectedImageKey(null);
    prevBlobsRef.current.forEach((u) => URL.revokeObjectURL(u));
    prevBlobsRef.current = [];

    if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    progressTimerRef.current = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 95) {
          if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
          return 95;
        }
        return p + 4;
      });
    }, 80);

    try {
      const result = await generateImages({ theme, style, sizes });
      setImages(result);
      if (result.length > 0) setSelectedImageKey(result[0].id);
      setProgress(100);
      setProgressComplete(true);
      if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
      window.setTimeout(() => {
        setLoading(false);
        setProgress(0);
        setProgressComplete(false);
      }, 600);
    } catch (e: any) {
      setError(e?.response?.data?.error || '生成图片失败，请重试');
      setLoading(false);
      if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    }
  };

  const debouncedAdjust = useCallback(
    (sizeKey: string) => {
      if (adjustTimerRef.current) window.clearTimeout(adjustTimerRef.current);
      adjustTimerRef.current = window.setTimeout(async () => {
        try {
          const url = await adjustImage({
            theme,
            style,
            size_key: sizeKey,
            adjustments,
          });
          prevBlobsRef.current.push(url);
          setImages((prev) =>
            prev.map((img) =>
              img.size_key === sizeKey ? { ...img, adjustedUrl: url } : img
            )
          );
        } catch (e) {
          console.error('adjust error', e);
        }
      }, 150);
    },
    [theme, style, adjustments]
  );

  useEffect(() => {
    if (!selectedImage) return;
    if (
      adjustments.title_size === 0 &&
      adjustments.title_color === defaultColors.titleColor &&
      adjustments.bg_color === defaultColors.bgColor &&
      adjustments.decoration_density === 1
    ) {
      setImages((prev) =>
        prev.map((img) =>
          img.id === selectedImage.id
            ? { ...img, adjustedUrl: undefined }
            : img
        )
      );
      return;
    }
    debouncedAdjust(selectedImage.size_key);
  }, [adjustments, selectedImage, debouncedAdjust, defaultColors]);

  const handleSelectImage = (key: string) => {
    setSelectedImageKey(key);
    const img = images.find((i) => i.id === key);
    if (img && !img.adjustedUrl) {
      setAdjustments({
        title_size: 0,
        title_color: defaultColors.titleColor,
        bg_color: defaultColors.bgColor,
        decoration_density: 1,
      });
    }
  };

  const mainLayout = (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        background: '#1E1E2E',
      }}
    >
      {!isMobile && (
        <>
          <div style={{ width: '30%', minWidth: '300px', background: '#252538', overflow: 'hidden' }}>
            <InputPanel
              theme={theme}
              onThemeChange={setTheme}
              style={style}
              onStyleChange={setStyle}
              sizes={sizes}
              onSizesChange={setSizes}
              onGenerate={handleGenerate}
              loading={loading}
              styles={styles}
              sizesList={sizesList}
              progress={progress}
              progressComplete={progressComplete}
            />
          </div>
          <div style={{ width: '1px', background: '#3A3A5C', flexShrink: 0 }} />
        </>
      )}

      <div style={{ flex: 1, overflow: 'hidden', minWidth: 0 }}>
        {isMobile && mobileView !== 'preview' ? (
          mobileView === 'input' ? (
            <InputPanel
              theme={theme}
              onThemeChange={setTheme}
              style={style}
              onStyleChange={setStyle}
              sizes={sizes}
              onSizesChange={setSizes}
              onGenerate={handleGenerate}
              loading={loading}
              styles={styles}
              sizesList={sizesList}
              progress={progress}
              progressComplete={progressComplete}
            />
          ) : (
            <AdjustPanel
              selectedImage={selectedImage}
              adjustments={adjustments}
              onAdjustmentsChange={setAdjustments}
              defaultColors={defaultColors}
            />
          )
        ) : (
          <PreviewPanel
            images={images}
            selectedImageKey={selectedImageKey}
            onSelectImage={handleSelectImage}
          />
        )}
      </div>

      {!isMobile && (
        <>
          <div style={{ width: '1px', background: '#3A3A5C', flexShrink: 0 }} />
          <div style={{ width: '15%', minWidth: '220px', background: '#252538', overflow: 'hidden' }}>
            <AdjustPanel
              selectedImage={selectedImage}
              adjustments={adjustments}
              onAdjustmentsChange={setAdjustments}
              defaultColors={defaultColors}
            />
          </div>
        </>
      )}
    </div>
  );

  const mobileTabs = isMobile && (
    <div
      style={{
        display: 'flex',
        background: '#2D2D44',
        borderBottom: '1px solid #3A3A5C',
        flexShrink: 0,
      }}
    >
      {(['input', 'preview', 'adjust'] as const).map((view) => (
        <button
          key={view}
          onClick={() => setMobileView(view)}
          style={{
            flex: 1,
            padding: '14px 12px',
            border: 'none',
            background: 'transparent',
            color: mobileView === view ? '#00B4D8' : '#B0B0C0',
            fontSize: '13px',
            fontWeight: mobileView === view ? 700 : 500,
            cursor: 'pointer',
            borderBottom: mobileView === view ? '2px solid #00B4D8' : '2px solid transparent',
            transition: 'all 0.2s ease',
          }}
        >
          {view === 'input' && '📝 参数'}
          {view === 'preview' && '🖼️ 预览'}
          {view === 'adjust' && '🎨 微调'}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      {mobileTabs}
      {error && (
        <div
          style={{
            position: 'fixed',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10000,
            padding: '12px 20px',
            background: 'rgba(220, 53, 69, 0.95)',
            color: '#FFFFFF',
            borderRadius: '8px',
            fontSize: '14px',
            boxShadow: '0 4px 16px rgba(220,53,69,0.4)',
            animation: 'slideIn 0.3s ease',
          }}
        >
          ⚠️ {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: '14px',
              background: 'transparent',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              fontSize: '16px',
              opacity: 0.8,
            }}
          >
            ✕
          </button>
        </div>
      )}
      {mainLayout}
    </div>
  );
};

export default App;
