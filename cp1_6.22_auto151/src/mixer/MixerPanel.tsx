import { useState, useEffect, useCallback } from 'react';
import { eventBus } from '@/events/EventBus';
import { audioEngine, TimbreId, TIMBRE_NAMES, TIMBRE_CONFIGS } from '@/audio/AudioEngine';
import './MixerPanel.css';

interface ChannelState {
  volume: number;
  pan: number;
}

const TIMBRE_ICONS: Record<TimbreId, string> = {
  piano: '🎹',
  synth: '🎛️',
  strings: '🎻',
  guitar: '🎸',
  bass: '🎸',
  drums: '🥁',
};

export function MixerPanel() {
  const [channels, setChannels] = useState<Record<TimbreId, ChannelState>>(() => {
    const initial = {} as Record<TimbreId, ChannelState>;
    (Object.keys(TIMBRE_CONFIGS) as TimbreId[]).forEach((t) => {
      initial[t] = { volume: 0.8, pan: 0 };
    });
    return initial;
  });
  const [usedTimbres, setUsedTimbres] = useState<Set<TimbreId>>(new Set());

  const refreshUsedTimbres = useCallback(() => {
    setUsedTimbres(new Set(audioEngine.getUsedTimbres()));
  }, []);

  useEffect(() => {
    const unsubOn = eventBus.on('note:on', () => {
      refreshUsedTimbres();
    });
    return unsubOn;
  }, [refreshUsedTimbres]);

  const handleVolumeChange = (timbre: TimbreId, value: number) => {
    setChannels((prev) => ({
      ...prev,
      [timbre]: { ...prev[timbre], volume: value },
    }));
    audioEngine.setVolume(timbre, value);
  };

  const handlePanChange = (timbre: TimbreId, value: number) => {
    setChannels((prev) => ({
      ...prev,
      [timbre]: { ...prev[timbre], pan: value },
    }));
    audioEngine.setPan(timbre, value / 100);
  };

  const allTimbres = Object.keys(TIMBRE_CONFIGS) as TimbreId[];
  const displayTimbres = allTimbres.filter((t) => usedTimbres.has(t));

  if (displayTimbres.length === 0) {
    return (
      <div className="mixer-panel">
        <div className="mixer-panel__title">混音台</div>
        <div className="mixer-panel__empty">
          <p>暂无已使用的音色</p>
          <p className="mixer-panel__hint">弹奏琴键后，音色通道将显示在这里</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mixer-panel">
      <div className="mixer-panel__title">混音台</div>
      <div className="mixer-panel__channels">
        {displayTimbres.map((timbre) => (
          <div key={timbre} className="mixer-channel">
            <div className="mixer-channel__header">
              <span className="mixer-channel__icon">{TIMBRE_ICONS[timbre]}</span>
              <span className="mixer-channel__name">{TIMBRE_NAMES[timbre]}</span>
            </div>
            <div className="mixer-channel__controls">
              <div className="volume-slider">
                <div className="volume-slider__track">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={channels[timbre].volume}
                    onChange={(e) => handleVolumeChange(timbre, parseFloat(e.target.value))}
                    className="volume-slider__input"
                    style={{
                      background: `linear-gradient(to top, #38bdf8 ${channels[timbre].volume * 100}%, #334155 ${channels[timbre].volume * 100}%)`,
                    }}
                  />
                </div>
                <span className="volume-slider__label">
                  {Math.round(channels[timbre].volume * 100)}%
                </span>
                <span className="volume-slider__title">音量</span>
              </div>
              <div className="pan-knob">
                <PanKnob
                  value={channels[timbre].pan}
                  onChange={(v) => handlePanChange(timbre, v)}
                />
                <span className="pan-knob__label">
                  {channels[timbre].pan > 0 ? `R${channels[timbre].pan}` : channels[timbre].pan < 0 ? `L${Math.abs(channels[timbre].pan)}` : 'C'}
                </span>
                <span className="pan-knob__title">声像</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface PanKnobProps {
  value: number;
  onChange: (value: number) => void;
}

function PanKnob({ value, onChange }: PanKnobProps) {
  const rotation = (value / 100) * 135;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseInt(e.target.value, 10));
  };

  return (
    <div className="pan-knob__wrapper">
      <div
        className="pan-knob__dial"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <div className="pan-knob__indicator" />
      </div>
      <input
        type="range"
        min="-100"
        max="100"
        step="1"
        value={value}
        onChange={handleChange}
        className="pan-knob__input"
      />
    </div>
  );
}
