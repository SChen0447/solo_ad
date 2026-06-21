import { ERAS } from '../data/BuildingData';

export class TimeLineController {
  private currentEraIndex: number = 0;
  private isPlaying: boolean = false;
  private playIntervalId: number | null = null;

  private sliderInput: HTMLInputElement;
  private thumbElement: HTMLElement;
  private fillElement: HTMLElement;
  private yearDisplay: HTMLElement;
  private playBtn: HTMLElement;
  private playIcon: HTMLElement;
  private pauseIcon: HTMLElement;
  private marks: NodeListOf<HTMLElement>;

  public onEraChange: ((era: number) => void) | null = null;

  constructor() {
    this.sliderInput = document.getElementById('timeline-input') as HTMLInputElement;
    this.thumbElement = document.getElementById('timeline-thumb') as HTMLElement;
    this.fillElement = document.getElementById('timeline-fill') as HTMLElement;
    this.yearDisplay = document.getElementById('year-display') as HTMLElement;
    this.playBtn = document.getElementById('play-btn') as HTMLElement;
    this.playIcon = document.getElementById('play-icon') as HTMLElement;
    this.pauseIcon = document.getElementById('pause-icon') as HTMLElement;
    this.marks = document.querySelectorAll('.timeline-mark') as NodeListOf<HTMLElement>;

    this.bindEvents();
    this.updateUI();
  }

  private bindEvents(): void {
    this.sliderInput.addEventListener('input', this.handleSliderInput.bind(this));
    this.sliderInput.addEventListener('change', this.handleSliderChange.bind(this));

    this.sliderInput.addEventListener('mouseenter', () => {
      this.thumbElement.classList.add('hover');
    });
    this.sliderInput.addEventListener('mouseleave', () => {
      this.thumbElement.classList.remove('hover');
    });

    this.playBtn.addEventListener('click', this.togglePlay.bind(this));

    this.marks.forEach((mark, index) => {
      mark.addEventListener('click', () => {
        this.setEraIndex(index);
      });
    });
  }

  private handleSliderInput(): void {
    const value = parseInt(this.sliderInput.value, 10);
    this.currentEraIndex = value;
    this.updateUI(false);
  }

  private handleSliderChange(): void {
    const value = parseInt(this.sliderInput.value, 10);
    this.setEraIndex(value);
  }

  public setEraIndex(index: number, animate: boolean = true): void {
    if (index < 0 || index >= ERAS.length) return;
    if (index === this.currentEraIndex && animate) return;

    this.currentEraIndex = index;
    this.sliderInput.value = index.toString();
    this.updateUI();

    if (this.onEraChange) {
      this.onEraChange(ERAS[index]);
    }
  }

  private updateUI(triggerChange: boolean = false): void {
    const percentage = (this.currentEraIndex / (ERAS.length - 1)) * 100;

    this.thumbElement.style.left = `${percentage}%`;
    this.fillElement.style.width = `${percentage}%`;
    this.yearDisplay.textContent = ERAS[this.currentEraIndex].toString();

    this.marks.forEach((mark, index) => {
      if (index <= this.currentEraIndex) {
        mark.classList.add('active');
      } else {
        mark.classList.remove('active');
      }
    });

    if (triggerChange && this.onEraChange) {
      this.onEraChange(ERAS[this.currentEraIndex]);
    }
  }

  public togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public play(): void {
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.playIcon.style.display = 'none';
    this.pauseIcon.style.display = 'block';

    this.playNextEra();
  }

  private playNextEra(): void {
    if (!this.isPlaying) return;

    this.playIntervalId = window.setTimeout(() => {
      if (!this.isPlaying) return;

      let nextIndex = this.currentEraIndex + 1;
      if (nextIndex >= ERAS.length) {
        nextIndex = 0;
      }

      this.setEraIndex(nextIndex, true);
      this.playNextEra();
    }, 3000);
  }

  public pause(): void {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    this.playIcon.style.display = 'block';
    this.pauseIcon.style.display = 'none';

    if (this.playIntervalId !== null) {
      clearTimeout(this.playIntervalId);
      this.playIntervalId = null;
    }
  }

  public getCurrentEra(): number {
    return ERAS[this.currentEraIndex];
  }

  public getCurrentEraIndex(): number {
    return this.currentEraIndex;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
