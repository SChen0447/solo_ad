import type * as THREE from 'three';

const SNAPSHOT_WIDTH = 240;
const SNAPSHOT_HEIGHT = 180;

export class RenderSnapshot {
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.canvas = renderer.domElement;
  }

  public capture(): string {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = SNAPSHOT_WIDTH;
    tempCanvas.height = SNAPSHOT_HEIGHT;
    const ctx = tempCanvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }

    const sourceWidth = this.canvas.width;
    const sourceHeight = this.canvas.height;
    
    const sourceAspect = sourceWidth / sourceHeight;
    const targetAspect = SNAPSHOT_WIDTH / SNAPSHOT_HEIGHT;
    
    let sx = 0, sy = 0, sw = sourceWidth, sh = sourceHeight;
    
    if (sourceAspect > targetAspect) {
      sw = sourceHeight * targetAspect;
      sx = (sourceWidth - sw) / 2;
    } else {
      sh = sourceWidth / targetAspect;
      sy = (sourceHeight - sh) / 2;
    }

    ctx.drawImage(
      this.canvas,
      sx, sy, sw, sh,
      0, 0, SNAPSHOT_WIDTH, SNAPSHOT_HEIGHT
    );

    return tempCanvas.toDataURL('image/png');
  }

  public captureWithCallback(callback: (dataUrl: string) => void): void {
    requestAnimationFrame(() => {
      const dataUrl = this.capture();
      callback(dataUrl);
    });
  }

  public static getSnapshotSize(): { width: number; height: number } {
    return { width: SNAPSHOT_WIDTH, height: SNAPSHOT_HEIGHT };
  }
}
