export interface BuildingData {
  id: string;
  position: { x: number; z: number };
  size: { width: number; depth: number };
  height: number;
  color: string;
  timestamp: string;
  exists: boolean;
}

export interface DiffResult {
  added: BuildingData[];
  removed: BuildingData[];
  heightChanged: {
    buildingA: BuildingData;
    buildingB: BuildingData;
    oldHeight: number;
    newHeight: number;
    changePercent: number;
  }[];
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1));
}

function generateGrayColor(): string {
  const v = randInt(120, 200);
  const r = Math.min(255, v + randInt(-10, 10));
  const g = Math.min(255, v + randInt(-10, 10));
  const b = Math.min(255, v + randInt(-5, 15));
  return `rgb(${r},${g},${b})`;
}

function isPositionOccupied(
  x: number,
  z: number,
  w: number,
  d: number,
  existing: BuildingData[]
): boolean {
  for (const b of existing) {
    const dx = Math.abs(x - b.position.x);
    const dz = Math.abs(z - b.position.z);
    if (dx < (w + b.size.width) / 2 + 0.2 && dz < (d + b.size.depth) / 2 + 0.2) {
      return true;
    }
  }
  return false;
}

export function generateBuildingData(): {
  timeA: BuildingData[];
  timeB: BuildingData[];
} {
  const countA = randInt(20, 30);
  const timeA: BuildingData[] = [];

  for (let i = 0; i < countA; i++) {
    const w = rand(0.5, 1.2);
    const d = rand(0.5, 1.2);
    const h = rand(0.5, 3.0);
    let x: number, z: number;
    let attempts = 0;
    do {
      x = rand(-9, 9);
      z = rand(-9, 9);
      attempts++;
    } while (isPositionOccupied(x, z, w, d, timeA) && attempts < 50);

    if (attempts >= 50) continue;

    timeA.push({
      id: `B${String(i + 1).padStart(3, '0')}`,
      position: { x, z },
      size: { width: w, depth: d },
      height: h,
      color: generateGrayColor(),
      timestamp: '2024-01-01',
      exists: true,
    });
  }

  const timeB: BuildingData[] = timeA.map((b) => ({ ...b, timestamp: '2024-06-01' }));

  const numToRemove = randInt(3, 5);
  const numToAdd = randInt(5, 8);
  const numHeightChange = 5;

  const indices = Array.from({ length: timeB.length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const removeIndices = indices.slice(0, Math.min(numToRemove, indices.length));
  const removeSet = new Set(removeIndices);

  const heightChangeCandidates = indices.filter(
    (idx) => !removeSet.has(idx)
  );
  const heightChangeIndices = heightChangeCandidates.slice(
    0,
    Math.min(numHeightChange, heightChangeCandidates.length)
  );
  const heightChangeSet = new Set(heightChangeIndices);

  for (const idx of removeSet) {
    timeB[idx] = { ...timeB[idx], exists: false };
  }

  for (const idx of heightChangeSet) {
    const delta = Math.random() > 0.5 ? 0.5 : -0.5;
    const newHeight = Math.max(0.3, timeB[idx].height + delta);
    timeB[idx] = { ...timeB[idx], height: newHeight };
  }

  const existing = timeB.filter((b) => b.exists);
  let addedCount = 0;
  for (let i = 0; i < numToAdd; i++) {
    const w = rand(0.5, 1.2);
    const d = rand(0.5, 1.2);
    const h = rand(0.5, 3.0);
    let x: number, z: number;
    let attempts = 0;
    do {
      x = rand(-9, 9);
      z = rand(-9, 9);
      attempts++;
    } while (isPositionOccupied(x, z, w, d, existing) && attempts < 50);

    if (attempts >= 50) continue;

    const newBuilding: BuildingData = {
      id: `B${String(timeA.length + addedCount + 1).padStart(3, '0')}`,
      position: { x, z },
      size: { width: w, depth: d },
      height: h,
      color: generateGrayColor(),
      timestamp: '2024-06-01',
      exists: true,
    };
    timeB.push(newBuilding);
    existing.push(newBuilding);
    addedCount++;
  }

  return { timeA, timeB };
}

export function computeDiff(
  buildingsA: BuildingData[],
  buildingsB: BuildingData[]
): DiffResult {
  const mapA = new Map<string, BuildingData>();
  for (const b of buildingsA) mapA.set(b.id, b);

  const mapB = new Map<string, BuildingData>();
  for (const b of buildingsB) mapB.set(b.id, b);

  const added: BuildingData[] = [];
  const removed: BuildingData[] = [];
  const heightChanged: DiffResult['heightChanged'] = [];

  for (const [id, bB] of mapB) {
    if (!mapA.has(id)) {
      if (bB.exists) added.push(bB);
    }
  }

  for (const [id, bA] of mapA) {
    const bB = mapB.get(id);
    if (!bB || !bB.exists) {
      removed.push(bA);
    } else if (Math.abs(bA.height - bB.height) > 0.01) {
      const changePercent = ((bB.height - bA.height) / bA.height) * 100;
      heightChanged.push({
        buildingA: bA,
        buildingB: bB,
        oldHeight: bA.height,
        newHeight: bB.height,
        changePercent,
      });
    }
  }

  return { added, removed, heightChanged };
}
