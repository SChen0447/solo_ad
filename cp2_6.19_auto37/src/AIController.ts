export interface BallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface PaddleState {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class AIController {
  private predictedY: number = 0;
  private reactionDelay: number = 0;
  private randomOffset: number = 0;
  private paddleSpeed: number = 500;

  constructor() {
    this.predictedY = 0;
  }

  public update(
    deltaTime: number,
    ball: BallState,
    paddle: PaddleState,
    canvasHeight: number
  ): number {
    this.reactionDelay -= deltaTime;

    if (ball.vx < 0) {
      if (this.reactionDelay <= 0) {
        this.predictedY = this.predictBallLandingY(ball, paddle, canvasHeight);
        this.randomOffset = (Math.random() - 0.5) * 40;
        this.reactionDelay = 0.08 + Math.random() * 0.15;
      }

      const targetY = this.predictedY + this.randomOffset;
      const paddleCenter = paddle.y + paddle.height / 2;
      const diff = targetY - paddleCenter;

      if (Math.abs(diff) > 5) {
        const moveAmount = Math.sign(diff) * this.paddleSpeed * deltaTime;
        if (Math.abs(moveAmount) > Math.abs(diff)) {
          return paddle.y + diff;
        }
        return paddle.y + moveAmount;
      }
    } else {
      const centerY = canvasHeight / 2 - paddle.height / 2;
      const diff = centerY - paddle.y;
      if (Math.abs(diff) > 5) {
        const moveAmount = Math.sign(diff) * this.paddleSpeed * 0.5 * deltaTime;
        if (Math.abs(moveAmount) > Math.abs(diff)) {
          return centerY;
        }
        return paddle.y + moveAmount;
      }
    }

    return paddle.y;
  }

  private predictBallLandingY(
    ball: BallState,
    paddle: PaddleState,
    canvasHeight: number
  ): number {
    let simX = ball.x;
    let simY = ball.y;
    let simVx = ball.vx;
    let simVy = ball.vy;
    const paddleX = paddle.x + paddle.width;
    const maxIterations = 1000;
    let iterations = 0;

    while (simX > paddleX && iterations < maxIterations) {
      simX += simVx * 0.016;
      simY += simVy * 0.016;

      if (simY - ball.radius < 0) {
        simY = ball.radius;
        simVy = Math.abs(simVy);
      } else if (simY + ball.radius > canvasHeight) {
        simY = canvasHeight - ball.radius;
        simVy = -Math.abs(simVy);
      }

      iterations++;
    }

    return simY;
  }

  public setSpeedMultiplier(multiplier: number): void {
    this.paddleSpeed = 500 * multiplier;
  }
}
