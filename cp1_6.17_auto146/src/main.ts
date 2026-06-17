import { createTool, ToolType, ToolState, Point, DrawAction } from './tools';
import { RecordSession, PlaybackSpeed } from './recorder';
import { initUI } from './ui';
import './style.css';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 700;
const SAMPLE_INTERVAL = 10;

let tool = createTool('brush');
let toolState: ToolState = {
  color: '#000000',
  brushSize: 2,
  brightness: 1,
};

let isPointerDown = false;
let lastSampleTime = 0;
let recorder: RecordSession;
let uiApi: ReturnType<typeof initUI>;

function main() {
  const mainCanvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
  const overlayCanvas = document.getElementById('overlayCanvas') as HTMLCanvasElement;
  const toolbar = document.getElementById('toolbar') as HTMLElement;
  const colorWheel = document.getElementById('colorWheel') as HTMLCanvasElement;
  const brightnessSlider = document.getElementById('brightnessSlider') as HTMLInputElement;
  const brushSizeSlider = document.getElementById('brushSizeSlider') as HTMLInputElement;
  const brushPreview = document.getElementById('brushPreview') as HTMLElement;
  const recordBtn = document.getElementById('recordBtn') as HTMLButtonElement;
  const playBtn = document.getElementById('playBtn') as HTMLButtonElement;
  const speedSelect = document.getElementById('speedSelect') as HTMLSelectElement;
  const progressFill = document.getElementById('progressFill') as HTMLElement;
  const progressBarWrapper = document.getElementById('progressBarWrapper') as HTMLElement;
  const canvasContainer = document.getElementById('canvasContainer') as HTMLElement;

  mainCanvas.width = CANVAS_WIDTH;
  mainCanvas.height = CANVAS_HEIGHT;
  overlayCanvas.width = CANVAS_WIDTH;
  overlayCanvas.height = CANVAS_HEIGHT;

  const ctx = mainCanvas.getContext('2d')!;
  const overlayCtx = overlayCanvas.getContext('2d')!;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  recorder = new RecordSession(ctx);

  uiApi = initUI(
    toolbar,
    colorWheel,
    brightnessSlider,
    brushSizeSlider,
    brushPreview,
    recordBtn,
    playBtn,
    speedSelect,
    progressFill,
    progressBarWrapper,
    canvasContainer,
    {
      onToolChange: (toolType: ToolType) => {
        if (recorder.isPlayingBack()) return;
        currentToolType = toolType;
        tool = createTool(toolType);
        tool.clearOverlay(overlayCtx);
      },
      onColorChange: (color: string) => {
        toolState.color = color;
      },
      onBrushSizeChange: (size: number) => {
        toolState.brushSize = size;
      },
      onRecordToggle: () => {
        if (recorder.isPlayingBack()) return;
        if (recorder.isRecordingActive()) {
          recorder.stopRecording();
          uiApi.updateRecordButton(false);
          uiApi.updatePlayButton(recorder.hasRecording(), false);
        } else {
          recorder.startRecording();
          uiApi.updateRecordButton(true);
          uiApi.updatePlayButton(false, false);
        }
      },
      onPlayToggle: () => {
        if (recorder.isRecordingActive()) return;
        if (recorder.isPlayingBack()) {
          recorder.stopPlayback();
          uiApi.updatePlayButton(recorder.hasRecording(), false);
          uiApi.showProgressBar(false);
        } else {
          recorder.startPlayback();
          uiApi.updatePlayButton(true, true);
          uiApi.showProgressBar(true);
        }
      },
      onSpeedChange: (speed: number) => {
        recorder.setPlaybackSpeed(speed as PlaybackSpeed);
      },
    },
    toolState
  );

  recorder.setOnProgress((progress: number) => {
    uiApi.updateProgress(progress);
  });

  recorder.setOnPlaybackEnd(() => {
    uiApi.updatePlayButton(recorder.hasRecording(), false);
  });

  mainCanvas.addEventListener('pointerdown', handlePointerDown);
  mainCanvas.addEventListener('pointermove', handlePointerMove);
  mainCanvas.addEventListener('pointerup', handlePointerUp);
  mainCanvas.addEventListener('pointerleave', handlePointerUp);

  uiApi.updatePlayButton(false, false);
}

function getPointFromEvent(e: PointerEvent): Point {
  const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
    pressure: e.pressure > 0 ? e.pressure : 0.5,
    timestamp: performance.now(),
  };
}

function handlePointerDown(e: PointerEvent) {
  if (recorder.isPlayingBack()) return;
  isPointerDown = true;
  lastSampleTime = performance.now();

  const point = getPointFromEvent(e);
  const mainCanvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
  const overlayCanvas = document.getElementById('overlayCanvas') as HTMLCanvasElement;
  const ctx = mainCanvas.getContext('2d')!;
  const overlayCtx = overlayCanvas.getContext('2d')!;

  if (recorder.isRecordingActive()) {
    recorder.startAction();
  }

  tool.onPointerDown(ctx, overlayCtx, point, toolState);
}

function handlePointerMove(e: PointerEvent) {
  if (!isPointerDown || recorder.isPlayingBack()) return;

  const now = performance.now();
  if (now - lastSampleTime < SAMPLE_INTERVAL) return;
  lastSampleTime = now;

  const point = getPointFromEvent(e);
  const mainCanvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
  const overlayCanvas = document.getElementById('overlayCanvas') as HTMLCanvasElement;
  const ctx = mainCanvas.getContext('2d')!;
  const overlayCtx = overlayCanvas.getContext('2d')!;

  tool.onPointerMove(ctx, overlayCtx, point, toolState);
}

function handlePointerUp(e: PointerEvent) {
  if (!isPointerDown || recorder.isPlayingBack()) return;
  isPointerDown = false;

  const point = getPointFromEvent(e);
  const mainCanvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
  const overlayCanvas = document.getElementById('overlayCanvas') as HTMLCanvasElement;
  const ctx = mainCanvas.getContext('2d')!;
  const overlayCtx = overlayCanvas.getContext('2d')!;

  const action = tool.onPointerUp(ctx, overlayCtx, point, toolState);
  if (action && recorder.isRecordingActive()) {
    if (action.type === 'text') {
      const textAction = action as DrawAction & { text?: string };
      setTimeout(() => {
        const input = document.querySelector('.text-input-popup input') as HTMLInputElement;
        const btn = document.querySelector('.text-input-popup button') as HTMLButtonElement;
        if (input && btn) {
          const originalOnClick = btn.onclick;
          btn.onclick = () => {
            textAction.text = input.value.trim();
            if (textAction.text) {
              recorder.addAction(textAction);
            }
            if (originalOnClick) originalOnClick.call(btn, new MouseEvent('click') as any);
          };
          input.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') {
              textAction.text = input.value.trim();
              if (textAction.text) {
                recorder.addAction(textAction);
              }
            }
          });
        }
      }, 50);
    } else {
      recorder.addAction(action);
    }
  }
}

document.addEventListener('DOMContentLoaded', main);
