import { fleetManager, Ship, MissionInfo, TaskLog } from '../data/FleetManager';

type MissionType = 'patrol' | 'escort' | 'raid';

const MISSION_LABELS: Record<MissionType, string> = {
  patrol: '🛡️ 巡逻',
  escort: '🚀 护航',
  raid: '⚔️ 突袭',
};

const SORT_STORAGE_KEY = 'starfleet_ship_sort_order';
const EXPAND_STORAGE_KEY = 'starfleet_expanded_ship';

class CommandPanel {
  private fleetListEl: HTMLElement;
  private cmdContentEl: HTMLElement;
  private filterContainerEl: HTMLElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private starFilterSelect: HTMLSelectElement | null = null;
  private selectedShipId: string | null = null;
  private expandedShipId: string | null = null;
  private selectedMission: MissionType | null = null;
  private currentPath: number[] = [];
  private pollingInterval: number | null = null;
  private logPollingInterval: number | null = null;
  private onShipSelect: ((id: string | null) => void) | null = null;
  private onPathCalculated: ((path: number[]) => void) | null = null;
  private draggedShipId: string | null = null;
  private searchKeyword = '';
  private starFilter = 3;

  constructor() {
    this.fleetListEl = document.getElementById('fleet-list')!;
    this.cmdContentEl = document.getElementById('cmd-content')!;
    this.loadSortOrder();
    this.loadExpandedShip();
    this.setupFilterBar();
    this.setupMobileToggles();
    this.renderCommandPanel();
    this.renderFleetList();
    this.startPolling();
    this.startLogPolling();
    fleetManager.onLogsChange(() => this.renderTaskLogs());
    fleetManager.queryTaskLogs();
  }

  setOnShipSelect(cb: (id: string | null) => void): void {
    this.onShipSelect = cb;
  }

  setOnPathCalculated(cb: (path: number[]) => void): void {
    this.onPathCalculated = cb;
  }

