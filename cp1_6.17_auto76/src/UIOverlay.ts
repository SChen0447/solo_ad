import { FacilityData, FloorData, RoomData } from './DataService';

export class UIOverlay {
  private annotationContainer: HTMLElement;
  private facilityCard: HTMLElement;
  private minimapPanel: HTMLElement;
  private minimapCanvas: HTMLCanvasElement;
  private filterPanel: HTMLElement;
  private positionInfo: HTMLElement;
  private collisionOverlay: HTMLElement;
  private floorSelector: HTMLElement;
  private filterMobileBtn: HTMLElement;
  
  private currentFloor: number = 1;
  private currentPosition: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  
  private minimapVisible: boolean = false;
  private floorData: FloorData[] = [];
  
  private onFilterChangeCallback?: (categories: string[]) => void;
  private onFloorChangeCallback?: (floor: number) => void;
  private onMinimapRoomClickCallback?: (roomId: string) => void;
  
  constructor() {
    this.annotationContainer = document.getElementById('annotation-container')!;
    this.facilityCard = document.getElementById('facility-card')!;
    this.minimapPanel = document.getElementById('minimap-panel')!;
    this.minimapCanvas = document.getElementById('minimap-canvas') as HTMLCanvasElement;
    this.filterPanel = document.getElementById('filter-panel')!;
    this.positionInfo = document.getElementById('position-info')!;
    this.collisionOverlay = document.getElementById('collision-overlay')!;
    this.floorSelector = document.getElementById('floor-selector')!;
    this.filterMobileBtn = document.getElementById('filter-mobile-btn')!;
    
    this.setupEventListeners();
    this.setupDraggablePanel();
    this.checkWindowSize();
  }
  
