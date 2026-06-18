import { Pathfinder } from '../../src/modules/ai/Pathfinder';
import { MapTile, MAP_WIDTH, MAP_HEIGHT } from '../../src/modules/gameMap/types';

function createPlainTiles(): MapTile[][] {
  const tiles: MapTile[][] = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row: MapTile[] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      row.push({ x, y, biome: 'plain', walkable: true, obstacle: false });
    }
    tiles.push(row);
  }
  return tiles;
}

function addObstacle(tiles: MapTile[][], gx: number, gy: number): void {
  if (tiles[gy]?.[gx]) {
    tiles[gy][gx].obstacle = true;
  }
}

function addMountain(tiles: MapTile[][], gx: number, gy: number): void {
  if (tiles[gy]?.[gx]) {
    tiles[gy][gx].biome = 'mountain';
    tiles[gy][gx].walkable = false;
  }
}

function addWater(tiles: MapTile[][], gx: number, gy: number): void {
  if (tiles[gy]?.[gx]) {
    tiles[gy][gx].biome = 'water';
    tiles[gy][gx].walkable = false;
  }
}

const pf = new Pathfinder();

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string): void {
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${name}`);
    failed++;
  }
}

function testBasicPathfinding(): void {
  console.log('\n--- Test: Basic Pathfinding ---');
  const tiles = createPlainTiles();
  const path = pf.findPath(tiles, 0, 0, 19, 19, false);
  assert(path.length > 0, 'Path exists from (0,0) to (19,19)');
  assert(path[0].x === 0 && path[0].y === 0, 'Path starts at (0,0)');
  assert(path[path.length - 1].x === 19 && path[path.length - 1].y === 19, 'Path ends at (19,19)');
}

function testSameStartEnd(): void {
  console.log('\n--- Test: Same Start and End ---');
  const tiles = createPlainTiles();
  const path = pf.findPath(tiles, 5, 5, 5, 5, false);
  assert(path.length === 0, 'No path when start equals end');
}

function testObstacleAvoidance(): void {
  console.log('\n--- Test: Obstacle Avoidance ---');
  const tiles = createPlainTiles();
  for (let x = 0; x < MAP_WIDTH; x++) {
    addObstacle(tiles, x, 10);
  }
  addObstacle(tiles, 10, 10);
  tiles[10][5].obstacle = false;
  const path = pf.findPath(tiles, 5, 5, 5, 15, false);
  assert(path.length > 0, 'Path exists around wall obstacle');
  for (const p of path) {
    assert(tiles[p.y]?.[p.x]?.walkable && !tiles[p.y]?.[p.x]?.obstacle,
      `Path point (${p.x},${p.y}) is walkable`);
  }
}

function testMountainWaterAvoidance(): void {
  console.log('\n--- Test: Mountain/Water Avoidance ---');
  const tiles = createPlainTiles();
  for (let x = 5; x <= 15; x++) {
    addMountain(tiles, x, 5);
    addWater(tiles, x, 6);
  }
  const path = pf.findPath(tiles, 2, 2, 15, 15, false);
  assert(path.length > 0, 'Path exists around mountain/water');
  for (const p of path) {
    const tile = tiles[p.y]?.[p.x];
    assert(tile?.walkable === true, `Point (${p.x},${p.y}) is walkable, not mountain/water`);
  }
}

function testUnreachableTarget(): void {
  console.log('\n--- Test: Unreachable Target ---');
  const tiles = createPlainTiles();
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      addMountain(tiles, x, y);
    }
  }
  tiles[0][0].biome = 'plain';
  tiles[0][0].walkable = true;
  const path = pf.findPath(tiles, 0, 0, 19, 19, false);
  assert(path.length === 0, 'No path when target is completely surrounded');
}

function testPerformanceUnder15ms(): void {
  console.log('\n--- Test: Performance < 15ms on 20x20 ---');
  const tiles = createPlainTiles();
  for (let x = 3; x <= 17; x++) {
    addMountain(tiles, x, 10);
  }
  tiles[10][10].biome = 'plain';
  tiles[10][10].walkable = true;

  const iterations = 50;
  let totalTime = 0;
  let maxTime = 0;

  for (let i = 0; i < iterations; i++) {
    const sx = Math.floor(Math.random() * MAP_WIDTH);
    const sy = Math.floor(Math.random() * MAP_HEIGHT);
    const ex = Math.floor(Math.random() * MAP_WIDTH);
    const ey = Math.floor(Math.random() * MAP_HEIGHT);
    const t0 = performance.now();
    pf.findPath(tiles, sx, sy, ex, ey, false);
    const elapsed = performance.now() - t0;
    totalTime += elapsed;
    maxTime = Math.max(maxTime, elapsed);
  }

  const avgTime = totalTime / iterations;
  console.log(`  Average: ${avgTime.toFixed(3)}ms, Max: ${maxTime.toFixed(3)}ms over ${iterations} runs`);
  assert(maxTime < 15, `Max pathfinding time ${maxTime.toFixed(2)}ms < 15ms`);
  assert(avgTime < 5, `Average pathfinding time ${avgTime.toFixed(2)}ms < 5ms`);
}

function testReroutePerformanceUnder10ms(): void {
  console.log('\n--- Test: Reroute Performance < 10ms ---');
  const tiles = createPlainTiles();
  for (let x = 3; x <= 17; x++) {
    addMountain(tiles, x, 10);
  }
  tiles[10][10].biome = 'plain';
  tiles[10][10].walkable = true;

  addObstacle(tiles, 10, 5);
  addObstacle(tiles, 11, 5);
  addObstacle(tiles, 12, 5);

  const iterations = 50;
  let totalTime = 0;
  let maxTime = 0;

  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    pf.findPath(tiles, 5, 5, 15, 15, true);
    const elapsed = performance.now() - t0;
    totalTime += elapsed;
    maxTime = Math.max(maxTime, elapsed);
  }

  const avgTime = totalTime / iterations;
  console.log(`  Reroute Average: ${avgTime.toFixed(3)}ms, Max: ${maxTime.toFixed(3)}ms over ${iterations} runs`);
  assert(maxTime < 10, `Max reroute time ${maxTime.toFixed(2)}ms < 10ms`);
}

function testDynamicObstacleReroute(): void {
  console.log('\n--- Test: Dynamic Obstacle Reroute ---');
  const tiles = createPlainTiles();
  const path1 = pf.findPath(tiles, 0, 0, 19, 0, false);
  assert(path1.length > 0, 'Path exists without obstacles');

  for (let x = 5; x <= 15; x++) {
    addObstacle(tiles, x, 0);
  }
  const path2 = pf.findPath(tiles, 0, 0, 19, 0, true);
  assert(path2.length > 0, 'Rerouted path exists around obstacles');
  for (const p of path2) {
    assert(!tiles[p.y]?.[p.x]?.obstacle, `Rerouted point (${p.x},${p.y}) avoids obstacle`);
  }
  let path2GridLen = 0;
  for (let i = 1; i < path2.length; i++) {
    path2GridLen += Math.max(Math.abs(path2[i].x - path2[i-1].x), Math.abs(path2[i].y - path2[i-1].y));
  }
  let path1GridLen = 0;
  for (let i = 1; i < path1.length; i++) {
    path1GridLen += Math.max(Math.abs(path1[i].x - path1[i-1].x), Math.abs(path1[i].y - path1[i-1].y));
  }
  assert(path2GridLen >= path1GridLen, 'Rerouted path grid distance >= direct path');
}

function testOutOfBoundReturns(): void {
  console.log('\n--- Test: Out of Bounds ---');
  const tiles = createPlainTiles();
  assert(pf.findPath(tiles, -1, 0, 5, 5, false).length === 0, 'Negative start X returns empty');
  assert(pf.findPath(tiles, 0, 0, 25, 25, false).length === 0, 'Out of bounds end returns empty');
}

console.log('========================================');
console.log('  A* Pathfinder Unit Tests');
console.log('========================================');

testBasicPathfinding();
testSameStartEnd();
testObstacleAvoidance();
testMountainWaterAvoidance();
testUnreachableTarget();
testPerformanceUnder15ms();
testReroutePerformanceUnder10ms();
testDynamicObstacleReroute();
testOutOfBoundReturns();

console.log('\n========================================');
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
