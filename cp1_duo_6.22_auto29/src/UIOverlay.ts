import * as THREE from 'three';
import type { AnnotationSystem, AnnotationData } from './AnnotationSystem';
import type { ModelLoader } from './ModelLoader';

interface UIOverlayOptions {
  canvas: HTMLCanvasElement;
  annotationSystem: AnnotationSystem;
  modelLoader: ModelLoader;
  onModelLoaded: (model: THREE.Group) => void;
  onAutoRotateToggle: (enabled: boolean) => void;
  onResetView: () => void;
  onScreenshot: () => void;
}

export class UIOverlay {
  private canvas: HTMLCanvasElement;
  private annotationSystem: AnnotationSystem;
  private modelLoader: ModelLoader;
  private onModelLoaded: (model: THREE.Group) => void;
  private onAutoRotateToggle: (enabled: boolean) => void;
  private onResetView: () => void;
  private onScreenshot: () => void;

  private autoRotateEnabled: boolean = false;
  private sidebarOpen: boolean = true;
  private highlightedListItemId: string | null = null;

  private elements: Record<string, HTMLElement> = {};

  constructor(options: UIOverlayOptions) {
    this.canvas = options.canvas;
    this.annotationSystem = options.annotationSystem;
    this.modelLoader = options.modelLoader;
    this.onModelLoaded = options.onModelLoaded;
    this.onAutoRotateToggle = options.onAutoRotateToggle;
    this.onResetView = options.onResetView;
    this.onScreenshot = options.onScreenshot;

    this.cacheElements();
    this.bindEvents();
    this.setupResponsive();
    this.updateAnnotationList();

    this.annotationSystem.onAnnotationListChange(() => {
      this.updateAnnotationList();
    });
  }

  private cacheElements(): void {
    this.elements.loadingOverlay = document.getElementById('loading-overlay')!;
    this.elements.progressBar = document.getElementById('progress-bar')!;
    this.elements.loadingPercent = document.getElementById('loading-percent')!;
    this.elements.autoRotateToggle = document.getElementById('auto-rotate-toggle')!;
    this.elements.resetViewBtn = document.getElementById('reset-view-btn')!;
    this.elements.screenshotBtn = document.getElementById('screenshot-btn')!;
    this.elements.exportJsonBtn = document.getElementById('export-json-btn')!;
    this.elements.uploadBtn = document.getElementById('upload-btn')!;
    this.elements.fileInput = document.getElementById('file-input')!;
    this.elements.modelInfo = document.getElementById('model-info')!;
    this.elements.infoContent = document.getElementById('info-content')!;
    this.elements.sidebar = document.getElementById('sidebar')!;
    this.elements.sidebarToggle = document.getElementById('sidebar-toggle')!;
    this.elements.annotationList = document.getElementById('annotation-list')!;
    this.elements.annotationCount = document.getElementById('annotation-count')!;
    this.elements.annotationInputModal = document.getElementById('annotation-input-modal')!;
    this.elements.annotationText = document.getElementById('annotation-text')!;
    this.elements.confirmAnnotationBtn = document.getElementById('confirm-annotation-btn')!;
    this.elements.cancelAnnotationBtn = document.getElementById('cancel-annotation-btn')!;
  }

