import Phaser from 'phaser';
import { GravityManager, PlanetData } from '../physics/GravityManager';
import { ParticleEffect } from '../effects/ParticleEffect';
import { UIOverlay } from '../ui/UIOverlay';

type ArcadeBody = Phaser.Physics.Arcade.Body;

export class PlanetScene extends Phaser.Scene {
  private gravityManager: GravityManager;
  private particleEffect: ParticleEffect | null = null;
  private uiOverlay: UIOverlay | null = null;

  private player: Phaser.Physics.Arcade.Sprite | null = null;
  private playerShadow: Phaser.GameObjects.Ellipse | null = null;
  private groundLayer: Phaser.Physics.Arcade.StaticGroup | null = null;
  private springBlocks: Phaser.Physics.Arcade.Sprite[] = [];
  private platforms: Phaser.Physics.Arcade.StaticGroup | null = null;

  private background: Phaser.GameObjects.Graphics | null = null;
  private stars: Phaser.GameObjects.Arc[] = [];
  private parallaxLayers: Phaser.GameObjects.Graphics[] = [];

  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private spaceKey: Phaser.Input.Keyboard.Key | null = null;

  private currentPlanet: PlanetData;
  private targetPlanet: PlanetData;
  private bgTransitionProgress: number = 0;
  private isBgTransitioning: boolean = false;
  private currentBgTop: number;
  private currentBgBottom: number;

  private readonly PLAYER_SPEED = 280;
  private readonly JUMP_VELOCITY_BASE = -520;
  private readonly SPRING_BOUNCE = -900;
  private readonly GROUND_Y_OFFSET = 100;

  private wasOnGround: boolean = true;
  private lastGravityFactor: number = 1;

  constructor(gravityManager: GravityManager) {
    super({ key: 'PlanetScene' });
    this.gravityManager = gravityManager;
    this.currentPlanet = gravityManager.getCurrentPlanet();
    this.targetPlanet = this.currentPlanet;
    this.currentBgTop = this.currentPlanet.bgTop;
    this.currentBgBottom = this.currentPlanet.bgBottom;
    this.lastGravityFactor = this.currentPlanet.gravity;
  }

  preload(): void {
    this.generateTextures();
  }

  private generateTextures(): void {
    this.generatePlayerTexture();
    this.generateGroundTexture();
    this.generateSpringTexture();
    this.generatePlatformTexture();
  }

  private generatePlayerTexture(): void {
    const w = 32;
    const h = 44;
    const gfx = this.make.graphics({});

    gfx.fillStyle(0x4fc3f7, 1);
    this.drawPixelRect(gfx, 6, 12, 20, 24);

    gfx.fillStyle(0xffcc99, 1);
    this.drawPixelRect(gfx, 8, 0, 16, 16);

    gfx.fillStyle(0xffffff, 1);
    this.drawPixelRect(gfx, 10, 4, 5, 6);
    this.drawPixelRect(gfx, 17, 4, 5, 6);
    gfx.fillStyle(0x222222, 1);
    this.drawPixelRect(gfx, 12, 6, 2, 3);
    this.drawPixelRect(gfx, 19, 6, 2, 3);

    gfx.fillStyle(0x2196f3, 1);
    this.drawPixelRect(gfx, 6, 36, 8, 8);
    this.drawPixelRect(gfx, 18, 36, 8, 8);

    gfx.generateTexture('player_tex', w, h);
    gfx.destroy();
  }

  private drawPixelRect(gfx: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
    gfx.fillRect(x, y, w, h);
  }

  private generateGroundTexture(): void {
    const w = 64;
    const h = 64;
    const gfx = this.make.graphics({});
    gfx.fillStyle(0x5d8a4a, 1);
    gfx.fillRect(0, 0, w, h);
    gfx.fillStyle(0x7cb342, 1);
    gfx.fillRect(0, 0, w, 12);
    gfx.fillStyle(0x4a6e3a, 1);
    for (let i = 0; i < 8; i++) {
      const px = Phaser.Math.Between(0, w - 4);
      const py = Phaser.Math.Between(16, h - 4);
      gfx.fillRect(px, py, 4, 4);
    }
    gfx.generateTexture('ground_tex', w, h);
    gfx.destroy();
  }

