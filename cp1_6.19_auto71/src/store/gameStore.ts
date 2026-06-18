import { create } from 'zustand'
import { Song, SONGS, BeatMap, NoteColor, Beat } from '../audio/BeatMap'
import { audioEngine } from '../audio/AudioEngine'
import { ScoreManager, ScoreState, HitResult } from '../game/ScoreManager'
import { v4 as uuidv4 } from 'uuid'

export type GamePhase = 'idle' | 'playing' | 'paused' | 'ended'

export interface Particle {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  color: string
  life: number
  maxLife: number
  column: number
  row: number
}

export interface FlashEffect {
  id: string
  column: number
  row: number
  time: number
}

interface GameStore {
  phase: GamePhase
  selectedSong: Song | null
  currentTime: number
  scoreState: ScoreState
  highlightedColumn: number | null
  borderColor: string
  particles: Particle[]
  flashEffects: FlashEffect[]
  activeBeats: Beat[]
  beatMap: BeatMap | null
  scoreManager: ScoreManager | null
  isGameOver: boolean
  fadeIn: boolean

  selectSong: (songId: string) => void
  startGame: () => void
  pauseGame: () => void
  resumeGame: () => void
  resetGame: () => void
  handleColumnClick: (columnIndex: number) => void
  handleKeyPress: (key: string) => void
  spawnParticles: (column: number, row: number, note: NoteColor) => void
  update: (deltaTime: number) => void
}

const HIT_WINDOW = 0.15
const PERFECT_WINDOW = 0.08
const INITIAL_LIVES = 3

