import { useState, useEffect } from 'react';
import { X, Download, Loader2 } from 'lucide-react';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  previewUrl: string;
  isExporting: boolean;
  downloadUrl: string | null;
}

export function ExportDialog({
  isOpen,
  onClose,
  onConfirm,
  previewUrl,
  isExporting,
  downloadUrl,
}: ExportDialogProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (downloadUrl && !isExporting) {
      setShowSuccess(true);
    }
  }, [downloadUrl, isExporting]);

  useEffect(() => {
    if (!isOpen) {
      setShowSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `poster_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            {showSuccess ? '导出成功' : '导出海报'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {showSuccess ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <Download size={32} className="text-green-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-800 mb-2">
                海报已生成！
              </h4>
              <p className="text-gray-500 mb-6">
                高清 PNG 图片已准备好下载
              </p>
              <button
                onClick={handleDownload}
                className="w-full py-3 px-6 bg-[#4a90d9] hover:bg-[#3a7bc8] text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download size={20} />
                下载图片
              </button>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  确认导出以下海报为高清 PNG 图片（300 DPI）：
                </p>
                <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="预览"
                      className="w-full h-auto"
                      style={{ maxHeight: '300px', objectFit: 'contain' }}
                    />
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isExporting}
                  className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isExporting}
                  className="flex-1 py-3 px-4 bg-[#4a90d9] hover:bg-[#3a7bc8] text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isExporting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      导出中...
                    </>
                  ) : (
                    <>
                      <Download size={20} />
                      确认导出
                    </>
                  )}
                </button>
              </div>

              {isExporting && (
                <p className="text-xs text-gray-500 text-center mt-3">
                  正在生成高清图片，请稍候...
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
