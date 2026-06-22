export interface WindVector {
  x: number;
  y: number;
  z: number;
  u: number;
  v: number;
  w: number;
  speed: number;
}

export interface WindGridData {
  scene: string;
  description: string;
  timeStep: number;
  gridSize: { nx: number; ny: number; nz: number };
  bounds: {
    xMin: number; xMax: number;
    yMin: number; yMax: number;
    zMin: number; zMax: number;
  };
  vectors: WindVector[];
  timestamp: number;
}

export interface IncrementalUpdate {
  type: 'incremental';
  timeStep: number;
  vectors: WindVector[];
  timestamp: number;
}

export type SceneType = 'typhoon' | 'monsoon' | 'valley';

export interface SceneInfo {
  id: SceneType;
  name: string;
  description: string;
}

export type WindDataCallback = (data: WindGridData | IncrementalUpdate) => void;
export type ConnectionCallback = (connected: boolean) => void;

const API_BASE = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3001/wind/stream';

export class WindApiService {
  private ws: WebSocket | null = null;
  private dataCallback: WindDataCallback | null = null;
  private connectionCallback: ConnectionCallback | null = null;
  private reconnectTimer: number | null = null;
  private isManualClose = false;

  constructor() {}

  onData(callback: WindDataCallback) {
    this.dataCallback = callback;
  }

  onConnectionChange(callback: ConnectionCallback) {
    this.connectionCallback = callback;
  }

  async getScenes(): Promise<SceneInfo[]> {
    const response = await fetch(`${API_BASE}/api/wind/scenes`);
    if (!response.ok) {
      throw new Error('Failed to fetch scenes');
    }
    return response.json();
  }

  async initScene(scene: SceneType): Promise<WindGridData> {
    const response = await fetch(`${API_BASE}/api/wind/init?scene=${scene}`);
    if (!response.ok) {
      throw new Error('Failed to initialize wind scene');
    }
    return response.json();
  }

  async initScenePost(scene: SceneType): Promise<WindGridData> {
    const response = await fetch(`${API_BASE}/api/wind/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scene }),
    });
    if (!response.ok) {
      throw new Error('Failed to initialize wind scene');
    }
    return response.json();
  }

  connect(scene?: SceneType) {
    this.isManualClose = false;
    this.establishWebSocket(scene);
  }

  private establishWebSocket(scene?: SceneType) {
    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.connectionCallback?.(true);
        if (scene && this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ scene }));
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'incremental') {
            this.dataCallback?.(data as IncrementalUpdate);
          } else {
            this.dataCallback?.(data as WindGridData);
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connectionCallback?.(false);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.connectionCallback?.(false);
        if (!this.isManualClose) {
          this.scheduleReconnect(scene);
        }
      };
    } catch (e) {
      console.error('Failed to create WebSocket:', e);
      this.scheduleReconnect(scene);
    }
  }

  private scheduleReconnect(scene?: SceneType) {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = window.setTimeout(() => {
      this.establishWebSocket(scene);
    }, 3000);
  }

  sendSceneChange(scene: SceneType) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ scene }));
    }
  }

  disconnect() {
    this.isManualClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connectionCallback?.(false);
  }

  interpolateGrid(
    vectors: WindVector[],
    bounds: WindGridData['bounds'],
    gridSize: WindGridData['gridSize']
  ): (x: number, y: number, z: number) => { u: number; v: number; w: number; speed: number } {
    const nx = gridSize.nx;
    const ny = gridSize.ny;
    const nz = gridSize.nz;

    const dx = (bounds.xMax - bounds.xMin) / (nx - 1);
    const dy = (bounds.yMax - bounds.yMin) / (ny - 1);
    const dz = (bounds.zMax - bounds.zMin) / (nz - 1);

    const grid = new Map<string, WindVector>();
    vectors.forEach((v) => {
      const key = `${v.x.toFixed(2)}_${v.y.toFixed(2)}_${v.z.toFixed(2)}`;
      grid.set(key, v);
    });

    const getVector = (i: number, j: number, k: number): WindVector | undefined => {
      const x = bounds.xMin + i * dx;
      const y = bounds.yMin + j * dy;
      const z = bounds.zMin + k * dz;
      const key = `${x.toFixed(2)}_${y.toFixed(2)}_${z.toFixed(2)}`;
      return grid.get(key);
    };

    return (x: number, y: number, z: number) => {
      const clampedX = Math.max(bounds.xMin, Math.min(bounds.xMax, x));
      const clampedY = Math.max(bounds.yMin, Math.min(bounds.yMax, y));
      const clampedZ = Math.max(bounds.zMin, Math.min(bounds.zMax, z));

      const fi = (clampedX - bounds.xMin) / dx;
      const fj = (clampedY - bounds.yMin) / dy;
      const fk = (clampedZ - bounds.zMin) / dz;

      const i0 = Math.max(0, Math.min(nx - 2, Math.floor(fi)));
      const j0 = Math.max(0, Math.min(ny - 2, Math.floor(fj)));
      const k0 = Math.max(0, Math.min(nz - 2, Math.floor(fk)));

      const i1 = i0 + 1;
      const j1 = j0 + 1;
      const k1 = k0 + 1;

      const tx = fi - i0;
      const ty = fj - j0;
      const tz = fk - k0;

      const v000 = getVector(i0, j0, k0);
      const v100 = getVector(i1, j0, k0);
      const v010 = getVector(i0, j1, k0);
      const v110 = getVector(i1, j1, k0);
      const v001 = getVector(i0, j0, k1);
      const v101 = getVector(i1, j0, k1);
      const v011 = getVector(i0, j1, k1);
      const v111 = getVector(i1, j1, k1);

      const safe = (v: WindVector | undefined) => v || { u: 0, v: 0, w: 0, speed: 0, x: 0, y: 0, z: 0 };

      const c00 = safe(v000);
      const c10 = safe(v100);
      const c01 = safe(v010);
      const c11 = safe(v110);
      const c00k1 = safe(v001);
      const c10k1 = safe(v101);
      const c01k1 = safe(v011);
      const c11k1 = safe(v111);

      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

      const u00 = lerp(c00.u, c10.u, tx);
      const u01 = lerp(c01.u, c11.u, tx);
      const u10 = lerp(c00k1.u, c10k1.u, tx);
      const u11 = lerp(c01k1.u, c11k1.u, tx);
      const u0 = lerp(u00, u01, ty);
      const u1 = lerp(u10, u11, ty);
      const u = lerp(u0, u1, tz);

      const vv00 = lerp(c00.v, c10.v, tx);
      const vv01 = lerp(c01.v, c11.v, tx);
      const vv10 = lerp(c00k1.v, c10k1.v, tx);
      const vv11 = lerp(c01k1.v, c11k1.v, tx);
      const vv0 = lerp(vv00, vv01, ty);
      const vv1 = lerp(vv10, vv11, ty);
      const v = lerp(vv0, vv1, tz);

      const w00 = lerp(c00.w, c10.w, tx);
      const w01 = lerp(c01.w, c11.w, tx);
      const w10 = lerp(c00k1.w, c10k1.w, tx);
      const w11 = lerp(c01k1.w, c11k1.w, tx);
      const w0 = lerp(w00, w01, ty);
      const w1 = lerp(w10, w11, ty);
      const w = lerp(w0, w1, tz);

      const speed = Math.sqrt(u * u + v * v + w * w);

      return { u, v, w, speed };
    };
  }
}
