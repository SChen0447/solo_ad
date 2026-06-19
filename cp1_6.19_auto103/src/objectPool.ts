export interface Poolable {
  active: boolean;
  reset(): void;
}

export class ObjectPool<T extends Poolable> {
  private pool: T[];
  private factory: () => T;
  private maxSize: number;

  constructor(factory: () => T, initialSize: number = 20, maxSize: number = 200) {
    this.factory = factory;
    this.maxSize = maxSize;
    this.pool = [];

    for (let i = 0; i < initialSize; i++) {
      const obj = factory();
      obj.active = false;
      this.pool.push(obj);
    }
  }

  acquire(): T {
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) {
        const obj = this.pool[i];
        obj.active = true;
        obj.reset();
        return obj;
      }
    }

    if (this.pool.length < this.maxSize) {
      const obj = this.factory();
      obj.active = true;
      this.pool.push(obj);
      return obj;
    }

    const oldest = this.pool[0];
    oldest.active = true;
    oldest.reset();
    return oldest;
  }

  release(obj: T): void {
    obj.active = false;
  }

  getActive(): T[] {
    return this.pool.filter(obj => obj.active);
  }

  getAll(): T[] {
    return this.pool;
  }

  clear(): void {
    for (const obj of this.pool) {
      obj.active = false;
    }
  }

  get size(): number {
    return this.pool.length;
  }

  get activeCount(): number {
    return this.pool.filter(obj => obj.active).length;
  }
}
