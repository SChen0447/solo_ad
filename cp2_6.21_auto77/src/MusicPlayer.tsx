import React, { useCallback, useEffect, useRef, useState } from 'react';

const TRACKS = [
  { title: '高山流水', freq: 220 },
  { title: '梅花三弄', freq: 261 },
  { title: '广陵散', freq: 196 },
  { title: '平沙落雁', freq: 293 },
];

function generateGuqinTone(audioCtx: AudioContext, frequency: number): AudioBuffer {
  const sampleRate = audioCtx.sampleRate;
  const duration = 4;
  const length = sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const envelope = Math.exp(-t * 0.8) * (1 - Math.exp(-t * 20));
    const fundamental = Math.sin(2 * Math.PI * frequency * t);
    const harmonic2 = Math.sin(2 * Math.PI * frequency * 2 * t) * 0.4;
    const harmonic3 = Math.sin(2 * Math.PI * frequency * 3 * t) * 0.15;
    const harmonic4 = Math.sin(2 * Math.PI * frequency * 4 * t) * 0.08;
    const vibrato = Math.sin(2 * Math.PI * 5 * t) * 0.002;
    data[i] = envelope * (fundamental + harmonic2 + harmonic3 + harmonic4) * (1 + vibrato) * 0.3;
  }
  return buffer;
}

const GuqinIcon: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FAF0E6" strokeWidth="1.5">
    <rect x="4" y="6" width="16" height="12" rx="2" />
    <line x1="7" y1="6" x2="7" y2="18" />
    <line x1="10" y1="6" x2="10" y2="18" />
    <line x1="13" y1="6" x2="13" y2="18" />
    <line x1="16" y1="6" x2="16" y2="18" />
    <line x1="19" y1="6" x2="19" y2="18" />
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
  </svg>
);

const MusicPlayer: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  const stopSource = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch (_e) { /* ignore */ }
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
  }, []);

  const play = useCallback(() => {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    stopSource();

    const buffer = generateGuqinTone(ctx, TRACKS[trackIndex].freq);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const gain = ctx.createGain();
    gain.gain.value = volume;

    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();

    sourceRef.current = source;
    gainRef.current = gain;
    setPlaying(true);
  }, [trackIndex, volume, getAudioCtx, stopSource]);

  const pause = useCallback(() => {
    stopSource();
    setPlaying(false);
  }, [stopSource]);

  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.value = volume;
    }
  }, [volume]);

  useEffect(() => {
    return () => {
      stopSource();
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, [stopSource]);

  const togglePlay = useCallback(() => {
    if (playing) {
      pause();
    } else {
      play();
    }
  }, [playing, play, pause]);

  const switchTrack = useCallback((idx: number) => {
    setTrackIndex(idx);
    if (playing) {
      stopSource();
      const ctx = getAudioCtx();
      const buffer = generateGuqinTone(ctx, TRACKS[idx].freq);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = volume;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      sourceRef.current = source;
      gainRef.current = gain;
    }
  }, [playing, volume, getAudioCtx, stopSource]);

  return (
    <>
      <style>{`
        .guqin-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #D7CCC8;
          cursor: pointer;
          border: none;
        }
        .guqin-slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #D7CCC8;
          cursor: pointer;
          border: none;
        }
      `}</style>
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1000,
        fontFamily: "'KaiTi', 'STKaiti', serif",
      }}
    >
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: expanded ? 220 : 48,
          height: expanded ? 140 : 48,
          background: expanded ? '#3E2723' : '#5D4037',
          borderRadius: expanded ? 8 : 24,
          overflow: 'hidden',
          transition: 'all 0.3s ease-out',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}
      >
        {expanded && (
          <div style={{ padding: '14px 16px', color: '#FAF0E6' }}>
            <div style={{ fontSize: 14, marginBottom: 8, fontWeight: 700 }}>
              🎵 {TRACKS[trackIndex].title}
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {TRACKS.map((track, i) => (
                <button
                  key={i}
                  onClick={() => switchTrack(i)}
                  style={{
                    background: i === trackIndex ? '#5D4037' : 'transparent',
                    border: '1px solid #5D4037',
                    color: '#FAF0E6',
                    borderRadius: 4,
                    padding: '2px 8px',
                    fontSize: 11,
                    cursor: 'pointer',
                    fontFamily: "'KaiTi', 'STKaiti', serif",
                  }}
                >
                  {track.title.slice(0, 2)}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={togglePlay}
                style={{
                  background: '#5D4037',
                  border: 'none',
                  color: '#FAF0E6',
                  width: 28,
                  height: 28,
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: "'KaiTi', 'STKaiti', serif",
                }}
              >
                {playing ? '⏸' : '▶'}
              </button>

              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                className="guqin-slider"
                onChange={e => setVolume(parseFloat(e.target.value))}
                style={{
                  flex: 1,
                  height: 4,
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  background: '#5D4037',
                  borderRadius: 2,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => setExpanded(prev => !prev)}
        style={{
          position: 'relative',
          zIndex: 10,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: '#5D4037',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
          transition: 'background 0.3s ease-out',
          float: 'right',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = '#4E342E';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = '#5D4037';
        }}
      >
        <GuqinIcon />
      </button>
    </div>
    </>
  );
};

export default MusicPlayer;
