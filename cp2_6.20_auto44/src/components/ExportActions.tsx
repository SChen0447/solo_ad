import { useState, type FC } from 'react';
import { createShareLink } from '../services/api';

interface ExportActionsProps {
  processedImage: string | null;
  onToast: (message: string) => void;
}

export const ExportActions: FC<ExportActionsProps> = ({ processedImage, onToast }) => {
  const [isSharing, setIsSharing] = useState(false);

  const handleSave = () => {
    if (!processedImage) return;

    const link = document.createElement('a');
    link.href = processedImage;
    link.download = `styled-image-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onToast('图片已保存');
  };

  const handleShare = async () => {
    if (!processedImage) return;

    setIsSharing(true);
    try {
      const result = await createShareLink(processedImage);
      if (result.success && result.shareUrl) {
        const fullUrl = window.location.origin + result.shareUrl;
        await navigator.clipboard.writeText(fullUrl);
        onToast('链接已复制到剪贴板，5分钟内有效');
      }
    } catch (err) {
      onToast('分享失败，请重试');
    } finally {
      setIsSharing(false);
    }
  };

  if (!processedImage) return null;

  return (
    <div className="export-actions">
      <button className="btn btn-primary export-btn" onClick={handleSave}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        保存图片
      </button>
      <button className="btn btn-success export-btn" onClick={handleShare} disabled={isSharing}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        {isSharing ? '分享中...' : '分享图片'}
      </button>
    </div>
  );
};
