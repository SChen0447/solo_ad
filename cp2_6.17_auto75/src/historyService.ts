import type { DrawElement, Snapshot } from './types';

export interface HistoryServiceOptions {
  roomId: string;
  onSnapshotRestore: (elements: DrawElement[]) => void;
  onHistoryModeChange?: (isHistoryMode: boolean) => void;
  autoSaveInterval?: number;
}

export class HistoryService {
  private roomId: string;
  private onSnapshotRestore: (elements: DrawElement[]) => void;
  private onHistoryModeChange?: (isHistoryMode: boolean) => void;
  private autoSaveInterval: number = 30000;
  private snapshots: Snapshot[] = [];
  private currentSnapshotIndex: number = -1;
  private isInHistoryMode: boolean = false;
  private timerId: number | null = null;

  constructor(options: HistoryServiceOptions) {
    this.roomId = options.roomId;
    this.onSnapshotRestore = options.onSnapshotRestore;
    this.onHistoryModeChange = options.onHistoryModeChange;
    if (options.autoSaveInterval) {
      this.autoSaveInterval = options.autoSaveInterval;
    }
  }

  public async saveSnapshot(elements: DrawElement[], thumbnail?: string): Promise<Snapshot | null> {
    try {
      const response = await fetch(`/api/board/${this.roomId}/snapshot`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          elements,
          thumbnail
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save snapshot');
      }

      const snapshot: Snapshot = await response.json();

      if (!this.isInHistoryMode) {
        this.snapshots.unshift(snapshot);
        if (this.snapshots.length > 50) {
          this.snapshots = this.snapshots.slice(0, 50);
        }
        this.currentSnapshotIndex = -1;
      }

      return snapshot;
    } catch (error) {
      console.error('Error saving snapshot:', error);
      return null;
    }
  }

  public async getSnapshots(): Promise<Snapshot[]> {
    try {
      const response = await fetch(`/api/board/${this.roomId}/snapshots`);

      if (!response.ok) {
        throw new Error('Failed to get snapshots');
      }

      this.snapshots = await response.json();
      return this.snapshots;
    } catch (error) {
      console.error('Error getting snapshots:', error);
      return [];
    }
  }

  public async restoreSnapshot(snapshotId: string): Promise<DrawElement[] | null> {
    try {
      const response = await fetch(`/api/board/${this.roomId}/restore?snapshot=${snapshotId}`);

      if (!response.ok) {
        throw new Error('Failed to restore snapshot');
      }

      const snapshot: Snapshot = await response.json();
      this.currentSnapshotIndex = this.snapshots.findIndex(s => s.id === snapshotId);
      this.isInHistoryMode = true;
      this.onHistoryModeChange?.(true);
      this.onSnapshotRestore(snapshot.elements);

      return snapshot.elements;
    } catch (error) {
      console.error('Error restoring snapshot:', error);
      return null;
    }
  }

  public exitHistoryMode(): void {
    this.isInHistoryMode = false;
    this.currentSnapshotIndex = -1;
    this.onHistoryModeChange?.(false);
  }

  public getIsInHistoryMode(): boolean {
    return this.isInHistoryMode;
  }

  public getCurrentSnapshotIndex(): number {
    return this.currentSnapshotIndex;
  }

  public getCachedSnapshots(): Snapshot[] {
    return [...this.snapshots];
  }

  public startAutoSave(getElements: () => DrawElement[], getThumbnail?: () => string): void {
    this.stopAutoSave();

    this.saveSnapshot(getElements(), getThumbnail ? getThumbnail() : undefined);

    this.timerId = window.setInterval(async () => {
      if (!this.isInHistoryMode) {
        const elements = getElements();
        if (elements.length > 0) {
          const thumbnail = getThumbnail ? getThumbnail() : undefined;
          await this.saveSnapshot(elements, thumbnail);
        }
      }
    }, this.autoSaveInterval);
  }

  public stopAutoSave(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public setAutoSaveInterval(interval: number): void {
    this.autoSaveInterval = interval;
  }

  public getAutoSaveInterval(): number {
    return this.autoSaveInterval;
  }

  public destroy(): void {
    this.stopAutoSave();
    this.snapshots = [];
    this.currentSnapshotIndex = -1;
    this.isInHistoryMode = false;
  }
}
