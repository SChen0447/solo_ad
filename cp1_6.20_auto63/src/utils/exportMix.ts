import type { Track } from '../types';

function createReverbImpulse(ctx: OfflineAudioContext, decayTime: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * decayTime;
  const impulse = ctx.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const channelData = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
    }
  }

  return impulse;
}

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, bufferLength - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return arrayBuffer;
}

export async function exportMix(
  tracks: Track[],
  _startTime: number,
  onProgress: (progress: number) => void
): Promise<void> {
  const sampleRate = 44100;

  let maxDuration = 0;
  tracks.forEach(track => {
    if (track.audioBuffer) {
      const endTime = track.startTime + track.audioBuffer.duration;
      if (endTime > maxDuration) maxDuration = endTime;
    }
  });

  if (maxDuration === 0) {
    throw new Error('No audio tracks to export');
  }

  const offlineCtx = new OfflineAudioContext(2, Math.ceil(maxDuration * sampleRate), sampleRate);
  const masterGain = offlineCtx.createGain();
  masterGain.gain.value = 0.9;
  masterGain.connect(offlineCtx.destination);

  const hasSolo = tracks.some(t => t.solo);

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i];
    if (!track.audioBuffer) continue;

    onProgress((i / tracks.length) * 0.5);

    const source = offlineCtx.createBufferSource();
    source.buffer = track.audioBuffer;

    const gainNode = offlineCtx.createGain();
    const shouldPlay = hasSolo ? track.solo : !track.muted;
    gainNode.gain.value = shouldPlay ? track.volume / 100 : 0;

    let lastNode: AudioNode = gainNode;

    for (const effect of track.effects) {
      if (!effect.enabled) continue;

      switch (effect.type) {
        case 'reverb': {
          const convolver = offlineCtx.createConvolver();
          convolver.buffer = createReverbImpulse(offlineCtx, effect.params.decayTime || 2);
          const dryGain = offlineCtx.createGain();
          const wetGain = offlineCtx.createGain();
          dryGain.gain.value = 0.7;
          wetGain.gain.value = 0.3;

          lastNode.connect(dryGain);
          lastNode.connect(convolver);
          convolver.connect(wetGain);
          dryGain.connect(masterGain);
          wetGain.connect(masterGain);
          lastNode = convolver;
          break;
        }

        case 'delay': {
          const delay = offlineCtx.createDelay(5);
          delay.delayTime.value = 0.3;
          const feedback = offlineCtx.createGain();
          feedback.gain.value = effect.params.feedback || 0.3;
          const wetGain = offlineCtx.createGain();
          wetGain.gain.value = 0.5;

          lastNode.connect(delay);
          delay.connect(feedback);
          feedback.connect(delay);
          delay.connect(wetGain);
          wetGain.connect(masterGain);
          lastNode.connect(masterGain);
          lastNode = delay;
          break;
        }

        case 'lowpass': {
          const filter = offlineCtx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = effect.params.cutoff || 2000;
          filter.Q.value = 1;
          lastNode.connect(filter);
          lastNode = filter;
          break;
        }
      }
    }

    if (lastNode !== gainNode || track.effects.length === 0 || track.effects.every(e => !e.enabled)) {
      if (lastNode === gainNode || track.effects.every(e => !e.enabled)) {
        lastNode.connect(masterGain);
      }
    }

    source.connect(gainNode);
    source.start(Math.max(0, track.startTime));
  }

  onProgress(0.6);

  const renderedBuffer = await offlineCtx.startRendering();

  onProgress(0.9);

  const wavBuffer = audioBufferToWav(renderedBuffer);
  const blob = new Blob([wavBuffer], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `mixed_audio_${Date.now()}.wav`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);

  onProgress(1.0);
}
