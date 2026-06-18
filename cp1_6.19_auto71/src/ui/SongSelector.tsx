import { useState, useEffect } from 'react'
import { SONGS, Song } from '../audio/BeatMap'
import { useGameStore } from '../store/gameStore'
import { audioEngine } from '../audio/AudioEngine'

interface SongSelectorProps {
  onStartGame: () => void
}

function SongSelector({ onStartGame }: SongSelectorProps) {
  const { selectedSong, selectSong, startGame } = useGameStore()
  const [previewingId, setPreviewingId] = useState<string | null>(null)

  useEffect(() => {
    if (selectedSong === null && SONGS.length > 0) {
      selectSong(SONGS[0].id)
    }
  }, [selectedSong, selectSong])

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handlePreview = async (song: Song) => {
    if (previewingId === song.id) {
      audioEngine.stop()
      setPreviewingId(null)
      return
    }

    setPreviewingId(song.id)

    await audioEngine.loadSong(song, {
      onEnd: () => setPreviewingId(null),
    })
    audioEngine.play()

    setTimeout(() => {
      if (previewingId === song.id) {
        audioEngine.stop()
        setPreviewingId(null)
      }
    }, 8000)
  }

  const handleStart = () => {
    audioEngine.stop()
    setPreviewingId(null)
    startGame()
    setTimeout(() => {
      onStartGame()
    }, 100)
  }

  const getStyleLabel = (style: Song['style']) => {
    switch (style) {
      case 'electronic': return { label: '电子', color: '#48dbfb' }
      case 'classical': return { label: '古典', color: '#feca57' }
      case 'jazz': return { label: '爵士', color: '#1dd1a1' }
    }
  }

  return (
    <div className="song-selector">
      <div className="selector-header">
        <h1 className="game-title">音律迷阵</h1>
        <p className="game-subtitle">Rhythm Maze · 跟随节拍，点亮音符</p>
      </div>

      <div className="songs-scroll">
        <div className="songs-container">
          {SONGS.map((song) => {
            const styleInfo = getStyleLabel(song.style)
            const isSelected = selectedSong?.id === song.id
            const isPreviewing = previewingId === song.id

            return (
              <div
                key={song.id}
                className={`song-card ${isSelected ? 'selected' : ''}`}
                onClick={() => selectSong(song.id)}
              >
                <div className="song-card-inner">
                  <div className="song-cover" style={{
                    background: `linear-gradient(135deg, ${styleInfo.color}30, #0f3460)`,
                  }}>
                    <div className="cover-icon">
                      {song.style === 'electronic' && '🎛️'}
                      {song.style === 'classical' && '🎹'}
                      {song.style === 'jazz' && '🎷'}
                    </div>
                  </div>

                  <div className="song-details">
                    <h3 className="card-song-name">{song.name}</h3>
                    <div className="card-meta">
                      <span
                        className="style-tag"
                        style={{ backgroundColor: `${styleInfo.color}20`, color: styleInfo.color }}
                      >
                        {styleInfo.label}
                      </span>
                      <span className="song-bpm">{song.bpm} BPM</span>
                    </div>
                    <div className="card-footer">
                      <span className="song-duration">⏱ {formatDuration(song.duration)}</span>
                      <button
                        className={`preview-btn ${isPreviewing ? 'playing' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePreview(song)
                        }}
                      >
                        {isPreviewing ? '⏹ 停止' : '▶ 预览'}
                      </button>
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="selected-indicator">
                    <span>✓ 已选择</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="selector-footer">
        <div className="instructions">
          <p><strong>操作说明：</strong></p>
          <div className="keys-hint">
            <span>键盘 A S D F G H</span>
            <span className="hint-arrow">→</span>
            <span>对应 C D E F G A 六列</span>
          </div>
          <p className="hint-mobile">（移动端可直接点击对应列方块）</p>
        </div>

        <button
          className="start-game-btn"
          onClick={handleStart}
          disabled={!selectedSong}
        >
          🎵 开始游戏
        </button>
      </div>
    </div>
  )
}

export default SongSelector
