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

  drawFieldIndicators(ctx: CanvasRenderingContext2D, time: number): void {
    for (const field of this.fields) {
      const ringCount = 3;
      for (let ring = 0; ring < ringCount; ring++) {
        const r = field.radius * (0.35 + ring * 0.25);
        const arrowCount = ring === 0 ? 6 : ring === 1 ? 10 : 14;
        const rotationOffset = time * 0.3 * (ring % 2 === 0 ? 1 : -1);

        for (let i = 0; i < arrowCount; i++) {
          const angle = (i / arrowCount) * Math.PI * 2 + rotationOffset;
          const ax = field.x + Math.cos(angle) * r;
          const ay = field.y + Math.sin(angle) * r;

          const distRatio = r / field.radius;
          const arrowLength = 4 + (1 - distRatio) * 6;

          let dirX: number;
          let dirY: number;
          if (field.charge < 0) {
            dirX = -Math.cos(angle);
            dirY = -Math.sin(angle);
          } else {
            dirX = Math.cos(angle);
            dirY = Math.sin(angle);
          }

          const tipX = ax + dirX * arrowLength;
          const tipY = ay + dirY * arrowLength;

          const baseColor = field.charge < 0
            ? 'rgba(255, 71, 87, '
            : 'rgba(46, 134, 222, ';
          const alpha = 0.25 + (1 - distRatio) * 0.35;

          ctx.strokeStyle = baseColor + alpha + ')';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(tipX, tipY);
          ctx.stroke();

          const headLen = 2.5;
          const headAngle = Math.atan2(dirY, dirX);
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(
            tipX - headLen * Math.cos(headAngle - Math.PI / 6),
            tipY - headLen * Math.sin(headAngle - Math.PI / 6),
          );
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(
            tipX - headLen * Math.cos(headAngle + Math.PI / 6),
            tipY - headLen * Math.sin(headAngle + Math.PI / 6),
          );
          ctx.stroke();
        }
      }
    }
  }

  isParticleAffected(px: number, py: number): boolean {
    for (const field of this.fields) {
      const dx = px - field.x;
      const dy = py - field.y;
      if (dx * dx + dy * dy < field.radius * field.radius) {
        return true;
      }
    }
    return false;
  }
}
