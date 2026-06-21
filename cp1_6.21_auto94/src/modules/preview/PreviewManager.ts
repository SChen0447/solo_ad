import Phaser from 'phaser';
import { TileScene3D } from './TileScene3D';
import { createCanvas, getContext, drawGridLines } from '../../utils/canvas';

export class PreviewManager {
  private previewContainer: HTMLElement;
  private phaserContainer: HTMLElement;
  private previewCanvas: HTMLCanvasElement;
  private previewCtx: CanvasRenderingContext2D;
  private phaserGame: Phaser.Game | null = null;
  private tileScene: TileScene3D | null = null;
  private textureSize: number = 128;
  private displaySize: number = 256;

  constructor(previewContainer: HTMLElement, phaserContainer: HTMLElement) {
    this.previewContainer = previewContainer;
    this.phaserContainer = phaserContainer;

    this.previewCanvas = createCanvas(this.displaySize, this.displaySize);
    this.previewCtx = getContext(this.previewCanvas);
    this.previewCanvas.style.imageRendering = 'pixelated';
    this.previewCanvas.style.border = '1px solid #cccccc';
    this.previewCanvas.style.backgroundColor = '#1a1a2e';

    this.setupPreviewCanvas();
    this.initPhaserGame();
  }

  private setupPreviewCanvas(): void {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '8px';

    const label = document.createElement('div');
    label.textContent = '无缝纹理预览 (128x128)';
    label.style.color = '#cccccc';
    label.style.fontSize = '12px';
    label.style.fontFamily = 'monospace';

    wrapper.appendChild(label);
    wrapper.appendChild(this.previewCanvas);
    this.previewContainer.appendChild(wrapper);

    this.drawEmptyPreview();
  }

  private drawEmptyPreview(): void {
    this.previewCtx.fillStyle = '#1a1a2e';
    this.previewCtx.fillRect(0, 0, this.displaySize, this.displaySize);

    this.previewCtx.strokeStyle = '#3a3a3a';
    this.previewCtx.lineWidth = 1;
    this.previewCtx.setLineDash([4, 4]);
    this.previewCtx.strokeRect(8, 8, this.displaySize - 16, this.displaySize - 16);
    this.previewCtx.setLineDash([]);

    this.previewCtx.fillStyle = '#666666';
    this.previewCtx.font = '12px monospace';
    this.previewCtx.textAlign = 'center';
    this.previewCtx.fillText(
      '点击"无接缝生成"按钮',
      this.displaySize / 2,
      this.displaySize / 2 - 8
    );
    this.previewCtx.fillText(
      '预览纹理效果',
      this.displaySize / 2,
      this.displaySize / 2 + 8
    );
  }

  private initPhaserGame(): void {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '8px';

    const label = document.createElement('div');
    label.textContent = '3D平铺预览 (拖拽旋转视角)';
    label.style.color = '#cccccc';
    label.style.fontSize = '12px';
    label.style.fontFamily = 'monospace';

    const phaserDiv = document.createElement('div');
    phaserDiv.id = 'phaser-container';
    phaserDiv.style.width = '320px';
    phaserDiv.style.height = '320px';
    phaserDiv.style.border = '1px solid #cccccc';
    phaserDiv.style.overflow = 'hidden';

    wrapper.appendChild(label);
    wrapper.appendChild(phaserDiv);
    this.phaserContainer.appendChild(wrapper);

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 320,
      height: 320,
      parent: phaserDiv,
      scene: [TileScene3D],
      render: {
        antialias: false,
        pixelArt: true,
      },
      scale: {
        mode: Phaser.Scale.NONE,
        width: 320,
        height: 320,
      },
      backgroundColor: '#1a1a2e',
    };

    this.phaserGame = new Phaser.Game(config);

    this.phaserGame.events.once('ready', () => {
      this.phaserGame?.events.once('scenecreate', (scene: Phaser.Scene) => {
        if (scene instanceof TileScene3D) {
          this.tileScene = scene;
        }
      });
    });
  }

  public update2DPreview(textureCanvas: HTMLCanvasElement): void {
    this.previewCtx.imageSmoothingEnabled = false;
    this.previewCtx.clearRect(0, 0, this.displaySize, this.displaySize);

    this.previewCtx.drawImage(
      textureCanvas,
      0,
      0,
      textureCanvas.width,
      textureCanvas.height,
      0,
      0,
      this.displaySize,
      this.displaySize
    );

    const gridCellSize = this.displaySize / 4;
    drawGridLines(
      this.previewCtx,
      this.displaySize,
      this.displaySize,
      gridCellSize,
      '#ffff00',
      1
    );
  }

  public update3DPreview(textureCanvas: HTMLCanvasElement): void {
    if (this.tileScene) {
      this.tileScene.updateTexture(textureCanvas);
    } else if (this.phaserGame) {
      const checkScene = () => {
        const scene = this.phaserGame?.scene.getScene('TileScene3D');
        if (scene instanceof TileScene3D) {
          this.tileScene = scene;
          this.tileScene.updateTexture(textureCanvas);
        } else {
          setTimeout(checkScene, 100);
        }
      };
      checkScene();
    }
  }

  public updateBothPreviews(textureCanvas: HTMLCanvasElement): void {
    this.update2DPreview(textureCanvas);
    this.update3DPreview(textureCanvas);
  }

  public getTileScene(): TileScene3D | null {
    return this.tileScene;
  }

  public getPreviewCanvas(): HTMLCanvasElement {
    return this.previewCanvas;
  }

  public destroy(): void {
    if (this.phaserGame) {
      this.phaserGame.destroy(true);
      this.phaserGame = null;
    }
    if (this.previewCanvas.parentNode) {
      this.previewCanvas.parentNode.removeChild(this.previewCanvas);
    }
  }
}
