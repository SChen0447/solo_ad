import { ThreeScene } from './ThreeScene';
import { NeuronManager } from './NeuronManager';
import { SignalSimulator } from './SignalSimulator';
import { UIPanel } from './UIPanel';
import * as THREE from 'three';

function bootstrap(): void {
  const container = document.getElementById('app');
  if (!container) {
    console.error('Container #app not found');
    return;
  }

  const threeScene = new ThreeScene(container);
  const neuronManager = new NeuronManager(threeScene);
  const signalSimulator = new SignalSimulator(threeScene, neuronManager);
  new UIPanel(container, neuronManager, signalSimulator);

  createDemoNetwork(neuronManager, signalSimulator);

  (window as any).__neuralVisualizer = {
    threeScene,
    neuronManager,
    signalSimulator,
  };
}

function createDemoNetwork(
  neuronManager: NeuronManager,
  signalSimulator: SignalSimulator
): void {
  const n1 = neuronManager.createNeuron(new THREE.Vector3(-8, 1.2, -4), 'sensory', 0.65);
  const n2 = neuronManager.createNeuron(new THREE.Vector3(-8, 1.2, 4), 'sensory', 0.65);
  const n3 = neuronManager.createNeuron(new THREE.Vector3(-2, 2.8, 0), 'inter', 0.75);
  const n4 = neuronManager.createNeuron(new THREE.Vector3(4, 1.5, -3), 'inter', 0.6);
  const n5 = neuronManager.createNeuron(new THREE.Vector3(4, 3.2, 3), 'inter', 0.7);
  const n6 = neuronManager.createNeuron(new THREE.Vector3(10, 2.0, 0), 'motor', 0.7);
  const n7 = neuronManager.createNeuron(new THREE.Vector3(0, 4.5, 0), 'inter', 0.55);

  neuronManager.createConnection(n1.id, n3.id, 1.0);
  neuronManager.createConnection(n2.id, n3.id, 1.0);
  neuronManager.createConnection(n3.id, n4.id, 0.9);
  neuronManager.createConnection(n3.id, n5.id, 1.1);
  neuronManager.createConnection(n3.id, n7.id, 0.7);
  neuronManager.createConnection(n7.id, n5.id, 0.8);
  neuronManager.createConnection(n4.id, n6.id, 1.0);
  neuronManager.createConnection(n5.id, n6.id, 1.2);
  neuronManager.createConnection(n7.id, n4.id, 0.6);

  setTimeout(() => {
    signalSimulator.triggerSignal(n1.id);
  }, 1200);

  setTimeout(() => {
    signalSimulator.triggerSignal(n2.id);
  }, 2000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
