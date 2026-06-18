import { create } from 'zustand'
import { RecordingState } from '../types'

interface RecorderState {
  recordingState: RecordingState
  mediaRecorder: MediaRecorder | null
  recordedChunks: Blob[]
  canvas: HTMLCanvasElement | null

  setCanvas: (canvas: HTMLCanvasElement | null) => void
  startRecording: () => void
  stopRecording: () => void
  downloadVideo: () => void
  resetRecorder: () => void
}

export const useRecorderStore = create<RecorderState>((set, get) => ({
  recordingState: RecordingState.Idle,
  mediaRecorder: null,
  recordedChunks: [],
  canvas: null,

  setCanvas: (canvas) => {
    set({ canvas })
  },

  startRecording: () => {
    const { canvas } = get()
    if (!canvas) {
      console.warn('Canvas not available for recording')
      return
    }

    try {
      const stream = canvas.captureStream(60)
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 8_000_000,
      })
      const chunks: Blob[] = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.start()

      set({
        mediaRecorder,
        recordedChunks: chunks,
        recordingState: RecordingState.Recording,
      })
    } catch (error) {
      console.error('Failed to start recording:', error)
    }
  },

  stopRecording: () => {
    const { mediaRecorder } = get()
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      return
    }

    set({ recordingState: RecordingState.Processing })

    mediaRecorder.onstop = () => {
      set({ recordingState: RecordingState.Idle })
    }

    mediaRecorder.stop()
  },

  downloadVideo: () => {
    const { recordedChunks } = get()
    if (recordedChunks.length === 0) {
      console.warn('No recorded data available')
      return
    }

    const blob = new Blob(recordedChunks, { type: 'video/webm' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `light-sculpture-${Date.now()}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

  resetRecorder: () => {
    set({
      mediaRecorder: null,
      recordedChunks: [],
      recordingState: RecordingState.Idle,
    })
  },
}))
