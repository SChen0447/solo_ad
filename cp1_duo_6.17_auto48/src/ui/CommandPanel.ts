import { fleetManager, Ship, MissionInfo } from '../data/FleetManager';

type MissionType = 'patrol' | 'escort' | 'raid';

const MISSION_LABELS: Record<MissionType, string> = {
  patrol: '🛡️ 巡逻',
  escort: '🚀 护航',
  raid: '⚔️ 突袭',
};

class CommandPanel {
  private fleetListEl: HTMLElement;
  private cmdContentEl: HTMLElement;
  private selectedShipId: string | null = null;
  private selectedMission: MissionType | null = null;
  private currentPath: number[] = [];
  private pollingInterval: number | null = null;
  private onShipSelect: ((id: string | null) => void) | null = null;
  private onPathCalculated: ((path: number[]) => void) | null = null;

  constructor() {
    this.fleetListEl = document.getElementById('fleet-list')!;
    this.cmdContentEl = document.getElementById('cmd-content')!;
    this.setupMobileToggles();
    this.renderCommandPanel();
    this.startPolling();
  }

  setOnShipSelect(cb: (id: string | null) => void): void {
    this.onShipSelect = cb;
  }

  setOnPathCalculated(cb: (path: number[]) => void): void {
    this.onPathCalculated = cb;
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

  setSelectedMission(mission: MissionType): void {
    this.selectedMission = mission;
    this.renderCommandPanel();
  }

  setCurrentPath(path: number[]): void {
    this.currentPath = path;
    this.renderCommandPanel();
  }

  renderFleetList(): void {
    const fleet = fleetManager.getFleet();
    this.fleetListEl.innerHTML = '';

    for (const ship of fleet) {
      const card = document.createElement('div');
      card.className = 'fleet-card';
      if (this.selectedShipId === ship.id) {
        card.classList.add('selected');
      }
      if (ship.status === 'moving') card.classList.add('glow-moving');
      else if (ship.status === 'combat') card.classList.add('glow-combat');
      else if (ship.status === 'idle') card.classList.add('glow-idle');

      const stars = '★'.repeat(ship.stars) + '☆'.repeat(5 - ship.stars);
      const hpPct = ship.max_hp > 0 ? (ship.hp / ship.max_hp * 100) : 0;
      const fpPct = ((ship.firepower - 50) / 100 * 100);
      const spPct = ((ship.speed - 100) / 200 * 100);

      let statusClass = 'status-idle';
      if (ship.status === 'moving') statusClass = 'status-moving';
      else if (ship.status === 'combat') statusClass = 'status-combat';
      else if (ship.status === 'destroyed') statusClass = 'status-combat';

      card.innerHTML = `
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
        <div class="status-dot ${statusClass}"></div>
      `;

      card.addEventListener('click', () => this.selectShip(ship.id));
      this.fleetListEl.appendChild(card);
    }
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
          ? `路径节点：${this.currentPath.join(' → ')}`
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

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
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
