import { artifactData, formatYear } from '../data/artifactData';

export interface TimelineManagerOptions {
  containerId: string;
  onNodeSelect: (index: number) => void;
}

export class TimelineManager {
  private container: HTMLElement;
  private nodes: HTMLElement[] = [];
  private currentIndex: number = 0;
  private onNodeSelect: (index: number) => void;
  private isDragging: boolean = false;
  private startX: number = 0;
  private startIndex: number = 0;

  constructor(options: TimelineManagerOptions) {
    const container = document.getElementById(options.containerId);
    if (!container) {
      throw new Error(`Timeline container not found: ${options.containerId}`);
    }
    this.container = container;
    this.onNodeSelect = options.onNodeSelect;

    this.createNodes();
    this.setupDragEvents();
    this.setupWheelEvent();
    this.updateActiveNode();
  }

  private createNodes(): void {
    const count = artifactData.length;

    artifactData.forEach((data, index) => {
      const position = (index / (count - 1)) * 100;

      const node = document.createElement('div');
      node.className = 'timeline-node';
      node.style.left = `${position}%`;
      node.dataset.index = index.toString();

      node.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectNode(index);
      });

      this.container.appendChild(node);
      this.nodes.push(node);

      const label = document.createElement('div');
      label.className = 'timeline-label';
      label.style.left = `${position}%`;
      label.textContent = formatYear(data.year);
      this.container.appendChild(label);
    });
  }

  private setupDragEvents(): void {
    this.container.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.startX = e.clientX;
      this.startIndex = this.currentIndex;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - this.startX;
      const containerWidth = this.container.offsetWidth;
      const nodeDistance = containerWidth / (artifactData.length - 1);
      const indexDelta = Math.round(deltaX / nodeDistance);

      let newIndex = this.startIndex + indexDelta;
      newIndex = Math.max(0, Math.min(artifactData.length - 1, newIndex));

      if (newIndex !== this.currentIndex) {
        this.selectNode(newIndex);
      }
    });

    document.addEventListener('mouseup', () => {
      this.isDragging = false;
    });
  }

  private setupWheelEvent(): void {
    let wheelTimeout: number | null = null;

    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();

      if (wheelTimeout !== null) {
        clearTimeout(wheelTimeout);
      }

      wheelTimeout = window.setTimeout(() => {
        if (e.deltaY > 0) {
          this.nextNode();
        } else {
          this.prevNode();
        }
      }, 50);
    }, { passive: false });
  }

  private selectNode(index: number): void {
    if (index === this.currentIndex) return;
    this.currentIndex = index;
    this.updateActiveNode();
    this.onNodeSelect(index);
  }

  private updateActiveNode(): void {
    this.nodes.forEach((node, index) => {
      if (index === this.currentIndex) {
        node.classList.add('active');
      } else {
        node.classList.remove('active');
      }
    });
  }

  public nextNode(): void {
    if (this.currentIndex < artifactData.length - 1) {
      this.selectNode(this.currentIndex + 1);
    }
  }

  public prevNode(): void {
    if (this.currentIndex > 0) {
      this.selectNode(this.currentIndex - 1);
    }
  }

  public setCurrentIndex(index: number): void {
    if (index >= 0 && index < artifactData.length) {
      this.currentIndex = index;
      this.updateActiveNode();
    }
  }

  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  public dispose(): void {
    this.nodes = [];
  }
}
