import { v4 as uuidv4 } from 'uuid';
import {
  SceneManager,
  GeometryData,
  HistoryState as SceneHistoryState,
  ModelStats
} from './renderer/sceneManager.js';
import { ControlPanel } from './ui/panel.js';
import { Hud } from './ui/hud.js';
import SimplifyWorker from './renderer/workers/simplifyWorker.ts?worker';

interface SimplifyWorkerRequest {
  type: 'simplify';
  algorithm: 'edge-collapse' | 'vertex-clustering' | 'quadric-collapse';
  targetPercent: number;
  geometry: GeometryData;
  requestId: string;
}

interface SimplifyWorkerProgress {
  type: 'progress';
  requestId: string;
  progress: number;
}

interface SimplifyWorkerResponse {
  type: 'complete';
  requestId: string;
  geometry: GeometryData;
  elapsedMs: number;
}

type WorkerMessage = SimplifyWorkerProgress | SimplifyWorkerResponse;

interface PendingSimplify {
  requestId: string;
  algorithm: 'edge-collapse' | 'vertex-clustering' | 'quadric-collapse';
  percent: number;
  prevFaceCount: number;
  prevVertexCount: number;
  prevGeometryData: GeometryData;
}

const algNameMap: Record<string, string> = {
  'edge-collapse': '边坍缩法',
  'vertex-clustering': '顶点聚类法',
  'quadric-collapse': '四边折叠法',
};

class App {
  private appContainer: HTMLElement;
  private canvasContainer: HTMLElement;

  private sceneManager: SceneManager;
  private panel: ControlPanel;
  private hud: Hud;

  private worker: Worker | null = null;
  private pending: PendingSimplify | null = null;

  private historyStates: Map<string, SceneHistoryState> = new Map();
  private originalFaceCount = 0;
  private originalVertexCount = 0;

  private diffActive = false;

  constructor() {
    this.appContainer = document.getElementById('app')!;
    this.canvasContainer = document.getElementById('canvas-container')!;

    if (!this.appContainer || !this.canvasContainer) {
      throw new Error('Required DOM containers not found');
    }

    this.sceneManager = new SceneManager({ container: this.canvasContainer });
    this.panel = new ControlPanel(this.appContainer);
    this.hud = new Hud(this.canvasContainer);

    this.initWorker();
    this.bindEvents();

    const initialStats = this.sceneManager.getCurrentStats();
    this.originalFaceCount = initialStats.faceCount;
    this.originalVertexCount = initialStats.vertexCount;
    this.hud.update(initialStats);
  }

  private initWorker(): void {
    try {
      this.worker = new SimplifyWorker();
      this.worker.addEventListener('message', (e: MessageEvent<WorkerMessage>) => {
        this.handleWorkerMessage(e.data);
      });
      this.worker.addEventListener('error', (e) => {
        console.error('Worker error:', e);
        this.handleSimplifyError(e.message);
      });
    } catch (err) {
      console.error('Failed to create worker:', err);
    }
  }

  private bindEvents(): void {
    this.sceneManager.setOnStatsChange((stats: ModelStats & { fps: number }) => {
      this.hud.update(stats);
    });

    this.panel.addEventListener((event) => {
      switch (event.type) {
        case 'SIMPLIFY':
          this.handleSimplifyRequest(event.algorithm, event.percent, event.requestId);
          break;

        case 'APPLY_HISTORY':
          this.handleApplyHistory(event.historyId);
          break;

        case 'RESET':
          this.handleReset();
          break;

        case 'TOGGLE_DIFF':
          this.handleToggleDiff();
          break;
      }
    });
  }

  private estimateRuntimeMs(
    algorithm: string,
    faceCount: number,
    percent: number
  ): number {
    const baseFaces = Math.max(1, faceCount);
    const reductionFactor = 1 + (1 - percent / 100) * 3;

    const algFactor =
      algorithm === 'edge-collapse' ? 0.04 :
      algorithm === 'vertex-clustering' ? 0.015 :
      0.05;

    return Math.max(50, baseFaces * algFactor * reductionFactor);
  }

  private handleSimplifyRequest(
    algorithm: 'edge-collapse' | 'vertex-clustering' | 'quadric-collapse',
    percent: number,
    requestId: string
  ): void {
    if (!this.worker) {
      alert('Worker 初始化失败，无法执行简化计算');
      return;
    }

    const geomData = this.sceneManager.getCurrentGeometryData();
    if (!geomData) return;

    const currentStats = this.sceneManager.getCurrentStats();

    const estimatedMs = this.estimateRuntimeMs(algorithm, currentStats.faceCount, percent);
    this.panel.showLoading(`${algNameMap[algorithm] ?? algorithm} 简化中...`, estimatedMs);
    this.panel.setProgress(0.02);

    this.sceneManager.processCommand({
      type: 'SIMPLIFY_REQUEST',
      algorithm,
      percent,
      requestId
    });

    this.pending = {
      requestId,
      algorithm,
      percent,
      prevFaceCount: currentStats.faceCount,
      prevVertexCount: currentStats.vertexCount,
      prevGeometryData: geomData
    };

    const payload: SimplifyWorkerRequest = {
      type: 'simplify',
      algorithm,
      targetPercent: percent,
      geometry: geomData,
      requestId
    };

    try {
      this.worker.postMessage(payload, [
        geomData.positions.buffer,
        geomData.normals.buffer,
        ...(geomData.indices ? [geomData.indices.buffer] : [])
      ]);
    } catch (err) {
      console.warn('Transfer list failed, falling back to copy:', err);
      this.worker.postMessage({
        ...payload,
        geometry: {
          positions: new Float32Array(geomData.positions),
          normals: new Float32Array(geomData.normals),
          indices: geomData.indices ? new Uint32Array(geomData.indices) : null,
          vertexCount: geomData.vertexCount,
          faceCount: geomData.faceCount
        }
      });
    }
  }