  private generateSpringTexture(): void {
    const w = 48;
    const h = 32;
    const gfx = this.make.graphics({});

    gfx.fillStyle(0x666666, 1);
    gfx.fillRect(0, 24, w, 8);

    gfx.fillStyle(0xff9800, 1);
    for (let i = 0; i < 4; i++) {
      gfx.fillRect(4, 4 + i * 5, w - 8, 3);
    }

    gfx.fillStyle(0xffc107, 1);
    gfx.fillRect(0, 0, w, 6);

    gfx.generateTexture('spring_tex', w, h);
    gfx.destroy();

    const gfx2 = this.make.graphics({});
    gfx2.fillStyle(0x666666, 1);
    gfx2.fillRect(0, 28, w, 4);
    gfx2.fillStyle(0xff9800, 1);
    for (let i = 0; i < 2; i++) {
      gfx2.fillRect(4, 14 + i * 4, w - 8, 2);
    }
    gfx2.fillStyle(0xffc107, 1);
    gfx2.fillRect(0, 8, w, 6);
    gfx2.fillStyle(0xffeb3b, 1);
    gfx2.fillRect(4, 4, w - 8, 4);
    gfx2.generateTexture('spring_compressed_tex', w, h);
    gfx2.destroy();
  }

  private generatePlatformTexture(): void {
    const w = 128;
    const h = 24;
    const gfx = this.make.graphics({});
    gfx.fillStyle(0x8d6e63, 1);
    gfx.fillRect(0, 0, w, h);
    gfx.fillStyle(0xa1887f, 1);
    gfx.fillRect(0, 0, w, 6);
    gfx.fillStyle(0x6d4c41, 1);
    for (let i = 0; i < 4; i++) {
      gfx.fillRect(i * 32 + 4, 10, 2, 10);
    }
    gfx.generateTexture('platform_tex', w, h);
    gfx.destroy();
  }

  create(): void {
    this.particleEffect = new ParticleEffect(this);
    this.uiOverlay = new UIOverlay(this, this.gravityManager);
    this.uiOverlay.setPlanetSwitchCallback((planetId: string) => {
      this.requestPlanetSwitch(planetId);
    });

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.createBackground();
    this.createStars();
    this.createParallaxLayers();
    this.createGround();
    this.createPlatforms();
    this.createSprings();
    this.createPlayer();

    this.gravityManager.addCallback((gravity: number, planet: PlanetData, progress: number) => {
      this.onGravityUpdate(gravity, planet, progress);
    });

    this.scale.on('resize', this.handleResize, this);
  }

  private createBackground(): void {
    this.background = this.add.graphics();
    this.background.setDepth(-100);
    this.redrawBackground();
  }

  private hexToRgb(hex: number): { r: number; g: number; b: number } {
    const color = Phaser.Display.Color.IntegerToColor(hex);
    return {
      r: color.red,
      g: color.green,
      b: color.blue
    };
  }

  private redrawBackground(): void {
    if (!this.background) return;
    const w = this.scale.width;
    const h = this.scale.height;
    this.background.clear();

    const topColor = this.hexToRgb(this.currentBgTop);
    const bottomColor = this.hexToRgb(this.currentBgBottom);

    for (let y = 0; y < h; y += 2) {
      const t = y / h;
      const r = Math.floor(topColor.r + (bottomColor.r - topColor.r) * t);
      const g = Math.floor(topColor.g + (bottomColor.g - topColor.g) * t);
      const b = Math.floor(topColor.b + (bottomColor.b - topColor.b) * t);
      this.background.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
      this.background.fillRect(0, y, w, 2);
    }
  }

