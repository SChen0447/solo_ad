import { FaceMesh, Results } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

export interface EmotionData {
  smile: number;
  browRaise: number;
  mouthOpen: number;
}

export type EmotionCallback = (data: EmotionData) => void;

const UPPER_LIP = 13;
const LOWER_LIP = 14;
const MOUTH_LEFT = 61;
const MOUTH_RIGHT = 291;
const LEFT_EYE_TOP = 159;
const LEFT_EYE_BOTTOM = 145;
const RIGHT_EYE_TOP = 386;
const RIGHT_EYE_BOTTOM = 374;
const LEFT_BROW_TOP = 66;
const RIGHT_BROW_TOP = 296;
const MOUTH_CORNER_LEFT = 61;
const MOUTH_CORNER_RIGHT = 291;
const LEFT_CHEEK = 234;
const RIGHT_CHEEK = 454;

const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

const dist2 = (a: { x: number; y: number; z?: number }, b: { x: number; y: number; z?: number }): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

export class FaceCapture {
  private videoElement: HTMLVideoElement;
  private faceMesh: FaceMesh | null = null;
  private camera: Camera | null = null;
  private callback: EmotionCallback;
  private running = false;
  private lastData: EmotionData = { smile: 0, browRaise: 0, mouthOpen: 0 };
  private smoothedData: EmotionData = { smile: 0, browRaise: 0, mouthOpen: 0 };
  private smoothingFactor = 0.4;

  constructor(callback: EmotionCallback) {
    this.callback = callback;
    this.videoElement = document.createElement('video');
    this.videoElement.style.display = 'none';
    this.videoElement.setAttribute('playsinline', '');
    this.videoElement.width = 640;
    this.videoElement.height = 480;
    document.body.appendChild(this.videoElement);
  }

  async init(): Promise<void> {
    this.faceMesh = new FaceMesh({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
      }
    });

    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.faceMesh.onResults((results: Results) => {
      this.onResults(results);
    });
  }

  async start(): Promise<void> {
    if (this.running) return;
    if (!this.faceMesh) {
      await this.init();
    }

    this.camera = new Camera(this.videoElement, {
      onFrame: async () => {
        if (this.faceMesh && this.running) {
          await this.faceMesh.send({ image: this.videoElement });
        }
      },
      width: 640,
      height: 480
    });

    this.running = true;
    await this.camera.start();
  }

  stop(): void {
    this.running = false;
    if (this.camera) {
      this.camera.stop();
      this.camera = null;
    }
    if (this.videoElement.srcObject) {
      const stream = this.videoElement.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      this.videoElement.srcObject = null;
    }
  }

  destroy(): void {
    this.stop();
    if (this.faceMesh) {
      this.faceMesh.close();
      this.faceMesh = null;
    }
    if (this.videoElement.parentNode) {
      this.videoElement.parentNode.removeChild(this.videoElement);
    }
  }

  getVideoElement(): HTMLVideoElement {
    return this.videoElement;
  }

  private onResults(results: Results): void {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      this.lastData = { smile: 0, browRaise: 0, mouthOpen: 0 };
      this.emitSmoothed();
      return;
    }

    const lm = results.multiFaceLandmarks[0];
    const cheekDist = dist2(lm[LEFT_CHEEK], lm[RIGHT_CHEEK]);
    const norm = cheekDist > 0 ? cheekDist : 1;

    const upperLip = lm[UPPER_LIP];
    const lowerLip = lm[LOWER_LIP];
    const mouthVertical = dist2(upperLip, lowerLip);
    const mouthHorizontal = dist2(lm[MOUTH_LEFT], lm[MOUTH_RIGHT]);
    const mouthOpenRaw = mouthVertical / (mouthHorizontal > 0 ? mouthHorizontal : 1);
    const mouthOpen = clamp((mouthOpenRaw - 0.05) / 0.35, 0, 1);

    const leftEyeDist = dist2(lm[LEFT_EYE_TOP], lm[LEFT_EYE_BOTTOM]);
    const rightEyeDist = dist2(lm[RIGHT_EYE_TOP], lm[RIGHT_EYE_BOTTOM]);
    const eyeOpen = (leftEyeDist + rightEyeDist) / 2;
    const leftBrowToEye = dist2(lm[LEFT_BROW_TOP], lm[LEFT_EYE_TOP]);
    const rightBrowToEye = dist2(lm[RIGHT_BROW_TOP], lm[RIGHT_EYE_TOP]);
    const browDist = (leftBrowToEye + rightBrowToEye) / 2;
    const browRatio = browDist / (eyeOpen > 0 ? eyeOpen : 1);
    const browRaise = clamp((browRatio - 1.2) / 1.0, 0, 1);

    const mouthWidth = dist2(lm[MOUTH_CORNER_LEFT], lm[MOUTH_CORNER_RIGHT]);
    const mouthCenterY = (lm[MOUTH_CORNER_LEFT].y + lm[MOUTH_CORNER_RIGHT].y) / 2;
    const lipCenterY = (upperLip.y + lowerLip.y) / 2;
    const smileCurve = (mouthCenterY - lipCenterY) / norm;
    const widthRatio = mouthWidth / norm;
    const smileRaw = (widthRatio - 0.35) * 3 + smileCurve * 8;
    const smile = clamp(smileRaw, 0, 1);

    this.lastData = { smile, browRaise, mouthOpen };
    this.emitSmoothed();
  }

  private emitSmoothed(): void {
    this.smoothedData.smile += (this.lastData.smile - this.smoothedData.smile) * this.smoothingFactor;
    this.smoothedData.browRaise += (this.lastData.browRaise - this.smoothedData.browRaise) * this.smoothingFactor;
    this.smoothedData.mouthOpen += (this.lastData.mouthOpen - this.smoothedData.mouthOpen) * this.smoothingFactor;
    this.callback({ ...this.smoothedData });
  }
}
