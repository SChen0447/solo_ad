import * as THREE from 'three';
import { SceneSetup } from './engine/SceneSetup';
import { NodeManager } from './engine/NodeManager';
import { ConnectionManager } from './engine/ConnectionManager';
import { PathAnimator } from './animation/PathAnimator';
import { ControlPanel } from './ui/ControlPanel';
import { eventBus } from './core/EventBus';

class App {
  private sceneSetup: SceneSetup;
  private nodeManager: NodeManager;
  private connectionManager: ConnectionManager;
  private pathAnimator: PathAnimator;
  private controlPanel: ControlPanel;
  private animationId: number = 0;

  constructor() {
    const container = document.getElementById('canvas-container')!;

    this.sceneSetup = new SceneSetup(container);
    (this.sceneSetup.scene as unknown as { userData: { camera?: THREE.Camera } }).userData.camera =
      this.sceneSetup.camera;
    this.nodeManager = new NodeManager(
      this.sceneSetup.scene,
      this.sceneSetup.camera,
      this.sceneSetup.renderer
    );
    this.connectionManager = new ConnectionManager(this.sceneSetup.scene);
    this.connectionManager.setCamera(this.sceneSetup.camera);
    this.pathAnimator = new PathAnimator(this.sceneSetup.scene);
    this.controlPanel = new ControlPanel();

    this.bindInternalEvents();
    this.animate();

    window.addEventListener('resize', () => this.sceneSetup.onResize());
  }

  private bindInternalEvents(): void {
    eventBus.on('node:created', (data) => {
      this.controlPanel.updateStats();
      this.pathAnimator.onNodeCreated(data);
    });

    eventBus.on('node:deleted', (data) => {
      this.connectionManager.onNodeDeleted(data);
      this.controlPanel.updateStats();
      this.pathAnimator.onNodeDeleted(data);
    });

    eventBus.on('node:selected', (data) => {
      this.connectionManager.onNodeSelected(data);
    });

    eventBus.on('connection:created', (data) => {
      this.controlPanel.updateStats();
      this.pathAnimator.onConnectionCreated(data);
    });

    eventBus.on('connection:deleted', () => {
      this.controlPanel.updateStats();
    });

    eventBus.on('node:flash', (data) => {
      this.nodeManager.flashNode(data);
    });

    eventBus.on('ui:request-stats', () => {
      eventBus.emit('stats:update', {
        nodeCount: this.nodeManager.getNodeCount(),
        connectionCount: this.connectionManager.getConnectionCount()
      });
    });

    eventBus.on('ui:request-constellation', () => {
      const data = {
        nodes: this.nodeManager.getAllNodesData(),
        connections: this.connectionManager.getAllConnectionsData()
      };
      eventBus.emit('constellation:data', data);
    });

    eventBus.on('ui:request-nodelist', () => {
      eventBus.emit('nodelist:update', this.nodeManager.getAllNodesData());
    });

    eventBus.on('ui:delete-node', (data) => {
      this.nodeManager.deleteNodeById((data as { id: string }).id);
    });

    this.nodeManager.init();
    this.connectionManager.init();
    this.pathAnimator.init();
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.sceneSetup.update();
    this.nodeManager.update();
    this.connectionManager.update();
    this.pathAnimator.update();
    this.sceneSetup.render();
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
