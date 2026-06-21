import * as THREE from 'three';
import { AudioEngine } from '../core/AudioEngine';
import { Scene3D, Instrument3DObject } from '../core/Scene3D';

export class InstrumentManager {
  private container: HTMLElement | null = null;
  private audioEngine: AudioEngine | null = null;
  private scene3D: Scene3D | null = null;
  
  private draggedInstrument: Instrument3DObject | null = null;
  private isDragging: boolean = false;
  private dragOffset: THREE.Vector3 = new THREE.Vector3();
  
  private onInstrumentPlacedCallback: ((id: string, position: THREE.Vector3) => void) | null = null;
  private onStageClickListener: ((position: THREE.Vector3) => void) | null = null;
  
  init(
    container: HTMLElement,
    audioEngine: AudioEngine,
    scene3D: Scene3D
  ): void {
    this.container = container;
    this.audioEngine = audioEngine;
    this.scene3D = scene3D;
    
    this.addEventListeners();
  }
  
  private addEventListeners(): void {
    const canvas = this.scene3D?.getDomElement();
    if (!canvas) return;
    
    canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    canvas.addEventListener('pointermove', this.handlePointerMove.bind(this));
    canvas.addEventListener('pointerup', this.handlePointerUp.bind(this));
    canvas.addEventListener('pointerleave', this.handlePointerUp.bind(this));
    
    canvas.style.touchAction = 'none';
  }
  
  private handlePointerDown(e: PointerEvent): void {
    if (!this.scene3D || !this.container) return;
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const instrument = this.scene3D.getInstrumentAtScreen(x, y);
    
    if (instrument) {
      this.startDragging(instrument, x, y);
      e.preventDefault();
    } else {
      const stagePoint = this.scene3D.getStagePointFromScreen(x, y);
      if (stagePoint && this.onStageClickListener) {
        this.onStageClickListener(stagePoint);
      }
    }
  }
  
  private startDragging(instrument: Instrument3DObject, x: number, y: number): void {
    if (!this.scene3D || !this.audioEngine) return;
    
    this.draggedInstrument = instrument;
    this.isDragging = true;
    
    const stagePos = this.scene3D.getStagePointFromScreen(x, y);
    if (stagePos) {
      this.dragOffset.copy(instrument.group.position).sub(stagePos);
    }
    
    this.scene3D.setInstrumentDragging(instrument.id, true);
    
    if (this.audioEngine.isInstrumentPlaying(instrument.id)) {
      this.audioEngine.stopNote(instrument.id);
    }
    
    document.body.style.cursor = 'grabbing';
  }
  
  private handlePointerMove(e: PointerEvent): void {
    if (!this.isDragging || !this.draggedInstrument || !this.scene3D) return;
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const stagePos = this.scene3D.getStagePointFromScreen(x, y);
    if (stagePos) {
      const newPosition = stagePos.clone().add(this.dragOffset);
      
      this.scene3D.moveInstrument(this.draggedInstrument.id, newPosition, false);
      this.scene3D.updateTrail(this.draggedInstrument.id, newPosition);
      
      if (this.audioEngine) {
        const currentPos = this.scene3D.getInstrumentPosition(this.draggedInstrument.id);
        if (currentPos) {
          this.audioEngine.updatePosition(this.draggedInstrument.id, currentPos);
        }
      }
    }
    
    e.preventDefault();
  }
  
  private handlePointerUp(e: PointerEvent): void {
    if (!this.isDragging || !this.draggedInstrument || !this.scene3D || !this.audioEngine) return;
    
    const instrument = this.draggedInstrument;
    
    this.isDragging = false;
    this.draggedInstrument = null;
    
    this.scene3D.setInstrumentDragging(instrument.id, false);
    
    const currentPos = this.scene3D.getInstrumentPosition(instrument.id);
    if (currentPos) {
      this.audioEngine.updatePosition(instrument.id, currentPos);
      this.audioEngine.playNote(instrument.id);
      
      if (this.onInstrumentPlacedCallback) {
        this.onInstrumentPlacedCallback(instrument.id, currentPos);
      }
    }
    
    document.body.style.cursor = 'default';
    
    e.preventDefault();
  }
  
  setOnInstrumentPlacedCallback(callback: (id: string, position: THREE.Vector3) => void): void {
    this.onInstrumentPlacedCallback = callback;
  }
  
  setOnStageClickListener(callback: (position: THREE.Vector3) => void): void {
    this.onStageClickListener = callback;
  }
  
  destroy(): void {
    const canvas = this.scene3D?.getDomElement();
    if (canvas) {
      canvas.removeEventListener('pointerdown', this.handlePointerDown.bind(this));
      canvas.removeEventListener('pointermove', this.handlePointerMove.bind(this));
      canvas.removeEventListener('pointerup', this.handlePointerUp.bind(this));
      canvas.removeEventListener('pointerleave', this.handlePointerUp.bind(this));
    }
  }
}
