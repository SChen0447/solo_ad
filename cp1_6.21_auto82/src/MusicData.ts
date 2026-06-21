import type { BeatNote, BeatSequence } from './types';

function generate128BPMTrack(): BeatNote[] {
  const notes: BeatNote[] = [];
  const bpm = 128;
  const beatInterval = 60000 / bpm;
  const sixteenth = beatInterval / 4;

  for (let bar = 0; bar < 16; bar++) {
    for (let beat = 0; beat < 4; beat++) {
      const beatTime = bar * beatInterval * 4 + beat * beatInterval;
      notes.push({
        timestamp: beatTime,
        pitch: bar % 2 === 0 ? 'mid' : (beat % 2 === 0 ? 'high' : 'low'),
        intensity: beat === 0 ? 5 : (beat === 2 ? 4 : 3)
      });

      if (beat === 1 || beat === 3) {
        notes.push({
          timestamp: beatTime + sixteenth * 2,
          pitch: beat === 1 ? 'high' : 'mid',
          intensity: 2
        });
      }

      if (beat === 0 && bar % 4 !== 0) {
        notes.push({
          timestamp: beatTime + sixteenth,
          pitch: 'low',
          intensity: 2
        });
        notes.push({
          timestamp: beatTime + sixteenth * 3,
          pitch: 'mid',
          intensity: 1
        });
      }

      if (bar % 4 === 3 && beat === 3) {
        notes.push({
          timestamp: beatTime + sixteenth,
          pitch: 'high',
          intensity: 3
        });
        notes.push({
          timestamp: beatTime + sixteenth * 2,
          pitch: 'high',
          intensity: 4
        });
        notes.push({
          timestamp: beatTime + sixteenth * 3,
          pitch: 'high',
          intensity: 5
        });
      }
    }
  }

  return notes.sort((a, b) => a.timestamp - b.timestamp);
}

function generate80BPMTrack(): BeatNote[] {
  const notes: BeatNote[] = [];
  const bpm = 80;
  const beatInterval = 60000 / bpm;
  const eighth = beatInterval / 2;

  for (let bar = 0; bar < 16; bar++) {
    for (let beat = 0; beat < 4; beat++) {
      const beatTime = bar * beatInterval * 4 + beat * beatInterval;

      if (beat === 0) {
        notes.push({
          timestamp: beatTime,
          pitch: 'low',
          intensity: 5
        });
      } else if (beat === 2) {
        notes.push({
          timestamp: beatTime,
          pitch: 'mid',
          intensity: 4
        });
      }

      if (beat === 1) {
        notes.push({
          timestamp: beatTime,
          pitch: 'high',
          intensity: 3
        });
      }

      if (bar % 2 === 1 && (beat === 1 || beat === 3)) {
        notes.push({
          timestamp: beatTime + eighth,
          pitch: beat === 1 ? 'mid' : 'high',
          intensity: 2
        });
      }

      if (bar % 4 === 3 && beat === 3) {
        notes.push({
          timestamp: beatTime,
          pitch: 'high',
          intensity: 5
        });
        notes.push({
          timestamp: beatTime + eighth,
          pitch: 'mid',
          intensity: 3
        });
      }
    }
  }

  return notes.sort((a, b) => a.timestamp - b.timestamp);
}

export const TRACKS: BeatSequence[] = [
  {
    id: 'fast-128',
    name: 'Pulse Rush',
    bpm: 128,
    duration: 30000,
    colorTheme: 'warm',
    notes: generate128BPMTrack()
  },
  {
    id: 'slow-80',
    name: 'Deep Flow',
    bpm: 80,
    duration: 48000,
    colorTheme: 'cool',
    notes: generate80BPMTrack()
  }
];
