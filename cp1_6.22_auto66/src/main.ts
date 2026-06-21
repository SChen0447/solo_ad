// main.ts - 应用入口
// 初始化 Canvas、加载资源、创建录音机实例并启动主循环
// 调用关系：main.ts -> recorder.ts（创建录音机实例并初始化）
//             main.ts -> ui.ts（创建 UI 实例并启动渲染循环）

import { TapeRecorder } from './recorder';
import { RecorderUI } from './ui';

async function bootstrap(): Promise<void> {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('[TapeRecorder] 找不到 Canvas 元素');
    return;
  }

  canvas.width = 640;
  canvas.height = 480;

  let ui: RecorderUI | null = null;

  const recorder = new TapeRecorder({
    onStateChange: (state) => {
      if (ui) {
        ui.setState(state);
      }
    },
    onError: (message) => {
      if (ui) ui.showError(message);
    }
  });

  ui = new RecorderUI(canvas, recorder);

  try {
    await recorder.init();
  } catch (e) {
    console.error('[TapeRecorder] 初始化失败:', e);
    ui.showError('音频初始化失败');
  }

  ui.start();

  const cleanup = () => {
    recorder.destroy();
    ui.destroy();
    window.removeEventListener('beforeunload', cleanup);
  };
  window.addEventListener('beforeunload', cleanup);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (recorder.getState() === 'playing' || recorder.getState() === 'recording') {
        recorder.stop();
      }
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
