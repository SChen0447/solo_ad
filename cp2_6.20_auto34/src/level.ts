export const TILE_SIZE = 40;
export const LEVEL_WIDTH = 20;
export const LEVEL_HEIGHT = 15;
export const LEVEL_PIXEL_WIDTH = LEVEL_WIDTH * TILE_SIZE;
export const LEVEL_PIXEL_HEIGHT = LEVEL_HEIGHT * TILE_SIZE;

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Spike {
  x: number;
  y: number;
}

export interface Checkpoint {
  x: number;
  y: number;
  activated: boolean;
  glowTime: number;
}

export interface Goal {
  x: number;
  y: number;
  rotation: number;
}

export interface PushBox {
  x: number;
  y: number;
  width: number;
  height: number;
  velX: number;
  velY: number;
  onGround: boolean;
}

export interface PressurePlate {
  x: number;
  y: number;
  width: number;
  height: number;
  activated: boolean;
}

export interface Bridge {
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
}

export class Level {
  platforms: Platform[] = [];
  spikes: Spike[] = [];
  checkpoints: Checkpoint[] = [];
  goal: Goal;
  pushBox: PushBox;
  pressurePlate: PressurePlate;
  bridge: Bridge;
  spawnPoint: { x: number; y: number };

  constructor() {
    this.platforms = [
      { x: 0, y: 14, width: 6, height: 1 },
      { x: 8, y: 12, width: 2, height: 1 },
      { x: 12, y: 10, width: 2, height: 1 },
      { x: 15, y: 8, width: 2, height: 1 },
      { x: 17, y: 6, width: 3, height: 1 },
    ];

    this.spikes = [
      { x: 6, y: 13 },
      { x: 7, y: 13 },
    ];

    this.checkpoints = [
      { x: 2, y: 13, activated: false, glowTime: 0 },
    ];

    this.goal = {
      x: 18,
      y: 5,
      rotation: 0,
    };

    this.pushBox = {
      x: 9 * TILE_SIZE,
      y: 11 * TILE_SIZE,
      width: TILE_SIZE,
      height: TILE_SIZE,
      velX: 0,
      velY: 0,
      onGround: false,
    };

    this.pressurePlate = {
      x: 13 * TILE_SIZE,
      y: (9 * TILE_SIZE) + TILE_SIZE - 8,
      width: TILE_SIZE * 2,
      height: 8,
      activated: false,
    };

    this.bridge = {
      x: 15 * TILE_SIZE,
      y: 9 * TILE_SIZE,
      width: TILE_SIZE * 2,
      height: TILE_SIZE * 0.5,
      active: false,
    };

    this.spawnPoint = {
      x: 1 * TILE_SIZE,
      y: 12 * TILE_SIZE,
    };
  }

  update(dt: number) {
    this.goal.rotation += (Math.PI * 2) * dt;
    if (this.goal.rotation >= Math.PI * 2) {
      this.goal.rotation -= Math.PI * 2;
    }

    for (const cp of this.checkpoints) {
      if (cp.glowTime > 0) {
        cp.glowTime -= dt;
      }
    }

    this.pushBox.velY += 0.4 * 60 * dt;
    this.pushBox.y += this.pushBox.velY * dt * 60;
    this.pushBox.velX *= 0.8;
    this.pushBox.x += this.pushBox.velX * dt * 60;

    this.pushBox.onGround = false;
    for (const plat of this.platforms) {
      const platX = plat.x * TILE_SIZE;
      const platY = plat.y * TILE_SIZE;
      const platW = plat.width * TILE_SIZE;
      const platH = plat.height * TILE_SIZE;

      if (
        this.pushBox.x + this.pushBox.width > platX &&
        this.pushBox.x < platX + platW &&
        this.pushBox.y + this.pushBox.height > platY &&
        this.pushBox.y < platY + platH
      ) {
        if (
          this.pushBox.y + this.pushBox.height - this.pushBox.velY * dt * 60 <= platY &&
          this.pushBox.velY >= 0
        ) {
          this.pushBox.y = platY - this.pushBox.height;
          this.pushBox.velY = 0;
          this.pushBox.onGround = true;
        } else if (
          this.pushBox.y - this.pushBox.velY * dt * 60 >= platY + platH &&
          this.pushBox.velY < 0
        ) {
          this.pushBox.y = platY + platH;
          this.pushBox.velY = 0;
        } else if (
          this.pushBox.x + this.pushBox.width - this.pushBox.velX * dt * 60 <= platX &&
          this.pushBox.velX > 0
        ) {
          this.pushBox.x = platX - this.pushBox.width;
          this.pushBox.velX = 0;
        } else if (
          this.pushBox.x - this.pushBox.velX * dt * 60 >= platX + platW &&
          this.pushBox.velX < 0
        ) {
          this.pushBox.x = platX + platW;
          this.pushBox.velX = 0;
        }
      }
    }

    if (this.bridge.active) {
      const bridgeX = this.bridge.x;
      const bridgeY = this.bridge.y;
      const bridgeW = this.bridge.width;
      const bridgeH = this.bridge.height;

      if (
        this.pushBox.x + this.pushBox.width > bridgeX &&
        this.pushBox.x < bridgeX + bridgeW &&
        this.pushBox.y + this.pushBox.height > bridgeY &&
        this.pushBox.y < bridgeY + bridgeH
      ) {
        if (
          this.pushBox.y + this.pushBox.height - this.pushBox.velY * dt * 60 <= bridgeY &&
          this.pushBox.velY >= 0
        ) {
          this.pushBox.y = bridgeY - this.pushBox.height;
          this.pushBox.velY = 0;
          this.pushBox.onGround = true;
        }
      }
    }

    if (this.pushBox.x < 0) {
      this.pushBox.x = 0;
      this.pushBox.velX = 0;
    }
    if (this.pushBox.x + this.pushBox.width > LEVEL_PIXEL_WIDTH) {
      this.pushBox.x = LEVEL_PIXEL_WIDTH - this.pushBox.width;
      this.pushBox.velX = 0;
    }

    if (this.pushBox.y > LEVEL_PIXEL_HEIGHT + 200) {
      this.pushBox.x = 9 * TILE_SIZE;
      this.pushBox.y = 11 * TILE_SIZE;
      this.pushBox.velX = 0;
      this.pushBox.velY = 0;
    }

    const plateCenterX = this.pressurePlate.x + this.pressurePlate.width / 2;
    const boxCenterX = this.pushBox.x + this.pushBox.width / 2;
    const onPlate =
      Math.abs(boxCenterX - plateCenterX) < this.pressurePlate.width / 2 &&
      this.pushBox.y + this.pushBox.height >= this.pressurePlate.y &&
      this.pushBox.y + this.pushBox.height <= this.pressurePlate.y + this.pressurePlate.height + 10 &&
      this.pushBox.onGround;

    this.pressurePlate.activated = onPlate;
    this.bridge.active = onPlate;
  }

