import { Howl } from 'howler';

let currentHowl: Howl | null = null;
let currentVolume = 70;
let progressRafId: number | null = null;
let isSeeking = false;

type ProgressCallback = (info: { seek: number; duration: number }) => void;
let onProgress: ProgressCallback | null = null;

function pollProgress() {
  if (!currentHowl || !currentHowl.playing() || isSeeking) {
    progressRafId = null;
    return;
  }
  const seek = currentHowl.seek() as number;
  const duration = currentHowl.duration() || 0;
  onProgress?.({ seek, duration });
  progressRafId = requestAnimationFrame(pollProgress);
}

function ensurePolling() {
  if (progressRafId !== null) return;
  progressRafId = requestAnimationFrame(pollProgress);
}

export function startProgressPolling() {
  stopProgressPolling();
  progressRafId = requestAnimationFrame(pollProgress);
}

export function stopProgressPolling() {
  if (progressRafId !== null) {
    cancelAnimationFrame(progressRafId);
    progressRafId = null;
  }
}

export function setProgressCallback(cb: ProgressCallback | null): void {
  onProgress = cb;
}

export function loadAudio(src: string, onPlay?: () => void, onStop?: () => void): void {
  unloadAudio();
  currentHowl = new Howl({
    src: [src],
    html5: true,
    volume: currentVolume / 100,
    loop: true,
    onplay: () => {
      isSeeking = false;
      onPlay?.();
      ensurePolling();
    },
    onstop: () => {
      isSeeking = false;
      onStop?.();
      stopProgressPolling();
    },
    onend: () => {
      isSeeking = false;
      onStop?.();
    },
    onpause: () => {
      stopProgressPolling();
    },
    onload: () => {
      isSeeking = false;
    },
  });
}

export function playAudio(): void {
  if (currentHowl) {
    currentHowl.play();
  }
}

export function stopAudio(): void {
  if (currentHowl) {
    currentHowl.stop();
  }
  isSeeking = false;
  stopProgressPolling();
}

export function pauseAudio(): void {
  if (currentHowl) {
    currentHowl.pause();
  }
}

export function resumeAudio(): void {
  if (currentHowl) {
    currentHowl.play();
  }
}

export function setVolume(volume: number): void {
  currentVolume = volume;
  if (currentHowl) {
    currentHowl.volume(volume / 100);
  }
}

export function getVolume(): number {
  return currentVolume;
}

export function fadeAudioIn(duration: number = 1000): void {
  if (currentHowl) {
    currentHowl.fade(0, currentVolume / 100, duration);
  }
}

export function fadeAudioOut(duration: number = 1000): void {
  if (currentHowl) {
    currentHowl.fade(currentHowl.volume(), 0, duration);
  }
}

export function seekAudio(seconds: number): void {
  if (!currentHowl) return;
  isSeeking = true;
  stopProgressPolling();
  try {
    currentHowl.seek(seconds);
  } catch {
    isSeeking = false;
    return;
  }
  const checkSeek = () => {
    if (!currentHowl) {
      isSeeking = false;
      return;
    }
    const currentSeek = currentHowl.seek() as number;
    if (Math.abs(currentSeek - seconds) < 0.05) {
      isSeeking = false;
      if (currentHowl.playing()) {
        ensurePolling();
      }
    } else {
      requestAnimationFrame(checkSeek);
    }
  };
  requestAnimationFrame(checkSeek);
}

export function unloadAudio(): void {
  stopProgressPolling();
  isSeeking = false;
  if (currentHowl) {
    currentHowl.unload();
    currentHowl = null;
  }
}

export function isAudioPlaying(): boolean {
  return currentHowl?.playing() ?? false;
}

export function getAudioProgress(): { seek: number; duration: number } {
  if (!currentHowl) return { seek: 0, duration: 0 };
  try {
    const seek = (currentHowl.seek() as number) || 0;
    const duration = currentHowl.duration() || 0;
    return { seek, duration };
  } catch {
    return { seek: 0, duration: 0 };
  }
}
