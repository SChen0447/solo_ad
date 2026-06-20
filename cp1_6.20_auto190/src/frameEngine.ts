import {
  PixelFrame,
  CharacterAction,
  Track,
  TrackClip,
  ProjectData,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  COLORS,
  DEFAULT_FPS,
} from './types';

const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const createEmptyPixels = (width: number, height: number): number[][] => {
  return Array(height)
    .fill(null)
    .map(() => Array(width).fill(0));
};

export const createFrame = (
  pixels?: number[][],
  width = CANVAS_WIDTH,
  height = CANVAS_HEIGHT
): PixelFrame => {
  return {
    id: generateId(),
    width,
    height,
    pixels: pixels || createEmptyPixels(width, height),
    createdAt: Date.now(),
  };
};

export const cloneFrame = (frame: PixelFrame): PixelFrame => {
  return {
    ...frame,
    id: generateId(),
    pixels: frame.pixels.map((row) => [...row]),
    createdAt: Date.now(),
  };
};

export const createAction = (
  name: string,
  characterType: 'player' | 'enemy' | 'item',
  frames: PixelFrame[] = []
): CharacterAction => {
  return {
    id: generateId(),
    name,
    characterType,
    frames,
    frameDuration: 1,
  };
};

export const createTrack = (
  characterType: 'player' | 'enemy' | 'item',
  name: string
): Track => {
  return {
    id: generateId(),
    characterType,
    name,
    clips: [],
  };
};

export const createTrackClip = (
  actionId: string,
  startFrame: number,
  duration: number
): TrackClip => {
  return {
    id: generateId(),
    actionId,
    startFrame,
    duration,
  };
};

export const reorderFrames = (
  frames: PixelFrame[],
  fromIndex: number,
  toIndex: number
): PixelFrame[] => {
  const result = [...frames];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
};

export const deleteFrame = (
  frames: PixelFrame[],
  frameId: string
): PixelFrame[] => {
  return frames.filter((f) => f.id !== frameId);
};

export const frameToDataURL = (
  frame: PixelFrame,
  scale: number = 1
): string => {
  const canvas = document.createElement('canvas');
  canvas.width = frame.width * scale;
  canvas.height = frame.height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const colorIndex = frame.pixels[y][x];
      if (colorIndex !== 0) {
        ctx.fillStyle = COLORS[colorIndex];
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }

  return canvas.toDataURL();
};

export const drawFrameToCanvas = (
  ctx: CanvasRenderingContext2D,
  frame: PixelFrame,
  offsetX: number = 0,
  offsetY: number = 0,
  scale: number = 1
): void => {
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const colorIndex = frame.pixels[y][x];
      if (colorIndex !== 0) {
        ctx.fillStyle = COLORS[colorIndex];
        ctx.fillRect(
          offsetX + x * scale,
          offsetY + y * scale,
          scale,
          scale
        );
      }
    }
  }
};

export const serializeProject = (
  name: string,
  actions: CharacterAction[],
  tracks: Track[],
  fps: number
): string => {
  const projectData: ProjectData = {
    version: '1.0',
    name,
    actions,
    tracks,
    fps,
  };
  return JSON.stringify(projectData, null, 2);
};

export const deserializeProject = (json: string): ProjectData | null => {
  try {
    const data = JSON.parse(json) as ProjectData;
    if (!data.version || !data.actions || !data.tracks) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
};

export const exportProjectJSON = (
  name: string,
  actions: CharacterAction[],
  tracks: Track[],
  fps: number
): void => {
  const json = serializeProject(name, actions, tracks, fps);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name || 'pixel-script'}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const loadProjectJSON = (
  file: File
): Promise<ProjectData | null> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const data = deserializeProject(text);
      resolve(data);
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
};

export const createEmptyProject = (): {
  actions: CharacterAction[];
  tracks: Track[];
  fps: number;
} => {
  const defaultAction = createAction('默认动作', 'player', [
    createFrame(),
  ]);
  const defaultTrack = createTrack('player', '玩家轨道');

  return {
    actions: [defaultAction],
    tracks: [defaultTrack],
    fps: DEFAULT_FPS,
  };
};

export const getTotalFrames = (tracks: Track[]): number => {
  let maxFrame = 0;
  for (const track of tracks) {
    for (const clip of track.clips) {
      const endFrame = clip.startFrame + clip.duration;
      if (endFrame > maxFrame) {
        maxFrame = endFrame;
      }
    }
  }
  return maxFrame;
};

export const getFrameAtPosition = (
  clip: TrackClip,
  action: CharacterAction,
  globalFrame: number
): PixelFrame | null => {
  if (
    globalFrame < clip.startFrame ||
    globalFrame >= clip.startFrame + clip.duration
  ) {
    return null;
  }

  const localFrame = Math.floor(
    (globalFrame - clip.startFrame) / action.frameDuration
  );
  const frameIndex = localFrame % action.frames.length;
  return action.frames[frameIndex] || null;
};