  private setupFilterBar(): void {
    const panel = document.getElementById('fleet-panel');
    if (!panel) return;

    this.filterContainerEl = document.createElement('div');
    this.filterContainerEl.className = 'filter-bar';
    this.filterContainerEl.innerHTML = `
      <div class="filter-row">
        <input type="text" id="search-input" placeholder="🔍 搜索舰船名称..." />
      </div>
      <div class="filter-row">
        <select id="star-filter">
          <option value="0">全部星级</option>
          <option value="1">1★ 及以上</option>
          <option value="2">2★ 及以上</option>
          <option value="3" selected>3★ 及以上</option>
          <option value="4">4★ 及以上</option>
          <option value="5">5★ 仅</option>
        </select>
      </div>
    `;
    panel.insertBefore(this.filterContainerEl, this.fleetListEl);

    this.searchInput = document.getElementById('search-input') as HTMLInputElement;
    this.starFilterSelect = document.getElementById('star-filter') as HTMLSelectElement;

    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.searchKeyword = (e.target as HTMLInputElement).value.toLowerCase();
        this.renderFleetList();
      });
    }

    if (this.starFilterSelect) {
      this.starFilterSelect.addEventListener('change', (e) => {
        this.starFilter = parseInt((e.target as HTMLSelectElement).value, 10);
        this.renderFleetList();
      });
    }
  }

  private loadSortOrder(): string[] | null {
    try {
      const saved = localStorage.getItem(SORT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  private saveSortOrder(order: string[]): void {
    try {
      localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(order));
    } catch {}
  }

  private loadExpandedShip(): void {
    try {
      const saved = localStorage.getItem(EXPAND_STORAGE_KEY);
      this.expandedShipId = saved || null;
    } catch {
      this.expandedShipId = null;
    }
  }

  private saveExpandedShip(id: string | null): void {
    try {
      if (id) {
        localStorage.setItem(EXPAND_STORAGE_KEY, id);
      } else {
        localStorage.removeItem(EXPAND_STORAGE_KEY);
      }
    } catch {}
  }

  private getSortedFleet(): Ship[] {
    const fleet = fleetManager.getFleet();
    const savedOrder = this.loadSortOrder();
    if (!savedOrder) return fleet;

    const idToShip = new Map(fleet.map(s => [s.id, s]));
    const ordered: Ship[] = [];
    for (const id of savedOrder) {
      if (idToShip.has(id)) {
        ordered.push(idToShip.get(id)!);
        idToShip.delete(id);
      }
    }
    for (const ship of idToShip.values()) {
      ordered.push(ship);
    }
    return ordered;
  }

  private getFilteredFleet(): Ship[] {
    const fleet = this.getSortedFleet();
    return fleet.filter(ship => {
      if (this.starFilter > 0 && ship.stars < this.starFilter) return false;
      if (this.searchKeyword && !ship.name.toLowerCase().includes(this.searchKeyword)) return false;
      return true;
    });
  }

  selectShip(id: string): void {
    if (this.selectedShipId === id) {
      this.selectedShipId = null;
      this.currentPath = [];
    } else {
      this.selectedShipId = id;
      this.currentPath = [];
    }
    this.renderFleetList();
    this.renderCommandPanel();
    if (this.onShipSelect) this.onShipSelect(this.selectedShipId);
  }

  toggleExpand(id: string): void {
    if (this.expandedShipId === id) {
      this.expandedShipId = null;
    } else {
      this.expandedShipId = id;
    }
    this.saveExpandedShip(this.expandedShipId);
    this.renderFleetList();
  }

  setSelectedMission(mission: MissionType): void {
    this.selectedMission = mission;
    this.renderCommandPanel();
  }

  setCurrentPath(path: number[]): void {
    this.currentPath = path;
    this.renderCommandPanel();
  }

  renderFleetList(): void {
    const fleet = this.getFilteredFleet();
    this.fleetListEl.innerHTML = '';

    for (const ship of fleet) {
      const card = this.createShipCard(ship);
      this.fleetListEl.appendChild(card);
    }
  }

  private createShipCard(ship: Ship): HTMLElement {
    const card = document.createElement('div');
    card.className = 'fleet-card';
    card.draggable = true;
    card.dataset.shipId = ship.id;

    if (this.selectedShipId === ship.id) {
      card.classList.add('selected');
    }
    if (this.expandedShipId === ship.id) {
      card.classList.add('expanded');
    }
    if (ship.status === 'moving') card.classList.add('glow-moving');
    else if (ship.status === 'combat') card.classList.add('glow-combat');
    else if (ship.status === 'idle') card.classList.add('glow-idle');

    const stars = '★'.repeat(ship.stars) + '☆'.repeat(5 - ship.stars);
    const hpPct = ship.max_hp > 0 ? (ship.hp / ship.max_hp * 100) : 0;
    const fpPct = ((ship.firepower - 50) / 100) * 100;
    const spPct = ((ship.speed - 100) / 200) * 100;

    let statusClass = 'status-idle';
    if (ship.status === 'moving') statusClass = 'status-moving';
    else if (ship.status === 'combat') statusClass = 'status-combat';
    else if (ship.status === 'destroyed') statusClass = 'status-combat';

    const isExpanded = this.expandedShipId === ship.id;

    card.innerHTML = `
      <div class="drag-handle" title="拖拽排序">⋮⋮</div>
      <div class="card-header">
        <span class="ship-name">${ship.name}</span>
        <span class="stars">${stars}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">耐久</span>
        <div class="stat-bar-bg"><div class="stat-bar-fill bar-hp" style="width:${hpPct}%"></div></div>
        <span class="stat-val">${ship.hp}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">火力</span>
        <div class="stat-bar-bg"><div class="stat-bar-fill bar-fire" style="width:${fpPct}%"></div></div>
        <span class="stat-val">${ship.firepower}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">速度</span>
        <div class="stat-bar-bg"><div class="stat-bar-fill bar-speed" style="width:${spPct}%"></div></div>
        <span class="stat-val">${ship.speed}</span>
      </div>
      <div class="card-actions">
        <span class="expand-btn" data-expand="${ship.id}" title="查看详情">
          ${isExpanded ? '▲ 收起' : '▼ 详情'}
        </span>
      </div>
      ${isExpanded ? this.renderShipDetail(ship) : ''}
      <div class="status-dot ${statusClass}"></div>
    `;

    const header = card.querySelector('.card-header') as HTMLElement;
    const nameEl = card.querySelector('.ship-name') as HTMLElement;
    nameEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectShip(ship.id);
    });
    header.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectShip(ship.id);
    });

    const expandBtn = card.querySelector('.expand-btn');
    if (expandBtn) {
      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleExpand(ship.id);
      });
    }

    card.addEventListener('dragstart', (e) => {
      this.draggedShipId = ship.id;
      card.classList.add('dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', ship.id);
      }
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      this.draggedShipId = null;
      document.querySelectorAll('.fleet-card.drag-over').forEach(el => {
        el.classList.remove('drag-over');
      });
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (this.draggedShipId && this.draggedShipId !== ship.id) {
        card.classList.add('drag-over');
      }
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-over');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      if (this.draggedShipId && this.draggedShipId !== ship.id) {
        this.reorderShips(this.draggedShipId, ship.id);
      }
    });

    return card;
  }

  private renderShipDetail(ship: Ship): string {
    const systems = fleetManager.getStarSystems();
    const currentSys = systems.find(s => s.id === ship.system_id);
    const hpPct = ship.max_hp > 0 ? (ship.hp / ship.max_hp * 100) : 0;
    const fpPct = ((ship.firepower - 50) / 100) * 100;
    const spPct = ((ship.speed - 100) / 200 * 100);
    return `
      <div class="ship-detail">
        <div class="detail-row">
          <span class="detail-label">舰船ID</span>
          <span class="detail-value">${ship.id}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">星级</span>
          <span class="detail-value star-gold">${'★'.repeat(ship.stars)}${'☆'.repeat(5 - ship.stars)}</span>
        </div>
        <div class="detail-row detail-bar-row">
          <span class="detail-label">耐久</span>
          <div class="detail-bar">
            <div class="stat-bar-fill bar-hp" style="width:${hpPct}%"></div>
          </div>
          <span class="detail-bar-val">${ship.hp}/${ship.max_hp}</span>
        </div>
        <div class="detail-row detail-bar-row">
          <span class="detail-label">火力</span>
          <div class="detail-bar">
            <div class="stat-bar-fill bar-fire" style="width:${fpPct}%"></div>
          </div>
          <span class="detail-bar-val">${ship.firepower}</span>
        </div>
        <div class="detail-row detail-bar-row">
          <span class="detail-label">速度</span>
          <div class="detail-bar">
            <div class="stat-bar-fill bar-speed" style="width:${spPct}%"></div>
          </div>
          <span class="detail-bar-val">${ship.speed}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">当前坐标</span>
          <span class="detail-value">(${Math.round(ship.x)}, ${Math.round(ship.y)})</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">所在星系</span>
          <span class="detail-value">${currentSys ? currentSys.name : '未知'}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">当前状态</span>
          <span class="detail-value">${this.getStatusText(ship.status)}</span>
        </div>
      </div>
    `;
  }

  private reorderShips(draggedId: string, targetId: string): void {
    const fleet = this.getSortedFleet();
    const ids = fleet.map(s => s.id);
    const fromIndex = ids.indexOf(draggedId);
    const toIndex = ids.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, draggedId);
    this.saveSortOrder(ids);
    this.renderFleetList();
  }

  renderCommandPanel(): void {
    const ship = this.selectedShipId ? fleetManager.getShipById(this.selectedShipId) : null;

    let html = '';

    html += `<div class="cmd-section">
      <h3>当前选中</h3>
      <div class="status-info">
        ${ship ? `
          舰船：${ship.name}<br/>
          星级：${'★'.repeat(ship.stars)}<br/>
          状态：${this.getStatusText(ship.status)}<br/>
          坐标：(${Math.round(ship.x)}, ${Math.round(ship.y)})
        ` : '<span style="color:#666">未选中舰船</span>'}
      </div>
    </div>`;

    html += `<div class="cmd-section">
      <h3>任务分配</h3>`;

    const missions: MissionType[] = ['patrol', 'escort', 'raid'];
    for (const m of missions) {
      const active = this.selectedMission === m ? 'active' : '';
      html += `<button class="mission-btn ${active}" data-mission="${m}">${MISSION_LABELS[m]}</button>`;
    }

    html += `</div>`;

    html += `<div class="cmd-section">
      <h3>航线信息</h3>
      <div class="status-info">
        ${this.currentPath.length > 1
          ? `路径节点：${this.renderPathNodes(this.currentPath)}`
          : '<span style="color:#666">请在地图上点击目标节点</span>'}
      </div>
    </div>`;

    const canExecute = ship && this.selectedMission && this.currentPath.length >= 2 && ship.status === 'idle';
    html += `<div class="cmd-section">
      <button class="execute-btn" ${canExecute ? '' : 'disabled'} id="execute-btn">执 行 任 务</button>
    </div>`;

    html += `<div class="cmd-section">
      <h3>活跃任务</h3>
      <div id="active-missions" class="status-info"></div>
    </div>`;

    html += `<div class="cmd-section">
      <h3>📜 任务日志</h3>
      <div id="task-logs" class="task-logs"></div>
    </div>`;

    this.cmdContentEl.innerHTML = html;

    this.cmdContentEl.querySelectorAll('.mission-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const mission = target.dataset.mission as MissionType;
        this.setSelectedMission(mission);
      });
    });

    const executeBtn = document.getElementById('execute-btn');
    if (executeBtn && canExecute) {
      executeBtn.addEventListener('click', () => this.executeMission());
    }

    this.renderActiveMissions();
    this.renderTaskLogs();
  }

  private renderPathNodes(path: number[]): string {
    const systems = fleetManager.getStarSystems();
    return path
      .map(id => {
        const sys = systems.find(s => s.id === id);
        return sys ? sys.name : `节点${id}`;
      })
      .join(' → ');
  }

  private async executeMission(): Promise<void> {
    if (!this.selectedShipId || !this.selectedMission || this.currentPath.length < 2) return;

    try {
      await fleetManager.assignMission(this.selectedShipId, this.selectedMission, this.currentPath);
      this.selectedMission = null;
      this.currentPath = [];
      this.renderCommandPanel();
    } catch (e) {
      console.error('Failed to assign mission:', e);
    }
  }

  private renderActiveMissions(): void {
    const container = document.getElementById('active-missions');
    if (!container) return;

    const missions = fleetManager.getActiveMissions();
    if (missions.length === 0) {
      container.innerHTML = '<span style="color:#666">暂无活跃任务</span>';
      return;
    }

    let html = '';
    for (const m of missions) {
      const ship = fleetManager.getShipById(m.ship_id);
      const label = MISSION_LABELS[m.mission_type as MissionType] || m.mission_type;
      html += `${ship ? ship.name : m.ship_id} — ${label}<br/>`;
    }
    container.innerHTML = html;
  }

  renderTaskLogs(): void {
    const container = document.getElementById('task-logs');
    if (!container) return;

    const logs = fleetManager.getTaskLogs();
    if (logs.length === 0) {
      container.innerHTML = '<div class="log-entry empty">暂无日志</div>';
      return;
    }

    const recentLogs = logs.slice(-10).reverse();
    let html = '';
    for (const log of recentLogs) {
      html += `<div class="log-entry">
        <span class="log-time">[${log.timestamp}]</span>
        <span class="log-msg">${log.message}</span>
      </div>`;
    }
    container.innerHTML = html;
  }

  private getStatusText(status: string): string {
    switch (status) {
      case 'idle': return '🟢 空闲';
      case 'moving': return '🔵 航行中';
      case 'combat': return '🔴 战斗中';
      case 'destroyed': return '⚫ 已损毁';
      default: return status;
    }
  }

  private startPolling(): void {
    this.pollingInterval = window.setInterval(() => {
      this.renderFleetList();
      this.renderActiveMissions();
    }, 2000);
  }

  private startLogPolling(): void {
    this.logPollingInterval = window.setInterval(() => {
      fleetManager.queryTaskLogs();
    }, 2000);
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    if (this.logPollingInterval) {
      clearInterval(this.logPollingInterval);
      this.logPollingInterval = null;
    }
  }

  private setupMobileToggles(): void {
    const toggleLeft = document.getElementById('toggle-left');
    const toggleRight = document.getElementById('toggle-right');
    const fleetPanel = document.getElementById('fleet-panel');
    const cmdPanel = document.getElementById('command-panel');

    if (toggleLeft && fleetPanel) {
      toggleLeft.addEventListener('click', () => {
        fleetPanel.classList.toggle('open');
        if (cmdPanel) cmdPanel.classList.remove('open');
      });
    }

    if (toggleRight && cmdPanel) {
      toggleRight.addEventListener('click', () => {
        cmdPanel.classList.toggle('open');
        if (fleetPanel) fleetPanel.classList.remove('open');
      });
    }
  }
}

export const commandPanel = new CommandPanel();
