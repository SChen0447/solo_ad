import { pipeline } from '@xenova/transformers';

let generator: any = null;
let state: 'idle' | 'loading' | 'ready' | 'error' = 'idle';

const MODEL_NAME = 'Xenova/tiny-random-gpt2';

async function loadModel() {
  if (state === 'ready' || state === 'loading') return;

  state = 'loading';
  self.postMessage({ type: 'loading', progress: 0 });

  try {
    generator = await pipeline('text-generation', MODEL_NAME, {
      progress_callback: (progress: any) => {
        if (progress.status === 'progress' && progress.progress != null) {
          self.postMessage({ type: 'loading', progress: Math.min(Math.round(progress.progress), 100) });
        } else if (progress.status === 'done') {
          self.postMessage({ type: 'loading', progress: 100 });
        }
      },
    });
    state = 'ready';
    self.postMessage({ type: 'ready' });
  } catch (err) {
    state = 'error';
    self.postMessage({ type: 'error', message: (err as Error).message });
  }
}

async function generate(prompt: string, maxTokens: number) {
  if (state !== 'ready' || !generator) {
    self.postMessage({ type: 'error', message: 'Model not ready' });
    return;
  }

  try {
    const output = await generator(prompt, {
      max_new_tokens: maxTokens,
      temperature: 0.8,
      top_p: 0.9,
      do_sample: true,
    });

    const generatedText = output[0]?.generated_text?.slice(prompt.length) || '';
    self.postMessage({ type: 'chunk', text: generatedText });
    self.postMessage({ type: 'complete', text: generatedText });
  } catch (err) {
    self.postMessage({ type: 'error', message: (err as Error).message });
  }
}

self.onmessage = async (e: MessageEvent) => {
  const { action, prompt, maxTokens } = e.data;

  if (action === 'load') {
    loadModel();
  } else if (action === 'generate') {
    if (state !== 'ready') {
      await loadModel();
    }
    generate(prompt, maxTokens || 150);
  }
};
