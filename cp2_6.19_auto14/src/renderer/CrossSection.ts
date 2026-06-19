import {
  GeologyData,
  CrossSectionResult,
  LayerSample
} from '../data/GeologyInterfaces';
import { SceneManager } from './SceneManager';

const DEFAULT_SLICE_THICKNESS = 1.0;

export class CrossSection {
  private data: GeologyData;
  private sceneManager: SceneManager;
  private sliceThickness: number;

  constructor(
    data: GeologyData,
    sceneManager: SceneManager,
    sliceThickness = DEFAULT_SLICE_THICKNESS
  ) {
    this.data = data;
    this.sceneManager = sceneManager;
    this.sliceThickness = sliceThickness;
  }

  query(depth: number): CrossSectionResult {
    const clampedDepth = Math.max(0, Math.min(depth, this.data.totalDepth));
    const half = this.sliceThickness / 2;
    const sliceTop = Math.max(0, clampedDepth - half);
    const sliceBottom = Math.min(this.data.totalDepth, clampedDepth + half);

    const samples: LayerSample[] = [];

    for (const layer of this.data.layers) {
      const overlapTop = Math.max(sliceTop, layer.topDepth);
      const overlapBottom = Math.min(sliceBottom, layer.bottomDepth);
      const overlapThickness = overlapBottom - overlapTop;

      if (overlapThickness > 0) {
        samples.push({
          name: layer.name,
          color: layer.color,
          thickness: Math.round(overlapThickness * 10) / 10
        });
      }
    }

    samples.sort((a, b) => b.thickness - a.thickness);

    return {
      samples,
      depth: clampedDepth
    };
  }

  applyDepth(depth: number): CrossSectionResult {
    const result = this.query(depth);
    this.sceneManager.addCrossSectionPlane(depth);
    return result;
  }

  updatePlane(depth: number): CrossSectionResult {
    const result = this.query(depth);
    this.sceneManager.addCrossSectionPlane(depth);
    return result;
  }

  remove(): void {
    this.sceneManager.removeCrossSectionPlane();
  }

  getMaxDepth(): number {
    return this.data.totalDepth;
  }

  formatResult(result: CrossSectionResult): string {
    if (result.samples.length === 0) {
      return `深度${result.depth}m：暂无岩层数据`;
    }
    const parts = result.samples
      .map(s => `${s.name}(${s.thickness}m) ${s.color}`)
      .join(', ');
    return `深度${result.depth}m：${parts}`;
  }

  static formatSamples(samples: LayerSample[]): string {
    return samples
      .map(s => `${s.name}(${s.thickness}m) ${s.color}`)
      .join(', ');
  }
}
