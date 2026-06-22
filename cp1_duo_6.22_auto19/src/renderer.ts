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

function dampedSine(elapsed: number, maxTime: number = 800): number {
  const t = elapsed / maxTime;
  if (t >= 1) return 0;
  const decay = Math.exp(-t * 6);
  const oscillation = Math.sin(t * Math.PI * 2 * 2);
  return -oscillation * decay * 12 * (1 - t);
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private spriteCanvas: HTMLCanvasElement;
  private spriteCtx: CanvasRenderingContext2D;
  private animTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.spriteCanvas = document.createElement('canvas');
    this.spriteCanvas.width = PET_SPRITE_SIZE;
    this.spriteCanvas.height = PET_SPRITE_SIZE;
    this.spriteCtx = this.spriteCanvas.getContext('2d')!;
  }

  render(pet: Pet, now: number): void {
    this.animTime = now;
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

    pet.notifications.forEach((notif) => {
      const elapsed = now - notif.startTime;
      if (elapsed > notif.duration + 500) return;

      let opacity = 1;
      if (elapsed < 200) {
        opacity = elapsed / 200;
      } else if (elapsed > notif.duration) {
        opacity = 1 - (elapsed - notif.duration) / 500;
      }
      opacity = Math.max(0, Math.min(1, opacity));

      const bounceY = dampedSine(elapsed, 800);

      const baseY = 55 + bounceY;
      const text = notif.text;

      const tScale = elapsed < 600 ? easeOutBounce(Math.min(1, elapsed / 600)) : 1;
      const scale = 0.8 + tScale * 0.2;

      this.ctx.save();
      this.ctx.globalAlpha = opacity;
      this.ctx.font = '8px "Press Start 2P", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';

      const metrics = this.ctx.measureText(text);
      const tw = Math.max(70, metrics.width + 16);
      const th = 22;

      this.ctx.translate(bubbleX, baseY);
      this.ctx.scale(scale, scale);

      this.ctx.fillStyle = '#FFFFFF';
      this.roundRect(-tw / 2, -th / 2, tw, th, 3);
      this.ctx.fill();

      this.ctx.strokeStyle = '#306230';
      this.ctx.lineWidth = 2;
      this.roundRect(-tw / 2, -th / 2, tw, th, 3);
      this.ctx.stroke();

      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillRect(-tw / 2 + 2, -th / 2 + 2, tw - 4, 3);
      this.ctx.fillRect(-tw / 2 + 2, -th / 2 + 2, 3, th - 4);

      this.ctx.fillStyle = '#306230';
      this.ctx.fillText(text, 0, 0);

      this.ctx.beginPath();
      this.ctx.moveTo(-6, th / 2);
      this.ctx.lineTo(0, th / 2 + 8);
      this.ctx.lineTo(6, th / 2);
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fill();
      this.ctx.strokeStyle = '#306230';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      this.ctx.restore();
    });
  }

  private roundRect(
    x: number, y: number,
    w: number, h: number,
    r: number
  ): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.arcTo(x + w, y, x + w, y + r, r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.arcTo(x, y + h, x, y + h - r, r);
    this.ctx.lineTo(x, y + r);
    this.ctx.arcTo(x, y, x + r, y, r);
    this.ctx.closePath();
  }
}
