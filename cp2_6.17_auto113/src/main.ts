import { AudioManager } from './audioManager';
import { NoteManager, type Song, type JudgeResult } from './noteManager';
import { Renderer } from './renderer';
import songsData from '../data/songs.json';

type Scene = 'start' | 'select' | 'game' | 'result';

const TRACK_COLORS = ['#ff4757', '#3742fa', '#2ed573', '#ffa502'];

export class GameApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private audioManager: AudioManager;
  private noteManager: NoteManager;
  private renderer: Renderer;
  private currentScene: Scene = 'start';
  private currentSong: Song | null = null;
  private songs: Song[] = [];
  private selectedSongIndex = 0;
  private animationId = 0;
  private lastFrameTime = 0;
  private animationTime = 0;
  private resultAnimationTime = 0;
  private gameStartTime = 0;

  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private perfectCount = 0;
  private goodCount = 0;
  private missCount = 0;

  private startBtnHover = false;
  private backBtnHover = false;
  private isGameEnded = false;
  private speedSettings: number[] = [];
  private activeSliderIndex: number | null = null;
  private isDraggingSlider = false;
  private currentSpeedMultiplier = 1.0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;

    this.audioManager = new AudioManager();
    this.noteManager = new NoteManager();
    this.renderer = new Renderer(ctx, canvas);

    this.songs = songsData.songs as Song[];
    this.speedSettings = this.songs.map(() => 1.0);

    this.resize();
    this.bindEvents();
  }

  public async init(): Promise<void> {
    this.resize();
    this.startGameLoop();
  }

  private resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.canvas.width = width;
    this.canvas.height = height;
    this.noteManager.setCanvasSize(width, height);
    this.renderer.resize(width, height);
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resize());

    window.addEventListener('keydown', (e) => {
      if (this.currentScene === 'game') {
        const result = this.noteManager.handleKeyDown(e.key);
        if (result) {
          this.processJudgeResult(result);
        }
      } else if (this.currentScene === 'select') {
        if (e.key === 'ArrowUp') {
          this.selectedSongIndex = Math.max(0, this.selectedSongIndex - 1);
        } else if (e.key === 'ArrowDown') {
          this.selectedSongIndex = Math.min(this.songs.length - 1, this.selectedSongIndex + 1);
        } else if (e.key === 'Enter') {
          this.startGame(this.songs[this.selectedSongIndex].id);
        }
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (this.currentScene === 'start') {
        this.startBtnHover = this.renderer.isPointInStartButton(x, y);
        this.renderer.setButtonHover('startBtn', this.startBtnHover);
        this.canvas.style.cursor = this.startBtnHover ? 'pointer' : 'default';
      } else if (this.currentScene === 'result') {
        this.backBtnHover = this.renderer.isPointInBackButton(x, y);
        this.renderer.setButtonHover('backBtn', this.backBtnHover);
        this.canvas.style.cursor = this.backBtnHover ? 'pointer' : 'default';
      } else if (this.currentScene === 'select') {
        if (this.isDraggingSlider && this.activeSliderIndex !== null) {
          this.speedSettings[this.activeSliderIndex] = this.renderer.getSpeedValueFromX(x, this.activeSliderIndex, this.songs);
          this.canvas.style.cursor = 'ew-resize';
        } else {
          const sliderIndex = this.renderer.getSliderAtPoint(x, y, this.songs);
          if (sliderIndex >= 0) {
            this.activeSliderIndex = sliderIndex;
            this.canvas.style.cursor = 'ew-resize';
          } else {
            this.activeSliderIndex = null;
            const cardIndex = this.renderer.isPointInSongCard(x, y, this.songs);
            this.canvas.style.cursor = cardIndex >= 0 ? 'pointer' : 'default';
          }
        }
      } else {
        this.canvas.style.cursor = 'default';
      }
    });

    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (this.currentScene === 'select') {
        const sliderIndex = this.renderer.getSliderAtPoint(x, y, this.songs);
        if (sliderIndex >= 0) {
          this.isDraggingSlider = true;
          this.activeSliderIndex = sliderIndex;
          this.speedSettings[sliderIndex] = this.renderer.getSpeedValueFromX(x, sliderIndex, this.songs);
          e.preventDefault();
        }
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDraggingSlider = false;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isDraggingSlider = false;
      this.activeSliderIndex = null;
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (this.currentScene === 'start' && this.renderer.isPointInStartButton(x, y)) {
        this.changeScene('select');
      } else if (this.currentScene === 'select') {
        const sliderIndex = this.renderer.getSliderAtPoint(x, y, this.songs);
        if (sliderIndex >= 0) return;
        const cardIndex = this.renderer.isPointInSongCard(x, y, this.songs);
        if (cardIndex >= 0) {
          this.selectedSongIndex = cardIndex;
          setTimeout(() => this.startGame(this.songs[cardIndex].id), 200);
        }
      } else if (this.currentScene === 'result' && this.renderer.isPointInBackButton(x, y)) {
        this.changeScene('select');
      }
    });
  }

  private processJudgeResult(result: JudgeResult): void {
    this.renderer.showJudgeResult(result);

    if (result.type === 'perfect') {
      this.perfectCount++;
      this.combo++;
      this.score += 100 * (1 + this.combo / 100);
      this.renderer.spawnParticles(result.x, result.y, TRACK_COLORS[result.track], 6 + Math.floor(Math.random() * 3));
      this.renderer.spawnHalo(result.x, result.y, result.track);
    } else if (result.type === 'good') {
      this.goodCount++;
      this.combo++;
      this.score += 50 * (1 + this.combo / 100);
    } else if (result.type === 'miss') {
      this.missCount++;
      this.combo = 0;
    }

    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }
  }

  public startGame(songId: string): void {
    const songIndex = this.songs.findIndex(s => s.id === songId);
    const song = this.songs[songIndex];
    if (!song) return;

    this.currentSong = song;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.perfectCount = 0;
    this.goodCount = 0;
    this.missCount = 0;
    this.isGameEnded = false;
    this.gameStartTime = 0;
    this.currentSpeedMultiplier = this.speedSettings[songIndex] || 1.0;

    this.noteManager.setSpeed(this.currentSpeedMultiplier);
    this.noteManager.loadNotes(song);

    if (song.useSynthetic) {
      this.audioManager.playSynthetic(song.bpm, song.duration, 0);
    } else if (song.audioUrl) {
      this.audioManager.loadAudio(song.audioUrl).then(() => {
        this.audioManager.play();
      });
    }

    this.changeScene('game');
  }

  public endGame(): void {
    if (this.isGameEnded) return;
    this.isGameEnded = true;

    this.audioManager.stop();

    const currentSong = this.currentSong;
    if (currentSong && currentSong.useSynthetic) {
      setTimeout(() => {
        this.audioManager.playSynthetic(currentSong.bpm, currentSong.duration, 0);
        this.audioManager.setVolume(0.3);
      }, 500);
    }

    this.resultAnimationTime = 0;
    this.changeScene('result');
  }

  private calculateGrade(): string {
    const total = this.perfectCount + this.goodCount + this.missCount;
    if (total === 0) return 'C';

    const perfectRate = this.perfectCount / total;
    if (perfectRate >= 0.9) return 'S';
    if (perfectRate >= 0.7) return 'A';
    if (perfectRate >= 0.5) return 'B';
    return 'C';
  }

  public changeScene(scene: Scene): void {
    this.currentScene = scene;
    if (scene === 'select') {
      this.audioManager.stop();
      this.audioManager.setVolume(0.7);
    }
  }

  private startGameLoop(): void {
    const loop = (timestamp: number) => {
      const deltaTime = this.lastFrameTime > 0 ? timestamp - this.lastFrameTime : 16.67;
      this.lastFrameTime = timestamp;
      this.animationTime = timestamp;

      if (this.currentScene === 'result') {
        this.resultAnimationTime += deltaTime;
      }

      this.update(deltaTime);
      this.render();

      this.animationId = requestAnimationFrame(loop);
    };

    this.animationId = requestAnimationFrame(loop);
  }

  private update(deltaTime: number): void {
    this.renderer.updateParticles(deltaTime);

    if (this.currentScene === 'game' && this.currentSong) {
      const currentTime = this.audioManager.getCurrentTime();

      if (this.gameStartTime === 0 && currentTime > 0) {
        this.gameStartTime = currentTime;
      }

      const missResult = this.noteManager.update(currentTime);
      if (missResult) {
        this.processJudgeResult(missResult);
      }

      const songDuration = this.currentSong.duration;
      if (currentTime >= songDuration + 1000 || this.noteManager.isSongComplete()) {
        this.endGame();
      }
    }
  }

  private render(): void {
    this.renderer.clear();
    this.renderer.drawBackground(this.currentScene);

    switch (this.currentScene) {
      case 'start':
        this.renderer.drawStartScreen(this.animationTime, this.startBtnHover);
        break;

      case 'select':
        this.renderer.drawSelectScreen(
          this.songs,
          this.selectedSongIndex,
          this.animationTime,
          this.speedSettings,
          this.isDraggingSlider ? this.activeSliderIndex : this.activeSliderIndex
        );
        break;

      case 'game':
        if (this.currentSong) {
          const currentTime = this.audioManager.getCurrentTime();
          const progress = Math.min(1, currentTime / this.currentSong.duration);
          const activeNotes = this.noteManager.getActiveNotes();
          const judgeLineY = this.noteManager.getJudgeLineY();

          this.renderer.drawGameScreen(
            activeNotes,
            this.score,
            this.combo,
            progress,
            judgeLineY,
            this.currentSpeedMultiplier
          );
        }
        break;

      case 'result':
        const grade = this.calculateGrade();
        this.renderer.drawResultScreen(
          this.score,
          this.maxCombo,
          this.perfectCount,
          this.goodCount,
          this.missCount,
          grade,
          this.resultAnimationTime
        );
        break;
    }
  }

  public destroy(): void {
    cancelAnimationFrame(this.animationId);
    this.audioManager.stop();
  }
}

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (canvas) {
  const game = new GameApp(canvas);
  game.init().catch(console.error);
}
