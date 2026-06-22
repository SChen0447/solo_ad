import { Pet } from './pet';

const LCD_GREEN = '#9BBC0F';
const LCD_GREEN_DARK = '#8B9F0A';
const CANVAS_W = 320;
const CANVAS_H = 288;
const PET_SCALE = 6;
const PET_SPRITE_SIZE = 32;
const PET_DISPLAY_SIZE = PET_SPRITE_SIZE * PET_SCALE;

type PixelMap = string[];

const COLORS: Record<string, string> = {
  '.': 'transparent',
  'G': '#8BC34A',
  'g': '#689F38',
  'L': '#AED581',
  'Y': '#C0CA33',
  'y': '#9E9D24',
  'W': '#DCE775',
  'B': '#212121',
  'w': '#FFFFFF',
  'P': '#F48FB1',
  'O': '#D32F2F',
  'K': '#795548',
  'S': '#42A5F5',
  'E': '#F57C00',
  'A': '#AFB42B'
};

const STANDING: PixelMap = [
  '................................',
  '................................',
  '................................',
  '................................',
  '..........GGGGGG................',
  '.........GGgggGGG...............',
  '........GGgggggGGG..............',
  '.......GGggwggggGGGGG...........',
  '......GGgggwwgggggGGGGG.........',
  '......GgggggggggggGGGGGG........',
  '.....GGggggggggggggGGGGGG.......',
  '.....GggPPgggggPPgggGGGGGG......',
  '....GGgggggggggggggggGGGGGG.....',
  '....GGgggggBBgggBBggggGGGGGG....',
  '....GgggggggggggggggggGGGGGG....',
  '....GgGGggggggggggggGGGGGGGG....',
  '....GGGLLggggggggLLGGGGGGGG.....',
  '....GGggggggggggggggGGGGGG......',
  '....GGggggggggggggggGGGGG.......',
  '....GGGggggggggggGGGGGGG........',
  '.....GGGGggggggGGGGGGG..........',
  '.......GGGGGGGGGGGG.............',
  '.......gg................gg.....',
  '......ggg................ggg....',
  '......gggg..............gggg....',
  '.....gggg................ggg....',
  '....gggg..................gg....',
  '....ggg...................gg....',
  '....ggg...................gg....',
  '................................',
  '................................',
  '................................'
];

const JUMPING: PixelMap = [
  '................................',
  '................................',
  '..........GGGGGG................',
  '.........GGgggGGG...............',
  '........GGgggggGGG..............',
  '.......GGggwggggGGGGG...........',
  '......GGgggwwgggggGGGGG.........',
  '......GgggggggggggGGGGGG........',
  '.....GGggggggggggggGGGGGG.......',
  '.....GggPPgggggPPgggGGGGGG......',
  '....GGgggggggggggggggGGGGGG.....',
  '....GGgggggBBgggBBggggGGGGGG....',
  '....GgggggggggggggggggGGGGGG....',
  '....GgGGggggggggggggGGGGGGGG....',
  '....GGGLLggggggggLLGGGGGGGG.....',
  '....GGggggggggggggggGGGGGG......',
  '....GGggggggggggggggGGGGG.......',
  '....GGGggggggggggGGGGGGG........',
  '.....GGGGggggggGGGGGGG..........',
  '.......GGGGGGGGGGGG.............',
  '.....GG..................GG.....',
  '....GGG..................GGG....',
  '....GGGG................GGGG....',
  '.....GGGG..............GGGG.....',
  '......GGGG............GGGG......',
  '.......GGGG..........GGGG.......',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................'
];

const YAWNING: PixelMap = [
  '................................',
  '................................',
  '................................',
  '................................',
  '..........GGGGGG................',
  '.........GGgggGGG...............',
  '........GGgggggGGG..............',
  '.......GGggBggggGGGGG...........',
  '......GGggggBgggggGGGGG.........',
  '......GgggggggggggGGGGGG........',
  '.....GGggggggggggggGGGGGG.......',
  '.....GggPPgggggPPgggGGGGGG......',
  '....GGgggggKKKKggggggGGGGGG.....',
  '....GGgggKKOOOOOOKgggGGGGGG....',
  '....GgggKOOOOOOOOOKgggGGGGGG....',
  '....GgGGggKKKKKggggGGGGGGGG.....',
  '....GGGLLggggggggLLGGGGGGGG.....',
  '....GGggggggggggggggGGGGGG......',
  '....GGggggggggggggggGGGGG.......',
  '....GGGggggggggggGGGGGGG........',
  '.....GGGGggggggGGGGGGG..........',
  '.......GGGGGGGGGGGG.............',
  '.......gg................gg.....',
  '......ggg................ggg....',
  '......gggg..............gggg....',
  '.....gggg................ggg....',
  '....gggg..................gg....',
  '....ggg...................gg....',
  '....ggg...................gg....',
  '................................',
  '..............www...............',
  '.............www................'
];

