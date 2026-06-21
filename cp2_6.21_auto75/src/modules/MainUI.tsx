import React, { useState, useCallback, useRef, useEffect } from 'react'
import WaterfallFlow from './WaterfallFlow'
import { debounce } from '../utils'
import type { DynastyOption } from '../types'

interface MainUIProps {
  onMusicToggle?: (isPlaying: boolean) => void
}

const DYNASTY_OPTIONS: { value: DynastyOption; label: string }[] = [
  { value: '', label: '全部朝代' },
  { value: '唐', label: '唐' },
  { value: '宋', label: '宋' },
  { value: '元', label: '元' },
  { value: '明', label: '明' },
  { value: '清', label: '清' }
]

const MainUI: React.FC<MainUIProps> = ({ onMusicToggle }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedDynasty, setSelectedDynasty] = useState<DynastyOption>('')
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const fadeAnimRef = useRef<number>()
  const isMusicPlayingRef = useRef(false)

  useEffect(() => {
    isMusicPlayingRef.current = isMusicPlaying
  }, [isMusicPlaying])

  const debouncedSearch = useCallback(
    debounce((query: string) => {
      setDebouncedQuery(query)
    }, 300),
    []
  )

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setSearchQuery(value)
      debouncedSearch(value)
    },
    [debouncedSearch]
  )

  const handleDynastyChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedDynasty(e.target.value as DynastyOption)
    },
    []
  )

  const cancelFadeAnim = useCallback(() => {
    if (fadeAnimRef.current) {
      cancelAnimationFrame(fadeAnimRef.current)
      fadeAnimRef.current = undefined
    }
  }, [])

  const fadeVolume = useCallback(
    (targetVolume: number, duration: number, onComplete?: () => void) => {
      const audio = audioRef.current
      if (!audio) {
        if (onComplete) onComplete()
        return
      }

      cancelFadeAnim()

      const startVolume = audio.volume
      const startTime = performance.now()

      const animate = (nowTime: number) => {
        const elapsed = nowTime - startTime
        const t = Math.min(elapsed / duration, 1)
        const easeT = 1 - Math.pow(1 - t, 2)
        const currentVolume = startVolume + (targetVolume - startVolume) * easeT
        audio.volume = Math.max(0, Math.min(currentVolume, 1))

        if (t < 1) {
          fadeAnimRef.current = requestAnimationFrame(animate)
        } else {
          audio.volume = targetVolume
          fadeAnimRef.current = undefined
          if (onComplete) onComplete()
        }
      }

      fadeAnimRef.current = requestAnimationFrame(animate)
    },
    [cancelFadeAnim]
  )

  const startMusicWithFadeIn = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (fadeAnimRef.current) {
      cancelAnimationFrame(fadeAnimRef.current)
    }

    audio.volume = 0

    audio
      .play()
      .then(() => {
        if (!isMusicPlayingRef.current) {
          setIsMusicPlaying(true)
          isMusicPlayingRef.current = true
        }
        fadeVolume(0.3, 2000)
        if (onMusicToggle) {
          onMusicToggle(true)
        }
      })
      .catch(() => {})
  }, [fadeVolume, onMusicToggle])

  const stopMusicWithFadeOut = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    fadeVolume(0, 1000, () => {
      audio.pause()
      setIsMusicPlaying(false)
      isMusicPlayingRef.current = false
      if (onMusicToggle) {
        onMusicToggle(false)
      }
    })
  }, [fadeVolume, onMusicToggle])

  const toggleMusic = useCallback(() => {
    const nowPlaying = isMusicPlayingRef.current

    if (nowPlaying) {
      stopMusicWithFadeOut()
    } else {
      startMusicWithFadeIn()
    }
  }, [startMusicWithFadeIn, stopMusicWithFadeOut])

  const handleCardClick = useCallback(
    (poemId: number) => {
      setExpandedCardId((prev) => {
        const willExpand = prev !== poemId
        if (willExpand && !isMusicPlayingRef.current) {
          startMusicWithFadeIn()
        }
        return willExpand ? poemId : null
      })
    },
    [startMusicWithFadeIn]
  )

  useEffect(() => {
    return () => {
      cancelFadeAnim()
    }
  }, [cancelFadeAnim])

  const headerStyle: React.CSSProperties = {
    padding: '20px 30px',
    background: 'linear-gradient(180deg, #34495E 0%, #2C3E50 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
    flexWrap: 'wrap'
  }

  const titleStyle: React.CSSProperties = {
    fontSize: 28,
    color: '#FAF0E6',
    fontFamily: '"KaiTi", "STKaiti", "楷体", serif',
    fontWeight: 'bold',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
    letterSpacing: 4
  }

  const searchContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    maxWidth: 500,
    minWidth: 250
  }

  const searchInputStyle: React.CSSProperties = {
    flex: 1,
    padding: '10px 16px',
    fontSize: 16,
    fontFamily: '"KaiTi", "STKaiti", "楷体", serif',
    border: '1px solid rgba(139, 69, 19, 0.3)',
    borderRadius: 6,
    backgroundColor: 'rgba(250, 240, 230, 0.9)',
    color: '#4A3728',
    outline: 'none',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease'
  }

  const selectStyle: React.CSSProperties = {
    padding: '10px 16px',
    fontSize: 16,
    fontFamily: '"KaiTi", "STKaiti", "楷体", serif',
    border: '1px solid rgba(139, 69, 19, 0.3)',
    borderRadius: 6,
    backgroundColor: 'rgba(250, 240, 230, 0.9)',
    color: '#4A3728',
    outline: 'none',
    cursor: 'pointer',
    transition: 'border-color 0.3s ease'
  }

  const musicButtonStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: '50%',
    backgroundColor: '#8B4513',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.3s ease, background-color 0.3s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    flexShrink: 0,
    padding: 0
  }

  const playIconStyle: React.CSSProperties = {
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderWidth: '6px 0 6px 10px',
    borderColor: 'transparent transparent transparent #FFFFFF',
    marginLeft: 3,
    display: 'block'
  }

  const pauseIconStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    width: 14,
    height: 14
  }

  const pauseBarStyle: React.CSSProperties = {
    width: 4,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 1
  }

  const contentStyle: React.CSSProperties = {
    flex: 1,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  }

  const mainContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: 'linear-gradient(180deg, #34495E 0%, #2C3E50 30%, #2C3E50 100%)'
  }

  return (
    <div style={mainContainerStyle}>
      <header style={headerStyle} className="waterfall-header">
        <h1 style={titleStyle}>诗韵流芳</h1>
        <div style={searchContainerStyle} className="search-container">
          <input
            type="text"
            placeholder="搜索诗词、作者..."
            value={searchQuery}
            onChange={handleSearchChange}
            style={searchInputStyle}
            className="search-input"
            onFocus={(e) => {
              e.target.style.borderColor = '#8B4513'
              e.target.style.boxShadow = '0 0 0 3px rgba(139, 69, 19, 0.2)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(139, 69, 19, 0.3)'
              e.target.style.boxShadow = 'none'
            }}
          />
          <select
            value={selectedDynasty}
            onChange={handleDynastyChange}
            style={selectStyle}
            className="dynasty-select"
            onFocus={(e) => {
              e.target.style.borderColor = '#8B4513'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(139, 69, 19, 0.3)'
            }}
          >
            {DYNASTY_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <button
          style={musicButtonStyle}
          className="music-button"
          onClick={toggleMusic}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)'
            e.currentTarget.style.backgroundColor = '#A0522D'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.backgroundColor = '#8B4513'
          }}
          aria-label={isMusicPlaying ? '暂停音乐' : '播放音乐'}
        >
          {isMusicPlaying ? (
            <div style={pauseIconStyle}>
              <div style={pauseBarStyle} />
              <div style={pauseBarStyle} />
            </div>
          ) : (
            <div style={playIconStyle} />
          )}
        </button>
      </header>
      <div style={contentStyle}>
        <WaterfallFlow
          searchQuery={debouncedQuery}
          selectedDynasty={selectedDynasty}
          expandedCardId={expandedCardId}
          onCardClick={handleCardClick}
        />
      </div>
      <audio
        ref={audioRef}
        loop
        preload="auto"
        src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
      />
    </div>
  )
}

export default MainUI
