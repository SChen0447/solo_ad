export interface CameraMarkerData {
  id: string;
  name: string;
  index: number;
}

export class UIManager {
  private recordBtn: HTMLButtonElement;
  private addCameraBtn: HTMLButtonElement;
  private cameraMarkersList: HTMLElement;
  private recordTimer: HTMLElement;
  private watermark: HTMLElement;
  private exportDialog: HTMLElement;
  private previewVideo: HTMLVideoElement;
  private downloadBtn: HTMLButtonElement;
  private closeDialogBtn: HTMLButtonElement;
  private sidebar: HTMLElement;
  private hamburgerBtn: HTMLButtonElement;
  private sidebarCloseBtn: HTMLButtonElement;
  private loadingLogo: HTMLElement;

  private onRecordClick: (() => void) | null = null;
  private onAddCameraClick: (() => void) | null = null;
  private onMarkerClick: ((id: string) => void) | null = null;
  private onMarkerDelete: ((id: string) => void) | null = null;
  private onMarkerReorder: ((fromIndex: number, toIndex: number) => void) | null = null;
  private onDownloadClick: (() => void) | null = null;

  private isRecording: boolean = false;
  private draggedMarker: HTMLElement | null = null;
  private dragStartIndex: number = -1;

  constructor() {
    this.recordBtn = document.getElementById('record-btn') as HTMLButtonElement;
    this.addCameraBtn = document.getElementById('add-camera-btn') as HTMLButtonElement;
    this.cameraMarkersList = document.getElementById('camera-markers-list') as HTMLElement;
    this.recordTimer = document.getElementById('record-timer') as HTMLElement;
    this.watermark = document.getElementById('recording-watermark') as HTMLElement;
    this.exportDialog = document.getElementById('export-dialog') as HTMLElement;
    this.previewVideo = document.getElementById('preview-video') as HTMLVideoElement;
    this.downloadBtn = document.getElementById('download-btn') as HTMLButtonElement;
    this.closeDialogBtn = document.getElementById('close-dialog-btn') as HTMLButtonElement;
    this.sidebar = document.getElementById('sidebar') as HTMLElement;
    this.hamburgerBtn = document.getElementById('hamburger-btn') as HTMLButtonElement;
    this.sidebarCloseBtn = document.getElementById('sidebar-close-btn') as HTMLButtonElement;
    this.loadingLogo = document.getElementById('loading-logo') as HTMLElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.recordBtn.addEventListener('click', () => {
      this.addRipple(this.recordBtn);
      if (this.onRecordClick) this.onRecordClick();
    });

    this.addCameraBtn.addEventListener('click', () => {
      this.addRipple(this.addCameraBtn);
      if (this.onAddCameraClick) this.onAddCameraClick();
    });

    this.downloadBtn.addEventListener('click', (e) => {
      this.addRipple(this.downloadBtn, e);
      if (this.onDownloadClick) this.onDownloadClick();
    });

    this.closeDialogBtn.addEventListener('click', () => {
      this.hideExportDialog();
    });

    this.exportDialog.addEventListener('click', (e) => {
      if (e.target === this.exportDialog) {
        this.hideExportDialog();
      }
    });

    this.hamburgerBtn.addEventListener('click', () => {
      this.openSidebar();
    });

    this.sidebarCloseBtn.addEventListener('click', () => {
      this.closeSidebar();
    });

    this.previewVideo.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  private addRipple(btn: HTMLElement, event?: MouseEvent): void {
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event ? event.clientX - rect.left : rect.width / 2;
    const y = event ? event.clientY - rect.top : rect.height / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x - size / 2}px`;
    ripple.style.top = `${y - size / 2}px`;

    btn.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 300);
  }

  setOnRecordClick(callback: () => void): void {
    this.onRecordClick = callback;
  }

  setOnAddCameraClick(callback: () => void): void {
    this.onAddCameraClick = callback;
  }

  setOnMarkerClick(callback: (id: string) => void): void {
    this.onMarkerClick = callback;
  }

  setOnMarkerDelete(callback: (id: string) => void): void {
    this.onMarkerDelete = callback;
  }

  setOnMarkerReorder(callback: (fromIndex: number, toIndex: number) => void): void {
    this.onMarkerReorder = callback;
  }

  setOnDownloadClick(callback: () => void): void {
    this.onDownloadClick = callback;
  }

  updateRecordButton(isRecording: boolean): void {
    this.isRecording = isRecording;
    const icon = this.recordBtn.querySelector('.btn-icon') as HTMLElement;
    const label = this.recordBtn.querySelector('.btn-label') as HTMLElement;

    if (isRecording) {
      this.recordBtn.classList.remove('stopped');
      if (icon) icon.textContent = '■';
      if (label) label.textContent = '停止录制';
      this.recordTimer.classList.add('active');
      this.watermark.classList.add('active');
    } else {
      this.recordBtn.classList.add('stopped');
      if (icon) icon.textContent = '●';
      if (label) label.textContent = '开始录制';
      this.recordTimer.classList.remove('active');
      this.watermark.classList.remove('active');
    }
  }

  updateTimer(timeMs: number): void {
    const totalSeconds = Math.floor(timeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    this.recordTimer.textContent =
      `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  showExportDialog(videoUrl: string): void {
    this.previewVideo.src = videoUrl;
    this.exportDialog.classList.add('active');
  }

  hideExportDialog(): void {
    this.exportDialog.classList.remove('active');
    this.previewVideo.pause();
    this.previewVideo.src = '';
  }

  updateCameraMarkers(markers: CameraMarkerData[]): void {
    this.cameraMarkersList.innerHTML = '';

    markers.forEach((marker, index) => {
      const item = document.createElement('div');
      item.className = 'camera-marker-item';
      item.dataset.id = marker.id;
      item.dataset.index = String(index);
      item.draggable = true;

      item.innerHTML = `
        <span class="marker-drag-handle">⋮⋮</span>
        <span class="marker-index">${index + 1}</span>
        <span class="marker-name">${marker.name}</span>
        <button class="marker-delete">×</button>
      `;

      item.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('marker-delete')) {
          e.stopPropagation();
          if (this.onMarkerDelete) this.onMarkerDelete(marker.id);
        } else {
          if (this.onMarkerClick) this.onMarkerClick(marker.id);
        }
      });

      item.addEventListener('dragstart', (e) => {
        this.draggedMarker = item;
        this.dragStartIndex = index;
        item.classList.add('dragging');
        e.dataTransfer!.effectAllowed = 'move';
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        this.draggedMarker = null;
        this.dragStartIndex = -1;
        document.querySelectorAll('.camera-marker-item').forEach(el => {
          el.classList.remove('drag-over');
        });
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';
        item.classList.add('drag-over');
      });

      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        if (this.draggedMarker && this.dragStartIndex !== index) {
          if (this.onMarkerReorder) {
            this.onMarkerReorder(this.dragStartIndex, index);
          }
        }
      });

      this.cameraMarkersList.appendChild(item);
    });
  }

  hideLoadingLogo(): void {
    setTimeout(() => {
      this.loadingLogo.style.transition = 'opacity 0.5s ease';
      this.loadingLogo.style.opacity = '0';
      setTimeout(() => {
        this.loadingLogo.style.display = 'none';
      }, 500);
    }, 800);
  }

  openSidebar(): void {
    this.sidebar.classList.add('open');
  }

  closeSidebar(): void {
    this.sidebar.classList.remove('open');
  }

  getCanvasContainer(): HTMLElement {
    return document.getElementById('canvas-container') as HTMLElement;
  }

  getCanvas(): HTMLCanvasElement {
    return document.getElementById('scene-canvas') as HTMLCanvasElement;
  }
}
