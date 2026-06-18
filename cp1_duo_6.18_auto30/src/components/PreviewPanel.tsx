import { Download, Save } from 'lucide-react';
import { useThemeStore, ColorScheme } from '@/stores/themeStore';
import { getContrastColor } from '@/utils/colorUtils';

interface PreviewCardProps {
  scheme: ColorScheme;
  showUIElements?: boolean;
}

function PreviewCard({ scheme, showUIElements = false }: PreviewCardProps) {
  const textColor = scheme.text || getContrastColor(scheme.background);

  const renderSampleText = () => (
    <div className="space-y-3">
      <h4
        className="text-xl font-bold"
        style={{ color: scheme.primary }}
      >
        标题文本 (Bold 20px)
      </h4>
      <p className="text-base font-semibold" style={{ color: textColor }}>
        这是一段示例文本，使用当前配色方案的文本颜色。字体粗细为600，字号16px。
      </p>
      <p className="text-sm font-medium" style={{ color: textColor, opacity: 0.8 }}>
        这是中等粗细的文本，字体粗细500，字号14px，透明度80%。
      </p>
      <p className="text-sm font-normal" style={{ color: textColor, opacity: 0.7 }}>
        这是常规粗细的文本，字体粗细400，字号14px，透明度70%。
      </p>
      <p className="text-xs font-light" style={{ color: textColor, opacity: 0.6 }}>
        这是细体文本，字体粗细300，字号12px，透明度60%。
      </p>
      <p className="text-sm" style={{ color: scheme.secondary }}>
        这是使用辅色的强调文本，用于突出显示重要信息。
      </p>
    </div>
  );

  const renderUIElements = () => (
    <div className="space-y-6 mt-6 pt-6 border-t border-gray-200">
      <div>
        <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          按钮样式
        </h5>
        <div className="flex flex-wrap gap-3">
          <button
            className="px-5 py-2.5 rounded-full text-white text-sm font-medium btn-bounce btn-hover"
            style={{ backgroundColor: scheme.primary }}
          >
            圆形按钮
          </button>
          <button
            className="px-5 py-2.5 rounded-lg text-white text-sm font-medium btn-bounce btn-hover"
            style={{ backgroundColor: scheme.primary }}
          >
            填充按钮
          </button>
          <button
            className="px-5 py-2.5 rounded-lg text-sm font-medium border-2 bg-transparent btn-bounce btn-hover"
            style={{
              borderColor: scheme.primary,
              color: scheme.primary,
            }}
          >
            轮廓按钮
          </button>
          <button
            className="w-10 h-10 rounded-full text-white flex items-center justify-center btn-bounce btn-hover"
            style={{ backgroundColor: scheme.secondary }}
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      <div>
        <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          输入框
        </h5>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="默认状态"
            className="px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none transition-all"
            style={{
              '--tw-ring-color': scheme.primary,
            } as React.CSSProperties}
          />
          <input
            type="text"
            placeholder="聚焦状态"
            className="px-4 py-2.5 rounded-xl border-2 text-sm focus:outline-none"
            style={{ borderColor: scheme.primary }}
            autoFocus
          />
        </div>
      </div>

      <div>
        <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          进度条
        </h5>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: '30%',
                  backgroundColor: scheme.primary,
                }}
              />
            </div>
            <span className="text-xs font-medium text-gray-500 w-10 text-right">
              30%
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: '60%',
                  backgroundColor: scheme.secondary,
                }}
              />
            </div>
            <span className="text-xs font-medium text-gray-500 w-10 text-right">
              60%
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: '85%',
                  background: `linear-gradient(90deg, ${scheme.primary}, ${scheme.secondary})`,
                }}
              />
            </div>
            <span className="text-xs font-medium text-gray-500 w-10 text-right">
              85%
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="rounded-2xl shadow-lg overflow-hidden transition-all duration-300"
      style={{ backgroundColor: scheme.background }}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold" style={{ color: textColor }}>
            {scheme.name}
          </h3>
          <div className="flex gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: scheme.primary }}
              title="主色"
            />
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: scheme.secondary }}
              title="辅色"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="text-center">
            <div
              className="h-16 rounded-xl mb-2 shadow-inner"
              style={{ backgroundColor: scheme.primary }}
            />
            <span className="text-xs font-mono" style={{ color: textColor, opacity: 0.7 }}>
              主色 {scheme.primary}
            </span>
          </div>
          <div className="text-center">
            <div
              className="h-16 rounded-xl mb-2 shadow-inner"
              style={{ backgroundColor: scheme.secondary }}
            />
            <span className="text-xs font-mono" style={{ color: textColor, opacity: 0.7 }}>
              辅色 {scheme.secondary}
            </span>
          </div>
          <div className="text-center">
            <div
              className="h-16 rounded-xl mb-2 shadow-inner border border-gray-200"
              style={{ backgroundColor: scheme.background }}
            />
            <span className="text-xs font-mono" style={{ color: textColor, opacity: 0.7 }}>
              背景 {scheme.background}
            </span>
          </div>
        </div>

        <div className="mb-6">
          <div
            className="h-8 rounded-xl mb-2"
            style={{
              background: `linear-gradient(90deg, ${scheme.primary}, ${scheme.secondary})`,
            }}
          />
          <div
            className="h-8 rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${scheme.primary} 0%, ${scheme.secondary} 50%, ${scheme.background} 100%)`,
            }}
          />
        </div>

        {renderSampleText()}
        {showUIElements && renderUIElements()}
      </div>
    </div>
  );
}

