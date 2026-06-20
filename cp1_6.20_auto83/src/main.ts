import { TrackEditor } from './editor';
import { RacingGame } from './racing';

class App {
  private editor: TrackEditor | null = null;
  private racingGame: RacingGame | null = null;
  private editorMode: HTMLElement;
  private racingMode: HTMLElement;
  private editorCanvas: HTMLCanvasElement;
  private racingCanvas: HTMLCanvasElement;
  private trackDataTextarea: HTMLTextAreaElement;
  private lapDisplay: HTMLElement;
  private gapDisplay: HTMLElement;
  private statusDisplay: HTMLElement;
  private undoBtn: HTMLButtonElement;
  private clearBtn: HTMLButtonElement;
  private saveBtn: HTMLButtonElement;
  private startBtn: HTMLButtonElement;
  private backBtn: HTMLButtonElement;
  private savedTrackData: string = '';

  constructor() {
    this.editorMode = document.getElementById('editorMode')!;
    this.racingMode = document.getElementById('racingMode')!;
    this.editorCanvas = document.getElementById('editorCanvas') as HTMLCanvasElement;
    this.racingCanvas = document.getElementById('racingCanvas') as HTMLCanvasElement;
    this.trackDataTextarea = document.getElementById('trackData') as HTMLTextAreaElement;
    this.lapDisplay = document.getElementById('lapDisplay')!;
    this.gapDisplay = document.getElementById('gapDisplay')!;
    this.statusDisplay = document.getElementById('statusDisplay')!;
    this.undoBtn = document.getElementById('undoBtn') as HTMLButtonElement;
    this.clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
    this.saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
    this.startBtn = document.getElementById('startBtn') as HTMLButtonElement;
    this.backBtn = document.getElementById('backBtn') as HTMLButtonElement;

    this.initEditor();
    this.bindEvents();
    this.updateButtonStates();
  }

  private initEditor(): void {
    this.editor = new TrackEditor(this.editorCanvas);

    const defaultPoints = [
      { x: 300, y: 80 },
      { x: 500, y: 150 },
      { x: 480, y: 300 },
      { x: 300, y: 350 },
      { x: 120, y: 300 },
      { x: 100, y: 150 }
    ];
    this.editor.setControlPoints(defaultPoints);
    this.updateTrackData();
  }

  private initRacingGame(): void {
    if (this.racingGame) {
      this.racingGame.destroy();
    }

    this.racingGame = new RacingGame(this.racingCanvas);

    this.racingGame.setOnLapUpdate((lap) => {
      this.lapDisplay.textContent = `${lap} / ${this.racingGame?.getTotalLaps() || 3}`;
    });

    this.racingGame.setOnGapUpdate((gap, playerAhead) => {
      const prefix = playerAhead ? '领先：+' : '落后：-';
      this.gapDisplay.textContent = `${prefix}${Math.floor(gap)}米`;
    });

    this.racingGame.setOnStatusUpdate((status) => {
      this.statusDisplay.textContent = status;
    });

    this.racingGame.setOnWin(() => {
      setTimeout(() => {
        this.switchToEditor();
      }, 2000);
    });

    this.loadTrackToRacing();
  }

  private bindEvents(): void {
    this.undoBtn.addEventListener('click', () => {
      this.editor?.undo();
      this.updateButtonStates();
    });

    this.clearBtn.addEventListener('click', () => {
      this.editor?.clear();
      this.updateButtonStates();
    });

    this.saveBtn.addEventListener('click', () => {
      this.updateTrackData();
      if (this.trackDataTextarea.value) {
        this.trackDataTextarea.select();
      }
    });

    this.startBtn.addEventListener('click', () => {
      this.switchToRacing();
    });

    this.backBtn.addEventListener('click', () => {
      this.switchToEditor();
    });

    const observer = new MutationObserver(() => {
      this.updateButtonStates();
    });
    observer.observe(this.editorCanvas, { attributes: true });

    setInterval(() => {
      this.updateButtonStates();
    }, 200);
  }

  private updateTrackData(): void {
    if (!this.editor) return;
    this.savedTrackData = this.editor.getTrackDataJSON();
    this.trackDataTextarea.value = this.savedTrackData;
  }

  private updateButtonStates(): void {
    if (!this.editor) return;

    this.undoBtn.disabled = !this.editor.canUndo();
    this.clearBtn.disabled = this.editor.getControlPoints().length === 0;
    this.saveBtn.disabled = !this.editor.hasValidTrack();
    this.startBtn.disabled = !this.editor.hasValidTrack();
  }

  private switchToRacing(): void {
    if (!this.editor || !this.editor.hasValidTrack()) return;

    this.updateTrackData();
    this.editorMode.classList.add('hidden');
    this.racingMode.classList.remove('hidden');

    this.initRacingGame();
  }

  private switchToEditor(): void {
    if (this.racingGame) {
      this.racingGame.stop();
    }

    this.racingMode.classList.add('hidden');
    this.editorMode.classList.remove('hidden');

    this.statusDisplay.textContent = '准备中';
  }

  private loadTrackToRacing(): void {
    if (!this.racingGame || !this.editor) return;

    try {
      const trackData = JSON.parse(this.savedTrackData || this.editor.getTrackDataJSON());
      const controlPoints = trackData.controlPoints || trackData;
      const success = this.racingGame.loadTrack(controlPoints);

      if (!success) {
        alert('赛道数据无效，请至少放置3个控制点！');
        this.switchToEditor();
      }
    } catch (e) {
      alert('赛道数据格式错误！');
      this.switchToEditor();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
