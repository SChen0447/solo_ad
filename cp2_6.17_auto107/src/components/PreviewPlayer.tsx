import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { useAppStore } from '@/store';
import {
  playSequence,
  pause,
  resume,
  stopSequence,
  skipBackward,
  skipForward,
  getTransitionAnimName,
  isEnginePlaying,
  isEnginePaused,
} from '@/utils/animationEngine';
import {
  playAudio,
  pauseAudio,
  resumeAudio,
  stopAudio,
  seekAudio,
  setVolume as setAudioVolume,
  fadeAudioIn,
} from '@/utils/audioManager';

interface PreviewPlayerProps {
  open: boolean;
  onClose: () => void;
}

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function requestFullscreen(el: HTMLElement): Promise<void> {
  const fn =
    el.requestFullscreen ||
    (el as any).webkitRequestFullscreen ||
    (el as any).msRequestFullscreen;
  if (fn) {
    return fn.call(el).catch(() => {});
  }
  return Promise.resolve();
}

function exitFullscreen(): Promise<void> {
  const fn =
    document.exitFullscreen ||
    (document as any).webkitExitFullscreen ||
    (document as any).msExitFullscreen;
  if (fn) {
    return fn.call(document).catch(() => {});
  }
  return Promise.resolve();
}

function isFullscreen(): boolean {
  return !!(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).msFullscreenElement
  );
}

