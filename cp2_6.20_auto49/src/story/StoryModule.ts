import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

export interface GenerateStoryOptions {
  prompt: string;
  theme?: string;
  maxLength?: number;
  onProgress?: (progress: number) => void;
  onToken?: (token: string) => void;
}

export interface StoryModuleState {
  isLoading: boolean;
  isReady: boolean;
  loadProgress: number;
  error: string | null;
}

class StoryModule {
  private generator: any = null;
  private state: StoryModuleState = {
    isLoading: false,
    isReady: false,
    loadProgress: 0,
    error: null,
  };
  private loadPromise: Promise<void> | null = null;
  private worker: Worker | null = null;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window === 'undefined') return;

    const workerCode = `
      importScripts('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.14.0');
      
      let generator = null;
      let isLoading = false;
      
      self.onmessage = async (e) => {
        const { type, data } = e.data;
        
        if (type === 'LOAD_MODEL') {
          if (isLoading || generator) return;
          isLoading = true;
          
          try {
            self.postMessage({ type: 'LOAD_START' });
            
            generator = await self.transformers.pipeline('text-generation', 'Xenova/distilgpt2', {
              progress_callback: (progress) => {
                if (progress.status === 'download') {
                  const percent = progress.file ? progress.progress : 0;
                  self.postMessage({ type: 'LOAD_PROGRESS', data: percent });
                }
              }
            });
            
            isLoading = false;
            self.postMessage({ type: 'LOAD_COMPLETE' });
          } catch (error) {
            isLoading = false;
            self.postMessage({ type: 'LOAD_ERROR', data: error.message });
          }
        } else if (type === 'GENERATE') {
          if (!generator) {
            self.postMessage({ type: 'GENERATE_ERROR', data: '模型未加载' });
            return;
          }
          
          try {
            const { prompt, maxLength } = data;
            const fullPrompt = prompt;
            
            self.postMessage({ type: 'GENERATE_START' });
            
            const output = await generator(fullPrompt, {
              max_new_tokens: maxLength || 100,
              temperature: 0.8,
              top_p: 0.9,
              do_sample: true,
              num_return_sequences: 1,
              stream: true,
            });
            
            let fullText = '';
            for await (const chunk of output) {
              const token = chunk[0]?.generated_text || '';
              const newText = token.slice(fullText.length);
              if (newText) {
                fullText = token;
                self.postMessage({ type: 'GENERATE_TOKEN', data: newText });
              }
            }
            
            self.postMessage({ type: 'GENERATE_COMPLETE', data: fullText });
          } catch (error) {
            self.postMessage({ type: 'GENERATE_ERROR', data: error.message });
          }
        }
      };
    `;

    try {
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      this.worker = new Worker(workerUrl);

      this.worker.onmessage = (e) => {
        const { type, data } = e.data;
        
        switch (type) {
          case 'LOAD_START':
            this.state.isLoading = true;
            this.state.loadProgress = 0;
            break;
          case 'LOAD_PROGRESS':
            this.state.loadProgress = data;
            break;
          case 'LOAD_COMPLETE':
            this.state.isLoading = false;
            this.state.isReady = true;
            this.state.loadProgress = 100;
            break;
          case 'LOAD_ERROR':
            this.state.isLoading = false;
            this.state.error = data;
            break;
        }
      };
    } catch (e) {
      console.warn('Web Worker初始化失败，将使用主线程加载模型');
    }
  }

  async loadModel(): Promise<void> {
    if (this.state.isReady) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = this._loadModelInternal();
    return this.loadPromise;
  }

  private async _loadModelInternal(): Promise<void> {
    if (this.worker) {
      this.worker.postMessage({ type: 'LOAD_MODEL' });
      
      return new Promise((resolve, reject) => {
        const checkReady = setInterval(() => {
          if (this.state.isReady) {
            clearInterval(checkReady);
            resolve();
          } else if (this.state.error) {
            clearInterval(checkReady);
            reject(new Error(this.state.error));
          }
        }, 100);
      });
    }

    this.state.isLoading = true;
    this.state.error = null;

    try {
      this.generator = await pipeline('text-generation', 'Xenova/distilgpt2', {
        progress_callback: (progress: any) => {
          if (progress.status === 'download' && progress.file) {
            this.state.loadProgress = progress.progress || 0;
          }
        },
      });

      this.state.isLoading = false;
      this.state.isReady = true;
      this.state.loadProgress = 100;
    } catch (error) {
      this.state.isLoading = false;
      this.state.error = error instanceof Error ? error.message : '模型加载失败';
      throw error;
    }
  }

  async generateStory(options: GenerateStoryOptions): Promise<string> {
    const { prompt, theme, maxLength = 100, onProgress, onToken } = options;

    await this.loadModel();

    const fullPrompt = theme ? `[${theme}] ${prompt}` : prompt;

    if (this.worker) {
      return new Promise((resolve, reject) => {
        let fullText = '';
        
        const handler = (e: MessageEvent) => {
          const { type, data } = e.data;
          
          switch (type) {
            case 'GENERATE_START':
              if (onProgress) onProgress(0);
              break;
            case 'GENERATE_TOKEN':
              fullText += data;
              if (onToken) onToken(data);
              if (onProgress) onProgress(Math.min(100, (fullText.length / maxLength) * 100));
              break;
            case 'GENERATE_COMPLETE':
              this.worker?.removeEventListener('message', handler);
              resolve(fullText || data);
              break;
            case 'GENERATE_ERROR':
              this.worker?.removeEventListener('message', handler);
              reject(new Error(data));
              break;
          }
        };
        
        this.worker?.addEventListener('message', handler);
        this.worker?.postMessage({ type: 'GENERATE', data: { prompt: fullPrompt, maxLength } });
      });
    }

    if (!this.generator) {
      throw new Error('模型未加载');
    }

    if (onProgress) onProgress(0);

    const output = await this.generator(fullPrompt, {
      max_new_tokens: maxLength,
      temperature: 0.8,
      top_p: 0.9,
      do_sample: true,
      num_return_sequences: 1,
      stream: true,
    });

    let fullText = '';
    for await (const chunk of output) {
      const token = chunk[0]?.generated_text || '';
      const newText = token.slice(fullText.length);
      if (newText) {
        fullText = token;
        if (onToken) onToken(newText);
        if (onProgress) onProgress(Math.min(100, (fullText.length / maxLength) * 100));
      }
    }

    if (onProgress) onProgress(100);
    return fullText;
  }

  getState(): StoryModuleState {
    return { ...this.state };
  }
}

export const storyModule = new StoryModule();
