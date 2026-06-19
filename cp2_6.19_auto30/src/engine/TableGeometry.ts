export interface Pocket {
  x: number;
  y: number;
  radius: number;
}

export interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export class TableGeometry {
  public readonly width: number;
  public readonly height: number;
  public readonly borderWidth: number;
  public readonly ballRadius: number;
  public readonly pocketRadius: number;
  public readonly bounds: Bounds;
  public readonly pockets: Pocket[];
  public readonly breakAreaLeft: number;
  public readonly breakAreaRight: number;
  public readonly breakAreaTop: number;
  public readonly breakAreaBottom: number;

  constructor() {
    this.width = 1600;
    this.height = 900;
    this.borderWidth = 60;
    this.ballRadius = 18;
    this.pocketRadius = 40;

    this.bounds = {
      left: this.borderWidth,
      right: this.width - this.borderWidth,
      top: this.borderWidth,
      bottom: this.height - this.borderWidth
    };

    this.pockets = [
      { x: this.bounds.left, y: this.bounds.top, radius: this.pocketRadius },
      { x: this.width / 2, y: this.bounds.top - 6, radius: this.pocketRadius },
      { x: this.bounds.right, y: this.bounds.top, radius: this.pocketRadius },
      { x: this.bounds.left, y: this.bounds.bottom, radius: this.pocketRadius },
      { x: this.width / 2, y: this.bounds.bottom + 6, radius: this.pocketRadius },
      { x: this.bounds.right, y: this.bounds.bottom, radius: this.pocketRadius }
    ];

    this.breakAreaLeft = this.bounds.left + 20;
    this.breakAreaRight = this.bounds.left + (this.bounds.right - this.bounds.left) * 0.25;
    this.breakAreaTop = this.bounds.top + 20;
    this.breakAreaBottom = this.bounds.bottom - 20;
  }

  isInBreakArea(x: number, y: number): boolean {
    return (
      x >= this.breakAreaLeft + this.ballRadius &&
      x <= this.breakAreaRight - this.ballRadius &&
      y >= this.breakAreaTop + this.ballRadius &&
      y <= this.breakAreaBottom - this.ballRadius
    );
  }

  clampToBreakArea(x: number, y: number): { x: number; y: number } {
    return {
      x: Math.max(this.breakAreaLeft + this.ballRadius, Math.min(this.breakAreaRight - this.ballRadius, x)),
      y: Math.max(this.breakAreaTop + this.ballRadius, Math.min(this.breakAreaBottom - this.ballRadius, y))
    };
  }
}