export default function PreviewPlayer({ open, onClose }: PreviewPlayerProps) {
  const cards = useAppStore((s) => s.cards);
  const audio = useAppStore((s) => s.audio);
  const setVolume = useAppStore((s) => s.setVolume);

  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [fadePhase, setFadePhase] = useState<'in' | 'out' | 'idle'>('idle');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [transitionPhase, setTransitionPhase] = useState<'enter' | 'hold' | 'exit'>('enter');
  const [prevIndex, setPrevIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const isClosingRef = useRef(false);

  const totalDuration = cards.reduce((sum, c) => sum + c.duration, 0);
  const currentCard = cards[currentIndex];
  const prevCard = prevIndex >= 0 && prevIndex !== currentIndex ? cards[prevIndex] : null;

  const resetPlayerState = useCallback(() => {
    stopSequence();
    stopAudio();
    setIsPlaying(false);
    setCurrentIndex(0);
    setPrevIndex(-1);
    setElapsed(0);
    setTransitionPhase('enter');
  }, []);

  const startSequence = useCallback(() => {
    if (cards.length === 0) return;
    playSequence(cards, {
      transitionDuration: 600,
      startIndex: 0,
      onPlayback: (info) => {
        setCurrentIndex((prev) => {
          if (prev !== info.currentIndex) {
            setPrevIndex(prev);
          }
          return info.currentIndex;
        });
        setElapsed(info.progress * totalDuration);
        setTransitionPhase(info.transitionPhase);
        if (info.isComplete) {
          setIsPlaying(false);
          stopAudio();
        }
      },
    });
    setIsPlaying(true);
    if (audio) {
      setAudioVolume(audio.volume);
      seekAudio(0);
      playAudio();
      fadeAudioIn(800);
    }
  }, [cards, audio, totalDuration]);

  const togglePlay = useCallback(() => {
    if (!isEnginePlaying() && !isEnginePaused()) {
      startSequence();
      return;
    }
    if (isEnginePlaying()) {
      pause();
      pauseAudio();
      setIsPlaying(false);
    } else if (isEnginePaused()) {
      resume();
      resumeAudio();
      setIsPlaying(true);
    }
  }, [startSequence]);

  const handleSkipBack = useCallback(() => {
    skipBackward();
    setPrevIndex(-1);
  }, []);

  const handleSkipFwd = useCallback(() => {
    skipForward();
    setPrevIndex(-1);
  }, []);

  const handleClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setFadePhase('out');
    resetPlayerState();
    if (isFullscreen()) {
      exitFullscreen();
    }
    setTimeout(() => {
      onClose();
      setMounted(false);
      setFadePhase('idle');
      isClosingRef.current = false;
    }, 500);
  }, [onClose, resetPlayerState]);

  useEffect(() => {
    if (open && !mounted) {
      setMounted(true);
      resetPlayerState();
      setTimeout(() => setFadePhase('in'), 10);
      const el = containerRef.current;
      if (el) {
        requestFullscreen(el);
      }
      setTimeout(() => {
        startSequence();
      }, 550);
    }
  }, [open, mounted, startSequence, resetPlayerState]);

  useEffect(() => {
    const onFsChange = () => {
      if (!isFullscreen() && mounted && !isClosingRef.current) {
        handleClose();
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('msfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
      document.removeEventListener('msfullscreenchange', onFsChange);
    };
  }, [mounted, handleClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!mounted || isClosingRef.current) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === 'ArrowLeft') handleSkipBack();
      if (e.key === 'ArrowRight') handleSkipFwd();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mounted, handleClose, togglePlay, handleSkipBack, handleSkipFwd]);

  if (!mounted) return null;

  const opacity =
    fadePhase === 'in' ? 1 : fadePhase === 'out' ? 0 : 0;
  const transitionStyle: React.CSSProperties = {
    opacity,
    transition: 'opacity 500ms ease',
  };

  const renderCardView = (card: typeof currentCard, role: 'current' | 'prev') => {
    if (!card) return null;
    const type = card.transition;
    const animName =
      role === 'prev'
        ? 'pfadeOutExit'
        : getTransitionAnimName(type, transitionPhase);
    const cardBg = card.imageUrl
      ? {
          backgroundImage: `url(${card.imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : { backgroundColor: card.bgColor };

    const width = Math.min(window.innerWidth * 0.72, 960);
    const height = (width * 3) / 4;

    return (
      <div
        key={`${role}-${card.id}`}
        className="absolute"
        style={{
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          willChange: 'transform, opacity',
          zIndex: role === 'current' ? 2 : 1,
        }}
      >
        <div
          style={{
            width,
            height,
            borderRadius: 20,
            overflow: 'hidden',
            animation: `${animName} 0.6s cubic-bezier(0.4, 0, 0.2, 1) both`,
            boxShadow:
              '0 0 60px rgba(99, 102, 241, 0.35), 0 0 120px rgba(139, 92, 246, 0.2), 0 20px 80px rgba(0,0,0,0.5)',
            ...cardBg,
          }}
        >
          <div
            className="h-full flex flex-col justify-end p-12"
            style={{
              background: card.imageUrl
                ? 'linear-gradient(transparent 40%, rgba(0,0,0,0.85))'
                : 'linear-gradient(transparent 55%, rgba(0,0,0,0.06))',
            }}
          >
            {card.title && (
              <div
                style={{
                  color: card.imageUrl ? '#fff' : '#1e293b',
                  fontSize: 40,
                  fontWeight: 700,
                  marginBottom: 12,
                  lineHeight: 1.2,
                }}
              >
                {card.title}
              </div>
            )}
            {card.content && (
              <div
                style={{
                  color: card.imageUrl ? '#e2e8f0' : '#334155',
                  fontSize: 20,
                  lineHeight: 1.6,
                  maxWidth: '90%',
                }}
              >
                {card.content}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: '#000',
        overflow: 'hidden',
        ...transitionStyle,
      }}
    >
      {prevCard && renderCardView(prevCard, 'prev')}
      {currentCard && renderCardView(currentCard, 'current')}

      <button
        onClick={handleClose}
        style={{
          position: 'absolute',
          top: 24,
          right: 24,
          width: 44,
          height: 44,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          zIndex: 10,
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
        title="退出 (Esc)"
      >
        <X size={20} />
      </button>

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '24px 32px 28px',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
          zIndex: 10,
        }}
      >
        <div
          style={{
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
            fontSize: 13,
          }}
        >
          <div style={{ opacity: 0.9, maxWidth: '50%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentCard?.title || `第 ${currentIndex + 1} 张卡片`}
          </div>
          <div style={{ opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(elapsed)} / {formatTime(totalDuration)}
          </div>
        </div>

        <div
          style={{
            height: 8,
            borderRadius: 4,
            background: 'rgba(255,255,255,0.1)',
            overflow: 'hidden',
            marginBottom: 20,
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0}%`,
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
              borderRadius: 4,
              transition: 'width 100ms linear',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <button
            onClick={handleSkipBack}
            style={ctrlBtnStyle}
            title="上一张"
          >
            <SkipBack size={22} fill="#fff" />
          </button>
          <button
            onClick={togglePlay}
            style={{
              ...ctrlBtnStyle,
              width: 56,
              height: 56,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: 999,
            }}
            title={isPlaying ? '暂停 (Space)' : '播放 (Space)'}
          >
            {isPlaying ? <Pause size={24} fill="#fff" /> : <Play size={24} fill="#fff" style={{ marginLeft: 2 }} />}
          </button>
          <button
            onClick={handleSkipFwd}
            style={ctrlBtnStyle}
            title="下一张"
          >
            <SkipForward size={22} fill="#fff" />
          </button>

          {audio && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 28 }}>
              <Volume2 size={18} color="#fff" style={{ opacity: 0.8 }} />
              <input
                type="range"
                min={0}
                max={100}
                value={audio.volume}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setVolume(v);
                  setAudioVolume(v);
                }}
                style={{ width: 100, accentColor: '#8b5cf6' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ctrlBtnStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 999,
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.15)',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  backdropFilter: 'blur(8px)',
  transition: 'all 0.2s',
};
