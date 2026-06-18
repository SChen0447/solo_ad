import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  Project,
  Track,
  AudioClip,
  MixerState,
  EditOperation,
  HistoryEntry,
  INSTRUMENT_COLORS,
  DEFAULT_INSTRUMENTS,
  USER_COLORS,
  CollaboratorInfo,
} from './types';

interface ProjectStore {
  project: Project | null;
  mixerState: MixerState;
  history: HistoryEntry[];
  historyIndex: number;
  selectedClipId: string | null;
  zoom: number;
  navCollapsed: boolean;
  activeUsers: CollaboratorInfo[];
  currentUserId: string;
  remoteEdits: Map<string, { userId: string; timestamp: number }>;
  exportProgress: number;
  exportTrackIndex: number;
  isExporting: boolean;

  createProject: (name: string, userId: string) => void;
  loadProject: (project: Project) => void;
  addTrack: (instrument?: string, userId?: string) => void;
  deleteTrack: (trackId: string, userId?: string) => void;
  renameTrack: (trackId: string, name: string, userId?: string) => void;
  addClip: (trackId: string, clip: Omit<AudioClip, 'id' | 'trackId'>, userId?: string) => void;
  moveClip: (clipId: string, trackId: string, startTime: number, userId?: string) => void;
  deleteClip: (clipId: string, trackId: string, userId?: string) => void;
  updateClip: (clipId: string, trackId: string, changes: Partial<AudioClip>, userId?: string) => void;
  updateMixerState: (changes: Partial<MixerState>, userId?: string) => void;
  undo: () => void;
  applyRemoteOperation: (operation: EditOperation, user: CollaboratorInfo) => void;
  setZoom: (zoom: number) => void;
  toggleNavCollapsed: () => void;
  setSelectedClip: (clipId: string | null) => void;
  setActiveUsers: (users: CollaboratorInfo[]) => void;
  addActiveUser: (user: CollaboratorInfo) => void;
  removeActiveUser: (userId: string) => void;
  setExportProgress: (trackIndex: number, progress: number) => void;
  setExporting: (val: boolean) => void;
  setCurrentUserId: (id: string) => void;
}

const createDefaultTracks = (): Track[] =>
  DEFAULT_INSTRUMENTS.map((instrument) => ({
    id: uuidv4(),
    name: instrument.charAt(0).toUpperCase() + instrument.slice(1),
    instrument,
    clips: [],
    volume: 80,
    pan: 0,
    mute: false,
    solo: false,
    color: INSTRUMENT_COLORS[instrument],
  }));

const createDefaultMixerState = (tracks: Track[]): MixerState => {
  const vols: Record<string, number> = {};
  const pans: Record<string, number> = {};
  const mutes: Record<string, boolean> = {};
  const solos: Record<string, boolean> = {};
  tracks.forEach((t) => {
    vols[t.id] = t.volume;
    pans[t.id] = t.pan;
    mutes[t.id] = t.mute;
    solos[t.id] = t.solo;
  });
  return { masterVolume: 0, masterMute: false, trackVolumes: vols, trackPans: pans, trackMutes: mutes, trackSolos: solos };
};

const MAX_HISTORY = 20;

