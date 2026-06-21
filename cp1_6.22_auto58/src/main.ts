import { Piano } from './piano';
import { PianoAudio } from './audio';
import { Recorder, RecordEvent } from './recorder';

let piano: Piano;
let audio: PianoAudio;
let recorder: Recorder;

const $ = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element not found: ${id}`);
  return el;
};

function showError(message: string): void {
  const toast = $('errorToast');
  toast.textContent = message;
  toast.classList.add('visible');
  window.setTimeout(() => {
    toast.classList.remove('visible');
  }, 2000);
}

function init(): void {
  audio = new PianoAudio();

  const pianoContainer = $('pianoContainer');

  piano = new Piano({
    container: pianoContainer,
    onKeyDown: (note) => {
      audio.ensureContext();
      audio.noteOn(note);
      recorder.recordEvent(note, 'press');
    },
    onKeyUp: (note) => {
      audio.noteOff(note);
      recorder.recordEvent(note, 'release');
    },
  });

  recorder = new Recorder(piano.getAllNotes(), {
    onRecordingStateChange: (isRecording) => {
      updateRecordingUI(isRecording);
    },
    onPlaybackStateChange: (isPlaying) => {
      updatePlaybackUI(isPlaying);
    },
    onEvent: (event) => {
      handlePlaybackEvent(event);
    },
    onHasRecordingChange: (hasData) => {
      updateRecordingAvailableUI(hasData);
    },
  });

  bindUI();
}

function updateRecordingUI(isRecording: boolean): void {
  const dot = $('recordingDot');
  const text = $('recordingText');
  const btnRecord = $('btnRecord') as HTMLButtonElement;
  const btnStop = $('btnStop') as HTMLButtonElement;
  const btnPlay = $('btnPlay') as HTMLButtonElement;

  if (isRecording) {
    dot.classList.add('active');
    text.textContent = '正在录制...';
    btnRecord.disabled = true;
    btnStop.disabled = false;
    btnPlay.disabled = true;
  } else {
    dot.classList.remove('active');
    text.textContent = recorder.hasRecording() ? '录制完成' : '就绪';
    btnRecord.disabled = false;
    btnStop.disabled = true;
  }
}

function updatePlaybackUI(isPlaying: boolean): void {
  const btnPlay = $('btnPlay') as HTMLButtonElement;
  const btnRecord = $('btnRecord') as HTMLButtonElement;
  const text = $('recordingText');

  if (isPlaying) {
    btnPlay.disabled = true;
    btnRecord.disabled = true;
    text.textContent = '回放中...';
  } else {
    btnPlay.disabled = !recorder.hasRecording();
    btnRecord.disabled = false;
    piano.releaseAll();
    audio.stopAll();
    if (!recorder.isRecordingState()) {
      text.textContent = recorder.hasRecording() ? '回放完成' : '就绪';
    }
  }
}

function updateRecordingAvailableUI(hasData: boolean): void {
  const btnPlay = $('btnPlay') as HTMLButtonElement;
  const btnExport = $('btnExport') as HTMLButtonElement;
  btnPlay.disabled = !hasData || recorder.isRecordingState() || recorder.isPlayingState();
  btnExport.disabled = !hasData;
}

function handlePlaybackEvent(event: RecordEvent): void {
  audio.ensureContext();
  if (event.action === 'press') {
    audio.noteOn(event.note);
    piano.pressKey(event.note, true);
  } else {
    audio.noteOff(event.note);
    piano.releaseKey(event.note, true);
  }
}

function bindUI(): void {
  const btnRecord = $('btnRecord') as HTMLButtonElement;
  const btnStop = $('btnStop') as HTMLButtonElement;
  const btnPlay = $('btnPlay') as HTMLButtonElement;
  const btnExport = $('btnExport') as HTMLButtonElement;
  const speedSlider = $('speedSlider') as HTMLInputElement;
  const speedValue = $('speedValue');
  const importZone = $('importZone');
  const fileInput = $('fileInput') as HTMLInputElement;

  btnRecord.addEventListener('click', () => {
    audio.ensureContext();
    recorder.stopPlayback();
    piano.releaseAll();
    audio.stopAll();
    recorder.start();
  });

  btnStop.addEventListener('click', () => {
    recorder.stop();
    piano.releaseAll();
    audio.stopAll();
  });

  btnPlay.addEventListener('click', () => {
    audio.ensureContext();
    recorder.play();
  });

  btnExport.addEventListener('click', () => {
    try {
      recorder.downloadFile();
    } catch (e) {
      showError((e as Error).message);
    }
  });

  speedSlider.addEventListener('input', () => {
    const speed = parseFloat(speedSlider.value);
    recorder.setSpeed(speed);
    speedValue.textContent = `${speed.toFixed(1)}x`;
  });

  importZone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const files = (e.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    fileInput.value = '';
  });

  importZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    importZone.classList.add('dragover');
  });

  importZone.addEventListener('dragleave', () => {
    importZone.classList.remove('dragover');
  });

  importZone.addEventListener('drop', (e) => {
    e.preventDefault();
    importZone.classList.remove('dragover');
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      piano.releaseAll();
      audio.stopAll();
      if (recorder.isPlayingState()) {
        recorder.stopPlayback();
      }
    }
  });
}

function handleFile(file: File): void {
  if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
    showError('请导入JSON格式的文件');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string;
      recorder.importFromJSON(content);
      const text = $('recordingText');
      text.textContent = '导入成功';
      window.setTimeout(() => {
        if (!recorder.isRecordingState() && !recorder.isPlayingState()) {
          text.textContent = recorder.hasRecording() ? '录制完成' : '就绪';
        }
      }, 1500);
    } catch (err) {
      showError((err as Error).message);
    }
  };
  reader.onerror = () => {
    showError('文件读取失败');
  };
  reader.readAsText(file);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