  getGroundY(x: number, width: number, prevBottom: number, currentBottom: number, velY: number): number | null {
    let groundY: number | null = null;

    for (const plat of this.platforms) {
      const platX = plat.x * TILE_SIZE;
      const platW = plat.width * TILE_SIZE;
      const platTopY = plat.y * TILE_SIZE;

      if (x + width > platX && x < platX + platW) {
        if (prevBottom <= platTopY + 1 && currentBottom >= platTopY && velY >= 0) {
          if (groundY === null || platTopY < groundY) {
            groundY = platTopY;
          }
        }
      }
    }

    if (this.bridge.active) {
      const bridgeX = this.bridge.x;
      const bridgeW = this.bridge.width;
      const bridgeTopY = this.bridge.y;

      if (x + width > bridgeX && x < bridgeX + bridgeW) {
        if (prevBottom <= bridgeTopY + 1 && currentBottom >= bridgeTopY && velY >= 0) {
          if (groundY === null || bridgeTopY < groundY) {
            groundY = bridgeTopY;
          }
        }
      }
    }

    if (
      x + width > this.pushBox.x &&
      x < this.pushBox.x + this.pushBox.width
    ) {
      const boxTopY = this.pushBox.y;
      if (prevBottom <= boxTopY + 1 && currentBottom >= boxTopY && velY >= 0) {
        if (groundY === null || boxTopY < groundY) {
          groundY = boxTopY;
        }
      }
    }

    return groundY;
  }

  checkWallCollision(x: number, y: number, width: number, height: number, velX: number): { left: boolean; right: boolean } {
    let left = false;
    let right = false;

    for (const plat of this.platforms) {
      const platX = plat.x * TILE_SIZE;
      const platY = plat.y * TILE_SIZE;
      const platW = plat.width * TILE_SIZE;
      const platH = plat.height * TILE_SIZE;

      if (x + width > platX && x < platX + platW && y + height > platY && y < platY + platH) {
        if (velX > 0) {
          right = true;
        } else if (velX < 0) {
          left = true;
        }
      }
    }

    if (x < 0) left = true;
    if (x + width > LEVEL_PIXEL_WIDTH) right = true;

    return { left, right };
  }

  checkCeilingCollision(x: number, y: number, width: number, height: number, velY: number): boolean {
    if (velY >= 0) return false;

    for (const plat of this.platforms) {
      const platX = plat.x * TILE_SIZE;
      const platY = plat.y * TILE_SIZE;
      const platW = plat.width * TILE_SIZE;
      const platH = plat.height * TILE_SIZE;

      if (x + width > platX && x < platX + platW && y < platY + platH && y + height > platY + platH) {
        return true;
      }
    }

    return false;
  }

  checkSpikeCollision(x: number, y: number, width: number, height: number): boolean {
    for (const spike of this.spikes) {
      const sx = spike.x * TILE_SIZE + TILE_SIZE * 0.1;
      const sy = spike.y * TILE_SIZE + TILE_SIZE * 0.3;
      const sw = TILE_SIZE * 0.8;
      const sh = TILE_SIZE * 0.7;

      if (x + width > sx && x < sx + sw && y + height > sy && y < sy + sh) {
        return true;
      }
    }
    return false;
  }

  checkCheckpointCollision(x: number, y: number, width: number, height: number): Checkpoint | null {
    for (const cp of this.checkpoints) {
      const cpX = cp.x * TILE_SIZE;
      const cpY = cp.y * TILE_SIZE;

      if (x + width > cpX && x < cpX + TILE_SIZE && y + height > cpY && y < cpY + TILE_SIZE) {
        return cp;
      }
    }
    return null;
  }

  checkGoalCollision(x: number, y: number, width: number, height: number): boolean {
    const gx = this.goal.x * TILE_SIZE + TILE_SIZE * 0.2;
    const gy = this.goal.y * TILE_SIZE + TILE_SIZE * 0.2;
    const gw = TILE_SIZE * 0.6;
    const gh = TILE_SIZE * 0.6;

    return x + width > gx && x < gx + gw && y + height > gy && y < gy + gh;
  }
}
