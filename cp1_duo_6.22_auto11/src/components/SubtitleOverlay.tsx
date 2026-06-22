import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useAppStore } from '@/store';

const SHADOW_MAP: Record<string, string> = {
  none: 'none',
  light: '1px 1px 3px rgba(0,0,0,0.5)',
  medium: '2px 2px 6px rgba(0,0,0,0.7)',
  heavy: '3px 3px 10px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)',
};

const SubtitleOverlay = forwardRef<HTMLDivElement>((_, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => containerRef.current!);

  const croppedImageUrl = useAppStore((s) => s.croppedImageUrl);
  const subtitleText = useAppStore((s) => s.subtitleText);
  const { fontFamily, fontSize, fontColor, shadowLevel, textAlign } =
    useAppStore((s) => s.subtitleStyle);

  const textStyle: React.CSSProperties = {
    fontFamily,
    fontSize,
    color: fontColor,
    textShadow: SHADOW_MAP[shadowLevel],
    textAlign,
  };

  if (!croppedImageUrl) {
    return (
      <div
        id="preview-container"
        ref={containerRef}
        className="flex h-full w-full items-center justify-center rounded-lg bg-cinema-surface border border-cinema-border"
      >
        <div className="flex flex-col items-center gap-3 text-cinema-muted">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
            />
          </svg>
          <p className="text-sm">裁剪图片后将在此处预览字幕效果</p>
          <p className="text-xs opacity-60">Lights, Camera, Subtitle!</p>
        </div>
      </div>
    );
  }

  return (
    <div
      id="preview-container"
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-lg bg-cinema-surface border border-cinema-border"
    >
      <img
        src={croppedImageUrl}
        alt="cropped preview"
        className="h-full w-full object-contain"
        draggable={false}
      />

      <div
        className="absolute bottom-0 left-0 right-0 flex items-end justify-center p-4"
        style={{ height: '20%', background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent)' }}
      >
        {subtitleText && (
          <span className="w-full leading-relaxed" style={textStyle}>
            {subtitleText}
          </span>
        )}
      </div>
    </div>
  );
});

SubtitleOverlay.displayName = 'SubtitleOverlay';

export default SubtitleOverlay;
