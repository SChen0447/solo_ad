import { create } from 'zustand';
import { DeliverySimulation } from '../simulation/DeliverySimulation';
import type {
  SimulationState,
  SchedulingStrategy,
  Vector3,
} from '../types';

let simulation: DeliverySimulation | null = null;

function getSimulation(): DeliverySimulation {
  if (!simulation) {
    simulation = new DeliverySimulation();
    simulation.startInitialAssignments();
  }
  return simulation;
}

export const useSimulationStore = create<SimulationState>((set, get) => {
  const sim = getSimulation();

  return {
    strategy: 'astar',
    speedMultiplier: 1,
    isRunning: true,
    drones: sim.getDrones(),
    packages: sim.getPackages(),
    deliveryCenters: sim.getDeliveryCenters(),
    buildings: sim.getBuildings(),
    particles: sim.getParticles(),
    statistics: sim.getStatistics(),
    cameraAngle: 0,

    setStrategy: (strategy: SchedulingStrategy) => {
      const sim = getSimulation();
      sim.setStrategy(strategy);
      set({
        strategy,
        drones: sim.getDrones(),
        packages: sim.getPackages(),
      });
    },

    setSpeedMultiplier: (speed: number) => {
      const sim = getSimulation();
      sim.setSpeedMultiplier(speed);
      set({ speedMultiplier: speed });
    },

    toggleRunning: () => {
      set((state) => ({ isRunning: !state.isRunning }));
    },

    generateNewTasks: (count: number) => {
      const sim = getSimulation();
      sim.generateNewTasks(count);
      set({
        packages: sim.getPackages(),
        drones: sim.getDrones(),
      });
    },

    updateSimulation: (deltaTime: number) => {
      const state = get();
      if (!state.isRunning) return;

      const sim = getSimulation();
      sim.update(deltaTime);

      set({
        drones: sim.getDrones(),
        packages: sim.getPackages(),
        particles: sim.getParticles(),
        statistics: sim.getStatistics(),
      });
    },

    addParticleEffect: (position: Vector3, color: string) => {
      const sim = getSimulation();
      sim.addParticleEffect(position, color);
      set({ particles: sim.getParticles() });
    },

    setCameraAngle: (angle: number) => {
      set({ cameraAngle: angle });
    },
  };
});