const WEAK: PixelMap = [
  '................................',
  '................................',
  '................................',
  '................................',
  '..........YYYYYY................',
  '.........YYyyyYYY...............',
  '........YYyyyyyYYY..............',
  '.......YYyyByyyyWWWWW...........',
  '......YYyyyByyyyyWWWWW..........',
  '......YyyyyyyyyyyWWWWWW.........',
  '.....YYyyyyyyyyyyyWWWWWW........',
  '.....YyyPPyyyyyPPyyyWWWWWW......',
  '....YYyyyyyyyyyyyyyyyWWWWWW.....',
  '....YYyyyyyEyyyyEyyyyyWWWWWW....',
  '....YyyyyyyyyyyyyyyyyyWWWWWW....',
  '....YyYYyyyyyyyyyyyyYYWWWWWW....',
  '....YYYWWyyyyyyyyWWWWWWWWW.....',
  '....YYyyyyyyyyyyyyyyWWWWW......',
  '....YYyyyyyyyyyyyyyyWWWWW.......',
  '....YYYyyyyyyyyyyYYWWWW........',
  '.....YYYYyyyyyyYYYYYY..........',
  '.......YYYYYYYYYY..............',
  '.......yy................yy.....',
  '......yyy................yyy....',
  '......yyyy..............yyyy....',
  '.....yyyy................yyy....',
  '....yyyy..................yy....',
  '....yyy...................yy....',
  '....yyy...................yy....',
  '........SSSS....................',
  '........S..S....................',
  '........SSSS....................'
];

const SPRITES: Record<string, PixelMap> = {
  standing: STANDING,
  jumping: JUMPING,
  yawning: YAWNING,
  weak: WEAK
};

function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
}

function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

