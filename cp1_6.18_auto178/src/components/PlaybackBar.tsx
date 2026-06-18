import React, { useRef, useCallback } from 'react'
import { useAppStore } from '../store'

interface PlaybackBarProps {
  audioEngine: React.MutableRefObject<any>
  onFileUpload: (file: File) => void
}

export const PlaybackBar: React.FC<PlaybackBarProps> = ({ audioEngine, onFileUpload }) => {
  const { audio, setAudioState } = useAppStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handlePlayPause = useCallback(() => {
    const engine = audioEngine.current
    if (!engine) return

    if (audio.isPlaying) {
      engine.pause()
      setAudioState({ isPlaying: false })
    } else {
      engine.play(audio.currentTime)
      setAudioState({ isPlaying: true })
    }
  }, [audio.isPlaying, audio.currentTime, audioEngine, setAudioState])

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!audio.duration || !progressRef.current) return

      const rect = progressRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const ratio = Math.max(0, Math.min(1, x / rect.width))
      const time = ratio * audio.duration

      const engine = audioEngine.current
      if (engine) {
        engine.seek(time)
      }
      setAudioState({ currentTime: time })
    },
    [audio.duration, audioEngine, setAudioState]
  )

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const volume = parseFloat(e.target.value)
      setAudioState({ volume })
      const engine = audioEngine.current
      if (engine) {
        engine.setVolume(volume)
      }
    },
    [audioEngine, setAudioState]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        if (file.size > 20 * 1024 * 1024) {
          alert('文件大小不能超过20MB')
          return
        }
        onFileUpload(file)
      }
    },
    [onFileUpload]
  )

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const progressPercent = audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0

  return (
    <div style={styles.container}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.wav"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <button style={styles.uploadBtn} onClick={handleUploadClick} title="上传音频">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </button>

      <div style={styles.progressContainer}>
        <div style={styles.timeText}>{formatTime(audio.currentTime)}</div>
        <div
          ref={progressRef}
          style={styles.progressBar}
          onClick={handleProgressClick}
        >
          <div style={{ ...styles.progressFill, width: `${progressPercent}%` }} />
        </div>
        <div style={styles.timeText}>{formatTime(audio.duration)}</div>
      </div>

      <button
        style={{
          ...styles.playBtn,
          transform: audio.isPlaying ? 'scale(1)' : 'scale(1)',
          transition: 'transform 0.2s ease',
        }}
        onClick={handlePlayPause}
        onMouseDown={(e) => {
          ;(e.target as HTMLButtonElement).style.transform = 'scale(0.95)'
        }}
        onMouseUp={(e) => {
          ;(e.target as HTMLButtonElement).style.transform = 'scale(1)'
        }}
        onMouseLeave={(e) => {
          ;(e.target as HTMLButtonElement).style.transform = 'scale(1)'
        }}
        disabled={!audio.fileName}
      >
        {audio.isPlaying ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div style={styles.volumeContainer}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
        <input
          type="range"
          min="0"
          max="100"
          value={audio.volume}
          onChange={handleVolumeChange}
          style={styles.volumeSlider}
        />
        <span style={styles.volumeText}>{Math.round(audio.volume)}</span>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    padding: '16px 24px',
    backgroundColor: 'rgba(21, 21, 32, 0.9)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(8px)',
  },
  uploadBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'box-shadow 0.2s ease, background-color 0.2s ease',
  },
  progressContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: '1',
    maxWidth: '500px',
  },
  timeText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '12px',
    fontVariantNumeric: 'tabular-nums',
    minWidth: '45px',
    textAlign: 'center',
  },
  progressBar: {
    flex: '1',
    height: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '3px',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: '3px',
    transition: 'width 0.1s linear',
  },
  playBtn: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
  },
  volumeContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  volumeSlider: {
    width: '80px',
    height: '4px',
    WebkitAppearance: 'none',
    appearance: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '2px',
    outline: 'none',
    cursor: 'pointer',
  },
  volumeText: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.6)',
    minWidth: '24px',
    textAlign: 'right',
  },
}
