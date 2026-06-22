import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, RotateCcw, Check } from 'lucide-react';
import { useAppStore } from '@/store';

const ASPECT_RATIO = 16 / 9;
const MAX_FILE_SIZE = 4 * 1024 * 1024;

interface Point {
  x: number;
  y: number;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ImageEditor = () => {
  const setImageUrl = useAppStore((s) => s.setImageUrl);
  const setCroppedImageUrl = useAppStore((s) => s.setCroppedImageUrl);
  const setCropArea = useAppStore((s) => s.setCropArea);
  const imageUrl = useAppStore((s) => s.imageUrl);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [crop, setCrop] = useState<CropArea | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragImage, setIsDragImage] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<number | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    setError(null);

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('只支持 JPG 和 PNG 格式图片');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('图片大小不能超过 4MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setImageUrl(dataUrl);
        setCrop(null);
        setCropArea(null);
        setCroppedImageUrl(null);
        requestAnimationFrame(drawCanvas);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [setImageUrl, setCroppedImageUrl, setCropArea]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragImage(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;

    if (!canvas || !ctx || !img) return;

    const container = canvas.parentElement;
    if (!container) return;

    const maxWidth = container.clientWidth;
    const maxHeight = 400;

    let scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    if (crop) {
      ctx.save();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.clearRect(crop.x, crop.y, crop.width, crop.height);
      ctx.drawImage(
        img,
        crop.x / scale, crop.y / scale, crop.width / scale, crop.height / scale,
        crop.x, crop.y, crop.width, crop.height
      );

      ctx.strokeStyle = '#e94560';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(crop.x, crop.y, crop.width, crop.height);
      ctx.setLineDash([]);

      const handleSize = 10;
      ctx.fillStyle = '#e94560';
      ctx.fillRect(
        crop.x + crop.width - handleSize / 2,
        crop.y + crop.height - handleSize / 2,
        handleSize,
        handleSize
      );

      ctx.restore();
    }

    animationRef.current = requestAnimationFrame(drawCanvas);
  }, [crop]);

