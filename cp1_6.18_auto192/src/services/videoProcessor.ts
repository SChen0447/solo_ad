import '@tensorflow/tfjs';
import * as bodyPix from '@tensorflow-models/body-pix';

export type BackgroundMode = 'none' | 'image' | 'blur';

export interface BackgroundConfig {
  mode: BackgroundMode;
  imageUrl?: string;
  blurIntensity?: number;
}

export class VideoProcessor {
  private net: bodyPix.BodyPix | null = null;
  private sourceVideo: HTMLVideoElement | null = null;
  private outputCanvas: HTMLCanvasElement | null = null;
  private outputCtx: CanvasRenderingContext2D | null = null;
  private backgroundCanvas: HTMLCanvasElement | null = null;
  private backgroundImage: HTMLImageElement | null = null;
  private animationFrameId: number | null = null;
  private config: BackgroundConfig = { mode: 'none' };
  private isModelLoading = false;
  private segmentationConfig: bodyPix.SemanticPersonSegmentationConfig;
  private outputStream: MediaStream | null = null;
  private canvasStreamTrack: MediaStreamTrack | null = null;

  constructor() {
    this.segmentationConfig = {
      internalResolution: 'medium',
      segmentationThreshold: 0.7,
    };
  }

  async loadModel(): Promise<void> {
    if (this.net || this.isModelLoading) return;

    this.isModelLoading = true;
    try {
      this.net = await bodyPix.load({
        architecture: 'MobileNetV1',
        outputStride: 16,
        multiplier: 0.75,
        quantBytes: 2,
      });
    } catch (err) {
      console.error('Failed to load BodyPix model:', err);
      throw err;
    } finally {
      this.isModelLoading = false;
    }
  }

  async startProcessing(
    inputStream: MediaStream,
    config: BackgroundConfig
  ): Promise<MediaStream> {
    await this.loadModel();

    this.config = config;
    this.stopProcessing();

    this.sourceVideo = document.createElement('video');
    this.sourceVideo.playsInline = true;
    this.sourceVideo.autoplay = true;
    this.sourceVideo.muted = true;
    this.sourceVideo.srcObject = inputStream;

    await new Promise<void>((resolve) => {
      if (!this.sourceVideo) return resolve();
      this.sourceVideo.onloadedmetadata = () => {
        if (this.sourceVideo) {
          this.sourceVideo.play().then(() => resolve()).catch(() => resolve());
        } else {
          resolve();
        }
      };
    });

    const width = this.sourceVideo?.videoWidth || 640;
    const height = this.sourceVideo?.videoHeight || 480;

    this.outputCanvas = document.createElement('canvas');
    this.outputCanvas.width = width;
    this.outputCanvas.height = height;
    this.outputCtx = this.outputCanvas.getContext('2d');

    this.backgroundCanvas = document.createElement('canvas');
    this.backgroundCanvas.width = width;
    this.backgroundCanvas.height = height;

    await this.prepareBackground(width, height);

    this.outputStream = this.outputCanvas.captureStream(30);
    this.canvasStreamTrack = this.outputStream.getVideoTracks()[0];

    const audioTracks = inputStream.getAudioTracks();
    if (audioTracks.length > 0) {
      this.outputStream.addTrack(audioTracks[0]);
    }

    this.processFrame();

    return this.outputStream;
  }

  private async prepareBackground(width: number, height: number): Promise<void> {
    if (!this.backgroundCanvas) return;

    const bgCtx = this.backgroundCanvas.getContext('2d');
    if (!bgCtx) return;

    if (this.config.mode === 'image' && this.config.imageUrl) {
      try {
        this.backgroundImage = new Image();
        this.backgroundImage.crossOrigin = 'anonymous';
        this.backgroundImage.src = this.config.imageUrl;
        await new Promise<void>((resolve, reject) => {
          if (!this.backgroundImage) return reject();
          this.backgroundImage.onload = () => resolve();
          this.backgroundImage.onerror = () => reject();
        });

        const imgRatio = this.backgroundImage.width / this.backgroundImage.height;
        const canvasRatio = width / height;
        let sx = 0, sy = 0, sw = this.backgroundImage.width, sh = this.backgroundImage.height;

        if (imgRatio > canvasRatio) {
          sw = this.backgroundImage.height * canvasRatio;
          sx = (this.backgroundImage.width - sw) / 2;
        } else {
          sh = this.backgroundImage.width / canvasRatio;
          sy = (this.backgroundImage.height - sh) / 2;
        }

        bgCtx.drawImage(this.backgroundImage, sx, sy, sw, sh, 0, 0, width, height);
      } catch (err) {
        console.error('Failed to load background image:', err);
        bgCtx.fillStyle = '#1e293b';
        bgCtx.fillRect(0, 0, width, height);
      }
    } else {
      bgCtx.fillStyle = '#1e293b';
      bgCtx.fillRect(0, 0, width, height);
    }
  }