function springBounceScale(elapsed: number, duration: number = 400): { scaleX: number; scaleY: number; offsetY: number } {
  const t = Math.min(1, elapsed / duration);

  if (t < 0.2) {
    const t1 = t / 0.2;
    const squash = easeOutBounce(t1);
    return {
      scaleX: 1.3 - squash * 0.3,
      scaleY: 0.7 + squash * 0.3,
      offsetY: (1 - squash) * 15
    };
  }

  if (t < 0.5) {
    const t2 = (t - 0.2) / 0.3;
    const stretch = easeOutElastic(t2);
    return {
      scaleX: 1 - stretch * 0.15,
      scaleY: 1 + stretch * 0.25,
      offsetY: -stretch * 10
    };
  }

  const t3 = (t - 0.5) / 0.5;
  const settle = easeOutBounce(t3);
  return {
    scaleX: 0.85 + settle * 0.15,
    scaleY: 1.25 - settle * 0.25,
    offsetY: -10 + settle * 10
  };
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private spriteCanvas: HTMLCanvasElement;
  private spriteCtx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.spriteCanvas = document.createElement('canvas');
    this.spriteCanvas.width = PET_SPRITE_SIZE;
    this.spriteCanvas.height = PET_SPRITE_SIZE;
    this.spriteCtx = this.spriteCanvas.getContext('2d')!;
  }

  render(pet: Pet, now: number): void {
    this.clearScreen();
    this.drawPetArea(pet, now);
    this.drawNotifications(pet, now);
  }

  private clearScreen(): void {
    this.ctx.fillStyle = LCD_GREEN;
    this.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    this.ctx.fillStyle = LCD_GREEN_DARK;
    for (let y = 0; y < CANVAS_H; y += 2) {
      this.ctx.fillRect(0, y, CANVAS_W, 1);
    }
  }

  private drawPetArea(pet: Pet, now: number): void {
    const petAreaX = 85;
    const petAreaY = 20;
    const petAreaW = CANVAS_W - petAreaX - 10;
    const petAreaH = CANVAS_H - 40;

    this.ctx.strokeStyle = '#306230';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(petAreaX, petAreaY, petAreaW, petAreaH);

    this.spriteCtx.clearRect(0, 0, PET_SPRITE_SIZE, PET_SPRITE_SIZE);

    const action = pet.getAnimationAction();
    this.drawPixelSprite(action);

    const t = now / 1000;
    const bounce = action === 'jumping' ? Math.abs(Math.sin(t * 4)) * 8 : 0;
    const yOff = action === 'weak' ? 4 : 0;

    const petCenterX = petAreaX + petAreaW / 2 - PET_DISPLAY_SIZE / 2;
    const petCenterY = petAreaY + petAreaH / 2 - PET_DISPLAY_SIZE / 2 + 10 - bounce + yOff;

    this.ctx.save();
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.globalAlpha = pet.fadeOpacity;
    this.ctx.drawImage(
      this.spriteCanvas,
      petCenterX, petCenterY,
      PET_DISPLAY_SIZE, PET_DISPLAY_SIZE
    );
    this.ctx.restore();
  }

  private drawPixelSprite(action: string): void {
    const sprite = SPRITES[action] || SPRITES.standing;
    const s = this.spriteCtx;

    for (let y = 0; y < PET_SPRITE_SIZE && y < sprite.length; y++) {
      const row = sprite[y];
      for (let x = 0; x < PET_SPRITE_SIZE && x < row.length; x++) {
        const key = row[x];
        const color = COLORS[key];
        if (color && color !== 'transparent') {
          s.fillStyle = color;
          s.fillRect(x, y, 1, 1);
        }
      }
    }
  }

  private drawNotifications(pet: Pet, now: number): void {
    const petAreaX = 85;
    const petAreaW = CANVAS_W - petAreaX - 10;
    const bubbleX = petAreaX + petAreaW / 2;
    const baseY = 55;

    pet.notifications.forEach((notif) => {
      const elapsed = now - notif.startTime;
      const totalDuration = notif.duration + 500;
      if (elapsed > totalDuration) return;

      const isEntering = elapsed < 400;
      const isExiting = elapsed > notif.duration;

      let opacity = 1;
      let scaleX = 1;
      let scaleY = 1;
      let offsetY = 0;

      if (isEntering) {
        const spring = springBounceScale(elapsed, 400);
        scaleX = spring.scaleX;
        scaleY = spring.scaleY;
        offsetY = spring.offsetY;
        opacity = Math.min(1, elapsed / 100);
      } else if (isExiting) {
        const exitT = (elapsed - notif.duration) / 500;
        opacity = 1 - exitT;
        scaleX = 1 - exitT * 0.3;
        scaleY = 1 - exitT * 0.3;
        offsetY = -exitT * 10;
      }

      const y = baseY + offsetY;
      const text = notif.text;

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, opacity);
      this.ctx.font = '8px "Press Start 2P", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      const metrics = this.ctx.measureText(text);
      const tw = Math.max(72, metrics.width + 20);
      const th = 24;

      this.ctx.translate(bubbleX, y);
      this.ctx.scale(scaleX, scaleY);

      this.drawPixelBubble(-tw / 2, -th / 2, tw, th);

      this.ctx.fillStyle = '#306230';
      this.ctx.fillText(text, 0, 0);

      this.ctx.restore();
    });
  }

  private drawPixelBubble(x: number, y: number, w: number, h: number): void {
    const ctx = this.ctx;
    const borderColor = '#306230';
    const bgColor = '#F5F5DC';
    const bgDark = '#E8E8C0';
    const hlColor = '#FFFFFF';
    const shColor = '#C0C0A0';

    ctx.fillStyle = bgColor;
    ctx.fillRect(x + 2, y + 2, w - 4, h - 4);

    ctx.fillStyle = hlColor;
    ctx.fillRect(x + 2, y + 2, w - 4, 2);
    ctx.fillRect(x + 2, y + 2, 2, h - 4);

    ctx.fillStyle = shColor;
    ctx.fillRect(x + 2, y + h - 4, w - 4, 2);
    ctx.fillRect(x + w - 4, y + 2, 2, h - 4);

    ctx.fillStyle = borderColor;
    for (let i = 2; i < w - 2; i++) {
      ctx.fillRect(x + i, y, 1, 1);
      ctx.fillRect(x + i, y + h - 1, 1, 1);
    }
    for (let i = 2; i < h - 2; i++) {
      ctx.fillRect(x, y + i, 1, 1);
      ctx.fillRect(x + w - 1, y + i, 1, 1);
    }

    ctx.fillStyle = borderColor;
    ctx.fillRect(x + 1, y + 1, 1, 1);
    ctx.fillRect(x + w - 2, y + 1, 1, 1);
    ctx.fillRect(x + 1, y + h - 2, 1, 1);
    ctx.fillRect(x + w - 2, y + h - 2, 1, 1);

    const tailW = 12;
    const tailH = 8;
    const tailX = x + w / 2 - tailW / 2;
    const tailY = y + h - 1;

    ctx.fillStyle = bgColor;
    ctx.fillRect(tailX + 3, tailY, tailW - 6, 2);
    ctx.fillRect(tailX + 5, tailY + 2, tailW - 10, 2);
    ctx.fillRect(tailX + tailW / 2 - 1, tailY + 4, 2, tailH - 4);

    ctx.fillStyle = borderColor;
    ctx.fillRect(tailX + 2, tailY, 1, 1);
    ctx.fillRect(tailX + tailW - 3, tailY, 1, 1);
    ctx.fillRect(tailX + 4, tailY + 2, 1, 1);
    ctx.fillRect(tailX + tailW - 5, tailY + 2, 1, 1);
    ctx.fillRect(tailX + tailW / 2 - 2, tailY + 4, 1, 2);
    ctx.fillRect(tailX + tailW / 2 + 1, tailY + 4, 1, 2);
    ctx.fillRect(tailX + tailW / 2 - 1, tailY + 6, 1, tailH - 6);
    ctx.fillRect(tailX + tailW / 2, tailY + tailH - 1, 1, 1);

    ctx.fillStyle = bgDark;
    ctx.fillRect(tailX + 3, tailY + 1, tailW - 6, 1);
  }
}
