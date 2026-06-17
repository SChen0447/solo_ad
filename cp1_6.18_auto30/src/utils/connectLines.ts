export interface Point {
  x: number;
  y: number;
}

export interface BezierCurve {
  path: string;
  startPoint: Point;
  endPoint: Point;
  controlPoint1: Point;
  controlPoint2: Point;
}

export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 160;
export const CONNECTION_HANDLE_SIZE = 12;

export function calculateBezierCurve(
  fromNode: { x: number; y: number },
  toNode: { x: number; y: number }
): BezierCurve {
  const startPoint: Point = {
    x: fromNode.x + NODE_WIDTH,
    y: fromNode.y + NODE_HEIGHT / 2,
  };

  const endPoint: Point = {
    x: toNode.x,
    y: toNode.y + NODE_HEIGHT / 2,
  };

  const dx = endPoint.x - startPoint.x;
  const controlOffset = Math.min(Math.abs(dx) * 0.5, 150);

  const controlPoint1: Point = {
    x: startPoint.x + controlOffset,
    y: startPoint.y,
  };

  const controlPoint2: Point = {
    x: endPoint.x - controlOffset,
    y: endPoint.y,
  };

  const path = `M ${startPoint.x} ${startPoint.y} C ${controlPoint1.x} ${controlPoint1.y}, ${controlPoint2.x} ${controlPoint2.y}, ${endPoint.x} ${endPoint.y}`;

  return {
    path,
    startPoint,
    endPoint,
    controlPoint1,
    controlPoint2,
  };
}

export function getPointOnCurve(
  t: number,
  start: Point,
  cp1: Point,
  cp2: Point,
  end: Point
): Point {
  const oneMinusT = 1 - t;
  const oneMinusTSquared = oneMinusT * oneMinusT;
  const oneMinusTCubed = oneMinusTSquared * oneMinusT;
  const tSquared = t * t;
  const tCubed = tSquared * t;

  return {
    x:
      oneMinusTCubed * start.x +
      3 * oneMinusTSquared * t * cp1.x +
      3 * oneMinusT * tSquared * cp2.x +
      tCubed * end.x,
    y:
      oneMinusTCubed * start.y +
      3 * oneMinusTSquared * t * cp1.y +
      3 * oneMinusT * tSquared * cp2.y +
      tCubed * end.y,
  };
}

export function getArrowPoints(endPoint: Point, angle: number, size: number = 10): string {
  const angleRad = (angle * Math.PI) / 180;
  const p1: Point = {
    x: endPoint.x - size * Math.cos(angleRad - Math.PI / 6),
    y: endPoint.y - size * Math.sin(angleRad - Math.PI / 6),
  };
  const p2: Point = {
    x: endPoint.x - size * Math.cos(angleRad + Math.PI / 6),
    y: endPoint.y - size * Math.sin(angleRad + Math.PI / 6),
  };
  return `${endPoint.x},${endPoint.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`;
}

export function calculateEndAngle(
  start: Point,
  cp1: Point,
  cp2: Point,
  end: Point
): number {
  const t = 0.99;
  const p1 = getPointOnCurve(t - 0.01, start, cp1, cp2, end);
  const p2 = getPointOnCurve(t, start, cp1, cp2, end);
  
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

export function generateAnimatedDashArray(
  pathLength: number,
  progress: number,
  dashLength: number = 15,
  gapLength: number = 8
): string {
  const filledLength = pathLength * progress;
  const patternLength = dashLength + gapLength;
  const dashArray: string[] = [];
  
  let remaining = filledLength;
  while (remaining > 0) {
    const dash = Math.min(dashLength, remaining);
    dashArray.push(`${dash}`);
    remaining -= dash;
    if (remaining > 0) {
      const gap = Math.min(gapLength, remaining);
      dashArray.push(`${gap}`);
      remaining -= gap;
    }
  }
  
  dashArray.push(`${pathLength - filledLength}`);
  
  return dashArray.join(' ');
}

export function isPointNearLine(
  point: Point,
  start: Point,
  end: Point,
  threshold: number = 10
): boolean {
  const A = point.x - start.x;
  const B = point.y - start.y;
  const C = end.x - start.x;
  const D = end.y - start.y;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  
  if (lenSq !== 0) {
    param = dot / lenSq;
  }
  
  let xx, yy;
  
  if (param < 0) {
    xx = start.x;
    yy = start.y;
  } else if (param > 1) {
    xx = end.x;
    yy = end.y;
  } else {
    xx = start.x + param * C;
    yy = start.y + param * D;
  }
  
  const dx = point.x - xx;
  const dy = point.y - yy;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  return distance <= threshold;
}

export function isPointInConnectionHandle(
  point: Point,
  nodePos: { x: number; y: number },
  isOutput: boolean
): boolean {
  const handleX = isOutput
    ? nodePos.x + NODE_WIDTH
    : nodePos.x;
  const handleY = nodePos.y + NODE_HEIGHT / 2;
  
  const dx = point.x - handleX;
  const dy = point.y - handleY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  return distance <= CONNECTION_HANDLE_SIZE;
}
