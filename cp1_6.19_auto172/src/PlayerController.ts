export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  baseSpeed: number;
  maxSpeed: number;
  invincible: boolean;
  invincibleTimer: number;
  flashTimer: number;
  visible: boolean;
  radius: number;
}

export interface Bullet {
  x: number;
  y: number;
  radius: number;
  speed: number;
  active: boolean;
}

interface KeyState {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
  space: boolean;
}

export class PlayerController {
  private player: Player;
  private bullets: Bullet[];
  private keyState: KeyState;
  private maxBullets: number = 50;
  private shootCooldown: number = 0;
  private shootInterval: number = 8;
  private moveHoldTime: { [key: string]: number } = {};
  private screenWidth: number;
  private screenHeight: number;

  constructor(screenWidth: number, screenHeight: number) {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.player = {
      x: 100,
      y: screenHeight / 2,
      width: 40,
      height: 30,
      speed: 3,
      baseSpeed: 3,
      maxSpeed: 5,
      invincible: false,
      invincibleTimer: 0,
      flashTimer: 0,
      visible: true,
      radius: 18,
    };
    this.bullets = [];
    this.keyState = { w: false, a: false, s: false, d: false, space: false };
    this.bindEvents();
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (key === 'w' || key === 'arrowup') {
      this.keyState.w = true;
      if (!this.moveHoldTime['vertical']) this.moveHoldTime['vertical'] = 0;
    }
    if (key === 's' || key === 'arrowdown') {
      this.keyState.s = true;
      if (!this.moveHoldTime['vertical']) this.moveHoldTime['vertical'] = 0;
    }
    if (key === 'a' || key === 'arrowleft') {
      this.keyState.a = true;
      if (!this.moveHoldTime['horizontal']) this.moveHoldTime['horizontal'] = 0;
    }
    if (key === 'd' || key === 'arrowright') {
      this.keyState.d = true;
      if (!this.moveHoldTime['horizontal']) this.moveHoldTime['horizontal'] = 0;
    }
    if (key === ' ' || e.code === 'Space') {
      this.keyState.space = true;
      e.preventDefault();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    if (key === 'w' || key === 'arrowup') {
      this.keyState.w = false;
      if (!this.keyState.s) delete this.moveHoldTime['vertical'];
    }
    if (key === 's' || key === 'arrowdown') {
      this.keyState.s = false;
      if (!this.keyState.w) delete this.moveHoldTime['vertical'];
    }
    if (key === 'a' || key === 'arrowleft') {
      this.keyState.a = false;
      if (!this.keyState.d) delete this.moveHoldTime['horizontal'];
    }
    if (key === 'd' || key === 'arrowright') {
      this.keyState.d = false;
      if (!this.keyState.a) delete this.moveHoldTime['horizontal'];
    }
    if (key === ' ' || e.code === 'Space') {
      this.keyState.space = false;
    }
  }

  private getSpeed(direction: string): number {
    if (this.moveHoldTime[direction] !== undefined) {
      this.moveHoldTime[direction]++;
      if (this.moveHoldTime[direction] > 15) {
        return this.player.maxSpeed;
      }
    }
    return this.player.baseSpeed;
  }

  public update(): void {
    if (this.keyState.w) {
      this.player.y -= this.getSpeed('vertical');
    }
    if (this.keyState.s) {
      this.player.y += this.getSpeed('vertical');
    }
    if (this.keyState.a) {
      this.player.x -= this.getSpeed('horizontal');
    }
    if (this.keyState.d) {
      this.player.x += this.getSpeed('horizontal');
    }

    this.player.x = Math.max(this.player.width / 2, Math.min(this.screenWidth - this.player.width / 2, this.player.x));
    this.player.y = Math.max(this.player.height / 2 + 40, Math.min(this.screenHeight - this.player.height / 2, this.player.y));

    if (this.keyState.space) {
      if (this.shootCooldown <= 0) {
        this.shoot();
        this.shootCooldown = this.shootInterval;
      }
    }
    if (this.shootCooldown > 0) this.shootCooldown--;

    this.updateBullets();
    this.updateInvincibility();
  }

  private shoot(): void {
    let bullet = this.bullets.find(b => !b.active);
    if (!bullet && this.bullets.length < this.maxBullets) {
      bullet = { x: 0, y: 0, radius: 3, speed: 10, active: false };
      this.bullets.push(bullet);
    }
    if (bullet) {
      bullet.x = this.player.x + this.player.width / 2;
      bullet.y = this.player.y;
      bullet.active = true;
    }
  }

  private updateBullets(): void {
    for (const bullet of this.bullets) {
      if (bullet.active) {
        bullet.x += bullet.speed;
        if (bullet.x > this.screenWidth + 10) {
          bullet.active = false;
        }
      }
    }
  }

  private updateInvincibility(): void {
    if (this.player.invincible) {
      this.player.invincibleTimer--;
      this.player.flashTimer++;
      if (this.player.flashTimer % 6 === 0) {
        this.player.visible = !this.player.visible;
      }
      if (this.player.invincibleTimer <= 0) {
        this.player.invincible = false;
        this.player.visible = true;
      }
    }
  }

  public setInvincible(frames: number): void {
    this.player.invincible = true;
    this.player.invincibleTimer = frames;
    this.player.flashTimer = 0;
    this.player.visible = true;
  }

  public getPlayer(): Player {
    return this.player;
  }

  public getBullets(): Bullet[] {
    return this.bullets.filter(b => b.active);
  }

  public getAllBullets(): Bullet[] {
    return this.bullets;
  }

  public reset(screenWidth: number, screenHeight: number): void {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.player.x = 100;
    this.player.y = screenHeight / 2;
    this.player.invincible = false;
    this.player.invincibleTimer = 0;
    this.player.visible = true;
    for (const b of this.bullets) {
      b.active = false;
    }
    this.moveHoldTime = {};
  }

  public resize(screenWidth: number, screenHeight: number): void {
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.player.x = Math.max(this.player.width / 2, Math.min(this.screenWidth - this.player.width / 2, this.player.x));
    this.player.y = Math.max(this.player.height / 2 + 40, Math.min(this.screenHeight - this.player.height / 2, this.player.y));
  }
}
