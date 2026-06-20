import { Poem } from '../core/poemData';
import { speak, stop as stopTTS, isSpeaking } from '../utils/tts';

export class ModalManager {
  private overlay: HTMLElement;
  private content: HTMLElement;
  private escHandler: (e: KeyboardEvent) => void;
  private overlayClickHandler: (e: MouseEvent) => void;

  constructor(overlay: HTMLElement, content: HTMLElement) {
    this.overlay = overlay;
    this.content = content;

    this.escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.close();
      }
    };

    this.overlayClickHandler = (e: MouseEvent) => {
      if (e.target === this.overlay) {
        this.close();
      }
    };

    this.overlay.addEventListener('click', this.overlayClickHandler);
    document.addEventListener('keydown', this.escHandler);
  }

  open(poem: Poem): void {
    this.content.innerHTML = `
      <button class="modal-close">✕</button>
      <h2 class="modal-title">${poem.title}</h2>
      <p class="modal-author">${poem.author} · ${poem.dynasty}</p>
      <div class="modal-poem-lines">${poem.lines.join('<br>')}</div>
      <div class="modal-annotations">
        <h3>注释</h3>
        ${poem.annotations.map(a => `<p>${a}</p>`).join('')}
      </div>
      <button class="tts-button">🔊 朗读</button>
    `;

    this.overlay.classList.add('active');

    const closeBtn = this.content.querySelector('.modal-close') as HTMLButtonElement;
    closeBtn.addEventListener('click', () => this.close());

    const ttsBtn = this.content.querySelector('.tts-button') as HTMLButtonElement;
    ttsBtn.addEventListener('click', () => {
      if (isSpeaking()) {
        stopTTS();
        ttsBtn.classList.remove('playing');
        ttsBtn.textContent = '🔊 朗读';
      } else {
        speak(poem.lines.join(' '));
        ttsBtn.classList.add('playing');
        ttsBtn.textContent = '⏸ 停止';
      }
    });
  }

  close(): void {
    this.overlay.classList.remove('active');
    stopTTS();
  }

  destroy(): void {
    this.overlay.removeEventListener('click', this.overlayClickHandler);
    document.removeEventListener('keydown', this.escHandler);
  }
}
