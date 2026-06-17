export function rectCircleCollision(
  rx: number, ry: number, rw: number, rh: number,
  cx: number, cy: number, cr: number
): boolean {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return (dx * dx + dy * dy) <= (cr * cr);
}

export function checkBulletShipCollision(
  bx: number, by: number, br: number,
  sx: number, sy: number, sw: number, sh: number
): boolean {
  return rectCircleCollision(sx - sw / 2, sy - sh / 2, sw, sh, bx, by, br);
}

export function checkShipShipCollision(
  x1: number, y1: number, w1: number, h1: number,
  x2: number, y2: number, w2: number, h2: number
): boolean {
  return !(
    x1 + w1 / 2 < x2 - w2 / 2 ||
    x1 - w1 / 2 > x2 + w2 / 2 ||
    y1 + h1 / 2 < y2 - h2 / 2 ||
    y1 - h1 / 2 > y2 + h2 / 2
  );
}
