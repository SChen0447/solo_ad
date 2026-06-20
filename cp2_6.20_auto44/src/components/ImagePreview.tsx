import type { FC } from 'react';

interface ImagePreviewProps {
  imageUrl: string | null;
  processedUrl: string | null;
  isProcessing: boolean;
}

export const ImagePreview: FC<ImagePreviewProps> = ({ imageUrl, processedUrl, isProcessing }) => {
  const displayUrl = processedUrl || imageUrl;

  if (!displayUrl) return null;

  return (
    <div className="image-preview">
      <div className="image-preview-wrapper">
        <img
          src={displayUrl}
          alt="Preview"
          className={`image-preview-img ${isProcessing ? 'fading' : ''}`}
        />
        {isProcessing && (
          <div className="processing-overlay">
            <div className="loading-spinner" />
            <span>处理中...</span>
          </div>
        )}
      </div>
    </div>
  );
};