export const useProjectStore = create<ProjectStore>((set, get) => ({
  project: null,
  mixerState: { masterVolume: 0, masterMute: false, trackVolumes: {}, trackPans: {}, trackMutes: {}, trackSolos: {} },
  history: [],
  historyIndex: -1,
  selectedClipId: null,
  zoom: 80,
  navCollapsed: false,
  activeUsers: [],
  currentUserId: '',
  remoteEdits: new Map(),
  exportProgress: 0,
  exportTrackIndex: 0,
  isExporting: false,

  createProject: (name, userId) => {
    const tracks = createDefaultTracks();
    const project: Project = {
      id: uuidv4(),
      name,
      bpm: 120,
      timeSignature: [4, 4],
      tracks,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ownerId: userId,
      collaborators: [],
    };
    set({
      project,
      mixerState: createDefaultMixerState(tracks),
      history: [],
      historyIndex: -1,
    });
  },

  loadProject: (project) => {
    set({
      project,
      mixerState: createDefaultMixerState(project.tracks),
      history: [],
      historyIndex: -1,
    });
  },

  addTrack: (instrument = 'piano', userId) => {
    const state = get();
    if (!state.project) return;
    const newTrack: Track = {
      id: uuidv4(),
      name: instrument.charAt(0).toUpperCase() + instrument.slice(1),
      instrument,
      clips: [],
      volume: 80,
      pan: 0,
      mute: false,
      solo: false,
      color: INSTRUMENT_COLORS[instrument] || '#6c5ce7',
    };
    const operation: EditOperation = { type: 'ADD_TRACK', track: newTrack, userId: userId || state.currentUserId };
    const inverse: EditOperation = { type: 'DELETE_TRACK', trackId: newTrack.id, userId: userId || state.currentUserId };
    pushHistory(state, operation, inverse);
    applyOperation(state, operation);
  },

  deleteTrack: (trackId, userId) => {
    const state = get();
    if (!state.project) return;
    const track = state.project.tracks.find((t) => t.id === trackId);
    if (!track) return;
    const operation: EditOperation = { type: 'DELETE_TRACK', trackId, userId: userId || state.currentUserId };
    const inverse: EditOperation = { type: 'ADD_TRACK', track, userId: userId || state.currentUserId };
    pushHistory(state, operation, inverse);
    applyOperation(state, operation);
  },

  renameTrack: (trackId, name, userId) => {
    const state = get();
    if (!state.project) return;
    const track = state.project.tracks.find((t) => t.id === trackId);
    if (!track) return;
    const oldName = track.name;
    const operation: EditOperation = { type: 'RENAME_TRACK', trackId, name, userId: userId || state.currentUserId };
    const inverse: EditOperation = { type: 'RENAME_TRACK', trackId, name: oldName, userId: userId || state.currentUserId };
    pushHistory(state, operation, inverse);
    applyOperation(state, operation);
  },

  addClip: (trackId, clipData, userId) => {
    const state = get();
    if (!state.project) return;
    const clip: AudioClip = { ...clipData, id: uuidv4(), trackId };
    const operation: EditOperation = { type: 'ADD_CLIP', trackId, clip, userId: userId || state.currentUserId };
    const inverse: EditOperation = { type: 'DELETE_CLIP', clipId: clip.id, trackId, userId: userId || state.currentUserId };
    pushHistory(state, operation, inverse);
    applyOperation(state, operation);
  },

  moveClip: (clipId, trackId, startTime, userId) => {
    const state = get();
    if (!state.project) return;
    let oldTrackId = '';
    let oldStartTime = 0;
    for (const t of state.project.tracks) {
      const c = t.clips.find((cl) => cl.id === clipId);
      if (c) {
        oldTrackId = t.id;
        oldStartTime = c.startTime;
        break;
      }
    }
    const operation: EditOperation = { type: 'MOVE_CLIP', clipId, trackId, startTime, userId: userId || state.currentUserId };
    const inverse: EditOperation = { type: 'MOVE_CLIP', clipId, trackId: oldTrackId, startTime: oldStartTime, userId: userId || state.currentUserId };
    pushHistory(state, operation, inverse);
    applyOperation(state, operation);
  },

  deleteClip: (clipId, trackId, userId) => {
    const state = get();
    if (!state.project) return;
    const track = state.project.tracks.find((t) => t.id === trackId);
    const clip = track?.clips.find((c) => c.id === clipId);
    if (!clip) return;
    const operation: EditOperation = { type: 'DELETE_CLIP', clipId, trackId, userId: userId || state.currentUserId };
    const inverse: EditOperation = { type: 'ADD_CLIP', trackId, clip, userId: userId || state.currentUserId };
    pushHistory(state, operation, inverse);
    applyOperation(state, operation);
  },

  updateClip: (clipId, trackId, changes, userId) => {
    const state = get();
    if (!state.project) return;
    const track = state.project.tracks.find((t) => t.id === trackId);
    const clip = track?.clips.find((c) => c.id === clipId);
    if (!clip) return;
    const inverseChanges: Partial<AudioClip> = {};
    for (const key of Object.keys(changes)) {
      (inverseChanges as any)[key] = (clip as any)[key];
    }
    const operation: EditOperation = { type: 'UPDATE_CLIP', clipId, trackId, changes, userId: userId || state.currentUserId };
    const inverse: EditOperation = { type: 'UPDATE_CLIP', clipId, trackId, changes: inverseChanges, userId: userId || state.currentUserId };
    pushHistory(state, operation, inverse);
    applyOperation(state, operation);
  },

  updateMixerState: (changes, userId) => {
    set((state) => ({
      mixerState: { ...state.mixerState, ...changes },
    }));
  },

  undo: () => {
    const state = get();
    if (state.historyIndex < 0 || !state.project) return;
    const entry = state.history[state.historyIndex];
    applyOperation(state, entry.inverse, true);
    set({ historyIndex: state.historyIndex - 1 });
  },

  applyRemoteOperation: (operation, user) => {
    const state = get();
    applyOperation(state, operation, true);
    const newEdits = new Map(state.remoteEdits);
    newEdits.set(operation.type + '_' + Date.now(), { userId: user.id, timestamp: Date.now() });
    set({ remoteEdits: newEdits });
  },

  setZoom: (zoom) => set({ zoom }),
  toggleNavCollapsed: () => set((s) => ({ navCollapsed: !s.navCollapsed })),
  setSelectedClip: (clipId) => set({ selectedClipId: clipId }),
  setActiveUsers: (users) => set({ activeUsers: users }),
  addActiveUser: (user) => set((s) => ({ activeUsers: [...s.activeUsers, user] })),
  removeActiveUser: (userId) => set((s) => ({ activeUsers: s.activeUsers.filter((u) => u.id !== userId) })),
  setExportProgress: (trackIndex, progress) => set({ exportTrackIndex: trackIndex, exportProgress: progress }),
  setExporting: (val) => set({ isExporting: val }),
  setCurrentUserId: (id) => set({ currentUserId: id }),
}));

