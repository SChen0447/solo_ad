import type { WorkerMessage, WorkerProgress, WorkerResult, WorkerError } from '../types';
import { extractColors } from './colorExtractor';

const ctx: Worker = self as unknown as Worker;

ctx.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { type, imageData, k = 5 } = event.data;

  if (type === 'extract') {
    try {
      const progressCallback = (progress: number) => {
        const progressMsg: WorkerProgress = { type: 'progress', progress };
        ctx.postMessage(progressMsg);
      };

      const result = extractColors(imageData, k, progressCallback);

      const successMsg: WorkerResult = { type: 'success', result };
      ctx.postMessage(successMsg);
    } catch (error) {
      const errorMsg: WorkerError = {
        type: 'error',
        message: error instanceof Error ? error.message : '未知错误',
      };
      ctx.postMessage(errorMsg);
    }
  }
});

export default {};
