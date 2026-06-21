import { TargetConfig } from './levelLoader';

export interface FieldRegion {
  x: number;
  y: number;
  radius: number;
  charge: number;
}

export class FieldManager {
  private fields: FieldRegion[] = [];
  private fieldStrength = 800;

  updateFields(targets: TargetConfig[]): void {
    this.fields = targets.map(t => ({
      x: t.x,
      y: t.y,
      radius: 60,
      charge: -1,
    }));
  }

  getForceAt(px: number, py: number, charge: number): { fx: number; fy: number } {
    let fx = 0;
    let fy = 0;

    for (const field of this.fields) {
      const dx = px - field.x;
      const dy = py - field.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);

      if (dist < field.radius && dist > 1) {
        const forceMag = this.fieldStrength * charge * field.charge / distSq;
        fx += forceMag * (dx / dist);
        fy += forceMag * (dy / dist);
      }
    }

    return { fx, fy };
  }

  getFields(): FieldRegion[] {
    return this.fields;
  }

  isPointInside(px: number, py: number, fieldIndex: number): boolean {
    if (fieldIndex < 0 || fieldIndex >= this.fields.length) return false;
    const field = this.fields[fieldIndex];
    const dx = px - field.x;
    const dy = py - field.y;
    const distSq = dx * dx + dy * dy;
    return distSq < field.radius * field.radius;
  }

  hasParticleInside(fieldIndex: number, particles: { x: number; y: number }[]): boolean {
    for (const p of particles) {
      if (this.isPointInside(p.x, p.y, fieldIndex)) {
        return true;
      }
    }
    return false;
  }

  removeField(index: number): void {
    if (index >= 0 && index < this.fields.length) {
      this.fields.splice(index, 1);
    }
  }
}
