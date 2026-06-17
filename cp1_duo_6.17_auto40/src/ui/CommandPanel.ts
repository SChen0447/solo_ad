import { fleetManager, ShipData } from '../data/FleetManager';

type MissionType = 'patrol' | 'escort' | 'raid' | null;

class CommandPanel {
  private fleetListEl: HTMLElement;
  private missionButtons: NodeListOf<HTMLElement>;
  private executeBtn: HTMLButtonElement;
  private selectedShipEl: HTMLElement;
  private targetNodeEl: HTMLElement;
  private missionTypeEl: HTMLElement;
  private selectedMission: MissionType = null;
  private targetSystemId: string | null = null;
  private targetSystemName: string | null = null;

  constructor() {
    this.fleetListEl = document.getElementById('fleet-list')!;
    this.missionButtons = document.querySelectorAll('.mission-btn');
    this.executeBtn = document.getElementById('execute-btn') as HTMLButtonElement;
    this.selectedShipEl = document.getElementById('selected-ship')!;
    this.targetNodeEl = document.getElementById('target-node')!;
    this.missionTypeEl = document.getElementById('mission-type')!;

    this.init();
  }

  private init(): void {
    this.missionButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mission = btn.getAttribute('data-mission') as MissionType;
        this.setSelectedMission(mission);
      });
    });

    this.executeBtn.addEventListener('click', () => {
      this.handleExecute();
    });

    fleetManager.subscribe(() => this.render());
    this.updateExecuteButton();
  }

  setTargetSystem(systemId: string, systemName: string): void {
    this.targetSystemId = systemId;
    this.targetSystemName = systemName;
    this.targetNodeEl.textContent = systemName;
    this.updateExecuteButton();
  }

  private setSelectedMission(mission: MissionType): void {
    this.selectedMission = mission;
    this.missionButtons.forEach(btn => {
      if (btn.getAttribute('data-mission') === mission) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
    this.missionTypeEl.textContent = mission ? 
      mission.charAt(0).toUpperCase() + mission.slice(1) : 'None';
    this.updateExecuteButton();
  }

  private updateExecuteButton(): void {
    const ship = fleetManager.getSelectedShip();
    const canExecute = ship && this.selectedMission && this.targetSystemId && ship.alive;
    this.executeBtn.disabled = !canExecute;
  }

  private async handleExecute(): Promise<void> {
    const ship = fleetManager.getSelectedShip();
    if (!ship || !this.selectedMission || !this.targetSystemId) return;

    const nearest = fleetManager.findNearestSystem(ship.x, ship.y);
    if (!nearest) return;

    const path = await fleetManager.findPath(nearest.id, this.targetSystemId);
    if (path.length === 0) {
      alert('No valid path found');
      return;
    }

    await fleetManager.assignMission(
      ship.id,
      this.selectedMission,
      this.targetSystemId,
      path
    );
  }

  render(): void {
    const ships = fleetManager.getShips();
    const selectedShip = fleetManager.getSelectedShip();

    this.selectedShipEl.textContent = selectedShip ? selectedShip.name : 'None';
    this.updateExecuteButton();

    this.fleetListEl.innerHTML = '';

    ships.forEach(ship => {
      const card = this.createShipCard(ship);
      this.fleetListEl.appendChild(card);
    });
  }

  private createShipCard(ship: ShipData): HTMLElement {
    const card = document.createElement('div');
    card.className = `ship-card state-${ship.status}`;
    if (!ship.alive) {
      card.style.opacity = '0.4';
    }

    const selected = fleetManager.getSelectedShip();
    if (selected && selected.id === ship.id) {
      card.classList.add('selected');
    }

    const starsHtml = Array.from({ length: ship.stars }, () => 
      '<span class="star">&#9733;</span>'
    ).join('');

    const hullPercent = (ship.hull / ship.maxHull) * 100;

    card.innerHTML = `
      <div class="stars">${starsHtml}</div>
      <div class="ship-name">${ship.name}</div>
      <div class="stat-row">
        <span class="stat-label">Hull</span>
        <div class="stat-bar">
          <div class="stat-fill hull" style="width: ${hullPercent}%"></div>
        </div>
        <span class="stat-value">${ship.hull}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Fire</span>
        <div class="stat-bar">
          <div class="stat-fill firepower" style="width: ${(ship.firepower / 150) * 100}%"></div>
        </div>
        <span class="stat-value">${ship.firepower}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Speed</span>
        <div class="stat-bar">
          <div class="stat-fill speed" style="width: ${(ship.speed / 300) * 100}%"></div>
        </div>
        <span class="stat-value">${ship.speed}</span>
      </div>
      <div class="status-indicator status-${ship.status}"></div>
    `;

    card.addEventListener('click', () => {
      if (!ship.alive) return;
      const current = fleetManager.getSelectedShip();
      if (current && current.id === ship.id) {
        fleetManager.setSelectedShip(null);
      } else {
        fleetManager.setSelectedShip(ship.id);
      }
    });

    return card;
  }
}

export const commandPanel = new CommandPanel();