  private createStars(): void {
    const w = this.scale.width;
    const h = this.scale.height - this.GROUND_Y_OFFSET;
    const starCount = 60;
    for (let i = 0; i < starCount; i++) {
      const x = Phaser.Math.Between(0, w);
      const y = Phaser.Math.Between(20, h - 20);
      const r = Phaser.Math.FloatBetween(0.5, 2);
      const alpha = Phaser.Math.FloatBetween(0.3, 0.9);
      const star = this.add.circle(x, y, r, 0xffffff, alpha);
      star.setDepth(-90);
      this.stars.push(star);
    }
  }

  private createParallaxLayers(): void {
    const h = this.scale.height;

    const layer1 = this.add.graphics();
    layer1.setDepth(-80);
    this.drawMountains(layer1, h - this.GROUND_Y_OFFSET - 80, 0x3a3a5a, 0.6, 150, 80);
    this.parallaxLayers.push(layer1);

    const layer2 = this.add.graphics();
    layer2.setDepth(-70);
    this.drawMountains(layer2, h - this.GROUND_Y_OFFSET - 40, 0x4a4a6a, 0.8, 100, 50);
    this.parallaxLayers.push(layer2);
  }

  private drawMountains(gfx: Phaser.GameObjects.Graphics, baseY: number, color: number, alpha: number, peakWidth: number, peakHeight: number): void {
    const w = this.scale.width;
    gfx.clear();
    gfx.fillStyle(color, alpha);
    gfx.beginPath();
    gfx.moveTo(0, baseY + peakHeight);
    let x = 0;
    while (x < w + peakWidth) {
      gfx.lineTo(x + peakWidth / 2, baseY + Phaser.Math.Between(-peakHeight * 0.3, peakHeight));
      gfx.lineTo(x + peakWidth, baseY + peakHeight);
      x += peakWidth;
    }
    gfx.lineTo(w, baseY + peakHeight + 100);
    gfx.lineTo(0, baseY + peakHeight + 100);
    gfx.closePath();
    gfx.fillPath();
  }

  private createGround(): void {
    this.groundLayer = this.physics.add.staticGroup();
    const w = this.scale.width;
    const h = this.scale.height;
    const tileW = 64;
    const groundY = h - this.GROUND_Y_OFFSET;
    const tilesCount = Math.ceil(w / tileW) + 2;

    for (let i = 0; i < tilesCount; i++) {
      const tile = this.groundLayer.create(i * tileW, groundY, 'ground_tex') as Phaser.Physics.Arcade.Sprite;
      tile.setOrigin(0, 0);
      tile.refreshBody();
    }

    this.updateGroundTint();
  }

  private updateGroundTint(): void {
    if (!this.groundLayer) return;
    const children = this.groundLayer.getChildren() as Phaser.Physics.Arcade.Sprite[];
    children.forEach((sprite: Phaser.Physics.Arcade.Sprite) => {
      sprite.setTint(this.currentPlanet.groundColor);
    });
  }

  private createPlatforms(): void {
    this.platforms = this.physics.add.staticGroup();
    const h = this.scale.height;

    const platformPositions = [
      { x: 200, y: h - this.GROUND_Y_OFFSET - 140 },
      { x: 450, y: h - this.GROUND_Y_OFFSET - 220 },
      { x: 700, y: h - this.GROUND_Y_OFFSET - 160 },
      { x: 950, y: h - this.GROUND_Y_OFFSET - 260 },
      { x: 1150, y: h - this.GROUND_Y_OFFSET - 180 },
    ];

    platformPositions.forEach(p => {
      if (p.x < this.scale.width + 100) {
        const plat = this.platforms!.create(p.x, p.y, 'platform_tex') as Phaser.Physics.Arcade.Sprite;
        plat.setOrigin(0, 0);
        plat.refreshBody();
      }
    });
  }

  private createSprings(): void {
    const h = this.scale.height;
    const springPositions = [
      { x: 350, y: h - this.GROUND_Y_OFFSET - 32 },
      { x: 800, y: h - this.GROUND_Y_OFFSET - 32 },
      { x: 550, y: h - this.GROUND_Y_OFFSET - 252 },
    ];

    springPositions.forEach(p => {
      if (p.x < this.scale.width + 100) {
        const spring = this.physics.add.sprite(p.x, p.y, 'spring_tex');
        spring.setOrigin(0, 0);
        spring.setImmovable(true);
        (spring.body as ArcadeBody).setAllowGravity(false);
        spring.setData('compressed', false);
        this.springBlocks.push(spring);
      }
    });
  }

