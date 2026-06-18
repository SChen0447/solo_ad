interface UndoNode {
  imageData: ImageData;
  prev: UndoNode | null;
  next: UndoNode | null;
}

export class UndoManager {
  private head: UndoNode | null = null;
  private current: UndoNode | null = null;
  private maxSize: number;
  private _size: number = 0;
  private onChangeCallbacks: (() => void)[] = [];

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
  }

  get canUndo(): boolean {
    return this.current !== null && this.current.prev !== null;
  }

  get canRedo(): boolean {
    return this.current !== null && this.current.next !== null;
  }

  get size(): number {
    return this._size;
  }

  onChange(cb: () => void): () => void {
    this.onChangeCallbacks.push(cb);
    return () => {
      this.onChangeCallbacks = this.onChangeCallbacks.filter(c => c !== cb);
    };
  }

  private notify(): void {
    this.onChangeCallbacks.forEach(cb => cb());
  }

  pushState(imageData: ImageData): void {
    const node: UndoNode = {
      imageData,
      prev: null,
      next: null,
    };

    if (this.current) {
      this.current.next = null;
      node.prev = this.current;
      this._size -= this._countForward(this.current);
    }

    this.current = node;

    if (!this.head) {
      this.head = node;
    }

    this._size++;

    while (this._size > this.maxSize && this.head) {
      const oldHead = this.head;
      this.head = this.head.next;
      if (this.head) {
        this.head.prev = null;
      }
      oldHead.next = null;
      this._size--;
    }

    this.notify();
  }

  undo(): ImageData | null {
    if (!this.current || !this.current.prev) return null;
    this.current = this.current.prev;
    this.notify();
    return this.current.imageData;
  }

  redo(): ImageData | null {
    if (!this.current || !this.current.next) return null;
    this.current = this.current.next;
    this.notify();
    return this.current.imageData;
  }

  private _countForward(node: UndoNode): number {
    let count = 0;
    let n = node.next;
    while (n) {
      count++;
      n = n.next;
    }
    return count;
  }
}