const defaultScoreState: ScoreState = {
  score: 0,
  combo: 0,
  maxCombo: 0,
  lives: INITIAL_LIVES,
  maxLives: INITIAL_LIVES,
  totalHits: 0,
  perfectHits: 0,
  totalMisses: 0,
  totalBeats: 0,
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'idle',
  selectedSong: null,
  currentTime: 0,
  scoreState: defaultScoreState,
  highlightedColumn: null,
  borderColor: '#ffffff40',
  particles: [],
  flashEffects: [],
  activeBeats: [],
  beatMap: null,
  scoreManager: null,
  isGameOver: false,
  fadeIn: false,

  selectSong: (songId: string) => {
    const song = SONGS.find((s) => s.id === songId) || null
    set({ selectedSong: song })
  },

  startGame: async () => {
    const { selectedSong } = get()
    if (!selectedSong) return

    const beatMap = new BeatMap(selectedSong)
    const scoreManager = new ScoreManager(selectedSong.beats.length, INITIAL_LIVES)

    scoreManager.subscribe((state) => {
      const gameOver = state.lives <= 0
      set({
        scoreState: state,
        isGameOver: gameOver,
      })
      if (gameOver) {
        audioEngine.stop()
        set({ phase: 'ended' })
      }
    })

    set({
      beatMap,
      scoreManager,
      phase: 'playing',
      currentTime: 0,
      particles: [],
      flashEffects: [],
      highlightedColumn: null,
      activeBeats: [],
      scoreState: scoreManager.getState(),
      isGameOver: false,
      fadeIn: true,
    })

    setTimeout(() => {
      set({ fadeIn: false })
    }, 300)

    await audioEngine.loadSong(selectedSong, {
      onUpdate: (time) => {
        const state = get()
        if (state.phase !== 'playing') return

        const missedBeats = state.beatMap?.checkMissedBeats(time, HIT_WINDOW) || []
        missedBeats.forEach((beat) => {
          const result = state.scoreManager?.processMiss(beat.note)
          if (result) {
            audioEngine.playMissSFX()
          }
        })

        const upcoming = state.beatMap?.getUpcomingBeats(time, 2) || []
        let highlightCol: number | null = null
        let borderCol = '#ffffff40'
        const noteOrder: NoteColor[] = ['C', 'D', 'E', 'F', 'G', 'A']
        const noteColors: Record<NoteColor, string> = {
          C: '#ff6b6b', D: '#feca57', E: '#48dbfb', F: '#1dd1a1', G: '#5f27cd', A: '#ff9ff3',
        }

        for (const beat of upcoming) {
          if (beat.time - time <= 0.4 && beat.time - time >= -HIT_WINDOW) {
            highlightCol = noteOrder.indexOf(beat.note)
            borderCol = noteColors[beat.note]
            break
          }
        }

        set({
          currentTime: time,
          highlightedColumn: highlightCol,
          borderColor: borderCol,
          activeBeats: upcoming,
        })

        get().update(0)
      },
      onEnd: () => {
        set({ phase: 'ended', isGameOver: true })
      },
    })

    audioEngine.play()
  },

  pauseGame: () => {
    if (get().phase === 'playing') {
      audioEngine.pause()
      set({ phase: 'paused' })
    }
  },

  resumeGame: () => {
    if (get().phase === 'paused') {
      audioEngine.play()
      set({ phase: 'playing' })
    }
  },

  resetGame: () => {
    audioEngine.stop()
    set({
      phase: 'idle',
      currentTime: 0,
      scoreState: defaultScoreState,
      highlightedColumn: null,
      borderColor: '#ffffff40',
      particles: [],
      flashEffects: [],
      activeBeats: [],
      beatMap: null,
      scoreManager: null,
      isGameOver: false,
      fadeIn: false,
    })
  },

  handleColumnClick: (columnIndex: number) => {
    const { beatMap, scoreManager, currentTime, phase } = get()
    if (phase !== 'playing' || !beatMap || !scoreManager) return

    const noteOrder: NoteColor[] = ['C', 'D', 'E', 'F', 'G', 'A']
    const note = noteOrder[columnIndex]
    if (!note) return

    const beat = beatMap.findClosestBeat(note, currentTime, HIT_WINDOW)

    if (beat) {
      const timingDiff = currentTime - beat.time
      const result = scoreManager.processHit(beat, timingDiff)
      const perfect = result.type === 'perfect'

      beatMap.markHit(beat.id, perfect)

      if (perfect) {
        audioEngine.playPerfectSFX()
        get().spawnParticles(columnIndex, 3, note)
      } else {
        audioEngine.playHitSFX()
      }

      const flash: FlashEffect = {
        id: uuidv4(),
        column: columnIndex,
        row: 3,
        time: performance.now(),
      }
      set((state) => ({ flashEffects: [...state.flashEffects, flash] }))
    } else {
      const result = scoreManager.processMiss(note)
      audioEngine.playMissSFX()
    }
  },

  handleKeyPress: (key: string) => {
    const keyMap: Record<string, number> = {
      a: 0, s: 1, d: 2, f: 3, g: 4, h: 5,
      A: 0, S: 1, D: 2, F: 3, G: 4, H: 5,
    }
    const columnIndex = keyMap[key]
    if (columnIndex !== undefined) {
      get().handleColumnClick(columnIndex)
    }
  },

  spawnParticles: (column: number, row: number, note: NoteColor) => {
    const noteColors: Record<NoteColor, string> = {
      C: '#ff6b6b', D: '#feca57', E: '#48dbfb', F: '#1dd1a1', G: '#5f27cd', A: '#ff9ff3',
    }
    const color = noteColors[note]
    const particles: Particle[] = []

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const speed = 60
      particles.push({
        id: uuidv4(),
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 0.4,
        maxLife: 0.4,
        column,
        row,
      })
    }

    set((state) => ({ particles: [...state.particles, ...particles] }))
  },

  update: (deltaTime: number) => {
    const state = get()
    const now = performance.now()
    const dt = deltaTime || 0.016

    let particlesChanged = false
    const updatedParticles = state.particles
      .map((p) => {
        const newLife = p.life - dt
        if (newLife <= 0) {
          particlesChanged = true
          return null
        }
        particlesChanged = true
        return {
          ...p,
          x: p.x + p.vx * dt,
          y: p.y + p.vy * dt,
          life: newLife,
        }
      })
      .filter((p): p is Particle => p !== null)

    const updatedFlashes = state.flashEffects.filter(
      (f) => now - f.time < 100
    )

    if (particlesChanged || updatedFlashes.length !== state.flashEffects.length) {
      set({
        particles: updatedParticles,
        flashEffects: updatedFlashes,
      })
    }
  },
}))