  useEffect(() => {
    if (imageUrl && !imageRef.current) {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        requestAnimationFrame(drawCanvas);
      };
      img.src = imageUrl;
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [imageUrl, drawCanvas]);

  const getCanvasPoint = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;

    const point = getCanvasPoint(e);

    if (crop) {
      const handleSize = 10;
      const handleX = crop.x + crop.width - handleSize / 2;
      const handleY = crop.y + crop.height - handleSize / 2;
      if (
        point.x >= handleX && point.x <= handleX + handleSize &&
        point.y >= handleY && point.y <= handleY + handleSize
      ) {
        setIsResizing(true);
        setDragStart(point);
        return;
      }

      if (
        point.x >= crop.x && point.x <= crop.x + crop.width &&
        point.y >= crop.y && point.y <= crop.y + crop.height
      ) {
        setIsDragging(true);
        setDragStart(point);
        return;
      }
    }

    setIsDragging(true);
    setDragStart(point);
    setCrop({ x: point.x, y: point.y, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragStart || !isDragging && !isResizing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const current = getCanvasPoint(e);

    if (isResizing && crop) {
      const dx = current.x - dragStart.x;
      const dy = current.y - dragStart.y;
      const newWidth = Math.max(50, crop.width + dx);
      const newHeight = newWidth / ASPECT_RATIO;

      setCrop({
        ...crop,
        width: Math.min(newWidth, canvas.width - crop.x),
        height: Math.min(newHeight, canvas.height - crop.y),
      });
      setDragStart(current);
    } else if (isDragging && crop) {
      if (crop.width === 0 && crop.height === 0) {
        let dx = current.x - dragStart.x;
        let dy = current.y - dragStart.y;

        if (Math.abs(dx / dy) > ASPECT_RATIO) {
          dy = dx / ASPECT_RATIO;
        } else {
          dx = dy * ASPECT_RATIO;
        }

        let x = dragStart.x;
        let y = dragStart.y;

        if (dx < 0) { x = dragStart.x + dx; dx = Math.abs(dx); }
        if (dy < 0) { y = dragStart.y + dy; dy = Math.abs(dy); }

        x = Math.max(0, Math.min(x, canvas.width - dx));
        y = Math.max(0, Math.min(y, canvas.height - dy));
        dx = Math.min(dx, canvas.width - x);
        dy = Math.min(dy, canvas.height - y);

        setCrop({ x, y, width: dx, height: dy });
      } else {
        const dx = current.x - dragStart.x;
        const dy = current.y - dragStart.y;

        let newX = crop.x + dx;
        let newY = crop.y + dy;

        newX = Math.max(0, Math.min(newX, canvas.width - crop.width));
        newY = Math.max(0, Math.min(newY, canvas.height - crop.height));

        setCrop({ ...crop, x: newX, y: newY });
        setDragStart(current);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setDragStart(null);
  };

  const confirmCrop = () => {
    if (!crop || !imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const scale = canvas.width / imageRef.current.width;

    const sourceX = crop.x / scale;
    const sourceY = crop.y / scale;
    const sourceWidth = crop.width / scale;
    const sourceHeight = crop.height / scale;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = Math.round(sourceWidth);
    exportCanvas.height = Math.round(sourceHeight);
    const ctx = exportCanvas.getContext('2d')!;

    ctx.drawImage(
      imageRef.current,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, exportCanvas.width, exportCanvas.height
    );

    const croppedDataUrl = exportCanvas.toDataURL('image/png');
    setCroppedImageUrl(croppedDataUrl);
    setCropArea({
      x: sourceX,
      y: sourceY,
      width: sourceWidth,
      height: sourceHeight,
    });
  };

  const resetUpload = () => {
    setImageUrl(null);
    setCroppedImageUrl(null);
    setCrop(null);
    setCropArea(null);
    setError(null);
    imageRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!imageUrl) {
    return (
      <div className="space-y-3">
        <h3 className="text-cinema-text text-sm font-medium">图片上传</h3>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/jpeg,image/png"
          onChange={handleInputChange}
          className="hidden"
        />
        <div
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-all duration-300 panel-inset
            ${isDragImage
              ? 'border-cinema-primary bg-cinema-primary/10'
              : 'border-cinema-border bg-cinema-card hover:border-cinema-primary/50'
            }
          `}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragImage(true); }}
          onDragLeave={() => setIsDragImage(false)}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-cinema-primary mb-3" />
          <p className="text-cinema-text font-medium mb-1">点击或拖拽上传图片</p>
          <p className="text-cinema-muted text-sm">支持 JPG / PNG 格式，最大 4MB</p>
        </div>
        {error && (
          <div className="text-red-400 text-sm">{error}</div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-cinema-text text-sm font-medium">图片裁切（16:9）</h3>
      <div
        className="rounded-xl overflow-hidden bg-cinema-card border border-cinema-border panel-inset"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas
          ref={canvasRef}
          className="crop-canvas block w-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
        />
      </div>
      {crop && crop.width > 50 && (
        <div className="text-xs text-cinema-muted">
          选区尺寸: {Math.round(crop.width)} × {Math.round(crop.height)} px
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={confirmCrop}
          disabled={!crop || crop.width < 50}
          className="btn-ripple flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg
            bg-cinema-primary text-white font-medium
            hover:bg-cinema-primary/90 hover:-translate-y-0.5
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
            transition-all duration-300"
        >
          <Check size={18} />
          确认裁切
        </button>
        <button
          onClick={resetUpload}
          className="btn-ripple flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
            bg-cinema-card border border-cinema-border text-cinema-text
            hover:bg-cinema-border/50 hover:-translate-y-0.5
            transition-all duration-300"
        >
          <RotateCcw size={18} />
          重新上传
        </button>
      </div>
    </div>
  );
};

export default ImageEditor;
