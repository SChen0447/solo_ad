export type NoteColor = 'C' | 'D' | 'E' | 'F' | 'G' | 'A'

export interface Beat {
  id: string
  time: number
  note: NoteColor
  hit: boolean
  perfect: boolean
  missed: boolean
}

export interface Song {
  id: string
  name: string
  style: 'electronic' | 'classical' | 'jazz'
  duration: number
  bpm: number
  beats: Beat[]
}

export const NOTE_COLORS: Record<NoteColor, string> = {
  C: '#ff6b6b',
  D: '#feca57',
  E: '#48dbfb',
  F: '#1dd1a1',
  G: '#5f27cd',
  A: '#ff9ff3',
}

export const NOTE_KEYS: Record<string, NoteColor> = {
  a: 'C',
  s: 'D',
  d: 'E',
  f: 'F',
  g: 'G',
  h: 'A',
}

export const NOTE_ORDER: NoteColor[] = ['C', 'D', 'E', 'F', 'G', 'A']

function generateBeats(bpm: number, duration: number, pattern: NoteColor[]): Beat[] {
  const beats: Beat[] = []
  const beatInterval = 60 / bpm
  const totalBeats = Math.floor(duration / beatInterval)
  let idCounter = 0

  for (let i = 0; i < totalBeats; i++) {
    const noteIndex = i % pattern.length
    if (Math.random() > 0.2 || i % 4 === 0) {
      beats.push({
        id: `beat-${idCounter++}`,
        time: i * beatInterval,
        note: pattern[noteIndex],
        hit: false,
        perfect: false,
        missed: false,
      })
    }
  }

  return beats
}

export const SONGS: Song[] = [
  {
    id: 'electronic-pulse',
    name: '电子脉冲',
    style: 'electronic',
    duration: 30,
    bpm: 128,
    beats: generateBeats(128, 30, ['C', 'E', 'G', 'E', 'F', 'A', 'G', 'E']),
  },
  {
    id: 'classical-dream',
    name: '古典梦境',
    style: 'classical',
    duration: 30,
    bpm: 90,
    beats: generateBeats(90, 30, ['C', 'D', 'E', 'F', 'G', 'A', 'G', 'F', 'E', 'D']),
  },
  {
    id: 'jazz-swing',
    name: '爵士摇摆',
    style: 'jazz',
    duration: 30,
    bpm: 110,
    beats: generateBeats(110, 30, ['C', 'G', 'E', 'A', 'D', 'F', 'C', 'E', 'G', 'D', 'A', 'F']),
  },
]

export class BeatMap {
  private beats: Beat[]
  private currentIndex: number = 0

  constructor(song: Song) {
    this.beats = JSON.parse(JSON.stringify(song.beats))
  }

  getBeats(): Beat[] {
    return this.beats
  }

  getBeatById(id: string): Beat | undefined {
    return this.beats.find((b) => b.id === id)
  }

  getUpcomingBeats(currentTime: number, window: number = 5): Beat[] {
    return this.beats.filter(
      (b) => b.time >= currentTime && b.time <= currentTime + window && !b.hit && !b.missed
    )
  }

  getActiveBeat(currentTime: number, tolerance: number = 0.15): Beat | null {
    for (let i = this.currentIndex; i < this.beats.length; i++) {
      const beat = this.beats[i]
      if (beat.time - tolerance > currentTime) {
        break
      }
      if (
        Math.abs(beat.time - currentTime) <= tolerance &&
        !beat.hit &&
        !beat.missed
      ) {
        return beat
      }
    }
    return null
  }

  findClosestBeat(note: NoteColor, currentTime: number, tolerance: number = 0.15): Beat | null {
    let closest: Beat | null = null
    let minDiff = Infinity

    for (let i = Math.max(0, this.currentIndex - 2); i < this.beats.length; i++) {
      const beat = this.beats[i]
      if (beat.time - tolerance > currentTime) {
        break
      }
      if (beat.note !== note || beat.hit || beat.missed) {
        continue
      }
      const diff = Math.abs(beat.time - currentTime)
      if (diff <= tolerance && diff < minDiff) {
        minDiff = diff
        closest = beat
      }
    }

    return closest
  }

  markHit(beatId: string, perfect: boolean): void {
    const beat = this.getBeatById(beatId)
    if (beat) {
      beat.hit = true
      beat.perfect = perfect
      if (this.beats[this.currentIndex]?.id === beatId) {
        this.currentIndex++
      }
    }
  }

  markMissed(beatId: string): void {
    const beat = this.getBeatById(beatId)
    if (beat) {
      beat.missed = true
      if (this.beats[this.currentIndex]?.id === beatId) {
        this.currentIndex++
      }
    }
  }

  checkMissedBeats(currentTime: number, tolerance: number = 0.15): Beat[] {
    const missed: Beat[] = []
    for (let i = this.currentIndex; i < this.beats.length; i++) {
      const beat = this.beats[i]
      if (beat.time + tolerance < currentTime && !beat.hit && !beat.missed) {
        beat.missed = true
        missed.push(beat)
        this.currentIndex++
      } else {
        break
      }
    }
    return missed
  }

  reset(): void {
    this.beats.forEach((b) => {
      b.hit = false
      b.perfect = false
      b.missed = false
    })
    this.currentIndex = 0
  }

  getStats() {
    const total = this.beats.length
    const hit = this.beats.filter((b) => b.hit).length
    const perfect = this.beats.filter((b) => b.perfect).length
    const missed = this.beats.filter((b) => b.missed).length
    return { total, hit, perfect, missed }
  }
}
