import { TIMELINE_MIN_GRANULARITY } from './types';

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

export function extractThumbnailData(buffer: AudioBuffer, samples: number = 200): Float32Array {
  const channelData = buffer.getChannelData(0);
  const blockSize = Math.floor(channelData.length / samples);
  const thumbnail = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    let sum = 0;
    const start = i * blockSize;
    for (let j = 0; j < blockSize; j++) {
      sum += Math.abs(channelData[start + j] || 0);
    }
    thumbnail[i] = sum / blockSize;
  }
  return thumbnail;
}

export async function loadAudioFile(
  file: File,
  audioContext: AudioContext
): Promise<{ buffer: AudioBuffer; thumbnailData: Float32Array }> {
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const thumbnailData = extractThumbnailData(audioBuffer);
  return { buffer: audioBuffer, thumbnailData };
}

export function snapToGrid(value: number): number {
  return Math.round(value / TIMELINE_MIN_GRANULARITY) * TIMELINE_MIN_GRANULARITY;
}

export function encodeWav(audioBuffer: AudioBuffer): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = length * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(audioBuffer.getChannelData(ch));
  }

  let offset = headerSize;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += bytesPerSample;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export async function exportMixToWav(
  tracks: { buffer: AudioBuffer; startTime: number; endTime: number; volume: number }[]
): Promise<Blob> {
  if (tracks.length === 0) {
    throw new Error('No tracks to export');
  }

  const sampleRate = tracks[0].buffer.sampleRate;
  const maxEndTime = Math.max(...tracks.map((t) => t.endTime));
  const totalSamples = Math.ceil(maxEndTime * sampleRate);
  const numChannels = tracks[0].buffer.numberOfChannels;

  const mixedBuffers: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    mixedBuffers.push(new Float32Array(totalSamples));
  }

  for (const track of tracks) {
    const startSample = Math.floor(track.startTime * sampleRate);
    const endSample = Math.min(
      Math.floor(track.endTime * sampleRate),
      startSample + track.buffer.length
    );
    const gain = track.volume / 100;

    for (let ch = 0; ch < numChannels; ch++) {
      const sourceData = track.buffer.getChannelData(Math.min(ch, track.buffer.numberOfChannels - 1));
      for (let i = startSample; i < endSample && (i - startSample) < sourceData.length; i++) {
        if (i >= 0 && i < totalSamples) {
          mixedBuffers[ch][i] += sourceData[i - startSample] * gain;
        }
      }
    }
  }

  for (let ch = 0; ch < numChannels; ch++) {
    for (let i = 0; i < totalSamples; i++) {
      mixedBuffers[ch][i] = Math.max(-1, Math.min(1, mixedBuffers[ch][i]));
    }
  }

  const mixedBuffer = new AudioBuffer({
    numberOfChannels: numChannels,
    length: totalSamples,
    sampleRate,
  });
  for (let ch = 0; ch < numChannels; ch++) {
    mixedBuffer.copyToChannel(mixedBuffers[ch], ch);
  }

  return encodeWav(mixedBuffer);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(1);
  return `${mins}:${secs.padStart(4, '0')}`;
}
