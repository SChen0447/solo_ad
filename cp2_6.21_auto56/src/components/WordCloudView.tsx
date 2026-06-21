import { useEffect, useRef } from 'react';
import type { WordCloudData } from '../api/timeline';

interface WordCloudViewProps {
  cloudData: WordCloudData | null;
  isLoading: boolean;
  showSuccess: boolean;
}

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;

export default function WordCloudView({ cloudData, isLoading, showSuccess }: WordCloudViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!cloudData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#1E1B4B');
    gradient.addColorStop(1, '#312E81');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 8;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);

    cloudData.words.forEach(word => {
      ctx.save();
      ctx.font = `bold ${word.fontSize}px -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif`;
      ctx.fillStyle = word.color;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 4;
      ctx.fillText(word.text, word.x, word.y);
      ctx.restore();
    });
  }, [cloudData]);

  return (
    <div className="word-cloud-view">
      <h2 className="word-cloud-title">词云预览</h2>

      <div className="cloud-container">
        {cloudData ? (
          <canvas
            ref={canvasRef}
            className="cloud-canvas"
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <div className="cloud-placeholder">
            <div className="cloud-placeholder-icon">☁️</div>
            <div className="cloud-placeholder-text">输入文字后点击生成按钮查看词云</div>
          </div>
        )}

        {(isLoading || showSuccess) && (
          <div className="loading-overlay">
            {isLoading && <div className="spinner" />}
            {showSuccess && !isLoading && <div className="success-pulse" />}
          </div>
        )}
      </div>
    </div>
  );
}
