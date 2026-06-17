import * as tf from '@tensorflow/tfjs';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

export type Expression =
  | 'happy'
  | 'sad'
  | 'surprised'
  | 'angry'
  | 'fearful'
  | 'disgusted'
  | 'neutral';

export type HeadOrientation = 'left' | 'right' | 'up' | 'down' | 'front';

export interface HeadAngles {
  yaw: number;
  pitch: number;
  roll: number;
}

export interface FrameAnalysisResult {
  timestamp: number;
  expression: Expression;
  expressionScores: Record<Expression, number>;
  headOrientation: HeadOrientation;
  headAngles: HeadAngles;
  faceActivity: number;
  focusScore: number;
  faceDetected: boolean;
}

type Keypoint = { x: number; y: number; z?: number };

const EXPRESSIONS: Expression[] = [
  'happy',
  'sad',
  'surprised',
  'angry',
  'fearful',
  'disgusted',
  'neutral'
];

const LANDMARK = {
  LEFT_EYE_OUTER: 33,
  LEFT_EYE_INNER: 133,
  RIGHT_EYE_OUTER: 263,
  RIGHT_EYE_INNER: 362,
  LEFT_EYE_TOP: 159,
  LEFT_EYE_BOTTOM: 145,
  RIGHT_EYE_TOP: 386,
  RIGHT_EYE_BOTTOM: 374,
  NOSE_TIP: 1,
  LEFT_MOUTH_CORNER: 61,
  RIGHT_MOUTH_CORNER: 291,
  MOUTH_TOP: 13,
  MOUTH_BOTTOM: 14,
  UPPER_LIP_TOP: 164,
  LOWER_LIP_BOTTOM: 17,
  LEFT_EYEBROW_INNER: 70,
  RIGHT_EYEBROW_INNER: 300,
  LEFT_EYEBROW_OUTER: 105,
  RIGHT_EYEBROW_OUTER: 334,
  CHIN: 152,
  LEFT_CHEEK: 234,
  RIGHT_CHEEK: 454,
  FOREHEAD: 10
};

export class FaceAnalyzer {
  private model: faceLandmarksDetection.FaceLandmarksDetector | null = null;
  private modelLoaded = false;
  private previousKeypoints: Keypoint[] | null = null;
  private noFaceFrameCount = 0;

  async loadModel(): Promise<void> {
    if (this.modelLoaded) return;
    await tf.ready();
    const model = faceLandmarksDetection.SupportedPackages.mediapipeFacemesh;
    this.model = await faceLandmarksDetection.createDetector(model, {
      runtime: 'tfjs',
      maxFaces: 1,
      refineLandmarks: true
    });
    this.modelLoaded = true;
  }

  private dist2D(p1: Keypoint, p2: Keypoint): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private async detectLandmarks(video: HTMLVideoElement): Promise<Keypoint[] | null> {
    if (!this.model) return null;
    try {
      const faces = await this.model.estimateFaces({
        input: video as unknown as tf.Tensor3D
      });
      if (!faces || faces.length === 0) return null;
      let bestFace = faces[0];
      let bestSize = 0;
      for (const face of faces) {
        const box = face.box;
        if (box) {
          const size = box.width * box.height;
          if (size > bestSize) {
            bestSize = size;
            bestFace = face;
          }
        }
      }
      return bestFace.keypoints as Keypoint[];
    } catch {
      return null;
    }
  }

  private computeHeadAngles(keypoints: Keypoint[]): HeadAngles {
    const kp = keypoints;
    const nose = kp[LANDMARK.NOSE_TIP];
    const chin = kp[LANDMARK.CHIN];
    const leftCheek = kp[LANDMARK.LEFT_CHEEK];
    const rightCheek = kp[LANDMARK.RIGHT_CHEEK];
    const forehead = kp[LANDMARK.FOREHEAD];
    const leftEye = kp[LANDMARK.LEFT_EYE_OUTER];
    const rightEye = kp[LANDMARK.RIGHT_EYE_OUTER];

    const faceWidth = this.dist2D(leftCheek, rightCheek);
    const faceHeight = this.dist2D(forehead, chin);
    const refLen = (faceWidth + faceHeight) / 2 || 1;

    const midEyesX = (leftEye.x + rightEye.x) / 2;
    const midEyesY = (leftEye.y + rightEye.y) / 2;

    const yawNorm = (nose.x - midEyesX) / refLen;
    const pitchNorm = (nose.y - midEyesY) / refLen;

    const eyeDx = rightEye.x - leftEye.x;
    const eyeDy = rightEye.y - leftEye.y;
    const rollRad = Math.atan2(eyeDy, eyeDx);
    const roll = (rollRad * 180) / Math.PI;

    const yaw = Math.max(-45, Math.min(45, yawNorm * 180));
    const pitch = Math.max(-45, Math.min(45, (pitchNorm - 0.15) * 220));

    return { yaw, pitch, roll };
  }

