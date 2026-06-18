import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  EditorState,
  EditorActions,
  Keyframe,
  KeyframeValue,
  EasingType,
  DEFAULT_TEXT_STYLE,
  DEFAULT_KEYFRAME_VALUES,
  DEFAULT_PLAYBACK
} from './types';

function easeLinear(t: number): number {
  return t;
}

function easeInQuad(t: number): number {
  return t * t;
}

function easeOutQuad(t: number): number {
  return t * (2 - t);
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function easeOutBounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    return n1 * (t -= 1.5 / d1) * t + 0.75;
  } else if (t < 2.5 / d1) {
    return n1 * (t -= 2.25 / d1) * t + 0.9375;
  } else {
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
}

function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function getEasingFunction(easing: EasingType): (t: number) => number {
  switch (easing) {
    case 'linear':
      return easeLinear;
    case 'ease-in':
      return easeInQuad;
    case 'ease-out':
      return easeOutQuad;
    case 'ease-in-out':
      return easeInOutQuad;
    case 'bounce':
      return easeOutBounce;
    case 'elastic':
      return easeOutElastic;
    case 'back':
      return easeOutBack;
    default:
      return easeLinear;
  }
}

function interpolateValues(
  start: KeyframeValue,
  end: KeyframeValue,
  progress: number,
  easing: EasingType
): KeyframeValue {
  const easeFn = getEasingFunction(easing);
  const t = easeFn(progress);

  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
    scale: start.scale + (end.scale - start.scale) * t,
    rotation: start.rotation + (end.rotation - start.rotation) * t,
    opacity: start.opacity + (end.opacity - start.opacity) * t
  };
}

const initialKeyframes: Keyframe[] = [
  {
    id: uuidv4(),
    time: 0,
    easing: 'ease-out',
    values: { ...DEFAULT_KEYFRAME_VALUES, y: -50, opacity: 0 }
  },
  {
    id: uuidv4(),
    time: 500,
    easing: 'linear',
    values: { ...DEFAULT_KEYFRAME_VALUES }
  },
  {
    id: uuidv4(),
    time: 2500,
    easing: 'ease-in',
    values: { ...DEFAULT_KEYFRAME_VALUES, y: 50, opacity: 0 }
  }
];

export const useEditorStore = create<EditorState & EditorActions>((set, get) => ({
  textStyle: { ...DEFAULT_TEXT_STYLE },
  keyframes: initialKeyframes,
  playback: { ...DEFAULT_PLAYBACK },
  selectedKeyframeId: null,
  isExporting: false,
  exportProgress: 0,

  setTextStyle: (style) =>
    set((state) => ({
      textStyle: { ...state.textStyle, ...style }
    })),

  addKeyframe: (time, values?) => {
    const state = get();
    const interpolatedValues = state.getInterpolatedValues(time);
    const newKeyframe: Keyframe = {
      id: uuidv4(),
      time,
      easing: 'linear',
      values: { ...interpolatedValues, ...values }
    };

    set((state) => {
      const newKeyframes = [...state.keyframes, newKeyframe].sort(
        (a, b) => a.time - b.time
      );
      return { keyframes: newKeyframes, selectedKeyframeId: newKeyframe.id };
    });
  },

  removeKeyframe: (id) =>
    set((state) => ({
      keyframes: state.keyframes.filter((k) => k.id !== id),
      selectedKeyframeId: state.selectedKeyframeId === id ? null : state.selectedKeyframeId
    })),

  updateKeyframe: (id, updates) =>
    set((state) => ({
      keyframes: state.keyframes
        .map((k) => (k.id === id ? { ...k, ...updates } : k))
        .sort((a, b) => a.time - b.time)
    })),

  selectKeyframe: (id) => set({ selectedKeyframeId: id }),

  setPlaying: (isPlaying) =>
    set((state) => ({
      playback: { ...state.playback, isPlaying }
    })),

  setCurrentTime: (time) =>
    set((state) => ({
      playback: {
        ...state.playback,
        currentTime: Math.max(0, Math.min(time, state.playback.totalDuration))
      }
    })),

  setLoop: (loop) =>
    set((state) => ({
      playback: { ...state.playback, loop }
    })),

  setSpeed: (speed) =>
    set((state) => ({
      playback: { ...state.playback, speed }
    })),

  setTotalDuration: (duration) =>
    set((state) => ({
      playback: {
        ...state.playback,
        totalDuration: duration,
        currentTime: Math.min(state.playback.currentTime, duration)
      }
    })),

  setExporting: (isExporting) => set({ isExporting }),
  setExportProgress: (progress) => set({ exportProgress: progress }),

  getInterpolatedValues: (time): KeyframeValue => {
    const state = get();
    const keyframes = state.keyframes;

    if (keyframes.length === 0) {
      return { ...DEFAULT_KEYFRAME_VALUES };
    }

    if (time <= keyframes[0].time) {
      return { ...keyframes[0].values };
    }

    if (time >= keyframes[keyframes.length - 1].time) {
      return { ...keyframes[keyframes.length - 1].values };
    }

    for (let i = 0; i < keyframes.length - 1; i++) {
      const current = keyframes[i];
      const next = keyframes[i + 1];

      if (time >= current.time && time <= next.time) {
        const duration = next.time - current.time;
        const progress = duration > 0 ? (time - current.time) / duration : 0;
        return interpolateValues(current.values, next.values, progress, current.easing);
      }
    }

    return { ...DEFAULT_KEYFRAME_VALUES };
  }
}));
