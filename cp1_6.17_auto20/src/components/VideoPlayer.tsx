import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react';

interface VideoPlayerProps {
  videoUrl: string;
  audioUrl: string;
  totalDuration: number;
  lineTimestamps: number[];
  lines: string[];
  currentLineIndex: number;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  playbackRate: number;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onTimeUpdate: (time: number, lineIndex: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  audioUrl,
  totalDuration,
  lineTimestamps,
  lines,
  currentLineIndex,
  isPlaying,
  currentTime,
  volume,
  playbackRate,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onTimeUpdate,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [tooltipLine, setTooltipLine] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState(0);

  const findCurrentLine = useCallback((time: number): number => {
    for (let i = lineTimestamps.length - 1; i >= 0; i--) {
      if (time >= lineTimestamps[i]) {
        return i;
      }
    }
    return 0;
  }, [lineTimestamps]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
    }
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      const lineIndex = findCurrentLine(time);
      onTimeUpdate(time, lineIndex);
    }
  }, [findCurrentLine, onTimeUpdate]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current && totalDuration > 0) {
      const rect = progressRef.current.getBoundingClientRect();
      const position = (e.clientX - rect.left) / rect.width;
      const newTime = position * totalDuration;
      onSeek(newTime);
      if (videoRef.current) {
        videoRef.current.currentTime = newTime;
      }
      if (audioRef.current) {
        audioRef.current.currentTime = newTime;
      }
    }
  }, [totalDuration, onSeek]);

  const handleProgressHover = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current && totalDuration > 0) {
      const rect = progressRef.current.getBoundingClientRect();
      const position = (e.clientX - rect.left) / rect.width;
      const hoverTime = position * totalDuration;
      const lineIndex = findCurrentLine(hoverTime);
      setTooltipLine(lines[lineIndex] || '');
      setTooltipPosition(e.clientX - rect.left);
    }
  }, [totalDuration, findCurrentLine, lines]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const progressPercentage = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="card p-4 flex flex-col gap-4 animate-fade-in">
      <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-cover"
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => onPlayPause()}
          loop
        />
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => onPlayPause()}
          loop
        />
        
        {!videoUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary-bg to-primary-bg">
            <div className="text-center text-text-secondary">
              <p className="text-6xl mb-4">🎬</p>
              <p className="font-serif-cn text-lg">输入诗歌后自动生成视频预览</p>
            </div>
          </div>
        )}

        {tooltipLine && (
          <div
            className="absolute top-4 transform -translate-x-1/2 bg-black/80 px-4 py-2 rounded-lg text-sm text-white line-tooltip pointer-events-none"
            style={{ left: `${tooltipPosition}px` }}
          >
            {tooltipLine}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div
          ref={progressRef}
          className="relative w-full h-3 bg-white/10 rounded-full cursor-pointer group"
          onClick={handleProgressClick}
          onMouseMove={handleProgressHover}
          onMouseLeave={() => setTooltipLine(null)}
        >
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-accent to-accent-hover rounded-full transition-all duration-100"
            style={{ width: `${progressPercentage}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progressPercentage}% - 8px)` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onPlayPause}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-accent hover:bg-accent-hover transition-all duration-200 hover:scale-105"
              disabled={!videoUrl}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white ml-0.5" />
              )}
            </button>

            <span className="text-text-secondary text-sm font-mono">
              {formatTime(currentTime)} / {formatTime(totalDuration)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-text-secondary" />
                ) : (
                  <Volume2 className="w-5 h-5 text-text-secondary" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setIsMuted(false);
                  onVolumeChange(parseFloat(e.target.value));
                }}
                className="slider-track w-24"
              />
            </div>

            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              disabled={!videoUrl}
            >
              <Maximize2 className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