  private classifyExpression(
    keypoints: Keypoint[]
  ): { expression: Expression; scores: Record<Expression, number> } {
    const kp = keypoints;
    const faceWidth = this.dist2D(kp[LANDMARK.LEFT_CHEEK], kp[LANDMARK.RIGHT_CHEEK]) || 1;

    const mouthWidth = this.dist2D(kp[LANDMARK.LEFT_MOUTH_CORNER], kp[LANDMARK.RIGHT_MOUTH_CORNER]);
    const mouthHeight = this.dist2D(kp[LANDMARK.MOUTH_TOP], kp[LANDMARK.MOUTH_BOTTOM]);
    const lipDistance = this.dist2D(kp[LANDMARK.UPPER_LIP_TOP], kp[LANDMARK.LOWER_LIP_BOTTOM]);

    const leftEyeOpen = this.dist2D(kp[LANDMARK.LEFT_EYE_TOP], kp[LANDMARK.LEFT_EYE_BOTTOM]);
    const rightEyeOpen = this.dist2D(kp[LANDMARK.RIGHT_EYE_TOP], kp[LANDMARK.RIGHT_EYE_BOTTOM]);
    const eyeOpen = (leftEyeOpen + rightEyeOpen) / 2;

    const leftEyebrowMid = this.dist2D(kp[LANDMARK.LEFT_EYEBROW_INNER], kp[LANDMARK.LEFT_EYE_INNER]);
    const rightEyebrowMid = this.dist2D(kp[LANDMARK.RIGHT_EYEBROW_INNER], kp[LANDMARK.RIGHT_EYE_INNER]);
    const eyebrowRaise = (leftEyebrowMid + rightEyebrowMid) / 2;

    const mouthCornerY = (kp[LANDMARK.LEFT_MOUTH_CORNER].y + kp[LANDMARK.RIGHT_MOUTH_CORNER].y) / 2;
    const lipMidY = (kp[LANDMARK.UPPER_LIP_TOP].y + kp[LANDMARK.LOWER_LIP_BOTTOM].y) / 2;
    const smileCurve = lipMidY - mouthCornerY;

    const mw = mouthWidth / faceWidth;
    const mh = mouthHeight / faceWidth;
    const ld = lipDistance / faceWidth;
    const eo = eyeOpen / faceWidth;
    const er = eyebrowRaise / faceWidth;
    const sc = smileCurve / faceWidth;

    const scores: Record<Expression, number> = {
      happy: 0,
      sad: 0,
      surprised: 0,
      angry: 0,
      fearful: 0,
      disgusted: 0,
      neutral: 0
    };

    scores.happy = Math.max(0, Math.min(1, sc * 35 + mw * 2.5 - 1.2));
    scores.sad = Math.max(0, Math.min(1, -sc * 45 + (0.25 - mw) * 2 - eo * 3 + 0.2));
    scores.surprised = Math.max(0, Math.min(1, mh * 18 + eo * 22 + er * 10 - 2.2));
    scores.angry = Math.max(0, Math.min(1, (0.05 - er) * 15 + (0.4 - mw) * 2.5 + ld * 10 - 0.4));
    scores.fearful = Math.max(0, Math.min(1, eo * 18 + er * 6 + mh * 8 + (0.38 - mw) * 1.5 - 1.6));
    scores.disgusted = Math.max(0, Math.min(1, ld * 12 + (0.36 - mw) * 2 + (0.06 - er) * 8 - 0.5));

    let maxNonNeutral = 0;
    for (const e of EXPRESSIONS) {
      if (e !== 'neutral' && scores[e] > maxNonNeutral) maxNonNeutral = scores[e];
    }
    scores.neutral = Math.max(0, Math.min(1, 1 - maxNonNeutral * 1.3 + 0.1));

    let bestExpr: Expression = 'neutral';
    let bestScore = -1;
    for (const e of EXPRESSIONS) {
      if (scores[e] > bestScore) {
        bestScore = scores[e];
        bestExpr = e;
      }
    }

    return { expression: bestExpr, scores };
  }

