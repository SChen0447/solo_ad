import type { MusicSuggestion } from './sentimentAnalyzer';

export interface PlaybackState {
  isPlaying: boolean;
  suggestionId: string | null;
  stop: (() => void) | null;
}

type Instrument = 'piano' | 'synth' | 'guitar' | 'cello' | 'violin' | 'viola' | 'bass' | 'drum';

const INSTRUMENT_FREQS: Record<Instrument, { base: number; harmonics: number[]; waveform: OscillatorType }> = {
  piano: { base: 261.63, harmonics: [1, 2, 3, 4], waveform: 'triangle' },
  synth: { base: 220, harmonics: [1, 1.5, 2], waveform: 'sawtooth' },
  guitar: { base: 196, harmonics: [1, 2, 3], waveform: 'square' },
  cello: { base: 65.41, harmonics: [1, 2, 3, 4, 5], waveform: 'sawtooth' },
  violin: { base: 293.66, harmonics: [1, 2, 3, 4], waveform: 'sawtooth' },
  viola: { base: 130.81, harmonics: [1, 2, 3], waveform: 'sawtooth' },
  bass: { base: 82.41, harmonics: [1, 2], waveform: 'sine' },
  drum: { base: 120, harmonics: [1, 2, 3, 4, 5, 6], waveform: 'sine' },
};

const SCALE_MAJOR = [0, 2, 4, 5, 7, 9, 11, 12];
const SCALE_MINOR = [0, 2, 3, 5, 7, 8, 10, 12];

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function getScaleForStyle(style: string): number[] {
  const minorStyles = ['strings', 'ambient', 'piano'];
  if (style === 'strings' || style === 'ambient') return SCALE_MINOR;
  return SCALE_MAJOR;
}

function noteFromScale(scaleIndex: number, scale: number[], baseMidi: number, octaveShift: number = 0): number {
  const octave = Math.floor(scaleIndex / scale.length);
  const degree = scaleIndex % scale.length;
  return baseMidi + (octave + octaveShift) * 12 + scale[degree];
}

export function playSuggestion(
  suggestion: MusicSuggestion,
  durationSec: number = 5
): { stop: () => void; audioContext: AudioContext } {
  const AudioCtx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
  const audioContext = new AudioCtx();

  const masterGain = audioContext.createGain();
  masterGain.gain.value = 0.35;
  masterGain.connect(audioContext.destination);

  const style = suggestion.style;
  const bpm = suggestion.bpm;
  const beatDuration = 60 / bpm;
  const totalBeats = Math.floor(durationSec / beatDuration);

  const scale = getScaleForStyle(style);

  const stopFns: (() => void)[] = [];

  suggestion.instruments.forEach((instName, instIdx) => {
    const instrument = INSTRUMENT_FREQS[instName as Instrument] || INSTRUMENT_FREQS.piano;

    if (instName === 'drum') {
      for (let beat = 0; beat < totalBeats; beat++) {
        const startTime = audioContext.currentTime + beat * beatDuration;

        if (beat % 2 === 0) {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(120, startTime);
          osc.frequency.exponentialRampToValueAtTime(40, startTime + 0.15);
          gain.gain.setValueAtTime(0.6, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);
          osc.connect(gain).connect(masterGain);
          osc.start(startTime);
          osc.stop(startTime + 0.2);
        }

        const hihatStart = startTime + beatDuration * 0.5;
        if (hihatStart < audioContext.currentTime + durationSec) {
          const bufferSize = audioContext.sampleRate * 0.05;
          const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
          const output = noiseBuffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
          }
          const noise = audioContext.createBufferSource();
          noise.buffer = noiseBuffer;
          const hpf = audioContext.createBiquadFilter();
          hpf.type = 'highpass';
          hpf.frequency.value = 7000;
          const hGain = audioContext.createGain();
          hGain.gain.setValueAtTime(0.12, hihatStart);
          hGain.gain.exponentialRampToValueAtTime(0.001, hihatStart + 0.04);
          noise.connect(hpf).connect(hGain).connect(masterGain);
          noise.start(hihatStart);
          noise.stop(hihatStart + 0.06);
        }
      }
      return;
    }

    const baseMidi = instName === 'bass' || instName === 'cello' ? 48 : instName === 'viola' ? 55 : 60;
    const octaveShift = instIdx === 0 ? 0 : 1;
    const patternLength = 8;

    for (let beat = 0; beat < totalBeats; beat++) {
      const patternIndex = beat % patternLength;
      const noteIndex = noteFromScale(patternIndex + (instIdx * 2), scale, baseMidi, octaveShift);
      const freq = midiToFreq(noteIndex);
      const startTime = audioContext.currentTime + beat * beatDuration;
      const noteLen = beatDuration * (style === 'ambient' || style === 'strings' ? 1.8 : 0.75);

      instrument.harmonics.forEach((h, hIdx) => {
        const osc = audioContext.createOscillator();
        const g = audioContext.createGain();
        osc.type = instrument.waveform;
        osc.frequency.value = freq * h;

        const harmonicGain = 1 / (hIdx + 1.5);
        g.gain.setValueAtTime(0, startTime);
        g.gain.linearRampToValueAtTime(0.15 * harmonicGain, startTime + 0.02);
        g.gain.setValueAtTime(0.12 * harmonicGain, startTime + noteLen * 0.3);
        g.gain.exponentialRampToValueAtTime(0.001, startTime + noteLen);

        osc.connect(g).connect(masterGain);
        osc.start(startTime);
        osc.stop(startTime + noteLen + 0.05);
      });
    }
  });

  const fadeOutStart = audioContext.currentTime + durationSec - 0.4;
  masterGain.gain.setValueAtTime(0.35, fadeOutStart);
  masterGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + durationSec);

  const stopAll = () => {
    try {
      masterGain.gain.cancelScheduledValues(audioContext.currentTime);
      masterGain.gain.setValueAtTime(masterGain.gain.value, audioContext.currentTime);
      masterGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
      setTimeout(() => {
        stopFns.forEach(fn => fn());
        try { audioContext.close(); } catch { /* ignore */ }
      }, 150);
    } catch {
      try { audioContext.close(); } catch { /* ignore */ }
    }
  };

  setTimeout(() => {
    try { audioContext.close(); } catch { /* ignore */ }
  }, (durationSec + 0.5) * 1000);

  return { stop: stopAll, audioContext };
}
