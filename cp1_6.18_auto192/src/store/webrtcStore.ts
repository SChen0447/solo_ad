import { create } from 'zustand';

export interface Participant {
  id: string;
  nickname: string;
  stream?: MediaStream;
}

export interface DrawingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VirtualBackground {
  type: 'none' | 'preset' | 'custom' | 'blur';
  presetKey?: string;
  imageUrl?: string;
  blurIntensity?: number;
}

export interface WebRTCState {
  isConnected: boolean;
  roomName: string;
  nickname: string;
  localStream: MediaStream | null;
  processedLocalStream: MediaStream | null;
  remoteStreams: Participant[];
  screenStream: MediaStream | null;
  isScreenSharing: boolean;
  virtualBackground: VirtualBackground;
  blurIntensity: number;
  isBlurEnabled: boolean;
  drawingBoxes: DrawingBox[];
  visibleParticipantsOffset: number;

  setRoomName: (name: string) => void;
  setNickname: (name: string) => void;
  setIsConnected: (connected: boolean) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setProcessedLocalStream: (stream: MediaStream | null) => void;
  addRemoteStream: (participant: Participant) => void;
  removeRemoteStream: (id: string) => void;
  setScreenStream: (stream: MediaStream | null) => void;
  setIsScreenSharing: (sharing: boolean) => void;
  setVirtualBackground: (bg: VirtualBackground) => void;
  setBlurIntensity: (intensity: number) => void;
  setIsBlurEnabled: (enabled: boolean) => void;
  addDrawingBox: (box: DrawingBox) => void;
  clearDrawingBoxes: () => void;
  setVisibleParticipantsOffset: (offset: number) => void;
  joinRoom: (roomName: string, nickname: string) => Promise<void>;
  leaveRoom: () => void;
  toggleShareScreen: () => Promise<void>;
  updateBlurIntensity: (intensity: number) => void;
}

export const useWebRTCStore = create<WebRTCState>((set, get) => ({
  isConnected: false,
  roomName: '',
  nickname: '',
  localStream: null,
  processedLocalStream: null,
  remoteStreams: [],
  screenStream: null,
  isScreenSharing: false,
  virtualBackground: { type: 'none' },
  blurIntensity: 5,
  isBlurEnabled: false,
  drawingBoxes: [],
  visibleParticipantsOffset: 0,

  setRoomName: (name) => set({ roomName: name }),
  setNickname: (name) => set({ nickname: name }),
  setIsConnected: (connected) => set({ isConnected: connected }),
  setLocalStream: (stream) => set({ localStream: stream }),
  setProcessedLocalStream: (stream) => set({ processedLocalStream: stream }),
  addRemoteStream: (participant) =>
    set((state) => {
      const exists = state.remoteStreams.some((p) => p.id === participant.id);
      if (exists) {
        return {
          remoteStreams: state.remoteStreams.map((p) =>
            p.id === participant.id ? participant : p
          ),
        };
      }
      return { remoteStreams: [...state.remoteStreams, participant] };
    }),
  removeRemoteStream: (id) =>
    set((state) => ({
      remoteStreams: state.remoteStreams.filter((p) => p.id !== id),
    })),
  setScreenStream: (stream) => set({ screenStream: stream }),
  setIsScreenSharing: (sharing) => set({ isScreenSharing: sharing }),
  setVirtualBackground: (bg) => set({ virtualBackground: bg }),
  setBlurIntensity: (intensity) => set({ blurIntensity: intensity }),
  setIsBlurEnabled: (enabled) => set({ isBlurEnabled: enabled }),
  addDrawingBox: (box) =>
    set((state) => ({ drawingBoxes: [...state.drawingBoxes, box] })),
  clearDrawingBoxes: () => set({ drawingBoxes: [] }),
  setVisibleParticipantsOffset: (offset) =>
    set({ visibleParticipantsOffset: offset }),

  joinRoom: async (_roomName: string, _nickname: string) => {},
  leaveRoom: () => {
    const state = get();
    if (state.localStream) {
      state.localStream.getTracks().forEach((t) => t.stop());
    }
    if (state.screenStream) {
      state.screenStream.getTracks().forEach((t) => t.stop());
    }
    state.remoteStreams.forEach((p) => {
      p.stream?.getTracks().forEach((t) => t.stop());
    });
    set({
      isConnected: false,
      localStream: null,
      processedLocalStream: null,
      remoteStreams: [],
      screenStream: null,
      isScreenSharing: false,
      virtualBackground: { type: 'none' },
      drawingBoxes: [],
      isBlurEnabled: false,
    });
  },
  toggleShareScreen: async () => {},
  updateBlurIntensity: (intensity) => set({ blurIntensity: intensity }),
}));
