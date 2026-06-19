import { FleetManager, FleetData } from './fleet/FleetManager';
import { PlacedShip, ShipType, SHIP_PRESETS } from './fleet/ShipConfig';
import { BattleEngine, BattleState, BattleEvent } from './battle/BattleEngine';
import { Renderer } from './battle/Renderer';
import { BattleReport } from './battle/BattleReport';
import { ShipEntity } from './battle/AIController';

type Scene = 'fleet' | 'battle' | 'report';

class App {
  private root: HTMLElement;
  private fleetManager: FleetManager;
  private battleReport: BattleReport;
  private currentScene: Scene = 'fleet';
  private battleEngine: BattleEngine | null = null;
  private renderer: Renderer | null = null;
  private battleCanvas: HTMLCanvasElement | null = null;
  private battleLastTime = 0;
  private battleRafId: number | null = null;
  private playBackSpeed = 1;

  constructor() {
    const el = document.getElementById('app');
    if (!el) throw new Error('Root #app not found');
    this.root = el;
    this.fleetManager = new FleetManager();
    this.battleReport = new BattleReport();
    this.battleReport.setCallbacks(
      () => this.switchScene('fleet'),
      (speed) => this.startPlayback(speed)
    );
    this.switchScene('fleet');
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  private handleResize(): void {
    if (this.currentScene === 'battle' && this.battleCanvas) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.battleCanvas.width = w;
      this.battleCanvas.height = h;
      if (this.renderer) this.renderer.resize(w, h);
    }
  }

  switchScene(scene: Scene): void {
    this.stopBattleLoop();
    this.currentScene = scene;
    this.root.innerHTML = '';
    if (scene === 'fleet') {
      this.renderFleetScene();
    } else if (scene === 'battle') {
      this.renderBattleScene(false, this.playBackSpeed);
    } else if (scene === 'report') {
      this.renderReportScene();
    }
  }

  private renderFleetScene(): void {
    this.fleetManager.render(this.root, () => this.switchScene('battle'));
  }

  private generateEnemyFleet(player: FleetData): PlacedShip[] {
    const types: ShipType[] = [ShipType.Frigate, ShipType.Destroyer, ShipType.Cruiser, ShipType.Battleship, ShipType.Carrier];
    const ships: PlacedShip[] = [];
    const count = Math.max(5, Math.min(8, player.ships.length));
    let id = 0;
    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const preset = SHIP_PRESETS[type];
      const gridX = Math.floor(Math.random() * 12);
      const gridY = Math.floor(Math.random() * 10);
      ships.push({
        id: `e_${id++}`,
        type,
        gridX,
        gridY,
        facing: 180,
        name: preset.name + '-E' + id,
        stats: { ...preset.stats }
      });
    }
    return ships;
  }

  private renderBattleScene(playback: boolean, speed: number = 1): void {
    this.playBackSpeed = speed;
    const w = window.innerWidth;
    const h = window.innerHeight;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.style.cssText = 'position:absolute;inset:0;display:block;';
    this.battleCanvas = canvas;
    this.root.appendChild(canvas);

    const battleContainer = document.createElement('div');
    battleContainer.style.cssText = 'position:absolute;inset:0;';
    battleContainer.appendChild(canvas);
    this.root.appendChild(battleContainer);

    this.battleEngine = new BattleEngine(w, h);
    this.battleEngine.setSpeed(speed);
    this.renderer = new Renderer(canvas, w, h);

    const playerFleet = this.fleetManager.getFleet();
    const enemyFleet = this.generateEnemyFleet(playerFleet);
    this.battleEngine.initFleets(playerFleet.ships, enemyFleet);

    this.battleEngine.onEnd = (state, events) => {
      this.battleReport.generate(
        this.battleEngine!.state.ships,
        events,
        state.time,
        state.winner || 'draw'
      );
      setTimeout(() => this.switchScene('report'), 2400);
    };

    this.renderer.renderBattleOverlay(
      this.battleEngine.state,
      battleContainer,
      () => this.togglePause(),
      (s) => this.battleEngine?.setSpeed(s),
      () => this.switchScene('fleet')
    );

    this.battleLastTime = performance.now();
    this.runBattleLoop();
  }

  private startPlayback(speed: number): void {
    const report = this.battleReport.getReport();
    if (!report) return;
    this.switchScene('battle');
    setTimeout(() => {
      if (this.battleEngine) this.battleEngine.setSpeed(speed);
    }, 100);
  }

  private renderReportScene(): void {
    this.battleReport.render(this.root);
  }

  private togglePause(): void {
    if (!this.battleEngine) return;
    this.battleEngine.setPaused(!this.battleEngine.state.paused);
    this.renderer?.updateBattleOverlay(this.battleEngine.state);
  }

  private runBattleLoop(): void {
    const loop = (now: number) => {
      if (!this.battleEngine || !this.renderer || !this.battleCanvas) return;
      const dt = Math.min(0.05, (now - this.battleLastTime) / 1000);
      this.battleLastTime = now;
      this.battleEngine.update(dt);
      this.renderer.render(this.battleEngine.state, dt);
      this.renderer.updateBattleOverlay(this.battleEngine.state);
      this.battleRafId = requestAnimationFrame(loop);
    };
    this.battleRafId = requestAnimationFrame(loop);
  }

  private stopBattleLoop(): void {
    if (this.battleRafId !== null) {
      cancelAnimationFrame(this.battleRafId);
      this.battleRafId = null;
    }
  }
}

const app = new App();
