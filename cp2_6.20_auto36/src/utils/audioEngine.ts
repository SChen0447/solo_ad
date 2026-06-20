let audioCtx: AudioContext | null = null
let masterGain: GainNode | null = null
let analyser: AnalyserNode | null = null
const activeOscillators: Map<string, { osc: OscillatorNode; gain: GainNode }> = new Map()

export function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    masterGain = audioCtx.createGain()
    masterGain.gain.value = 0.3
    analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    masterGain.connect(analyser)
    analyser.connect(audioCtx.destination)
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

export function getAnalyser(): AnalyserNode | null {
  return analyser
}

export function getCurrentVolume(): number {
  if (!analyser) return 0
  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)
  analyser.getByteTimeDomainData(dataArray)
  let sum = 0
  for (let i = 0; i < bufferLength; i++) {
    const v = (dataArray[i] - 128) / 128
    sum += v * v
  }
  return Math.sqrt(sum / bufferLength)
}

export function playNote(noteId: string, frequency: number, durationMs: number = 300) {
  if (!audioCtx || !masterGain) return

  const osc = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(frequency, audioCtx.currentTime)

  const attack = 0.02
  const release = 0.15
  const peak = 0.4
  gain.gain.setValueAtTime(0, audioCtx.currentTime)
  gain.gain.linearRampToValueAtTime(peak, audioCtx.currentTime + attack)
  gain.gain.setValueAtTime(peak, audioCtx.currentTime + durationMs / 1000 - release)
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + durationMs / 1000)

  osc.connect(gain)
  gain.connect(masterGain)
  osc.start()
  osc.stop(audioCtx.currentTime + durationMs / 1000 + 0.05)

  if (activeOscillators.has(noteId)) {
    try { activeOscillators.get(noteId)!.osc.stop() } catch {}
  }
  activeOscillators.set(noteId, { osc, gain })

  setTimeout(() => {
    activeOscillators.delete(noteId)
  }, durationMs + 100)
}

export function stopAll() {
  for (const { osc } of activeOscillators.values()) {
    try { osc.stop() } catch {}
  }
  activeOscillators.clear()
}
