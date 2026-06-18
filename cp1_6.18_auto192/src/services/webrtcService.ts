import { io, Socket } from 'socket.io-client';
import type { DrawingBox, Participant } from '../store/webrtcStore';

interface SignalServerConfig {
  url?: string;
}

interface WebRTCServiceCallbacks {
  onRemoteStream: (participant: Participant) => void;
  onRemoteStreamRemoved: (id: string) => void;
  onConnected: () => void;
  onDisconnected: () => void;
  onDrawingBox: (box: DrawingBox) => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export class WebRTCService {
  private socket: Socket | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private localStream: MediaStream | null = null;
  private localScreenStream: MediaStream | null = null;
  private callbacks: WebRTCServiceCallbacks;
  private roomName: string = '';
  private nickname: string = '';
  private userId: string = '';

  constructor(callbacks: WebRTCServiceCallbacks) {
    this.callbacks = callbacks;
  }

  async connectToRoom(
    roomName: string,
    nickname: string,
    localStream: MediaStream,
    config: SignalServerConfig = {}
  ): Promise<void> {
    this.roomName = roomName;
    this.nickname = nickname;
    this.localStream = localStream;
    this.userId = this.generateId();

    const serverUrl = config.url || import.meta.env.VITE_SIGNAL_SERVER || 'http://localhost:3001';

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
    });

    this.setupSocketListeners();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      this.socket?.once('connected', () => {
        clearTimeout(timeout);
        this.socket?.emit('join-room', {
          roomName,
          nickname,
          userId: this.userId,
        });
        this.callbacks.onConnected();
        resolve();
      });

      this.socket?.once('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on('user-joined', async ({ userId, nickname }: { userId: string; nickname: string }) => {
      if (userId === this.userId) return;
      await this.createPeerConnection(userId, nickname, true);
    });

    this.socket.on('user-left', ({ userId }: { userId: string }) => {
      this.closePeerConnection(userId);
      this.callbacks.onRemoteStreamRemoved(userId);
    });

    this.socket.on('existing-users', async (users: Array<{ userId: string; nickname: string }>) => {
      for (const user of users) {
        if (user.userId !== this.userId) {
          await this.createPeerConnection(user.userId, user.nickname, false);
        }
      }
    });

    this.socket.on('offer', async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      const pc = this.peerConnections.get(from);
      if (!pc) return;

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.socket?.emit('answer', {
        to: from,
        answer: pc.localDescription,
      });
    });

    this.socket.on('answer', async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
      const pc = this.peerConnections.get(from);
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    this.socket.on('ice-candidate', async ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => {
      const pc = this.peerConnections.get(from);
      if (!pc || !candidate) return;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    });

    this.socket.on('drawing-box', ({ box }: { box: DrawingBox }) => {
      this.callbacks.onDrawingBox(box);
    });
  }

  private async createPeerConnection(
    remoteUserId: string,
    remoteNickname: string,
    isInitiator: boolean
  ): Promise<void> {
    if (this.peerConnections.has(remoteUserId)) return;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(remoteUserId, pc);

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        if (this.localStream) {
          pc.addTrack(track, this.localStream);
        }
      });
    }

    const dataChannel = pc.createDataChannel('drawing-channel');
    this.dataChannels.set(remoteUserId, dataChannel);
    this.setupDataChannel(dataChannel);

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      this.callbacks.onRemoteStream({
        id: remoteUserId,
        nickname: remoteNickname,
        stream,
      });
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket?.emit('ice-candidate', {
          to: remoteUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.ondatachannel = (event) => {
      this.setupDataChannel(event.channel);
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        this.closePeerConnection(remoteUserId);
        this.callbacks.onRemoteStreamRemoved(remoteUserId);
      }
    };

    if (isInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.socket?.emit('offer', {
          to: remoteUserId,
          offer: pc.localDescription,
        });
      } catch (err) {
        console.error('Error creating offer:', err);
      }
    }
  }

  private setupDataChannel(channel: RTCDataChannel): void {
    channel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'drawing-box') {
          this.callbacks.onDrawingBox(data.box);
        }
      } catch (err) {
        console.error('Error parsing data channel message:', err);
      }
    };
  }

  sendDrawingBox(box: DrawingBox): void {
    const message = JSON.stringify({ type: 'drawing-box', box });
    this.dataChannels.forEach((channel) => {
      if (channel.readyState === 'open') {
        channel.send(message);
      }
    });

    this.socket?.emit('drawing-box', { box });
  }

  async replaceLocalStream(newStream: MediaStream): Promise<void> {
    this.localStream = newStream;
    this.peerConnections.forEach((pc) => {
      const senders = pc.getSenders();
      newStream.getTracks().forEach((track) => {
        const sender = senders.find((s) => s.track?.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track);
        } else {
          pc.addTrack(track, newStream);
        }
      });
    });
  }

  async toggleScreenShare(screenStream: MediaStream | null): Promise<void> {
    if (screenStream) {
      this.localScreenStream = screenStream;
      const videoTrack = screenStream.getVideoTracks()[0];
      if (videoTrack) {
        this.peerConnections.forEach((pc) => {
          const senders = pc.getSenders();
          const videoSender = senders.find((s) => s.track?.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(videoTrack);
          }
        });
      }
    } else if (this.localStream) {
      this.localScreenStream = null;
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        this.peerConnections.forEach((pc) => {
          const senders = pc.getSenders();
          const videoSender = senders.find((s) => s.track?.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(videoTrack);
          }
        });
      }
    }
  }

  private closePeerConnection(userId: string): void {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(userId);
    }
    const dc = this.dataChannels.get(userId);
    if (dc) {
      dc.close();
      this.dataChannels.delete(userId);
    }
  }

  disconnect(): void {
    this.peerConnections.forEach((_pc, userId) => {
      this.closePeerConnection(userId);
    });

    if (this.socket) {
      this.socket.emit('leave-room', {
        roomName: this.roomName,
        userId: this.userId,
      });
      this.socket.disconnect();
      this.socket = null;
    }

    this.callbacks.onDisconnected();
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