  private processFrame = (): void => {
    if (!this.sourceVideo || !this.outputCanvas || !this.outputCtx || !this.net) {
      this.animationFrameId = requestAnimationFrame(this.processFrame);
      return;
    }

    if (this.config.mode === 'none') {
      this.outputCtx.drawImage(
        this.sourceVideo,
        0,
        0,
        this.outputCanvas.width,
        this.outputCanvas.height
      );
    } else {
      this.segmentAndComposite();
    }

    this.animationFrameId = requestAnimationFrame(this.processFrame);
  };

  private async segmentAndComposite(): Promise<void> {
    if (!this.sourceVideo || !this.outputCanvas || !this.outputCtx || !this.net || !this.backgroundCanvas) {
      return;
    }

    try {
      const segmentation = await this.net.segmentPerson(
        this.sourceVideo,
        this.segmentationConfig
      );

      const width = this.outputCanvas.width;
      const height = this.outputCanvas.height;

      this.outputCtx.save();

      if (this.config.mode === 'blur') {
        this.outputCtx.filter = `blur(${this.config.blurIntensity || 5}px)`;
        this.outputCtx.drawImage(this.sourceVideo, 0, 0, width, height);
        this.outputCtx.filter = 'none';
      } else if (this.config.mode === 'image') {
        this.outputCtx.drawImage(this.backgroundCanvas, 0, 0, width, height);
      }

      const mask = bodyPix.toMask(segmentation, { r: 0, g: 0, b: 0, a: 0 }, { r: 0, g: 0, b: 0, a: 255 });
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = width;
      maskCanvas.height = height;
      const maskCtx = maskCanvas.getContext('2d');
      if (maskCtx) {
        const maskImageData = new ImageData(mask.data, width, height);
        maskCtx.putImageData(maskImageData, 0, 0);
      }

      this.outputCtx.globalCompositeOperation = 'destination-over';
      this.outputCtx.drawImage(this.sourceVideo, 0, 0, width, height);

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(this.sourceVideo, 0, 0, width, height);
        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.drawImage(maskCanvas, 0, 0, width, height);

        this.outputCtx.globalCompositeOperation = 'source-over';
        if (this.config.mode === 'blur') {
          this.outputCtx.drawImage(this.sourceVideo, 0, 0, width, height);
          this.outputCtx.filter = `blur(${this.config.blurIntensity || 5}px)`;
          this.outputCtx.drawImage(this.sourceVideo, 0, 0, width, height);
          this.outputCtx.filter = 'none';
          this.outputCtx.globalCompositeOperation = 'destination-atop';
          this.outputCtx.drawImage(tempCanvas, 0, 0, width, height);
        } else if (this.config.mode === 'image') {
          this.outputCtx.drawImage(this.backgroundCanvas, 0, 0, width, height);
          this.outputCtx.globalCompositeOperation = 'destination-atop';
          this.outputCtx.drawImage(tempCanvas, 0, 0, width, height);
        }
      }

      this.outputCtx.restore();
    } catch (err) {
      this.outputCtx?.drawImage(
        this.sourceVideo,
        0,
        0,
        this.outputCanvas.width,
        this.outputCanvas.height
      );
    }
  }

  setBlurIntensity(intensity: number): void {
    this.config = {
      ...this.config,
      mode: 'blur',
      blurIntensity: intensity,
    };
  }

  async setBackgroundImage(imageUrl: string): Promise<void> {
    this.config = {
      mode: 'image',
      imageUrl,
    };

    if (this.backgroundCanvas && this.outputCanvas) {
      await this.prepareBackground(
        this.outputCanvas.width,
        this.outputCanvas.height
      );
    }
  }

  clearBackground(): void {
    this.config = { mode: 'none' };
  }

  stopProcessing(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.canvasStreamTrack) {
      this.canvasStreamTrack.stop();
      this.canvasStreamTrack = null;
    }
    this.outputStream = null;

    if (this.sourceVideo) {
      this.sourceVideo.srcObject = null;
      this.sourceVideo = null;
    }

    this.outputCanvas = null;
    this.outputCtx = null;
    this.backgroundCanvas = null;
    this.backgroundImage = null;
  }

  isProcessing(): boolean {
    return this.animationFrameId !== null;
  }
}

export const videoProcessor = new VideoProcessor();
