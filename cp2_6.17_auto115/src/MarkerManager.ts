export interface Marker {
  id: string;
  time: number;
  note: string;
}

type MarkerChangeListener = (markers: Marker[]) => void;
type MarkerSelectListener = (markerId: string | null) => void;

export class MarkerManager {
  private markers: Marker[] = [];
  private maxMarkers: number = 100;
  private changeListeners: MarkerChangeListener[] = [];
  private selectListeners: MarkerSelectListener[] = [];
  private selectedMarkerId: string | null = null;
  private draggingMarkerId: string | null = null;

  constructor(initialMarkers: Marker[] = []) {
    this.markers = [...initialMarkers];
  }

  addMarker(time: number, note: string = ''): Marker | null {
    if (this.markers.length >= this.maxMarkers) {
      return null;
    }

    const id = this.generateId();
    const marker: Marker = {
      id,
      time,
      note
    };

    this.markers.push(marker);
    this.markers.sort((a, b) => a.time - b.time);
    this.notifyChange();
    return marker;
  }

  removeMarker(id: string): boolean {
    const index = this.markers.findIndex(m => m.id === id);
    if (index === -1) return false;

    this.markers.splice(index, 1);
    if (this.selectedMarkerId === id) {
      this.setSelectedMarker(null);
    }
    this.notifyChange();
    return true;
  }

  updateMarkerNote(id: string, note: string): boolean {
    const marker = this.markers.find(m => m.id === id);
    if (!marker) return false;

    marker.note = note;
    this.notifyChange();
    return true;
  }

  updateMarkerTime(id: string, time: number): boolean {
    const marker = this.markers.find(m => m.id === id);
    if (!marker) return false;

    marker.time = Math.max(0, time);
    this.markers.sort((a, b) => a.time - b.time);
    this.notifyChange();
    return true;
  }

  getMarker(id: string): Marker | undefined {
    return this.markers.find(m => m.id === id);
  }

  getMarkers(): Marker[] {
    return [...this.markers];
  }

  setSelectedMarker(id: string | null) {
    this.selectedMarkerId = id;
    this.notifySelect();
  }

  getSelectedMarkerId(): string | null {
    return this.selectedMarkerId;
  }

  jumpToMarker(id: string): number | null {
    const marker = this.markers.find(m => m.id === id);
    if (!marker) return null;

    this.setSelectedMarker(id);
    return marker.time;
  }

  setDraggingMarker(id: string | null) {
    this.draggingMarkerId = id;
  }

  getDraggingMarkerId(): string | null {
    return this.draggingMarkerId;
  }

  findNearestMarker(time: number, threshold: number = 0.5): Marker | null {
    let nearest: Marker | null = null;
    let minDistance = threshold;

    for (const marker of this.markers) {
      const distance = Math.abs(marker.time - time);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = marker;
      }
    }

    return nearest;
  }

  dragStart(time: number, threshold: number = 0.3): boolean {
    const marker = this.findNearestMarker(time, threshold);
    if (!marker) return false;
    
    this.draggingMarkerId = marker.id;
    this.selectedMarkerId = marker.id;
    this.notifySelect();
    return true;
  }

  dragMove(time: number, maxDuration: number = Infinity): boolean {
    if (!this.draggingMarkerId) return false;
    
    const marker = this.getMarker(this.draggingMarkerId);
    if (!marker) return false;

    marker.time = Math.max(0, Math.min(time, maxDuration));
    this.markers.sort((a, b) => a.time - b.time);
    this.notifyChange();
    return true;
  }

  dragEnd(maxDuration: number = Infinity): string | null {
    const id = this.draggingMarkerId;
    if (id) {
      const marker = this.getMarker(id);
      if (marker) {
        marker.time = Math.max(0, Math.min(marker.time, maxDuration));
        this.markers.sort((a, b) => a.time - b.time);
        this.notifyChange();
      }
    }
    this.draggingMarkerId = null;
    return id;
  }

  addChangeListener(listener: MarkerChangeListener): () => void {
    this.changeListeners.push(listener);
    return () => {
      this.changeListeners = this.changeListeners.filter(l => l !== listener);
    };
  }

  addSelectListener(listener: MarkerSelectListener): () => void {
    this.selectListeners.push(listener);
    return () => {
      this.selectListeners = this.selectListeners.filter(l => l !== listener);
    };
  }

  private notifyChange() {
    const markers = [...this.markers];
    this.changeListeners.forEach(listener => listener(markers));
  }

  private notifySelect() {
    this.selectListeners.forEach(listener => listener(this.selectedMarkerId));
  }

  private generateId(): string {
    return 'marker_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  getMaxMarkers(): number {
    return this.maxMarkers;
  }

  getMarkerCount(): number {
    return this.markers.length;
  }

  clearAll() {
    this.markers = [];
    this.selectedMarkerId = null;
    this.draggingMarkerId = null;
    this.notifyChange();
    this.notifySelect();
  }
}
