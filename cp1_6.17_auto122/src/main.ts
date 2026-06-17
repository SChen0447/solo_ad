import { Simulation } from './simulation';
import { Renderer } from './render';
import type { Planet, Asteroid } from './simulation';

interface AppState {
  selectedPlanetId: string | null;
  selectedAsteroidId: string | null;
}

class App {
  private simulation: Simulation;
  private renderer: Renderer;
  private canvas: HTMLCanvasElement;
  private state: AppState;
  private lastTime: number;
  private frameCount: number;
  private fps: number;
  private fpsUpdateTime: number;
  private animationId: number | null;

  private uiElements: {
    fpsValue: HTMLElement;
    planetName: HTMLElement;
    planetDetails: HTMLElement;
    sunMass: HTMLInputElement;
    sunMassValue: HTMLElement;
    planetMass: HTMLInputElement;
    planetMassValue: HTMLElement;
    gConstant: HTMLInputElement;
    gValue: HTMLElement;
    asteroidVelX: HTMLInputElement;
    velXValue: HTMLElement;
    asteroidVelY: HTMLInputElement;
    velYValue: HTMLElement;
    resetBtn: HTMLButtonElement;
    asteroidPopup: HTMLElement;
  };

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.simulation = new Simulation(window.innerWidth, window.innerHeight);
    this.renderer = new Renderer(this.canvas);
    this.state = {
      selectedPlanetId: null,
      selectedAsteroidId: null
    };
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.fps = 60;
    this.fpsUpdateTime = 0;
    this.animationId = null;

