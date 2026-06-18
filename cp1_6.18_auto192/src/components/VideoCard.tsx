import { useEffect, useRef, useState } from 'react';

interface VideoCardProps {
  stream?: MediaStream;
  nickname: string;
  isLocal?: boolean;
  isMirrored?: boolean;
  isDraggable?: boolean;
  style?: React.CSSProperties;
  onPositionChange?: (x: number, y: number) => void;
}

export function VideoCard({
  stream,
  nickname,
  isLocal = false,
  isMirrored = false,
  isDraggable = false,
  style,
  onPositionChange,
}: VideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasStream, setHasStream] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
      setHasStream(true);
    } else {
      video.srcObject = null;
      setHasStream(false);
    }

    return () => {
      video.srcObject = null;
    };
  }, [stream]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.style.transform = isMirrored ? 'scaleX(-1)' : 'none';
    }
  }, [isMirrored]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDraggable || !containerRef.current) return;
    setIsDragging(true);
    const rect = containerRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current || !onPositionChange) return;
    const x = e.clientX - dragOffset.current.x;
    const y = e.clientY - dragOffset.current.y;
    onPositionChange(x, y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: '#1e293b',
        cursor: isDraggable ? (isDragging ? 'grabbing' : 'grab') : 'default',
        opacity: hasStream ? 1 : 0.3,
        transition: 'opacity 0.3s ease-in-out',
        ...style,
      }}
      onMouseDown={handleMouseDown}
    >
      {!hasStream && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              border: '4px solid #475569',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
        </div>
      )}

      <video
        ref={videoRef}
        playsInline
        autoPlay
        muted={isLocal}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: hasStream ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
        }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          left: '8px',
          right: '8px',
          padding: '4px 10px',
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          borderRadius: '6px',
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: 500,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {nickname}
        {isLocal && ' (我)'}
      </div>
    </div>
  );
}
