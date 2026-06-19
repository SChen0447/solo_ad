import { GeologyData, CrossSectionResult, LayerSample } from '../data/GeologyInterfaces';
import { SceneManager } from './SceneManager';

export class CrossSection {
  private data: GeologyData;
  private sceneManager: SceneManager;

  constructor(data: GeologyData, sceneManager: SceneManager) {
    this.data = data;
    this.sceneManager = sceneManager;
  }

  query(depth: number): CrossSectionResult {
    const clampedDepth = Math.max(0, Math.min(depth, this.data.totalDepth));
    const samples: LayerSample[] = [];

    for (const layer of this.data.layers) {
      if (clampedDepth < layer.topDepth) continue;
      if (clampedDepth > layer.bottomDepth) continue;

      const thickness = Math.min(clampedDepth, layer.bottomDepth) - Math.max(clampedDepth - 1, layer.topDepth);

      samples.push({
        name: layer.name,
        color: layer.color,
        thickness: Math.max(1, Math.round(thickness))
      });
    }

    if (samples.length === 0) {
      const sortedLayers = [...this.data.layers].sort((a, b) => a.topDepth - b.topDepth);
      for (const layer of sortedLayers) {
        const overlap = this.calcOverlap(clampedDepth, layer);
        if (overlap > 0) {
          samples.push({
            name: layer.name,
            color: layer.color,
            thickness: Math.round(overlap)
          });
        }
      }
    }

    samples.sort((a, b) => b.thickness - a.thickness);
    return { samples, depth: clampedDepth };
  }

  private calcOverlap(depth: number, layer: { topDepth: number; bottomDepth: number }): number {
    const sectionTop = depth;
    const sectionBottom = depth;
    const overlapTop = Math.max(sectionTop, layer.topDepth);
    const overlapBottom = Math.min(sectionBottom, layer.bottomDepth);
    const direct = overlapBottom - overlapTop;
    if (direct > 0) return direct;

    const midThickness = 1;
    const rangeTop = Math.max(0, depth - midThickness);
    const rangeBottom = Math.min(this.data.totalDepth, depth + midThickness);
    const oTop = Math.max(rangeTop, layer.topDepth);
    const oBottom = Math.min(rangeBottom, layer.bottomDepth);
    return oBottom - oTop;
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