export function PreviewPanel() {
  const {
    currentScheme,
    isCompareMode,
    selectedForCompare,
    schemes,
    tempColors,
    currentScheme: storedScheme,
    applyTempColorsToScheme,
    setShowExportModal,
    addScheme,
  } = useThemeStore();

  const compareSchemes = selectedForCompare
    .map((id) => schemes.find((s) => s.id === id))
    .filter(Boolean) as ColorScheme[];

  const previewScheme: ColorScheme = storedScheme || {
    id: 'temp',
    name: '预览方案',
    primary: tempColors.primary,
    secondary: tempColors.secondary,
    background: tempColors.background,
    text: getContrastColor(tempColors.background),
    createdAt: Date.now(),
  };

  const handleSaveToCurrent = () => {
    if (storedScheme) {
      applyTempColorsToScheme(storedScheme.id);
    } else {
      addScheme({
        name: `方案 ${schemes.length + 1}`,
        primary: tempColors.primary,
        secondary: tempColors.secondary,
        background: tempColors.background,
      });
    }
  };

  const handleExport = () => {
    if (storedScheme) {
      setShowExportModal(true, storedScheme.id);
    }
  };

  if (isCompareMode && compareSchemes.length === 2) {
    return (
      <div className="h-full overflow-y-auto p-6 custom-scrollbar">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-2">方案对比</h2>
          <p className="text-sm text-gray-500">
            左右对比两个配色方案的实际渲染效果
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="text-center mb-4">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                方案 A
              </span>
            </div>
            <PreviewCard scheme={compareSchemes[0]} showUIElements />
          </div>
          <div>
            <div className="text-center mb-4">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-600">
                方案 B
              </span>
            </div>
            <PreviewCard scheme={compareSchemes[1]} showUIElements />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 custom-scrollbar">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">实时预览</h2>
          <p className="text-sm text-gray-500">
            调整颜色参数，实时查看预览效果
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSaveToCurrent}
            className="px-4 py-2 rounded-xl text-white text-sm font-medium flex items-center gap-2 btn-bounce btn-hover"
            style={{ backgroundColor: tempColors.primary }}
          >
            <Save size={16} />
            {storedScheme ? '更新方案' : '保存方案'}
          </button>
          {storedScheme && (
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-xl border-2 text-sm font-medium flex items-center gap-2 btn-bounce btn-hover"
              style={{
                borderColor: tempColors.primary,
                color: tempColors.primary,
              }}
            >
              <Download size={16} />
              导出CSS
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        <PreviewCard scheme={previewScheme} showUIElements />
      </div>
    </div>
  );
}
