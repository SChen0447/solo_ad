import { World } from './World';
import { UIController } from './UIController';
import { CityStats } from './StatsPanel';

function bootstrap(): void {
  const appContainer = document.getElementById('app');
  if (!appContainer) {
    console.error('Container #app not found');
    return;
  }

  const world = new World(appContainer);
  const ui = new UIController();

  ui.setBuildingManager(world.getBuildingManager());

  ui.onViewModeChange = (mode) => {
    world.setViewMode(mode);
  };

  ui.onTimeChange = (hour) => {
    world.setDayNightTime(hour);
  };

  ui.onRequestCityStats = (): CityStats => {
    const bm = world.getBuildingManager();
    return {
      buildingCount: bm.getBuildingCount(),
      maxHeight: bm.getMaxHeight(),
      timeOfDay: ui.getCurrentHour()
    };
  };

  world.setDayNightTime(ui.getCurrentHour());
  world.setViewMode(ui.getViewMode());

  const seedBuildings = [
    { x: -60, z: -30, style: 'modern' as const, h: 45 },
    { x: -30, z: -60, style: 'classic' as const, h: 35 },
    { x: 20, z: -50, style: 'futuristic' as const, h: 55 },
    { x: 60, z: -20, style: 'modern' as const, h: 70 },
    { x: 50, z: 30, style: 'classic' as const, h: 28 },
    { x: -10, z: 10, style: 'futuristic' as const, h: 65 },
    { x: -70, z: 40, style: 'modern' as const, h: 50 },
    { x: 0, z: 70, style: 'classic' as const, h: 40 },
    { x: 80, z: 60, style: 'futuristic' as const, h: 75 }
  ];
  seedBuildings.forEach(sb => {
    world.getBuildingManager().createBuilding(
      { x: sb.x, y: 0, z: sb.z } as any,
      sb.style,
      sb.h
    );
  });

  let prevTime = performance.now();
  let running = true;

  function animate(): void {
    if (!running) return;
    requestAnimationFrame(animate);

    const now = performance.now();
    let delta = (now - prevTime) / 1000;
    prevTime = now;
    delta = Math.min(delta, 0.1);

    world.update(delta, now);
    ui.tick(now);
    world.render();
  }

  animate();

  window.addEventListener('beforeunload', () => {
    running = false;
    world.dispose();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