  private createPlayer(): void {
    const h = this.scale.height;
    this.player = this.physics.add.sprite(100, h - this.GROUND_Y_OFFSET - 60, 'player_tex');
    this.player.setCollideWorldBounds(true);
    (this.player.body as ArcadeBody).setSize(24, 40);
    (this.player.body as ArcadeBody).setOffset(4, 4);

    const gravity = this.gravityManager.getCurrentGravity();
    (this.player.body as ArcadeBody).setGravityY(gravity);

    this.playerShadow = this.add.ellipse(
      this.player.x,
      h - this.GROUND_Y_OFFSET - 2,
      28,
      8,
      0x00ffff,
      0.3
    );
    this.playerShadow.setDepth(5);

    this.physics.add.collider(
      this.player as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
      this.groundLayer as Phaser.Physics.Arcade.StaticGroup,
      (_obj1, _obj2) => { this.onPlayerLand(); },
      undefined,
      this
    );
    this.physics.add.collider(
      this.player as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
      this.platforms as Phaser.Physics.Arcade.StaticGroup
    );
    this.springBlocks.forEach(spring => {
      this.physics.add.collider(
        this.player as Phaser.Types.Physics.Arcade.SpriteWithDynamicBody,
        spring as Phaser.Types.Physics.Arcade.SpriteWithStaticBody,
        (_p, s) => { this.onSpringHit(s as Phaser.Physics.Arcade.Sprite); },
        undefined,
        this
      );
    });
  }

  private onPlayerLand(): void {
    const player = this.player!;
    const body = player.body as ArcadeBody;
    const wasFalling = !this.wasOnGround && body.touching.down && body.velocity.y >= 0;
    this.wasOnGround = true;

    if (wasFalling && this.particleEffect) {
      this.particleEffect.spawnShockwave(
        player.x,
        player.y + player.height / 2 - 4,
        this.gravityManager.getCurrentPlanet()
      );
    }
  }

  private onSpringHit(spring: Phaser.Physics.Arcade.Sprite): void {
    const player = this.player!;
    const playerBody = player.body as ArcadeBody;

    if (playerBody.touching.down && !spring.getData('compressed')) {
      player.setVelocityY(this.SPRING_BOUNCE);
      spring.setData('compressed', true);
      spring.setTexture('spring_compressed_tex');

      if (this.particleEffect) {
        this.particleEffect.spawnSpringBounce(spring.x + spring.width / 2, spring.y);
      }

      this.time.delayedCall(200, () => {
        spring.setTexture('spring_tex');
        spring.setData('compressed', false);
      });
    }
  }

  private onGravityUpdate(gravity: number, planet: PlanetData, progress: number): void {
    if (this.player && this.player.body) {
      (this.player.body as ArcadeBody).setGravityY(gravity);
    }
    this.lastGravityFactor = gravity / this.gravityManager.getBaseGravity();

    if (!this.isBgTransitioning) {
      this.isBgTransitioning = true;
      this.targetPlanet = planet;
      this.bgTransitionProgress = 0;
    }

    this.uiOverlay?.updatePlanetInfo(
      planet,
      this.lastGravityFactor
    );
  }

  private requestPlanetSwitch(planetId: string): void {
    const switched = this.gravityManager.switchToPlanet(planetId);
    if (switched) {
      this.isBgTransitioning = true;
      const planet = this.gravityManager.getAllPlanets().find(p => p.id === planetId);
      if (planet) {
        this.targetPlanet = planet;
      }
      this.bgTransitionProgress = 0;
      this.uiOverlay?.setSelectedPlanet(planetId);
    }
  }

