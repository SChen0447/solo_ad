import { pipeline, env } from '@xenova/transformers'

env.allowLocalModels = false
env.allowRemoteModels = true
env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.14.0/dist/'

export type StoryProgressCallback = (partialText: string) => void
export type LoadProgressCallback = (progress: number) => void

class StoryModule {
  private generator: any = null
  private isLoading = false
  private loadPromise: Promise<void> | null = null

  async loadModel(onProgress?: LoadProgressCallback): Promise<void> {
    if (this.generator) return
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise
    }

    this.isLoading = true
    this.loadPromise = this._loadModel(onProgress)
    return this.loadPromise
  }

  private async _loadModel(onProgress?: LoadProgressCallback): Promise<void> {
    try {
      onProgress?.(0.1)
      
      this.generator = await pipeline('text-generation', 'Xenova/distilgpt2', {
        progress_callback: (progress: any) => {
          if (progress.status === 'progress' && progress.total) {
            const percent = Math.min(0.9, progress.loaded / progress.total * 0.9)
            onProgress?.(0.1 + percent)
          }
        }
      })
      
      onProgress?.(1.0)
      this.isLoading = false
    } catch (error) {
      console.error('Model loading failed:', error)
      this.isLoading = false
      this.generator = null
      throw error
    }
  }

  isModelLoaded(): boolean {
    return this.generator !== null
  }

  async generateStory(
    prompt: string,
    onProgress?: StoryProgressCallback,
    maxLength: number = 150
  ): Promise<string> {
    if (!this.generator) {
      await this.loadModel()
    }

    try {
      const output = await this.generator(prompt, {
        max_new_tokens: maxLength,
        temperature: 0.8,
        top_p: 0.9,
        do_sample: true,
        num_return_sequences: 1,
        callback_function: (beams: any) => {
          const fullText = beams[0].tokenizer.decode(beams[0].output_token_ids, {
            skip_special_tokens: true
          })
          onProgress?.(fullText)
        }
      })

      const result = output[0]?.generated_text || prompt
      onProgress?.(result)
      return result
    } catch (error) {
      console.error('Story generation failed:', error)
      const fallback = this._generateFallbackStory(prompt)
      onProgress?.(fallback)
      return fallback
    }
  }

  private _generateFallbackStory(prompt: string): string {
    const templates = [
      `${prompt} 在一个星光璀璨的夜晚，主角踏上了未知的旅程。周围的空气中弥漫着神秘的气息，远处的山脉若隐若现。`,
      `${prompt} 阳光穿过云层，洒在古老的小径上。微风轻拂，带来远方花香。故事的篇章在这一刻悄然展开。`,
      `${prompt} 风雨交加的午后，神秘的访客出现在门前。他的眼中闪烁着智慧的光芒，似乎知道所有秘密的答案。`,
      `${prompt} 当最后一片落叶飘下，古老的钟声响起。传说中的宝藏就藏在森林深处，等待着勇敢的探索者。`
    ]
    return templates[Math.floor(Math.random() * templates.length)]
  }

  simulateStreaming(
    fullText: string,
    onProgress: StoryProgressCallback,
    charDelay: number = 30
  ): Promise<void> {
    return new Promise((resolve) => {
      let currentIndex = 0
      const interval = setInterval(() => {
        currentIndex += 1
        const partial = fullText.slice(0, currentIndex)
        onProgress(partial)
        if (currentIndex >= fullText.length) {
          clearInterval(interval)
          resolve()
        }
      }, charDelay)
    })
  }
}

export const storyModule = new StoryModule()
export default storyModule
