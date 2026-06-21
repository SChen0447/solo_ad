export type FadeCurveType = 'linear' | 'logarithmic' | 'exponential';

export interface FadeEffect {
  type: 'fadeIn' | 'fadeOut';
  startSample: number;
  endSample: number;
  curve: FadeCurveType;
}

export interface Marker {
  id: string;
  sample: number;
  time: number;
}

export interface Selection {
  startSample: number;
  endSample: number;
}

export interface AudioInfo {
  duration: number;
  sampleRate: number;
  bitDepth: number;
  numberOfChannels: number;
}

export async function loadAudioFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();
  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    return audioBuffer;
  } finally {
    audioContext.close();
  }
}

function getGainValueForCurve(
  progress: number,
  curveType: FadeCurveType,
  isFadeIn: boolean
): number {
  const t = isFadeIn ? progress : 1 - progress;
  switch (curveType) {
    case 'linear':
      return t;
    case 'logarithmic':
      return Math.pow(t, 2);
    case 'exponential':
      return t === 0 ? 0 : Math.pow(2, (t - 1) * 10) / Math.pow(2, -10);
    default:
      return t;
  }
}

export function applyFadeToBuffer(
  sourceBuffer: AudioBuffer,
  fade: FadeEffect
): AudioBuffer {
  const audioContext = new OfflineAudioContext(
    sourceBuffer.numberOfChannels,
    sourceBuffer.length,
    sourceBuffer.sampleRate
  );

  const newBuffer = audioContext.createBuffer(
    sourceBuffer.numberOfChannels,
    sourceBuffer.length,
    sourceBuffer.sampleRate
  );

  for (let channel = 0; channel < sourceBuffer.numberOfChannels; channel++) {
    const sourceData = sourceBuffer.getChannelData(channel);
    const destData = newBuffer.getChannelData(channel);

    for (let i = 0; i < sourceBuffer.length; i++) {
      destData[i] = sourceData[i];

      if (i >= fade.startSample && i <= fade.endSample) {
        const fadeLength = fade.endSample - fade.startSample;
        const progress = fadeLength > 0 ? (i - fade.startSample) / fadeLength : 1;
        const gain = getGainValueForCurve(progress, fade.curve, fade.type === 'fadeIn');
        destData[i] *= gain;
      } else if (fade.type === 'fadeIn' && i < fade.startSample) {
        destData[i] = 0;
      } else if (fade.type === 'fadeOut' && i > fade.endSample) {
        destData[i] = 0;
      }
    }
  }

  return newBuffer;
}

export async function exportSelectionAsWav(
  sourceBuffer: AudioBuffer,
  selection: Selection,
  fades: FadeEffect[],
  onProgress?: (progress: number) => void
): Promise<Blob> {
  if (onProgress) onProgress(0.1);

  const startSample = Math.max(0, Math.floor(selection.startSample));
  const endSample = Math.min(sourceBuffer.length, Math.floor(selection.endSample));
  const selectionLength = endSample - startSample;

  if (onProgress) onProgress(0.2);

  const offlineContext = new OfflineAudioContext(
    sourceBuffer.numberOfChannels,
    selectionLength,
    sourceBuffer.sampleRate
  );

  const selectionBuffer = offlineContext.createBuffer(
    sourceBuffer.numberOfChannels,
    selectionLength,
    sourceBuffer.sampleRate
  );

  if (onProgress) onProgress(0.3);

  for (let channel = 0; channel < sourceBuffer.numberOfChannels; channel++) {
    const sourceData = sourceBuffer.getChannelData(channel);
    const destData = selectionBuffer.getChannelData(channel);
    for (let i = 0; i < selectionLength; i++) {
      destData[i] = sourceData[startSample + i];
    }
  }

  if (onProgress) onProgress(0.5);

  let processedBuffer = selectionBuffer;
  const adjustedFades = fades.map(fade => ({
    ...fade,
    startSample: Math.max(0, fade.startSample - startSample),
    endSample: Math.min(selectionLength, fade.endSample - startSample)
  }));

  for (let i = 0; i < adjustedFades.length; i++) {
    processedBuffer = applyFadeToBuffer(processedBuffer, adjustedFades[i]);
    if (onProgress) onProgress(0.5 + (0.3 * (i + 1)) / adjustedFades.length);
  }

  if (onProgress) onProgress(0.85);

  const wavBlob = audioBufferToWav(processedBuffer);

  if (onProgress) onProgress(1.0);

  return wavBlob;
}

export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const samples = buffer.length;
  const dataSize = samples * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < samples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = Math.max(-1, Math.min(1, channels[ch][i]));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, sample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export function getFadeEnvelopePoints(
  fade: FadeEffect,
  sampleRate: number,
  width: number,
  height: number,
  startX: number,
  endX: number
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const numPoints = 50;

  for (let i = 0; i <= numPoints; i++) {
    const progress = i / numPoints;
    const gain = getGainValueForCurve(progress, fade.curve, fade.type === 'fadeIn');
    const x = startX + (endX - startX) * progress;
    const y = height - (gain * height * 0.9) - height * 0.05;
    points.push({ x, y });
  }

  return points;
}

export function sampleToTime(sample: number, sampleRate: number): number {
  return sample / sampleRate;
}

export function timeToSample(time: number, sampleRate: number): number {
  return Math.floor(time * sampleRate);
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}