  update(time: number, delta: number): void {
    this.gravityManager.update(delta);
    this.handleInput(delta);
    this.updatePlayerShadow();
    this.updateBackgroundTransition(delta);
    this.uiOverlay?.update(time, delta);

    if (this.player && this.player.body) {
      const body = this.player.body as ArcadeBody;
      this.wasOnGround = body.onFloor() || body.touching.down;
    }
  }

  private handleInput(delta: number): void {
    if (!this.player || !this.cursors) return;

    const body = this.player.body as ArcadeBody;
    const gravityFactor = this.lastGravityFactor;
    const inertiaFactor = 0.15 + (1 - gravityFactor) * 0.45;
    const speed = this.PLAYER_SPEED * (0.85 + gravityFactor * 0.15);

    let targetVelX = 0;

    if (this.cursors.left.isDown) {
      targetVelX = -speed;
      this.player.setFlipX(true);
    } else if (this.cursors.right.isDown) {
      targetVelX = speed;
      this.player.setFlipX(false);
    }

    const currentVelX = body.velocity.x;
    const newVelX = currentVelX + (targetVelX - currentVelX) * inertiaFactor;
    body.setVelocityX(newVelX);

    const canJump = body.onFloor() || body.touching.down;
    if ((this.spaceKey?.isDown || this.cursors.up.isDown) && canJump) {
      const jumpPower = this.JUMP_VELOCITY_BASE * Math.sqrt(gravityFactor);
      body.setVelocityY(jumpPower);
      this.wasOnGround = false;
    }

    const velY = body.velocity.y;
    if (!body.onFloor() && velY > 0 && velY < 40) {
      body.setVelocityY(velY * 0.92);
    }
  }

  private updatePlayerShadow(): void {
    if (!this.player || !this.playerShadow) return;

    const h = this.scale.height;
    const groundY = h - this.GROUND_Y_OFFSET;
    const playerBottom = this.player.y + this.player.height / 2;
    const heightAboveGround = Math.max(0, groundY - playerBottom);

    const maxHeight = 400;
    const t = Math.min(heightAboveGround / maxHeight, 1);
    const sizeX = 28 * (1 - t * 0.65);
    const sizeY = 8 * (1 - t * 0.75);
    const alpha = 0.3 * (1 - t * 0.7);

    this.playerShadow.setPosition(this.player.x, groundY - 2);
    this.playerShadow.setSize(sizeX, sizeY);
    this.playerShadow.setAlpha(alpha);
  }

  private updateBackgroundTransition(delta: number): void {
    if (!this.isBgTransitioning) return;

    const duration = 1500;
    this.bgTransitionProgress += delta;
    let t = Math.min(this.bgTransitionProgress / duration, 1);
    t = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const startTop = this.hexToRgb(this.currentPlanet.bgTop);
    const startBottom = this.hexToRgb(this.currentPlanet.bgBottom);
    const endTop = this.hexToRgb(this.targetPlanet.bgTop);
    const endBottom = this.hexToRgb(this.targetPlanet.bgBottom);

    const topR = Math.floor(startTop.r + (endTop.r - startTop.r) * t);
    const topG = Math.floor(startTop.g + (endTop.g - startTop.g) * t);
    const topB = Math.floor(startTop.b + (endTop.b - startTop.b) * t);
    const bottomR = Math.floor(startBottom.r + (endBottom.r - startBottom.r) * t);
    const bottomG = Math.floor(startBottom.g + (endBottom.g - startBottom.g) * t);
    const bottomB = Math.floor(startBottom.b + (endBottom.b - startBottom.b) * t);

    this.currentBgTop = Phaser.Display.Color.GetColor(topR, topG, topB);
    this.currentBgBottom = Phaser.Display.Color.GetColor(bottomR, bottomG, bottomB);

    this.redrawBackground();
    this.updateGroundTint();

    if (t >= 1) {
      this.isBgTransitioning = false;
      this.currentPlanet = this.targetPlanet;
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const w = gameSize.width;
    const h = gameSize.height;

    this.cameras.main.setSize(w, h);
    this.redrawBackground();
    this.uiOverlay?.resize(w, h);
  }
}