function pushHistory(state: ProjectStore, operation: EditOperation, inverse: EditOperation): void {
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push({ operation, inverse, timestamp: Date.now() });
  if (newHistory.length > MAX_HISTORY) newHistory.shift();
  const idx = Math.min(newHistory.length - 1, state.historyIndex + 1);
  setImmediate(() => {
    useProjectStore.setState({ history: newHistory, historyIndex: idx });
  });
}

function applyOperation(state: ProjectStore, operation: EditOperation, isUndo = false): void {
  const project = state.project;
  if (!project) return;

  switch (operation.type) {
    case 'ADD_TRACK': {
      const newTracks = [...project.tracks, operation.track];
      useProjectStore.setState({
        project: { ...project, tracks: newTracks, updatedAt: Date.now() },
        mixerState: {
          ...state.mixerState,
          trackVolumes: { ...state.mixerState.trackVolumes, [operation.track.id]: operation.track.volume },
          trackPans: { ...state.mixerState.trackPans, [operation.track.id]: operation.track.pan },
          trackMutes: { ...state.mixerState.trackMutes, [operation.track.id]: operation.track.mute },
          trackSolos: { ...state.mixerState.trackSolos, [operation.track.id]: operation.track.solo },
        },
      });
      break;
    }
    case 'DELETE_TRACK': {
      const newTracks = project.tracks.filter((t) => t.id !== operation.trackId);
      useProjectStore.setState({ project: { ...project, tracks: newTracks, updatedAt: Date.now() } });
      break;
    }
    case 'RENAME_TRACK': {
      const newTracks = project.tracks.map((t) =>
        t.id === operation.trackId ? { ...t, name: operation.name } : t
      );
      useProjectStore.setState({ project: { ...project, tracks: newTracks, updatedAt: Date.now() } });
      break;
    }
    case 'ADD_CLIP': {
      const newTracks = project.tracks.map((t) =>
        t.id === operation.trackId ? { ...t, clips: [...t.clips, operation.clip] } : t
      );
      useProjectStore.setState({ project: { ...project, tracks: newTracks, updatedAt: Date.now() } });
      break;
    }
    case 'MOVE_CLIP': {
      let movedClip: AudioClip | null = null;
      const tracksWithoutClip = project.tracks.map((t) => {
        const clip = t.clips.find((c) => c.id === operation.clipId);
        if (clip) {
          movedClip = { ...clip, startTime: operation.startTime };
          return { ...t, clips: t.clips.filter((c) => c.id !== operation.clipId) };
        }
        return t;
      });
      if (!movedClip) break;
      const newTracks = tracksWithoutClip.map((t) =>
        t.id === operation.trackId ? { ...t, clips: [...t.clips, movedClip!] } : t
      );
      useProjectStore.setState({ project: { ...project, tracks: newTracks, updatedAt: Date.now() } });
      break;
    }
    case 'DELETE_CLIP': {
      const newTracks = project.tracks.map((t) =>
        t.id === operation.trackId ? { ...t, clips: t.clips.filter((c) => c.id !== operation.clipId) } : t
      );
      useProjectStore.setState({ project: { ...project, tracks: newTracks, updatedAt: Date.now() } });
      break;
    }
    case 'UPDATE_CLIP': {
      const newTracks = project.tracks.map((t) =>
        t.id === operation.trackId
          ? {
              ...t,
              clips: t.clips.map((c) =>
                c.id === operation.clipId ? { ...c, ...operation.changes } : c
              ),
            }
          : t
      );
      useProjectStore.setState({ project: { ...project, tracks: newTracks, updatedAt: Date.now() } });
      break;
    }
    case 'UPDATE_MIXER': {
      useProjectStore.setState({ mixerState: { ...state.mixerState, ...operation.mixerState } });
      break;
    }
  }
}
