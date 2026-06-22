import { generateDungeon } from './modules/dungeon-generator';
import { spawnEntities } from './modules/entity-spawner';
import { GameEngine } from './core/engine';

function main(): void {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas element #game not found');
  }

  const seed = Date.now();

  const dungeon = generateDungeon(seed);
  console.log(`Dungeon generated with ${dungeon.rooms.length} rooms`);

  const { player, enemies } = spawnEntities(dungeon, seed);
  console.log(`Spawned player at (${player.x.toFixed(1)}, ${player.y.toFixed(1)})`);
  console.log(`Spawned ${enemies.length} enemies`);

  enemies.forEach((enemy, index) => {
    console.log(`Enemy ${index} path has ${enemy.patrolPath.length} waypoints`);
  });

  const game = new GameEngine(canvas);
  game.start();

  console.log('=== Roguelike Dungeon System Initialized ===');
  console.log('Controls: WASD or Arrow keys to move');
  console.log('Press R to regenerate dungeon');
}

main();
