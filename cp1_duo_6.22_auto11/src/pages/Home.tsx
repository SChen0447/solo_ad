import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { Download, AlignLeft, AlignCenter, AlignRight, Palette, Loader2 } from 'lucide-react';
import ImageEditor from '@/components/ImageEditor';
import SubtitleOverlay from '@/components/SubtitleOverlay';
import TemplateSelector from '@/components/TemplateSelector';
import HistoryPanel from '@/components/HistoryPanel';
import RippleButton from '@/components/RippleButton';
import { useAppStore } from '@/store';
import { exportCard } from '@/utils/cardExporter';
import { MOVIE_COLORS, FONT_OPTIONS } from '@/types';

const MIN_FONT_SIZE = 16;
const MAX_FONT_SIZE = 40;
const MAX_WORDS = 60;

const Home = () => {
  const subtitleText = useAppStore((s) => s.subtitleText);
  const subtitleStyle = useAppStore((s) => s.subtitleStyle);
  const setSubtitleText = useAppStore((s) => s.setSubtitleText);
  const setSubtitleStyle = useAppStore((s) => s.setSubtitleStyle);
  const croppedImageUrl = useAppStore((s) => s.croppedImageUrl);
  const activeTemplate = useAppStore((s) => s.activeTemplate);
  const exportFormat = useAppStore((s) => s.exportFormat);
  const setExportFormat = useAppStore((s) => s.setExportFormat);
  const isExporting = useAppStore((s) => s.isExporting);
  const setIsExporting = useAppStore((s) => s.setIsExporting);

  const previewRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [styleAnimKey, setStyleAnimKey] = useState(0);

  useEffect(() => {
    setStyleAnimKey((k) => k + 1);
  }, [activeTemplate]);

  const handleGenerate = useCallback(async () => {
    if (!croppedImageUrl) {
      setExportError('请先上传并裁切图片');
      return;
    }
    if (!subtitleText.trim()) {
      setExportError('请输入字幕文本');
      return;
    }

    setExportError(null);
    setIsExporting(true);

    try {
      await exportCard(
        croppedImageUrl,
        subtitleText,
        subtitleStyle,
        activeTemplate,
        exportFormat
      );
    } catch (error) {
      console.error('Export failed:', error);
      setExportError('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  }, [
    croppedImageUrl,
    subtitleText,
    subtitleStyle,
    activeTemplate,
    exportFormat,
    setIsExporting,
  ]);

  const wordCount = useMemo(() => {
    const cn = (subtitleText.match(/[\u4e00-\u9fa5]/g) || []).length;
    const enWords = subtitleText
      .split(/\s+/)
      .filter((w) => w.length > 0 && /[a-zA-Z]/.test(w));
    return cn + enWords.length;
  }, [subtitleText]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cnCount = (value.match(/[\u4e00-\u9fa5]/g) || []).length;
    const enCount = value
      .split(/\s+/)
      .filter((w) => w.length > 0 && /[a-zA-Z]/.test(w)).length;

    if (cnCount + enCount > MAX_WORDS) {
      return;
    }
    setSubtitleText(value);
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const size = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, Number(e.target.value)));
    setSubtitleStyle({ fontSize: size });
  };

  const shadowOptions = [
    { value: 'none' as const, label: '无' },
    { value: 'light' as const, label: '轻' },
    { value: 'medium' as const, label: '中' },
    { value: 'heavy' as const, label: '重' },
  ] as const;

  return (
    <div className="min-h-screen bg-cinema-bg text-cinema-text">
      <header className="border-b border-cinema-border bg-cinema-surface/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-4">
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-cinema-primary to-cinema-secondary bg-clip-text text-transparent">
            电影台词卡片生成器
          </h1>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 md:px-6 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-2/5 space-y-6 order-2 md:order-1">
            <div className="bg-cinema-card rounded-xl p-5 panel-inset border border-cinema-border space-y-6">
              <ImageEditor />
            </div>

            <div className="bg-cinema-card rounded-xl p-5 panel-inset border border-cinema-border space-y-6">
              <TemplateSelector />
            </div>

            <div
              key={styleAnimKey}
              className="bg-cinema-card rounded-xl p-5 panel-inset border border-cinema-border space-y-5 animate-fade-in"
            >
              <div className="space-y-3">
                <h3 className="text-cinema-text text-sm font-medium">字幕文本</h3>
                <textarea
                  value={subtitleText}
                  onChange={handleTextChange}
                  placeholder="输入电影台词，最多60个汉字或单词..."
                  className="w-full h-24 bg-cinema-surface border border-cinema-border rounded-lg p-3
                    text-cinema-text placeholder:text-cinema-muted/50 resize-none
                    focus:outline-none focus:border-cinema-primary focus:ring-1 focus:ring-cinema-primary
                    transition-colors duration-200"
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-cinema-muted">
                    支持换行，多行显示
                  </span>
                  <span className={`text-xs ${wordCount >= MAX_WORDS ? 'text-cinema-primary' : 'text-cinema-muted'}`}>
                    {wordCount} / {MAX_WORDS}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs text-cinema-muted font-medium">字体</label>
                  <select
                    value={subtitleStyle.fontFamily}
                    onChange={(e) => setSubtitleStyle({ fontFamily: e.target.value })}
                    className="w-full bg-cinema-surface border border-cinema-border rounded-lg px-3 py-2
                      text-cinema-text text-sm focus:outline-none focus:border-cinema-primary
                      transition-colors"
                  >
                    {FONT_OPTIONS.map((font) => (
                      <option key={font.value} value={font.value}>
                        {font.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-cinema-muted font-medium">字号</label>
                  <select
                    value={subtitleStyle.fontSize}
                    onChange={handleFontSizeChange}
                    className="w-full bg-cinema-surface border border-cinema-border rounded-lg px-3 py-2
                      text-cinema-text text-sm focus:outline-none focus:border-cinema-primary
                      transition-colors"
                  >
                    {Array.from(
                      { length: (MAX_FONT_SIZE - MIN_FONT_SIZE) / 2 + 1 },
                      (_, i) => MIN_FONT_SIZE + i * 2
                    ).map((size) => (
                      <option key={size} value={size}>
                        {size}px
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-cinema-muted font-medium flex items-center gap-1.5">
                  <Palette size={14} />
                  颜色预设（20种电影经典配色）
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="w-full bg-cinema-surface border border-cinema-border rounded-lg px-3 py-2
                      text-cinema-text text-sm flex items-center justify-between
                      hover:border-cinema-primary transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="w-5 h-5 rounded-full border-2 border-cinema-border"
                        style={{ backgroundColor: subtitleStyle.fontColor }}
                      />
                      {MOVIE_COLORS.find((c) => c.value === subtitleStyle.fontColor)?.name || '自定义'}
                    </span>
                    <span className="text-cinema-muted text-xs">{showColorPicker ? '收起' : '展开'}</span>
                  </button>
                  {showColorPicker && (
                    <div className="absolute z-20 mt-2 w-full bg-cinema-surface border border-cinema-border rounded-lg p-3 grid grid-cols-5 gap-2 shadow-xl animate-fade-in">
                      {MOVIE_COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => {
                            setSubtitleStyle({ fontColor: color.value });
                            setShowColorPicker(false);
                          }}
                          className={`w-full aspect-square rounded-lg border-2 transition-all hover:scale-110 ${
                            subtitleStyle.fontColor === color.value
                              ? 'border-cinema-primary ring-2 ring-cinema-primary/30'
                              : 'border-cinema-border'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs text-cinema-muted font-medium">阴影</label>
                  <div className="grid grid-cols-4 gap-1">
                    {shadowOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setSubtitleStyle({ shadowLevel: opt.value })}
                        className={`py-1.5 rounded text-xs font-medium transition-all duration-200 ${
                          subtitleStyle.shadowLevel === opt.value
                            ? 'bg-cinema-primary text-white'
                            : 'bg-cinema-surface text-cinema-muted hover:bg-cinema-border/50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-cinema-muted font-medium">对齐</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { value: 'left' as const, icon: AlignLeft },
                      { value: 'center' as const, icon: AlignCenter },
                      { value: 'right' as const, icon: AlignRight },
                    ].map(({ value, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setSubtitleStyle({ textAlign: value })}
                        className={`py-1.5 rounded flex items-center justify-center transition-all duration-200 ${
                          subtitleStyle.textAlign === value
                            ? 'bg-cinema-primary text-white'
                            : 'bg-cinema-surface text-cinema-muted hover:bg-cinema-border/50'
                        }`}
                      >
                        <Icon size={16} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-cinema-border">
                <div className="space-y-2">
                  <label className="text-xs text-cinema-muted font-medium">导出格式</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['png', 'jpg'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setExportFormat(fmt)}
                        className={`py-2 rounded-lg text-sm font-medium uppercase transition-all duration-200 ${
                          exportFormat === fmt
                            ? 'bg-cinema-primary text-white'
                            : 'bg-cinema-surface text-cinema-muted hover:bg-cinema-border/50 border border-cinema-border'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                {exportError && (
                  <div className="text-red-400 text-sm px-2 py-1 bg-red-500/10 rounded">
                    {exportError}
                  </div>
                )}

                <RippleButton
                  onClick={handleGenerate}
                  disabled={!croppedImageUrl || !subtitleText.trim() || isExporting}
                  size="lg"
                  className="w-full gap-2"
                >
                  {isExporting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      生成卡片
                    </>
                  )}
                </RippleButton>
              </div>
            </div>
          </div>

          <div className="w-full md:w-3/5 space-y-6 order-1 md:order-2">
            <div className="bg-cinema-card rounded-xl p-5 panel-inset border border-cinema-border">
              <h3 className="text-cinema-text text-sm font-medium mb-3">实时预览</h3>
              <div className="aspect-video w-full overflow-hidden rounded-lg bg-cinema-surface">
                <SubtitleOverlay ref={previewRef} />
              </div>
            </div>

            <div className="bg-cinema-card rounded-xl p-5 panel-inset border border-cinema-border">
              <h3 className="text-cinema-text text-sm font-medium mb-3">历史记录</h3>
              <HistoryPanel />
            </div>
          </div>
        </div>
      </main>

      {showColorPicker && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowColorPicker(false)}
        />
      )}
    </div>
  );
};

export default Home;
