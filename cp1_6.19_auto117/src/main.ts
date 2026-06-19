import { RenderEngine, type PlanetMesh } from './core/RenderEngine';
import { UIPanel } from './ui/UIPanel';
import { loadAllCelestialData, type PlanetData } from './data/CelestialData';

async function init(): Promise<void> {
  const canvas = document.getElementById('canvas3d') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas element not found');
  }

  const renderEngine = new RenderEngine({ canvas });
  const uiPanel = new UIPanel();

  const celestialData = await loadAllCelestialData();

  renderEngine.createStars(celestialData.stars);
  renderEngine.createPlanets(celestialData.planets);
  renderEngine.createNebulae(celestialData.nebulae);

  renderEngine.setOnPlanetClick((planetData: PlanetData) => {
    uiPanel.showPanel(planetData);
  });

  uiPanel.onClose = () => {
  };

  uiPanel.onSpeedChange = (speed: number) => {
    renderEngine.setTimeScale(speed);
  };

  renderEngine.setOnCameraUpdate(() => {
    updateMinimap();
  });

  function updateMinimap(): void {
    const planets = renderEngine.getPlanets();
    const cameraInfo = renderEngine.getCameraInfo();

    const planetPositions = planets.map((planet: PlanetMesh) => ({
      id: planet.userData.planetData.id,
      x: planet.position.x,
      y: planet.position.y,
      z: planet.position.z,
      color: planet.userData.planetData.color
    }));

    uiPanel.updateMinimap(planetPositions, cameraInfo.theta, cameraInfo.phi);
  }

  renderEngine.start();

  updateMinimap();

  window.addEventListener('beforeunload', () => {
    renderEngine.dispose();
  });
}

init().catch((error) => {
  console.error('Failed to initialize cosmic star map:', error);
});
