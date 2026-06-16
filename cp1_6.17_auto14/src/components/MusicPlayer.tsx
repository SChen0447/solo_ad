import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import * as Tone from 'tone'
import type { SheetMusic, Note } from '../utils/emotionAnalyzer'

export type InstrumentType = 'piano' | 'synth' | 'strings' | 'guitar'
export type TrackName = 'melody' | 'chord' | 'bass'

export interface TrackSettings {
  volume: number
  instrument: InstrumentType
}

export interface MixerSettings {
  melody: TrackSettings
  chord: TrackSettings
  bass: TrackSettings
}

interface MusicPlayerProps {
  sheetMusic: SheetMusic | null
  onExportReady?: (blob: Blob) => void
}

const INSTRUMENTS: { key: InstrumentType; label: string }[] = [
  { key: 'piano', label: '钢琴' },
  { key: 'synth', label: '电子琴' },
  { key: 'strings', label: '弦乐' },
  { key: 'guitar', label: '吉他' },
]

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

function createInstrument(
  type: InstrumentType,
  track: TrackName,
  destination: Tone.Gain
): Tone.PolySynth | Tone.Synth {
  const gain = new Tone.Gain(0).connect(destination)
  let synth: Tone.PolySynth | Tone.Synth

  switch (type) {
    case 'piano': {
      const poly = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.3, sustain: 0.1, release: 1.2 },
      }).connect(gain)
      synth = poly
      break
    }
    case 'synth': {
      const poly = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        filterEnvelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.8 },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 0.8 },
      }).connect(gain)
      ;(synth as Tone.PolySynth).volume.value = track === 'bass' ? -12 : -8
      synth = poly
      break
    }
    case 'strings': {
      const poly = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.15, decay: 0.2, sustain: 0.6, release: 1.8 },
      }).connect(gain)
      ;(synth as Tone.PolySynth).volume.value = track === 'chord' ? -14 : -10
      synth = poly
      break
    }
    case 'guitar': {
      const poly = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.008, decay: 0.25, sustain: 0.2, release: 0.9 },
      }).connect(gain)
      synth = poly
      break
    }
    default: {
      const poly = new Tone.PolySynth(Tone.Synth).connect(gain)
      synth = poly
    }
  }
  ;(synth as unknown as { _gainNode: Tone.Gain })._gainNode = gain
  return synth
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ sheetMusic, onExportReady }) => {
  const masterGainRef = useRef<Tone.Gain | null>(null)
  const tracksRef = useRef<{
    melody: { synth: Tone.PolySynth | Tone.Synth; gain: Tone.Gain; instrument: InstrumentType } | null
    chord: { synth: Tone.PolySynth | Tone.Synth; gain: Tone.Gain; instrument: InstrumentType } | null
    bass: { synth: Tone.PolySynth | Tone.Synth; gain: Tone.Gain; instrument: InstrumentType } | null
  }>({ melody: null, chord: null, bass: null })
  const scheduledEventsRef = useRef<number[]>([])
  const playStartRef = useRef<number>(0)
  const pauseAtRef = useRef<number>(0)
  const rafRef = useRef<number | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [volume, setVolume] = useState(70)
  const [bpmOffset, setBpmOffset] = useState(0)
  const [activeInstrument, setActiveInstrument] = useState<InstrumentType>('piano')
  const [mixerSettings, setMixerSettings] = useState<MixerSettings>({
    melody: { volume: 80, instrument: 'piano' },
    chord: { volume: 60, instrument: 'piano' },
    bass: { volume: 50, instrument: 'piano' },
  })
  const [tabRects, setTabRects] = useState<{ left: number; width: number }>({ left: 0, width: 0 })
  const tabContainerRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Record<InstrumentType, HTMLButtonElement | null>>({
    piano: null, synth: null, strings: null, guitar: null,
  })

  const effectiveBpm = useMemo(() => {
    if (!sheetMusic) return 120
    return Math.max(40, Math.min(220, sheetMusic.bpm + bpmOffset))
  }, [sheetMusic, bpmOffset])

  const totalDuration = useMemo(() => {
    if (!sheetMusic) return 0
    const secondsPerBeat = 60 / effectiveBpm
    const beatsPerBar = sheetMusic.timeSignature[0]
    return sheetMusic.bars * beatsPerBar * secondsPerBeat
  }, [sheetMusic, effectiveBpm])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const initAudio = useCallback(() => {
    if (!masterGainRef.current) {
      masterGainRef.current = new Tone.Gain(volume / 100).toDestination()
    }
  }, [volume])

  const buildTracks = useCallback((instOverride?: InstrumentType) => {
    if (!masterGainRef.current) return
    const baseInst = instOverride ?? activeInstrument

    const tracks: Array<TrackName> = ['melody', 'chord', 'bass']
    tracks.forEach((trackName) => {
      const old = tracksRef.current[trackName]
      if (old) {
        try {
          old.synth.dispose()
          old.gain.dispose()
        } catch {}
        tracksRef.current[trackName] = null
      }

      const inst = instOverride
        ? baseInst
        : mixerSettings[trackName].instrument
      const trackGain = new Tone.Gain(mixerSettings[trackName].volume / 100)
        .connect(masterGainRef.current!)
      const synth = createInstrument(inst, trackName, trackGain)
      const gainNode = (synth as unknown as { _gainNode: Tone.Gain })._gainNode
      gainNode.gain.value = 1
      tracksRef.current[trackName] = { synth, gain: trackGain, instrument: inst }
    })
  }, [activeInstrument, mixerSettings])

  const scheduleAllNotes = useCallback(() => {
    if (!sheetMusic) return
    const secondsPerBeat = 60 / effectiveBpm
    const events: number[] = []

    sheetMusic.notes.forEach((note: Note) => {
      const startTime = note.startTime * secondsPerBeat
      const dur = note.duration * secondsPerBeat
      const track = tracksRef.current[note.track]
      if (!track) return

      const freq = midiToFreq(note.pitch)
      const vel = note.velocity ?? 0.8

      const now = Tone.now()
      const schedTime = now + startTime + 0.05

      if (note.track === 'chord' || track.synth instanceof Tone.PolySynth) {
        const id = Tone.Transport.scheduleOnce(() => {
          ;(track.synth as Tone.PolySynth).triggerAttackRelease(
            freq,
            Math.max(dur * 0.95, 0.05),
            undefined,
            vel
          )
        }, schedTime - now)
        events.push(id)
      } else {
        const id = Tone.Transport.scheduleOnce(() => {
          ;(track.synth as Tone.Synth).triggerAttackRelease(
            freq,
            Math.max(dur * 0.95, 0.05),
            undefined,
            vel
          )
        }, schedTime - now)
        events.push(id)
      }
    })

    scheduledEventsRef.current = events
  }, [sheetMusic, effectiveBpm])

  const unscheduleAll = useCallback(() => {
    scheduledEventsRef.current.forEach((id) => {
      try { Tone.Transport.clear(id) } catch {}
    })
    scheduledEventsRef.current = []
  }, [])

  const stopProgressTick = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const startProgressTick = useCallback((startElapsed: number) => {
    stopProgressTick()
    const beginPerf = performance.now() - startElapsed * 1000
    const tick = () => {
      const elapsed = (performance.now() - beginPerf) / 1000
      if (elapsed >= totalDuration) {
        setProgress(totalDuration)
        setIsPlaying(false)
        pauseAtRef.current = 0
        Tone.Transport.stop()
        unscheduleAll()
        stopProgressTick()
        return
      }
      setProgress(elapsed)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [totalDuration, stopProgressTick, unscheduleAll])

  const handlePlay = useCallback(async () => {
    if (!sheetMusic) return
    await Tone.start()
    initAudio()
    if (!tracksRef.current.melody) {
      buildTracks()
    }

    if (isPlaying) {
      Tone.Transport.pause()
      pauseAtRef.current = progress
      setIsPlaying(false)
      stopProgressTick()
      return
    }

    unscheduleAll()
    scheduleAllNotes()

    const resumeFrom = pauseAtRef.current
    Tone.Transport.start('+0.05', resumeFrom)
    playStartRef.current = resumeFrom
    setIsPlaying(true)
    startProgressTick(resumeFrom)
  }, [sheetMusic, isPlaying, progress, initAudio, buildTracks, scheduleAllNotes, unscheduleAll, startProgressTick, stopProgressTick])

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!sheetMusic || totalDuration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const targetTime = ratio * totalDuration
    pauseAtRef.current = targetTime
    setProgress(targetTime)
    if (isPlaying) {
      Tone.Transport.stop()
      unscheduleAll()
      scheduleAllNotes()
      Tone.Transport.start('+0.05', targetTime)
      playStartRef.current = targetTime
      startProgressTick(targetTime)
    }
  }, [sheetMusic, totalDuration, isPlaying, scheduleAllNotes, unscheduleAll, startProgressTick])

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10)
    setVolume(v)
    if (masterGainRef.current) {
      masterGainRef.current.gain.rampTo(v / 100, 0.1)
    }
  }, [])

  const handleInstrumentChange = useCallback((inst: InstrumentType) => {
    setActiveInstrument(inst)
    initAudio()
    const wasPlaying = isPlaying
    if (wasPlaying) {
      Tone.Transport.pause()
      stopProgressTick()
      unscheduleAll()
    }
    setMixerSettings((prev) => ({
      melody: { ...prev.melody, instrument: inst },
      chord: { ...prev.chord, instrument: inst },
      bass: { ...prev.bass, instrument: inst },
    }))
    buildTracks(inst)
    if (wasPlaying) {
      scheduleAllNotes()
      Tone.Transport.start('+0.1', progress)
      startProgressTick(progress)
      setIsPlaying(true)
    }
  }, [initAudio, isPlaying, buildTracks, scheduleAllNotes, unscheduleAll, stopProgressTick, startProgressTick, progress])

  const handleBpmChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const offset = parseInt(e.target.value, 10)
    setBpmOffset(offset)
  }, [])

  const handleTrackVolumeChange = useCallback((track: TrackName, vol: number) => {
    setMixerSettings((prev) => ({
      ...prev,
      [track]: { ...prev[track], volume: vol },
    }))
    const t = tracksRef.current[track]
    if (t) {
      t.gain.gain.rampTo(vol / 100, 0.1)
    }
  }, [])

  const handleTrackInstrumentChange = useCallback((track: TrackName, inst: InstrumentType) => {
    setMixerSettings((prev) => ({
      ...prev,
      [track]: { ...prev[track], instrument: inst },
    }))
    const wasPlaying = isPlaying
    if (wasPlaying) {
      Tone.Transport.pause()
      stopProgressTick()
      unscheduleAll()
    }
    const old = tracksRef.current[track]
    if (old && masterGainRef.current) {
      try { old.synth.dispose(); old.gain.dispose() } catch {}
      const trackGain = new Tone.Gain(mixerSettings[track].volume / 100).connect(masterGainRef.current)
      const synth = createInstrument(inst, track, trackGain)
      tracksRef.current[track] = { synth, gain: trackGain, instrument: inst }
    }
    if (wasPlaying) {
      scheduleAllNotes()
      Tone.Transport.start('+0.1', progress)
      startProgressTick(progress)
      setIsPlaying(true)
    }
  }, [isPlaying, mixerSettings, scheduleAllNotes, unscheduleAll, stopProgressTick, startProgressTick, progress])

  const exportWav = useCallback(async () => {
    if (!sheetMusic) return
    await Tone.start()
    initAudio()
    if (!tracksRef.current.melody) buildTracks()

    const sampleRate = 44100
    const duration = totalDuration + 1.0
    const offline = new Tone.Offline(2, duration, sampleRate)
    const renderMaster = new Tone.Gain(volume / 100).connect(offline.destination)

    const renderTracks: Record<TrackName, { synth: Tone.PolySynth | Tone.Synth }> = {
      melody: { synth: new Tone.PolySynth(Tone.Synth) },
      chord: { synth: new Tone.PolySynth(Tone.Synth) },
      bass: { synth: new Tone.PolySynth(Tone.Synth) },
    }
    const tr: TrackName[] = ['melody', 'chord', 'bass']
    tr.forEach((tn) => {
      const g = new Tone.Gain(mixerSettings[tn].volume / 100).connect(renderMaster)
      renderTracks[tn].synth.connect(g)
    })

    const secondsPerBeat = 60 / effectiveBpm
    sheetMusic.notes.forEach((note) => {
      const freq = midiToFreq(note.pitch)
      const t = note.startTime * secondsPerBeat
      const d = Math.max(note.duration * secondsPerBeat * 0.95, 0.05)
      const vel = note.velocity ?? 0.8
      const ps = renderTracks[note.track].synth as Tone.PolySynth
      ps.triggerAttackRelease(freq, d, t, vel)
    })

    const buffer = await offline.render()
    const audioBuffer: AudioBuffer = buffer as unknown as AudioBuffer
    const length = audioBuffer.length
    const numChannels = audioBuffer.numberOfChannels
    const interleaved = new Float32Array(length * numChannels)
    for (let ch = 0; ch < numChannels; ch++) {
      const data = audioBuffer.getChannelData(ch)
      for (let i = 0; i < length; i++) {
        interleaved[i * numChannels + ch] = data[i]
      }
    }

    const wavBytes = encodeWAV(interleaved, numChannels, sampleRate)
    const blob = new Blob([wavBytes], { type: 'audio/wav' })

    tr.forEach((tn) => {
      try { renderTracks[tn].synth.dispose() } catch {}
    })

    const filename = `emotion-music-${Date.now()}.wav`
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)

    if (onExportReady) onExportReady(blob)
  }, [sheetMusic, totalDuration, volume, mixerSettings, effectiveBpm, initAudio, buildTracks, onExportReady])

  useEffect(() => {
    pauseAtRef.current = 0
    setProgress(0)
    setIsPlaying(false)
    unscheduleAll()
    Tone.Transport.stop()
    stopProgressTick()
  }, [sheetMusic, unscheduleAll, stopProgressTick])

  useEffect(() => {
    const update = () => {
      if (!tabContainerRef.current) return
      const active = tabRefs.current[activeInstrument]
      if (active) {
        setTabRects({
          left: active.offsetLeft,
          width: active.offsetWidth,
        })
      }
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [activeInstrument])

  useEffect(() => {
    return () => {
      stopProgressTick()
      unscheduleAll()
      Tone.Transport.stop()
      const tr: TrackName[] = ['melody', 'chord', 'bass']
      tr.forEach((tn) => {
        const t = tracksRef.current[tn]
        if (t) { try { t.synth.dispose(); t.gain.dispose() } catch {} }
      })
      if (masterGainRef.current) { try { masterGainRef.current.dispose() } catch {} }
    }
  }, [stopProgressTick, unscheduleAll])

  const bpmMin = -20, bpmMax = 20
  const bpmRatio = (bpmOffset - bpmMin) / (bpmMax - bpmMin)
  const knobCircum = 2 * Math.PI * 20
  const knobOffset = knobCircum * (1 - bpmRatio * 0.75)

  const hasSheet = !!sheetMusic

  return (
    <div className="player-bar glass-strong neon-border">
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="knobGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e94560" />
            <stop offset="100%" stopColor="#0f3460" />
          </linearGradient>
        </defs>
      </svg>

      <div className="player-content">
        <div className="player-main-controls">
          <button
            className="play-btn"
            onClick={handlePlay}
            disabled={!hasSheet}
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button
            className="btn btn-secondary"
            onClick={exportWav}
            disabled={!hasSheet}
            style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem' }}
          >
            导出WAV
          </button>
        </div>

        <div className="player-progress-section">
          <div className="instrument-tabs" ref={tabContainerRef}>
            {INSTRUMENTS.map((inst) => (
              <button
                key={inst.key}
                ref={(el) => { tabRefs.current[inst.key] = el }}
                className={`instrument-tab ${activeInstrument === inst.key ? 'active' : ''}`}
                onClick={() => handleInstrumentChange(inst.key)}
                disabled={!hasSheet}
              >
                {inst.label}
              </button>
            ))}
            <div
              className="instrument-underline"
              style={{ left: `${tabRects.left}px`, width: `${tabRects.width}px` }}
            />
          </div>
          <div className="progress-container">
            <span className="time-label">{formatTime(progress)}</span>
            <div className="progress-bar" onClick={handleSeek}>
              <div
                className="progress-fill"
                style={{ width: `${totalDuration > 0 ? (progress / totalDuration) * 100 : 0}%` }}
              />
            </div>
            <span className="time-label">{formatTime(totalDuration)}</span>
          </div>
        </div>

        <div className="controls-row">
          <div className="slider-group">
            <span className="slider-label">音量</span>
            <input
              type="range"
              className="slider"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
            />
            <span className="slider-value">{volume}%</span>
          </div>
          <div className="knob-group">
            <span className="knob-label">BPM</span>
            <div className="knob-wrapper">
              <svg className="knob-svg" viewBox="0 0 50 50">
                <circle className="knob-bg" cx="25" cy="25" r="20" />
                <circle
                  className="knob-fill"
                  cx="25"
                  cy="25"
                  r="20"
                  strokeDasharray={knobCircum}
                  strokeDashoffset={knobOffset}
                />
              </svg>
            </div>
            <input
              type="range"
              className="slider"
              min={bpmMin}
              max={bpmMax}
              value={bpmOffset}
              onChange={handleBpmChange}
              style={{ width: '80px', position: 'absolute', opacity: 0, pointerEvents: 'none' }}
            />
            <span className="knob-value">{effectiveBpm}</span>
            <input
              type="range"
              min={bpmMin}
              max={bpmMax}
              value={bpmOffset}
              onChange={handleBpmChange}
              style={{ width: '80px' }}
              className="slider"
            />
          </div>
        </div>
      </div>

      {sheetMusic && (
        <TimbreMixerInline
          settings={mixerSettings}
          onTrackVolumeChange={handleTrackVolumeChange}
          onTrackInstrumentChange={handleTrackInstrumentChange}
        />
      )}
    </div>
  )
}

interface InlineMixerProps {
  settings: MixerSettings
  onTrackVolumeChange: (track: TrackName, vol: number) => void
  onTrackInstrumentChange: (track: TrackName, inst: InstrumentType) => void
}

const TimbreMixerInline: React.FC<InlineMixerProps> = ({ settings, onTrackVolumeChange, onTrackInstrumentChange }) => {
  const [open, setOpen] = useState(false)
  const tracks: Array<{ key: TrackName; label: string }> = [
    { key: 'melody', label: '主旋律' },
    { key: 'chord', label: '和弦伴奏' },
    { key: 'bass', label: '低音' },
  ]
  return (
    <div style={{ maxWidth: 1400, margin: '12px auto 0' }}>
      <div
        className={`mixer-toggle ${open ? 'open' : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>⚙ 音色混音器（高级）</h3>
        <span className="mixer-toggle-icon">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="mixer-tracks" style={{ marginTop: '0.8rem' }}>
          {tracks.map((t) => (
            <div key={t.key} className="mixer-track">
              <div className="track-name">{t.label}</div>
              <select
                className="track-instrument-select"
                value={settings[t.key].instrument}
                onChange={(e) => onTrackInstrumentChange(t.key, e.target.value as InstrumentType)}
              >
                {INSTRUMENTS.map((inst) => (
                  <option key={inst.key} value={inst.key}>{inst.label}</option>
                ))}
              </select>
              <div className="track-volume">
                <span className="slider-label" style={{ minWidth: 30 }}>{settings[t.key].volume}%</span>
                <input
                  type="range"
                  className="slider"
                  min="0"
                  max="100"
                  value={settings[t.key].volume}
                  onChange={(e) => onTrackVolumeChange(t.key, parseInt(e.target.value, 10))}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MusicPlayer

export interface TimbreMixerProps {
  settings: MixerSettings
  onTrackVolumeChange: (track: TrackName, vol: number) => void
  onTrackInstrumentChange: (track: TrackName, inst: InstrumentType) => void
}

function encodeWAV(samples: Float32Array, numChannels: number, sampleRate: number): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }
  let offset = 0
  writeString(offset, 'RIFF'); offset += 4
  view.setUint32(offset, 36 + samples.length * 2, true); offset += 4
  writeString(offset, 'WAVE'); offset += 4
  writeString(offset, 'fmt '); offset += 4
  view.setUint32(offset, 16, true); offset += 4
  view.setUint16(offset, 1, true); offset += 2
  view.setUint16(offset, numChannels, true); offset += 2
  view.setUint32(offset, sampleRate, true); offset += 4
  view.setUint32(offset, sampleRate * numChannels * 2, true); offset += 4
  view.setUint16(offset, numChannels * 2, true); offset += 2
  view.setUint16(offset, 16, true); offset += 2
  writeString(offset, 'data'); offset += 4
  view.setUint32(offset, samples.length * 2, true); offset += 4
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
  }
  return buffer
}