  private setupEventListeners(): void {
    document.getElementById('minimap-close')?.addEventListener('click', () => {
      this.toggleMinimap(false);
    });
    
    document.getElementById('minimap-btn')?.addEventListener('click', () => {
      this.toggleMinimap();
    });
    
    document.getElementById('floor-switch-btn')?.addEventListener('click', () => {
      this.toggleFloorSelector();
    });
    
    document.querySelectorAll('.floor-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const floor = parseInt((e.target as HTMLElement).dataset.floor || '1');
        this.setCurrentFloor(floor);
        if (this.onFloorChangeCallback) {
          this.onFloorChangeCallback(floor);
        }
        this.toggleFloorSelector(false);
      });
    });
    
    document.getElementById('card-close')?.addEventListener('click', () => {
      this.hideFacilityCard();
    });
    
    document.querySelectorAll('#filter-panel .filter-item input').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        this.updateFilter();
      });
    });
    
    document.getElementById('filter-toggle')?.addEventListener('click', () => {
      this.toggleFilterPanel();
    });
    
    this.filterMobileBtn.addEventListener('click', () => {
      this.toggleFilterPanel();
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM') {
        this.toggleMinimap();
      }
    });
    
    window.addEventListener('resize', () => {
      this.checkWindowSize();
      this.drawMinimap();
    });
    
    this.minimapCanvas.addEventListener('click', (e) => {
      this.handleMinimapClick(e);
    });
  }
  
  private setupDraggablePanel(): void {
    const header = this.filterPanel.querySelector('.draggable-header') as HTMLElement;
    if (!header) return;
    
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;
    
    header.addEventListener('mousedown', (e) => {
      const evt = e as MouseEvent;
      isDragging = true;
      startX = evt.clientX;
      startY = evt.clientY;
      
      const rect = this.filterPanel.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      
      this.filterPanel.style.right = 'auto';
      this.filterPanel.style.left = startLeft + 'px';
      this.filterPanel.style.top = startTop + 'px';
      
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      
      this.filterPanel.style.left = (startLeft + dx) + 'px';
      this.filterPanel.style.top = (startTop + dy) + 'px';
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }
  
  private checkWindowSize(): void {
    if (window.innerWidth < 1024) {
      this.filterMobileBtn.classList.remove('hidden');
      this.filterPanel.classList.add('collapsed-mobile');
    } else {
      this.filterMobileBtn.classList.add('hidden');
      this.filterPanel.classList.remove('collapsed-mobile');
    }
  }
  
  private toggleFilterPanel(): void {
    const content = this.filterPanel.querySelector('.filter-content');
    const toggleBtn = document.getElementById('filter-toggle');
    
    if (content?.classList.contains('hidden')) {
      content.classList.remove('hidden');
      if (toggleBtn) toggleBtn.textContent = '−';
    } else {
      content?.classList.add('hidden');
      if (toggleBtn) toggleBtn.textContent = '+';
    }
  }
  
  private toggleMinimap(show?: boolean): void {
    if (show === undefined) {
      show = !this.minimapVisible;
    }
    
    this.minimapVisible = show;
    
    if (show) {
      this.minimapPanel.classList.remove('hidden');
      this.drawMinimap();
    } else {
      this.minimapPanel.classList.add('hidden');
    }
  }
  
  private toggleFloorSelector(show?: boolean): void {
    if (show === undefined) {
      show = this.floorSelector.classList.contains('hidden');
    }
    
    if (show) {
      this.floorSelector.classList.remove('hidden');
    } else {
      this.floorSelector.classList.add('hidden');
    }
  }
  
  private updateFilter(): void {
    const checkboxes = document.querySelectorAll('#filter-panel .filter-item input:checked');
    const categories: string[] = [];
    
    checkboxes.forEach(cb => {
      categories.push((cb as HTMLInputElement).value);
    });
    
    if (this.onFilterChangeCallback) {
      this.onFilterChangeCallback(categories);
    }
  }
  
  private handleMinimapClick(e: MouseEvent): void {
    const rect = this.minimapCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const floor = this.floorData.find(f => f.level === this.currentFloor);
    if (!floor) return;
    
    const scale = this.getMinimapScale();
    const offset = this.getMinimapOffset();
    
    const worldX = (x - offset.x) / scale;
    const worldZ = (y - offset.y) / scale;
    
    for (const room of floor.rooms) {
      if (this.isPointInRoom(worldX, worldZ, room)) {
        if (this.onMinimapRoomClickCallback) {
          this.onMinimapRoomClickCallback(room.id);
        }
        break;
      }
    }
  }
  
  private isPointInRoom(px: number, pz: number, room: RoomData): boolean {
    const corners = room.corners;
    let inside = false;
    
    for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
      const xi = corners[i][0], zi = corners[i][1];
      const xj = corners[j][0], zj = corners[j][1];
      
      if (((zi > pz) !== (zj > pz)) &&
          (px < (xj - xi) * (pz - zi) / (zj - zi) + xi)) {
        inside = !inside;
      }
    }
    
    return inside;
  }
  
  private getMinimapScale(): number {
    const canvas = this.minimapCanvas;
    const padding = 20;
    const mapWidth = 30;
    const mapHeight = 20;
    const scaleX = (canvas.width - padding * 2) / mapWidth;
    const scaleY = (canvas.height - padding * 2) / mapHeight;
    return Math.min(scaleX, scaleY);
  }
  
  private getMinimapOffset(): { x: number; y: number } {
    const canvas = this.minimapCanvas;
    const scale = this.getMinimapScale();
    const mapWidth = 30 * scale;
    const mapHeight = 20 * scale;
    return {
      x: (canvas.width - mapWidth) / 2 + 15 * scale,
      y: (canvas.height - mapHeight) / 2 + 10 * scale,
    };
  }
  
  setFloorData(floors: FloorData[]): void {
    this.floorData = floors;
    this.drawMinimap();
  }
  
  setCurrentFloor(floor: number): void {
    this.currentFloor = floor;
    document.getElementById('current-floor')!.textContent = floor + 'F';
    this.drawMinimap();
    
    document.querySelectorAll('.floor-btn').forEach(btn => {
      const btnFloor = parseInt((btn as HTMLElement).dataset.floor || '0');
      if (btnFloor === floor) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
  
  setCurrentPosition(x: number, y: number, z: number): void {
    this.currentPosition = { x, y, z };
    document.getElementById('current-position')!.textContent = 
      `X: ${x.toFixed(1)}, Z: ${z.toFixed(1)}`;
    this.drawMinimap();
  }
  
  showAnnotationBubble(facility: FacilityData, screenX: number, screenY: number): void {
    this.clearAnnotations();
    
    const bubble = document.createElement('div');
    bubble.className = 'annotation-bubble';
    bubble.innerHTML = `
      <span class="bubble-icon">${this.getCategoryIcon(facility.category)}</span>
      <span class="bubble-text">${facility.name}</span>
    `;
    
    bubble.style.left = screenX + 'px';
    bubble.style.top = screenY + 'px';
    
    this.annotationContainer.appendChild(bubble);
    
    requestAnimationFrame(() => {
      const rect = bubble.getBoundingClientRect();
      bubble.style.left = (screenX - rect.width / 2) + 'px';
      bubble.style.top = (screenY - rect.height - 20) + 'px';
    });
  }
  
  hideAnnotationBubble(): void {
    this.clearAnnotations();
  }
  
  private clearAnnotations(): void {
    this.annotationContainer.innerHTML = '';
  }
  
  showFacilityCard(facility: FacilityData, screenX: number, screenY: number): void {
    this.facilityCard.classList.remove('hidden');
    this.facilityCard.style.animation = 'none';
    
    document.getElementById('card-icon')!.textContent = this.getCategoryIcon(facility.category);
    document.getElementById('card-title')!.textContent = facility.name;
    document.getElementById('card-type')!.textContent = this.getTypeName(facility.type);
    document.getElementById('card-status')!.textContent = this.getStatusText(facility.status);
    document.getElementById('card-status')!.className = `status-${facility.status}`;
    document.getElementById('card-maintenance')!.textContent = facility.last_maintenance;
    document.getElementById('card-location')!.textContent = `${facility.floor}F - ${facility.description}`;
    
    this.facilityCard.style.left = Math.min(screenX - 150, window.innerWidth - 320) + 'px';
    this.facilityCard.style.top = (screenY + 10) + 'px';
    
    requestAnimationFrame(() => {
      this.facilityCard.style.animation = 'cardPopIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
    });
  }
  
  hideFacilityCard(): void {
    this.facilityCard.classList.add('hidden');
  }
  
  private getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      fire: '🔥',
      electrical: '⚡',
      plumbing: '💧',
      hvac: '❄️',
    };
    return icons[category] || '🔧';
  }
  
  private getTypeName(type: string): string {
    const names: Record<string, string> = {
      fire_hydrant: '消防栓',
      distribution_box: '配电箱',
      emergency_exit: '安全出口',
      elevator: '电梯',
      sprinkler_pump: '喷淋泵',
      air_conditioner: '空调机组',
      main_distribution: '总配电箱',
      server_rack: '服务器机柜',
      exhaust_system: '排风系统',
      precision_ac: '精密空调',
      gas_suppression: '气体灭火系统',
      printer_station: '打印工作站',
      hvac_return: '空调回风系统',
    };
    return names[type] || type;
  }
  
  private getStatusText(status: string): string {
    const texts: Record<string, string> = {
      normal: '正常运行',
      warning: '需要维护',
      error: '故障',
    };
    return texts[status] || status;
  }
  
  showCollisionEffect(): void {
    this.collisionOverlay.style.opacity = '1';
    
    setTimeout(() => {
      this.collisionOverlay.style.transition = 'opacity 0.3s ease-out';
      this.collisionOverlay.style.opacity = '0';
    }, 100);
  }
  
  private drawMinimap(): void {
    if (!this.minimapVisible) return;
    
    const canvas = this.minimapCanvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    
    ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
    ctx.fillRect(0, 0, width, height);
    
    const floor = this.floorData.find(f => f.level === this.currentFloor);
    if (!floor) return;
    
    const scale = this.getMinimapScale();
    const offset = this.getMinimapOffset();
    
    for (const room of floor.rooms) {
      ctx.beginPath();
      
      const corners = room.corners;
      const firstX = corners[0][0] * scale + offset.x;
      const firstZ = corners[0][1] * scale + offset.y;
      ctx.moveTo(firstX, firstZ);
      
      for (let i = 1; i < corners.length; i++) {
        const x = corners[i][0] * scale + offset.x;
        const z = corners[i][1] * scale + offset.y;
        ctx.lineTo(x, z);
      }
      
      ctx.closePath();
      
      if (room.is_corridor) {
        ctx.fillStyle = 'rgba(58, 74, 91, 0.6)';
      } else if (room.is_staircase) {
        ctx.fillStyle = 'rgba(42, 58, 75, 0.8)';
      } else {
        ctx.fillStyle = 'rgba(90, 106, 133, 0.5)';
      }
      ctx.fill();
      
      ctx.strokeStyle = 'rgba(15, 52, 96, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      
      if (!room.is_corridor && !room.is_staircase) {
        const centerX = corners.reduce((sum, c) => sum + c[0], 0) / corners.length * scale + offset.x;
        const centerZ = corners.reduce((sum, c) => sum + c[1], 0) / corners.length * scale + offset.y;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(room.name, centerX, centerZ);
      }
    }
    
    const playerX = this.currentPosition.x * scale + offset.x;
    const playerZ = this.currentPosition.z * scale + offset.y;
    
    ctx.beginPath();
    ctx.arc(playerX, playerZ, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#4ade80';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.shadowColor = '#4ade80';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(playerX, playerZ, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#4ade80';
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  
  setOnFilterChange(callback: (categories: string[]) => void): void {
    this.onFilterChangeCallback = callback;
  }
  
  setOnFloorChange(callback: (floor: number) => void): void {
    this.onFloorChangeCallback = callback;
  }
  
  setOnMinimapRoomClick(callback: (roomId: string) => void): void {
    this.onMinimapRoomClickCallback = callback;
  }
  
  showLoading(show: boolean): void {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      if (show) {
        loadingScreen.classList.remove('hidden');
      } else {
        loadingScreen.classList.add('hidden');
      }
    }
  }
  
  setLoadingProgress(progress: number): void {
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) {
      progressBar.style.width = (progress * 100) + '%';
    }
  }
}
