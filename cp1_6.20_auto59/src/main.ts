import { FaceCapture, EmotionData } from './faceCapture';
import { GameRenderer, AnimationState } from './gameRenderer';
import { BattleSystem } from './battleSystem';

const THRESHOLD_JUMP = 0.6;
const THRESHOLD_ATTACK = 0.5;
const THRESHOLD_SKILL = 0.65;
const WALK_THRESHOLD = 0.25;

class GameApp {
  private faceCapture: FaceCapture;
  private renderer: GameRenderer;
  private battle: BattleSystem;
  private currentEmotion: EmotionData = { smile: 0, browRaise: 0, mouthOpen: 0 };
  private rafId: number | null = null;
  private lastAttackTrigger = 0;
  private lastSkillTrigger = 0;
  private lastJumpTrigger = 0;
  private attackCooldown = 600;
  private skillCooldown = 1000;
  private jumpCooldown = 500;

  constructor() {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
    if (!canvas) throw new Error('Canvas element not found');

    this.renderer = new GameRenderer(canvas);
    this.battle = new BattleSystem();
    this.faceCapture = new FaceCapture((data: EmotionData) => {
      this.currentEmotion = data;
    });

    this.setupClickHandler(canvas);
  }

  private setupClickHandler(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('click', (e: MouseEvent) => {
      const battleState = this.battle.getState();
      if (this.renderer.isRestartButtonClicked(e.clientX, e.clientY, battleState.battleEnded)) {
        this.battle.resetBattle();
      }
    });
  }

  async start(): Promise<void> {
    try {
      await this.faceCapture.start();
    } catch (err) {
      console.warn('Camera access denied or not available, running in demo mode:', err);
    }
    this.loop();
  }

  private loop = (): void => {
    const now = performance.now();
    const emotion = this.currentEmotion;

    this.battle.update(now);
    this.processEmotionToActions(emotion, now);
    const animState = this.determineAnimationState(emotion, now);
    this.renderer.setAnimationState(animState, now);

    const battleState = this.battle.getState();
    this.renderer.render(emotion, battleState, now);

    this.rafId = requestAnimationFrame(this.loop);
  };

  private processEmotionToActions(emotion: EmotionData, now: number): void {
    if (emotion.browRaise >= THRESHOLD_ATTACK && now - this.lastAttackTrigger > this.attackCooldown) {
      this.battle.triggerAttack(emotion.browRaise, now);
      this.lastAttackTrigger = now;
    }

    if (emotion.mouthOpen >= THRESHOLD_SKILL && now - this.lastSkillTrigger > this.skillCooldown) {
      this.battle.triggerSkill(emotion.mouthOpen, now);
      this.lastSkillTrigger = now;
    }

    if (emotion.smile >= THRESHOLD_JUMP && now - this.lastJumpTrigger > this.jumpCooldown) {
      this.lastJumpTrigger = now;
    }
  }

  private determineAnimationState(emotion: EmotionData, now: number): AnimationState {
    const battleState = this.battle.getState();

    if (battleState.lastPlayerAction === 'attack' && now - battleState.playerActionTimer < 200) {
      return 'attack';
    }
    if (battleState.lastPlayerAction === 'skill' && now - battleState.playerActionTimer < 400) {
      return 'skill';
    }
    if (now - this.lastJumpTrigger < 400) {
      return 'jump';
    }
    if (emotion.smile > WALK_THRESHOLD || emotion.browRaise > WALK_THRESHOLD * 0.5 || emotion.mouthOpen > WALK_THRESHOLD * 0.5) {
      const activeBattle = this.battle.getState();
      if (activeBattle.playerActionTimer <= now) {
        return 'walk';
      }
    }
    return 'idle';
  }

  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.faceCapture.destroy();
  }
}

let app: GameApp | null = null;

async function bootstrap(): Promise<void> {
  app = new GameApp();
  await app.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
