import React from 'react'

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

export interface TimbreMixerProps {
  settings: MixerSettings
  onTrackVolumeChange: (track: TrackName, vol: number) => void
  onTrackInstrumentChange: (track: TrackName, inst: InstrumentType) => void
  className?: string
}

const INSTRUMENTS: { key: InstrumentType; label: string }[] = [
  { key: 'piano', label: '钢琴' },
  { key: 'synth', label: '电子琴' },
  { key: 'strings', label: '弦乐' },
  { key: 'guitar', label: '吉他' },
]

const TRACKS: Array<{ key: TrackName; label: string; icon: string }> = [
  { key: 'melody', label: '主旋律', icon: '🎵' },
  { key: 'chord', label: '和弦伴奏', icon: '🎹' },
  { key: 'bass', label: '低音', icon: '🎸' },
]

const TimbreMixer: React.FC<TimbreMixerProps> = ({
  settings,
  onTrackVolumeChange,
  onTrackInstrumentChange,
  className = '',
}) => {
  return (
    <div className={`mixer-section glass neon-border ${className}`}>
      <h3 className="section-title">🎚 音色混音器</h3>
      <div className="mixer-tracks">
        {TRACKS.map((track) => (
          <div key={track.key} className="mixer-track">
            <div className="track-name">
              <span style={{ marginRight: '0.4rem' }}>{track.icon}</span>
              {track.label}
            </div>
            <select
              className="track-instrument-select"
              value={settings[track.key].instrument}
              onChange={(e) =>
                onTrackInstrumentChange(track.key, e.target.value as InstrumentType)
              }
            >
              {INSTRUMENTS.map((inst) => (
                <option key={inst.key} value={inst.key}>
                  {inst.label}
                </option>
              ))}
            </select>
            <div className="track-volume">
              <input
                type="range"
                className="slider"
                min="0"
                max="100"
                value={settings[track.key].volume}
                onChange={(e) =>
                  onTrackVolumeChange(track.key, parseInt(e.target.value, 10))
                }
              />
              <span className="slider-value">{settings[track.key].volume}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TimbreMixer
