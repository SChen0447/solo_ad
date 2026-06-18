import { useState, useEffect } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';

export function ExportModal() {
  const {
    showExportModal,
    exportSchemeId,
    schemes,
    exportCSS,
    copyToClipboard,
    setShowExportModal,
    tempColors,
  } = useThemeStore();

  const [copied, setCopied] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const scheme = schemes.find((s) => s.id === exportSchemeId);
  const cssContent = scheme
    ? exportCSS(scheme)
    : `:root {
  --primary: ${tempColors.primary};
  --secondary: ${tempColors.secondary};
  --background: ${tempColors.background};
}`;

  useEffect(() => {
    if (showExportModal) {
      setIsVisible(true);
      setCopied(false);
    }
  }, [showExportModal]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      setShowExportModal(false);
    }, 200);
  };

  const handleCopy = async () => {
    const success = await copyToClipboard(cssContent);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showExportModal) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showExportModal]);

  if (!showExportModal) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden ${
          isVisible ? 'modal-enter' : ''
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-800">导出CSS变量</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {scheme ? scheme.name : '当前配色方案'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          <div className="relative">
            <pre className="bg-gray-900 text-gray-100 p-5 rounded-xl text-sm font-mono overflow-x-auto leading-relaxed">
              <code>{cssContent}</code>
            </pre>
            <button
              onClick={handleCopy}
              className={`absolute top-3 right-3 p-2 rounded-lg transition-all duration-200 ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>

          {copied && (
            <div className="mt-3 text-center text-sm text-green-600 font-medium">
              ✓ 已复制到剪贴板
            </div>
          )}

          <div className="mt-5 p-4 bg-blue-50 rounded-xl">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">
              使用说明
            </h4>
            <ol className="text-xs text-blue-700 space-y-1.5 list-decimal list-inside">
              <li>复制上方的CSS变量代码</li>
              <li>粘贴到您项目的全局CSS文件中</li>
              <li>在组件中使用 <code className="bg-blue-100 px-1 rounded">var(--primary)</code> 引用颜色</li>
              <li>所有颜色会自动跟随主题更新</li>
            </ol>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-gray-100 bg-gray-50">
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors btn-bounce"
          >
            关闭
          </button>
          <button
            onClick={handleCopy}
            className="flex-1 py-2.5 px-4 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 btn-bounce btn-hover"
            style={{
              backgroundColor: scheme ? scheme.primary : tempColors.primary,
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? '已复制' : '复制代码'}
          </button>
        </div>
      </div>
    </div>
  );
}
