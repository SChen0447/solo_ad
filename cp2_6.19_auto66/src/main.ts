import { SimulationEngine } from './SimulationEngine';
import { Renderer3D } from './Renderer3D';
import { UIControls } from './controls/UIControls';
import './styles.css';

class App {
  private engine: SimulationEngine;
  private renderer: Renderer3D;

  constructor() {
    this.engine = new SimulationEngine();
    this.renderer = new Renderer3D('app', this.engine);
    new UIControls(this.engine, this.renderer);

    this.renderer.animate();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
