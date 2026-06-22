import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useAppStore } from '@/store';
import { getShadowValue } from '@/utils/cardExporter';

const SubtitleOverlay = forwardRef<HTMLDivElement>((_props, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

  const croppedImageUrl = useAppStore((s) => s.croppedImageUrl);
  const subtitleText = useAppStore((s) => s.subtitleText);
  const activeTemplate = useAppStore((s) => s.activeTemplate);
  const subtitleStyle = useAppStore((s) => s.subtitleStyle);

  const { fontFamily, fontSize, fontColor, shadowLevel, textAlign } = subtitleStyle;

  const textStyle: React.CSSProperties = {
    fontFamily,
    fontSize: `${fontSize}px`,
    color: fontColor,
    textShadow: getShadowValue(shadowLevel),
    textAlign,
    transition: 'all 0.1s ease-out',
    lineHeight: 1.5,
    wordBreak: 'break-word',
    whiteSpace: 'pre-wrap',
  };

  if (!croppedImageUrl) {
    return (
      <div
        id="preview-container"
        ref={containerRef}
        className="flex h-full w-full items-center justify-center rounded-lg bg-cinema-surface border border-cinema-border"
      >
        <div className="flex flex-col items-center gap-3 text-cinema-muted animate-fade-in">
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

  const animKey = `${activeTemplate}-${fontFamily}-${fontSize}-${fontColor}-${shadowLevel}-${textAlign}`;

  return (
    <div
      id="preview-container"
      ref={containerRef}
      className="relative h-full w-full overflow-hidden rounded-lg bg-cinema-surface border border-cinema-border"
    >
      <img
        src={croppedImageUrl}
        alt="cropped preview"
        className="h-full w-full object-cover select-none"
        draggable={false}
      />

      <div
        className="absolute bottom-0 left-0 right-0 flex items-end p-4 md:p-6 animate-fade-in"
        key={animKey}
        style={{
          height: '22%',
          background:
            'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.2) 80%, transparent 100%)',
          transition: 'background 0.3s ease-in-out',
        }}
      >
        {subtitleText ? (
          <span className="w-full font-bold px-4" style={textStyle}>
            {subtitleText}
          </span>
        ) : (
          <span className="w-full text-center text-white/30 text-sm italic px-4">
            在此预览字幕效果
          </span>
        )}
      </div>
    </div>
  );
});

SubtitleOverlay.displayName = 'SubtitleOverlay';

export default SubtitleOverlay;