  private computeFaceActivity(current: Keypoint[]): number {
    if (!this.previousKeypoints) {
      this.previousKeypoints = current.map(k => ({ ...k }));
      return 0.3;
    }
    const prev = this.previousKeypoints;
    const noseCur = current[LANDMARK.NOSE_TIP];
    const nosePrev = prev[LANDMARK.NOSE_TIP];
    const faceWidth = this.dist2D(current[LANDMARK.LEFT_CHEEK], current[LANDMARK.RIGHT_CHEEK]) || 1;

    let totalMove = 0;
    const trackIndices = [
      LANDMARK.NOSE_TIP, LANDMARK.CHIN, LANDMARK.LEFT_MOUTH_CORNER,
      LANDMARK.RIGHT_MOUTH_CORNER, LANDMARK.LEFT_EYEBROW_INNER, LANDMARK.RIGHT_EYEBROW_INNER,
      LANDMARK.MOUTH_TOP, LANDMARK.MOUTH_BOTTOM
    ];
    for (const idx of trackIndices) {
      totalMove += this.dist2D(current[idx], prev[idx]);
    }
    const avgMove = (totalMove / trackIndices.length) / faceWidth;
    const noseMove = this.dist2D(noseCur, nosePrev) / faceWidth;
    const activity = Math.min(1, avgMove * 80 + noseMove * 50);

    this.previousKeypoints = current.map(k => ({ ...k }));
    return activity;
  }

  private computeHeadOrientation(angles: HeadAngles): HeadOrientation {
    const { yaw, pitch } = angles;
    const threshold = 12;
    if (Math.abs(yaw) > Math.abs(pitch)) {
      if (yaw < -threshold) return 'left';
      if (yaw > threshold) return 'right';
    } else {
      if (pitch < -threshold) return 'up';
      if (pitch > threshold) return 'down';
    }
    return 'front';
  }

  private computeFocusScore(
    angles: HeadAngles,
    expression: Expression,
    activity: number,
    faceDetected: boolean
  ): number {
    if (!faceDetected) {
      this.noFaceFrameCount++;
      if (this.noFaceFrameCount >= 3) return 10 + Math.random() * 10;
      return 40 - this.noFaceFrameCount * 10;
    }
    this.noFaceFrameCount = 0;

    const { yaw, pitch, roll } = angles;
    const headDeviation = Math.min(50, (Math.abs(yaw) + Math.abs(pitch) * 0.8 + Math.abs(roll) * 0.3) * 1.6);
    const headPenalty = headDeviation;

    let expressionPenalty = 0;
    switch (expression) {
      case 'neutral': expressionPenalty = 0; break;
      case 'happy':
      case 'surprised': expressionPenalty = 3; break;
      case 'sad':
      case 'angry':
      case 'fearful':
      case 'disgusted': expressionPenalty = 9; break;
    }

    let activityPenalty = 0;
    if (activity < 0.02) activityPenalty = 6;
    else if (activity > 0.7) activityPenalty = 8;

    const score = Math.max(0, Math.min(100, 100 - headPenalty - expressionPenalty - activityPenalty));
    return Math.round(score);
  }

  async analyzeFrame(video: HTMLVideoElement): Promise<FrameAnalysisResult> {
    const timestamp = Date.now();
    const keypoints = await this.detectLandmarks(video);

    if (!keypoints) {
      return {
        timestamp,
        expression: 'neutral',
        expressionScores: {
          happy: 0, sad: 0, surprised: 0, angry: 0,
          fearful: 0, disgusted: 0, neutral: 1
        },
        headOrientation: 'front',
        headAngles: { yaw: 0, pitch: 0, roll: 0 },
        faceActivity: 0,
        focusScore: 0,
        faceDetected: false
      };
    }

    const headAngles = this.computeHeadAngles(keypoints);
    const headOrientation = this.computeHeadOrientation(headAngles);
    const { expression, scores: expressionScores } = this.classifyExpression(keypoints);
    const faceActivity = this.computeFaceActivity(keypoints);
    const focusScore = this.computeFocusScore(headAngles, expression, faceActivity, true);

    return {
      timestamp,
      expression,
      expressionScores,
      headOrientation,
      headAngles,
      faceActivity,
      focusScore,
      faceDetected: true
    };
  }

  reset(): void {
    this.previousKeypoints = null;
    this.noFaceFrameCount = 0;
  }
}