  private bindEvents(): void {
    this.elements.uploadBtn.addEventListener('click', () => {
      (this.elements.fileInput as HTMLInputElement).click();
    });

    this.elements.fileInput.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        this.loadModel(file);
      }
      target.value = '';
    });

    this.elements.autoRotateToggle.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      this.autoRotateEnabled = checked;
      this.onAutoRotateToggle(checked);
    });

    this.elements.resetViewBtn.addEventListener('click', () => {
      this.onResetView();
    });

    this.elements.screenshotBtn.addEventListener('click', () => {
      this.onScreenshot();
    });

    this.elements.exportJsonBtn.addEventListener('click', () => {
      this.annotationSystem.downloadJSON();
    });

    this.elements.sidebarToggle.addEventListener('click', () => {
      this.toggleSidebar();
    });

    this.elements.confirmAnnotationBtn.addEventListener('click', () => {
      this.confirmAnnotation();
    });

    this.elements.cancelAnnotationBtn.addEventListener('click', () => {
      this.cancelAnnotation();
    });

    this.elements.annotationText.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.confirmAnnotation();
      }
      if (e.key === 'Escape') {
        this.cancelAnnotation();
      }
    });

    this.modelLoader.onProgress((progress) => {
      this.updateProgress(progress.percent);
    });
  }

  private setupResponsive(): void {
    const checkResponsive = () => {
      if (window.innerWidth < 768) {
        this.sidebarOpen = false;
        this.elements.sidebar.classList.add('collapsed');
        this.elements.sidebarToggle.classList.remove('hidden');
      } else {
        this.sidebarOpen = true;
        this.elements.sidebar.classList.remove('collapsed');
        this.elements.sidebarToggle.classList.add('hidden');
      }
    };

    checkResponsive();
    window.addEventListener('resize', checkResponsive);
  }

  private toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
    if (this.sidebarOpen) {
      this.elements.sidebar.classList.remove('collapsed');
    } else {
      this.elements.sidebar.classList.add('collapsed');
    }
  }

  showAnnotationInput(): void {
    this.elements.annotationInputModal.classList.remove('hidden');
    (this.elements.annotationText as HTMLTextAreaElement).value = '';
    (this.elements.annotationText as HTMLTextAreaElement).focus();
  }

  hideAnnotationInput(): void {
    this.elements.annotationInputModal.classList.add('hidden');
  }

  private confirmAnnotation(): void {
    const text = (this.elements.annotationText as HTMLTextAreaElement).value.trim();
    if (text) {
      this.annotationSystem.confirmAnnotation(text);
    } else {
      this.annotationSystem.cancelAnnotation();
    }
    this.hideAnnotationInput();
  }

  private cancelAnnotation(): void {
    this.annotationSystem.cancelAnnotation();
    this.hideAnnotationInput();
  }

  private async loadModel(file: File): Promise<void> {
    this.showLoading();

    try {
      const model = await this.modelLoader.loadFromFile(file);
      this.onModelLoaded(model);
      this.updateModelInfo(file.name);
    } catch (error) {
      console.error('Failed to load model:', error);
      alert('模型加载失败，请检查文件格式');
    } finally {
      setTimeout(() => {
        this.hideLoading();
      }, 500);
    }
  }

  showLoading(): void {
    this.elements.loadingOverlay.classList.remove('hidden');
    this.updateProgress(0);
  }

  hideLoading(): void {
    this.elements.loadingOverlay.classList.add('hidden');
  }

  updateProgress(percent: number): void {
    this.elements.progressBar.style.width = `${percent}%`;
    this.elements.loadingPercent.textContent = `${percent}%`;
  }

  updateModelInfo(fileName: string): void {
    const modelGroup = (window as any).__modelGroup as THREE.Group | undefined;
    if (!modelGroup) {
      this.elements.infoContent.innerHTML = `
        <div>文件：${fileName}</div>
        <div class="hint">模型信息加载中...</div>
      `;
      return;
    }

    const info = this.modelLoader.getModelInfo(modelGroup);
    const box = info.boundingBox;
    const size = new THREE.Vector3();
    box.getSize(size);

    this.elements.infoContent.innerHTML = `
      <div class="info-row">
        <span class="info-label">文件名</span>
        <span class="info-value">${fileName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">顶点数</span>
        <span class="info-value">${info.vertexCount.toLocaleString()}</span>
      </div>
      <div class="info-row">
        <span class="info-label">网格数</span>
        <span class="info-value">${info.meshCount}</span>
      </div>
      <div class="info-row">
        <span class="info-label">三角面</span>
        <span class="info-value">${info.triangleCount.toLocaleString()}</span>
      </div>
      <div class="info-row">
        <span class="info-label">尺寸</span>
        <span class="info-value">${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)}</span>
      </div>
    `;
  }

  updateAnnotationList(): void {
    const annotations = this.annotationSystem.getAnnotations();
    this.elements.annotationCount.textContent = annotations.length.toString();

    if (annotations.length === 0) {
      this.elements.annotationList.innerHTML = `
        <div class="empty-state">暂无批注</div>
        <div class="empty-hint">点击模型表面添加批注</div>
      `;
      return;
    }

    this.elements.annotationList.innerHTML = '';

    annotations.forEach((annotation, index) => {
      const item = document.createElement('div');
      item.className = 'annotation-item';
      item.dataset.id = annotation.id;

      const header = document.createElement('div');
      header.className = 'annotation-item-header';

      const marker = document.createElement('div');
      marker.className = 'annotation-marker-dot';

      const title = document.createElement('span');
      title.className = 'annotation-item-title';
      title.textContent = `批注 ${index + 1}`;

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'annotation-delete-btn';
      deleteBtn.innerHTML = '×';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.annotationSystem.deleteAnnotation(annotation.id);
      });

      header.appendChild(marker);
      header.appendChild(title);
      header.appendChild(deleteBtn);

      const content = document.createElement('div');
      content.className = 'annotation-item-content';
      content.textContent = annotation.text;

      item.appendChild(header);
      item.appendChild(content);

      item.addEventListener('click', () => {
        this.annotationSystem.highlightAnnotation(annotation.id);
      });

      this.elements.annotationList.appendChild(item);
    });
  }

  setAutoRotateEnabled(enabled: boolean): void {
    this.autoRotateEnabled = enabled;
    (this.elements.autoRotateToggle as HTMLInputElement).checked = enabled;
  }

  isAutoRotateEnabled(): boolean {
    return this.autoRotateEnabled;
  }
}