  private handleWorkerMessage(msg: WorkerMessage): void {
    switch (msg.type) {
      case 'progress': {
        if (this.pending && msg.requestId === this.pending.requestId) {
          this.panel.setProgress(msg.progress);
        }
        break;
      }

      case 'complete': {
        const pending = this.pending;
        this.pending = null;
        this.panel.hideLoading();

        if (!pending) break;
        if (msg.requestId !== pending.requestId) break;

        const simplifiedData = msg.geometry;
        if (!simplifiedData) {
          this.handleSimplifyError('Worker 返回空几何数据');
          break;
        }

        this.sceneManager.processCommand({
          type: 'SIMPLIFY_COMPLETE',
          geometry: simplifiedData,
          requestId: msg.requestId,
          elapsedMs: msg.elapsedMs
        });

        const historyId = uuidv4();
        const newGeomCopy: GeometryData = {
          positions: new Float32Array(simplifiedData.positions),
          normals: new Float32Array(simplifiedData.normals),
          indices: simplifiedData.indices ? new Uint32Array(simplifiedData.indices) : null,
          vertexCount: simplifiedData.vertexCount,
          faceCount: simplifiedData.faceCount
        };

        const state: SceneHistoryState = {
          id: historyId,
          geometryData: newGeomCopy,
          faceCount: simplifiedData.faceCount,
          vertexCount: simplifiedData.vertexCount,
          algorithm: pending.algorithm,
          percent: pending.percent,
          elapsedMs: msg.elapsedMs,
          prevFaceCount: pending.prevFaceCount,
          timestamp: Date.now()
        };

        this.historyStates.set(historyId, state);
        this.panel.addHistory({
          id: state.id,
          faceCount: state.faceCount,
          vertexCount: state.vertexCount,
          algorithm: state.algorithm,
          percent: state.percent,
          elapsedMs: state.elapsedMs,
          prevFaceCount: state.prevFaceCount,
          timestamp: state.timestamp
        });

        this.diffActive = false;
        this.panel.setDiffButtonState(false);
        break;
      }
    }
  }

  private handleSimplifyError(message: string): void {
    console.error('Simplification failed:', message);
    this.pending = null;
    this.panel.hideLoading();
    this.sceneManager.setHaloVisible(false);
  }

  private handleApplyHistory(historyId: string): void {
    const state = this.historyStates.get(historyId);
    if (!state) return;

    const geomCopy: GeometryData = {
      positions: new Float32Array(state.geometryData.positions),
      normals: new Float32Array(state.geometryData.normals),
      indices: state.geometryData.indices ? new Uint32Array(state.geometryData.indices) : null,
      vertexCount: state.geometryData.vertexCount,
      faceCount: state.geometryData.faceCount
    };

    this.sceneManager.processCommand({
      type: 'APPLY_HISTORY',
      state: { ...state, geometryData: geomCopy }
    });

    this.panel.setActiveHistory(historyId);
    this.diffActive = false;
    this.panel.setDiffButtonState(false);
  }

  private handleReset(): void {
    this.sceneManager.processCommand({ type: 'RESET' });
    this.panel.resetHistory();
    this.historyStates.clear();
    this.diffActive = false;
    this.panel.setDiffButtonState(false);
  }

  private handleToggleDiff(): void {
    const latest = this.panel.getLatestHistory();
    if (!latest) {
      alert('请先执行至少一次简化操作后再对比差异');
      return;
    }

    const state = this.historyStates.get(latest.id);
    if (!state) return;

    this.diffActive = !this.diffActive;
    this.panel.setDiffButtonState(this.diffActive);

    const geomCopy: GeometryData | null = state ? {
      positions: new Float32Array(state.geometryData.positions),
      normals: new Float32Array(state.geometryData.normals),
      indices: state.geometryData.indices ? new Uint32Array(state.geometryData.indices) : null,
      vertexCount: state.geometryData.vertexCount,
      faceCount: state.geometryData.faceCount
    } : null;

    const histCopy = state && geomCopy ? {
      ...state,
      geometryData: geomCopy
    } : null;

    this.sceneManager.processCommand({
      type: 'TOGGLE_DIFF_HIGHLIGHT',
      enabled: this.diffActive,
      prevState: histCopy
    });

    if (this.diffActive) {
      setTimeout(() => {
        this.diffActive = false;
        this.panel.setDiffButtonState(false);
      }, 3200);
    }
  }

  public dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.sceneManager.dispose();
    this.panel.dispose();
    this.hud.dispose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  (window as unknown as { __topologyApp?: App }).__topologyApp = new App();
});

window.addEventListener('beforeunload', () => {
  const app = (window as unknown as { __topologyApp?: App }).__topologyApp;
  if (app) {
    app.dispose();
  }
});