    this.uiElements = this.getUIElements();
    this.setupEventListeners();
    this.resize();
    this.updateUIFromSimulation();
  }

  private getUIElements() {
    const getElement = (id: string) => {
      const el = document.getElementById(id);
      if (!el) {
        throw new Error(`找不到元素: ${id}`);
      }
      return el;
    };

    const getInputElement = (id: string) => {
      const el = document.getElementById(id) as HTMLInputElement;
      if (!el) {
        throw new Error(`找不到输入元素: ${id}`);
      }
      return el;
    };

    return {
      fpsValue: getElement('fpsValue'),
      planetName: getElement('planetName'),
      planetDetails: getElement('planetDetails'),
      sunMass: getInputElement('sunMass'),
      sunMassValue: getElement('sunMassValue'),
      planetMass: getInputElement('planetMass'),
      planetMassValue: getElement('planetMassValue'),
      gConstant: getInputElement('gConstant'),
      gValue: getElement('gValue'),
      asteroidVelX: getInputElement('asteroidVelX'),
      velXValue: getElement('velXValue'),
      asteroidVelY: getInputElement('asteroidVelY'),
      velYValue: getElement('velYValue'),
      resetBtn: getElement('resetBtn') as HTMLButtonElement,
      asteroidPopup: getElement('asteroidPopup')
    };
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

    this.uiElements.sunMass.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.simulation.setConfig('sunMass', value);
      this.uiElements.sunMassValue.textContent = value.toString();
    });

    this.uiElements.planetMass.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.uiElements.planetMassValue.textContent = value.toString();
      if (this.state.selectedPlanetId) {
        this.simulation.setPlanetMass(this.state.selectedPlanetId, value);
        this.updatePlanetInfo();
      }
    });

    this.uiElements.gConstant.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.simulation.setConfig('G', value);
      this.uiElements.gValue.textContent = value.toFixed(2);
    });

    this.uiElements.asteroidVelX.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.simulation.setConfig('asteroidInitialVelX', value);
      this.uiElements.velXValue.textContent = value.toFixed(1);
    });

    this.uiElements.asteroidVelY.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.simulation.setConfig('asteroidInitialVelY', value);
      this.uiElements.velYValue.textContent = value.toFixed(1);
    });

    this.uiElements.resetBtn.addEventListener('click', () => {
      this.simulation.clearAsteroids();
      this.state.selectedAsteroidId = null;
      this.hideAsteroidPopup();
    });
  }

  private handleCanvasClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedPlanet = this.simulation.findPlanetAtPosition(x, y);
    if (clickedPlanet) {
      this.selectPlanet(clickedPlanet);
      return;
    }

    const clickedAsteroid = this.simulation.findAsteroidAtPosition(x, y);
    if (clickedAsteroid) {
      this.selectAsteroid(clickedAsteroid);
      return;
    }

    this.simulation.addAsteroid(x, y);
    this.state.selectedAsteroidId = null;
    this.hideAsteroidPopup();
  }

  private selectPlanet(planet: Planet): void {
    this.state.selectedPlanetId = planet.id;
    this.state.selectedAsteroidId = null;
    this.hideAsteroidPopup();

    this.uiElements.planetMass.value = planet.mass.toString();
    this.uiElements.planetMassValue.textContent = planet.mass.toString();

    this.updatePlanetInfo();
  }

  private selectAsteroid(asteroid: Asteroid): void {
    this.state.selectedAsteroidId = asteroid.id;
    this.state.selectedPlanetId = null;
    this.showAsteroidPopup(asteroid);
  }

  private updatePlanetInfo(): void {
    if (!this.state.selectedPlanetId) {
      this.uiElements.planetName.textContent = '未选中行星';
      this.uiElements.planetDetails.innerHTML = '<span style="color: #888; font-style: italic;">点击行星查看详细信息</span>';
      return;
    }

    const planet = this.simulation.getPlanets().find(p => p.id === this.state.selectedPlanetId);
    if (!planet) return;

    const perihelion = this.simulation.getPlanetPerihelion(planet);
    const aphelion = this.simulation.getPlanetAphelion(planet);
    const speed = Math.sqrt(planet.velocity.x ** 2 + planet.velocity.y ** 2);

    this.uiElements.planetName.textContent = planet.name;
    this.uiElements.planetDetails.innerHTML = `
      <p>质量: <span class="value">${planet.mass.toFixed(1)}</span></p>
      <p>公转半径: <span class="value">${planet.orbitRadius.toFixed(0)} px</span></p>
      <p>公转速度: <span class="value">${speed.toFixed(2)} px/frame</span></p>
      <p>轨道倾角: <span class="value">${(planet.inclination * 180 / Math.PI).toFixed(2)}°</span></p>
      <p>近日点: <span class="value">${perihelion.toFixed(1)} px</span></p>
      <p>远日点: <span class="value">${aphelion.toFixed(1)} px</span></p>
    `;
  }

  private showAsteroidPopup(asteroid: Asteroid): void {
    this.uiElements.asteroidPopup.style.display = 'block';
    this.updateAsteroidPopupContent(asteroid);
  }

  private hideAsteroidPopup(): void {
    this.uiElements.asteroidPopup.style.display = 'none';
  }

  private updateAsteroidPopupContent(asteroid: Asteroid): void {
    const popup = this.uiElements.asteroidPopup;
    
    popup.innerHTML = `
      <p><span class="label">位置:</span> <span class="value">(${asteroid.position.x.toFixed(1)}, ${asteroid.position.y.toFixed(1)})</span></p>
      <p><span class="label">速度:</span> <span class="value">(${asteroid.velocity.x.toFixed(2)}, ${asteroid.velocity.y.toFixed(2)})</span></p>
      <p><span class="label">合引力:</span> <span class="value">${asteroid.totalForceMagnitude.toFixed(4)}</span></p>
    `;

    popup.style.left = `${asteroid.position.x + 20}px`;
    popup.style.top = `${asteroid.position.y - 20}px`;
  }

  private updateUIFromSimulation(): void {
    const config = this.simulation.getConfig();
    this.uiElements.sunMass.value = config.sunMass.toString();
    this.uiElements.sunMassValue.textContent = config.sunMass.toString();
    this.uiElements.gConstant.value = config.G.toString();
    this.uiElements.gValue.textContent = config.G.toFixed(2);
    this.uiElements.asteroidVelX.value = config.asteroidInitialVelX.toString();
    this.uiElements.velXValue.textContent = config.asteroidInitialVelX.toFixed(1);
    this.uiElements.asteroidVelY.value = config.asteroidInitialVelY.toString();
    this.uiElements.velYValue.textContent = config.asteroidInitialVelY.toFixed(1);
  }

  private resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.resize(width, height);
    this.simulation.resize(width, height);
  }

  private updateFPS(currentTime: number): void {
    this.frameCount++;
    const elapsed = currentTime - this.fpsUpdateTime;

    if (elapsed >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;
      this.uiElements.fpsValue.textContent = this.fps.toString();
    }
  }

  private gameLoop = (currentTime: number): void => {
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    const fixedDelta = 1 / 60;
    void deltaTime;
    this.simulation.update(fixedDelta);

    const renderState = {
      sun: this.simulation.getSun(),
      planets: this.simulation.getPlanets(),
      asteroids: this.simulation.getAsteroids(),
      selectedPlanetId: this.state.selectedPlanetId,
      selectedAsteroidId: this.state.selectedAsteroidId,
      getPlanetOrbitPoints: (planet: Planet) => this.simulation.getPlanetOrbitPoints(planet),
      getInfluenceRadius: (planet: Planet) => this.simulation.getInfluenceRadius(planet),
      isInPlanetInfluence: (asteroid: Asteroid, planet: Planet) =>
        this.simulation.isInPlanetInfluence(asteroid, planet)
    };

    this.renderer.render(renderState);

    if (this.state.selectedAsteroidId) {
      const asteroid = this.simulation.getAsteroids().find(a => a.id === this.state.selectedAsteroidId);
      if (asteroid) {
        this.updateAsteroidPopupContent(asteroid);
      } else {
        this.state.selectedAsteroidId = null;
        this.hideAsteroidPopup();
      }
    }

    this.updateFPS(currentTime);

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  public start(): void {
    this.lastTime = performance.now();
    this.fpsUpdateTime = this.lastTime;
    this.animationId = requestAnimationFrame(this.gameLoop);
  }

  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.start();
});
