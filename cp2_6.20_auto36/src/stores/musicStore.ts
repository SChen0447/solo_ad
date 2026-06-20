import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Note, PlacedNote, ActiveNoteInfo } from '@/types/music'

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const NOTE_FREQUENCIES: Record<string, number> = {
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13,
  'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00,
  'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25,
  'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99,
  'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77
}

function generateNotes(): Note[] {
  const notes: Note[] = []
  let idx = 0
  for (let octave = 4; octave <= 5; octave++) {
    for (const name of NOTE_NAMES) {
      const fullName = `${name}${octave}`
      notes.push({
        id: `note-${idx}`,
        name: fullName,
        frequency: NOTE_FREQUENCIES[fullName],
        octave,
        index: idx
      })
      idx++
    }
  }
  return notes
}

export function getNoteColor(index: number): string {
  const t = index / 23
  const r1 = 79, g1 = 70, b1 = 229
  const r2 = 124, g2 = 58, b2 = 237
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  return `rgb(${r}, ${g}, ${b})`
}

export function getNoteHeight(index: number): number {
  const minH = 60, maxH = 120
  return minH + (maxH - minH) * (index / 23)
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

export const useMusicStore = defineStore('music', () => {
  const notes = ref<Note[]>(generateNotes())
  const placedNotes = ref<PlacedNote[]>([])
  const selectedNoteId = ref<string | null>(null)
  const isPlaying = ref(false)
  const currentBeat = ref(0)
  const currentBeatFloat = ref(0)
  const tempo = ref(1.0)
  const totalBeats = ref(80)
  const beatWidth = ref(40)
  const activeNotes = ref<ActiveNoteInfo[]>([])
  const isResetting = ref(false)
  const playbackStartTime = ref(0)
  const startBeatFloat = ref(0)

  const beatDurationMs = computed(() => 500 / tempo.value)

  function addNoteToTimeline(noteId: string, beat: number) {
    const note = notes.value.find(n => n.id === noteId)
    if (!note) return
    const existing = placedNotes.value.find(p => p.beat === beat)
    if (existing) return
    placedNotes.value.push({
      id: uid(),
      noteId,
      beat,
      note
    })
  }

  function removeNoteById(placedNoteId: string) {
    placedNotes.value = placedNotes.value.filter(p => p.id !== placedNoteId)
    if (selectedNoteId.value === placedNoteId) {
      selectedNoteId.value = null
    }
  }

  function removeSelectedNote() {
    if (selectedNoteId.value) {
      removeNoteById(selectedNoteId.value)
    }
  }

  function selectNote(placedNoteId: string | null) {
    selectedNoteId.value = placedNoteId
  }

  function togglePlay() {
    isPlaying.value = !isPlaying.value
    if (isPlaying.value) {
      playbackStartTime.value = performance.now()
      startBeatFloat.value = currentBeatFloat.value
    }
  }

  function resetPlayback() {
    isPlaying.value = false
    isResetting.value = true
    currentBeatFloat.value = 0
    currentBeat.value = 0
    activeNotes.value = []
    setTimeout(() => {
      isResetting.value = false
    }, 500)
  }

  function setTempo(value: number) {
    tempo.value = Math.max(0.5, Math.min(2.0, value))
  }

  function updatePlayback(now: number) {
    if (!isPlaying.value) return
    const elapsed = now - playbackStartTime.value
    currentBeatFloat.value = startBeatFloat.value + (elapsed / beatDurationMs.value)
    const newBeat = Math.floor(currentBeatFloat.value)

    if (newBeat >= totalBeats.value) {
      resetPlayback()
      return
    }

    if (newBeat !== currentBeat.value) {
      const beatNotes = placedNotes.value.filter(p => p.beat === newBeat)
      for (const pn of beatNotes) {
        activeNotes.value.push({
          placedNoteId: pn.id,
          name: pn.note.name,
          index: pn.note.index,
          frequency: pn.note.frequency,
          startTime: now
        })
      }
      currentBeat.value = newBeat
    }

    const cutoff = now - 400
    activeNotes.value = activeNotes.value.filter(a => a.startTime > cutoff)
  }

  function clearActiveNote(placedNoteId: string) {
    activeNotes.value = activeNotes.value.filter(a => a.placedNoteId !== placedNoteId)
  }

  return {
    notes,
    placedNotes,
    selectedNoteId,
    isPlaying,
    currentBeat,
    currentBeatFloat,
    tempo,
    totalBeats,
    beatWidth,
    activeNotes,
    isResetting,
    beatDurationMs,
    addNoteToTimeline,
    removeNoteById,
    removeSelectedNote,
    selectNote,
    togglePlay,
    resetPlayback,
    setTempo,
    updatePlayback,
    clearActiveNote
  }
})
