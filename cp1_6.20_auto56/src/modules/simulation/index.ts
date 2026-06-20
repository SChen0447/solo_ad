import { PedestrianFlow } from './PedestrianFlow.js';
import { TrafficController } from './TrafficController.js';

export class SimulationModule {
  private eventTarget: EventTarget;
  private pedestrianFlow: PedestrianFlow;
  private trafficController: TrafficController;
  private isRunning = false;
  private pedestrianTimer: number | null = null;
  private simulatedHour: number = 12;

  constructor() {
    this.eventTarget = new EventTarget();
    this.pedestrianFlow = new PedestrianFlow();
    this.trafficController = new TrafficController();
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    this.runPedestrianSimulation();
    this.pedestrianTimer = window.setInterval(() => {
      this.runPedestrianSimulation();
    }, 2000);
  }

  stop(): void {
    this.isRunning = false;
    if (this.pedestrianTimer !== null) {
      clearInterval(this.pedestrianTimer);
      this.pedestrianTimer = null;
    }
  }

  private runPedestrianSimulation(): void {
    const data = this.pedestrianFlow.generate(this.simulatedHour);
    const event = new CustomEvent('dataUpdated', { detail: data });
    this.eventTarget.dispatchEvent(event);
  }

  setSimulatedHour(hour: number): void {
    this.simulatedHour = hour;
  }

  on(type: string, callback: EventListenerOrEventListenerObject): void {
    this.eventTarget.addEventListener(type, callback);
  }

  off(type: string, callback: EventListenerOrEventListenerObject): void {
    this.eventTarget.removeEventListener(type, callback);
  }

  getTrafficController(): TrafficController {
    return this.trafficController;
  }
}
