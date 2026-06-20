export interface Note {
  id: string
  name: string
  frequency: number
  octave: number
  index: number
}

export interface PlacedNote {
  id: string
  noteId: string
  beat: number
  note: Note
}

export interface ActiveNoteInfo {
  placedNoteId: string
  name: string
  index: number
  frequency: number
  startTime: number
}
