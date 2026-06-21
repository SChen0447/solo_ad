import { useEffect, useRef } from 'react';
import { ImageOff } from 'lucide-react';
import type { ImageItem, WatermarkConfig } from '../utils/watermark';
import { drawWatermarkOnCanvas } from '../utils/watermark';
import './PreviewArea.css';

interface PreviewAreaProps {
  image: ImageItem | null;
  config: WatermarkConfig;
}

export default function PreviewArea({ image, config }: PreviewAreaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!image) {
      imageRef.current = null;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      return;
    }

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      renderPreview();
    };
    img.src = image.url;

    return () => {
      imageRef.current = null;
    };
  }, [image?.url]);

  useEffect(() => {
    if (imageRef.current) {
      renderPreview();
    }
  }, [config]);

  const renderPreview = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    animationRef.current = requestAnimationFrame(() => {
      const maxWidth = canvas.parentElement?.clientWidth || 600;
      const maxHeight = 500;
      const ratio = Math.min(maxWidth / img.naturalWidth, maxHeight / img.naturalHeight, 1);
      const displayWidth = Math.round(img.naturalWidth * ratio);
      const displayHeight = Math.round(img.naturalHeight * ratio);

      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      drawWatermarkOnCanvas(canvas, img, config);
    });
  };

  return (
    <div className="preview-container">
      <div className="preview-header">
        <span className="preview-title">实时预览</span>
        {image && (
          <span className="preview-info">
            {image.width} × {image.height}
          </span>
        )}
      </div>
      <div className="preview-content">
        {image ? (
          <canvas ref={canvasRef} className="preview-canvas" />
        ) : (
          <div className="preview-empty">
            <ImageOff size={64} strokeWidth={1.2} />
            <p className="empty-text">请上传图片以预览水印效果</p>
          </div>
        )}
      </div>
    </div>
  );
}
