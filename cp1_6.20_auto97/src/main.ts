import { AudioEngine } from './AudioEngine';
import { PianoKeyboard } from './PianoKeyboard';
import { Sequencer } from './Sequencer';

const pianoKeyboardEl = document.getElementById('pianoKeyboard') as HTMLElement;
const currentNoteEl = document.getElementById('currentNote') as HTMLElement;
const recordBtn = document.getElementById('recordBtn') as HTMLButtonElement;
const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
const playBtn = document.getElementById('playBtn') as HTMLButtonElement;
const speedSlider = document.getElementById('speedSlider') as HTMLInputElement;
const speedValue = document.getElementById('speedValue') as HTMLElement;
const timelineContainer = document.getElementById('timelineContainer') as HTMLElement;
const playhead = document.getElementById('playhead') as HTMLElement;
const trackList = document.getElementById('trackList') as HTMLElement;
const trackCount = document.getElementById('trackCount') as HTMLElement;

const audioEngine = new AudioEngine();
const keyboard = new PianoKeyboard(pianoKeyboardEl, currentNoteEl, audioEngine);
const sequencer = new Sequencer(
  audioEngine,
  keyboard,
  timelineContainer,
  playhead,
  trackList,
  trackCount
);

keyboard.setOnNoteOn((note, octave) => {
  sequencer.recordNoteOn(note, octave);
});

keyboard.setOnNoteOff((note, octave) => {
  sequencer.recordNoteOff(note, octave);
});

recordBtn.addEventListener('click', () => {
  if (sequencer.getIsRecording()) return;
  if (sequencer.getTracks().length >= sequencer.getMaxTracks()) {
    alert('最多只能录制 4 条音轨');
    return;
  }
  sequencer.startRecording();
});

stopBtn.addEventListener('click', () => {
  if (sequencer.getIsRecording()) {
    sequencer.stopRecording();
  }
  if (sequencer.getIsPlaying()) {
    sequencer.stopPlayback();
    sequencer.setCurrentTime(0);
  }
});

playBtn.addEventListener('click', () => {
  if (sequencer.getIsPlaying()) {
    sequencer.stopPlayback();
  } else {
    if (sequencer.getTracks().length === 0) {
      alert('请先录制音轨');
      return;
    }
    sequencer.startPlayback();
  }
});

speedSlider.addEventListener('input', () => {
  const speed = parseFloat(speedSlider.value);
  speedValue.textContent = `${speed}x`;
  sequencer.setPlaybackSpeed(speed);
});

sequencer.setOnRecordingStateChanged((isRecording) => {
  if (isRecording) {
    recordBtn.classList.add('recording');
    recordBtn.textContent = '⏺ 录音中...';
    recordBtn.disabled = true;
    stopBtn.disabled = false;
    playBtn.disabled = true;
  } else {
    recordBtn.classList.remove('recording');
    recordBtn.textContent = '⏺ 录音';
    recordBtn.disabled = false;
    stopBtn.disabled = true;
    playBtn.disabled = false;
  }
});

sequencer.setOnPlayStateChanged((isPlaying) => {
  if (isPlaying) {
    playBtn.textContent = '⏸ 暂停';
    recordBtn.disabled = true;
    stopBtn.disabled = false;
  } else {
    playBtn.textContent = '▶ 播放';
    recordBtn.disabled = false;
    stopBtn.disabled = true;
  }
});

sequencer.setOnTracksChanged(() => {
  sequencer.refreshTimeline();
});

timelineContainer.addEventListener('click', (e) => {
  if (sequencer.getIsPlaying()) return;
  const rect = timelineContainer.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const percent = x / rect.width;
  const totalDuration = sequencer.getTotalDuration();
  sequencer.setCurrentTime(percent * totalDuration);
});

window.addEventListener('load', () => {
  sequencer.refreshTimeline();
});

document.addEventListener('click', () => {
  audioEngine.resume();
}, { once: true });
