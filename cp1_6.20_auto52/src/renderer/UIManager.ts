import { Unit, Owner, UnitType, UNIT_DEFINITIONS } from '../data/unitData';

export type GamePhase = 'deploy' | 'select_unit' | 'select_target' | 'ai_turn' | 'game_over';

export class UIManager {
  private playerCardsEl: HTMLElement;
  private aiCardsEl: HTMLElement;
  private turnInfoEl: HTMLElement;
  private hintTextEl: HTMLElement;
  private deployBarEl: HTMLElement;
  private actionButtonsEl: HTMLElement;
  private statusPanelEl: HTMLElement;
  private tooltipEl: HTMLElement;

  private onDeploySelect: ((type: UnitType) => void) | null = null;
  private onUnitSelect: ((unitId: string) => void) | null = null;
  private onAction: ((action: string) => void) | null = null;

  constructor() {
    this.playerCardsEl = document.getElementById('player-cards')!;
    this.aiCardsEl = document.getElementById('ai-cards')!;
    this.turnInfoEl = document.getElementById('turn-info')!;
    this.hintTextEl = document.getElementById('hint-text')!;
    this.deployBarEl = document.getElementById('deploy-bar')!;
    this.actionButtonsEl = document.getElementById('action-buttons')!;
    this.statusPanelEl = document.getElementById('status-panel')!;
    this.tooltipEl = document.getElementById('tooltip')!;
  }

  setCallbacks(
    onDeploySelect: (type: UnitType) => void,
    onUnitSelect: (unitId: string) => void,
    onAction: (action: string) => void
  ): void {
    this.onDeploySelect = onDeploySelect;
    this.onUnitSelect = onUnitSelect;
    this.onAction = onAction;
  }

  updateStatusCards(units: Unit[], selectedUnitId: string | null): void {
    this.renderCardGroup(
      this.playerCardsEl,
      units.filter(u => u.owner === Owner.Player),
      selectedUnitId
    );
    this.renderCardGroup(
      this.aiCardsEl,
      units.filter(u => u.owner === Owner.AI),
      selectedUnitId
    );
  }

  private renderCardGroup(
    container: HTMLElement,
    units: Unit[],
    selectedUnitId: string | null
  ): void {
    container.innerHTML = '';
    for (const unit of units) {
      const card = document.createElement('div');
      card.className = 'unit-card' + (unit.id === selectedUnitId ? ' selected' : '') + (!unit.alive ? ' dead' : '');

      const hpRatio = unit.hp / unit.maxHp;
      let barColor: string;
      if (hpRatio > 0.6) barColor = '#4caf50';
      else if (hpRatio > 0.3) barColor = '#ff9800';
      else barColor = '#f44336';

      card.innerHTML = `
        <span class="emoji">${unit.emoji}</span>
        <div class="info">
          <div class="name-row">
            <span>${unit.name}</span>
            <span>${unit.hp}/${unit.maxHp}</span>
          </div>
          <div class="hp-bar"><div class="hp-fill" style="width:${hpRatio * 100}%;background:${barColor}"></div></div>
          <div class="pos">位置: (${unit.x}, ${unit.y})</div>
        </div>
      `;

      if (unit.alive) {
        card.addEventListener('click', () => {
          if (this.onUnitSelect) this.onUnitSelect(unit.id);
        });
      }

      container.appendChild(card);
    }
  }

  setPhase(
    phase: GamePhase,
    turn: number,
    deployCounts: Record<UnitType, number>,
    units: Unit[]
  ): void {
    this.turnInfoEl.textContent = `第 ${turn} 回合`;
    this.statusPanelEl.classList.toggle('ai-turn', phase === 'ai_turn');

    switch (phase) {
      case 'deploy':
        this.hintTextEl.textContent = '选择兵种，点击地图部署单位';
        this.showDeployBar(deployCounts);
        this.actionButtonsEl.innerHTML = '';
        break;

      case 'select_unit':
        this.hintTextEl.textContent = '选择你的一个单位进行行动';
        this.deployBarEl.innerHTML = '';
        this.showSelectUnitButtons(units);
        break;

      case 'select_target':
        this.hintTextEl.textContent = '选择一个敌方单位作为攻击目标';
        this.deployBarEl.innerHTML = '';
        this.showSelectTargetButtons(units);
        break;

      case 'ai_turn':
        this.hintTextEl.textContent = 'AI 思考中...';
        this.deployBarEl.innerHTML = '';
        this.actionButtonsEl.innerHTML = '';
        break;

      case 'game_over':
        this.hintTextEl.textContent = '游戏结束';
        this.deployBarEl.innerHTML = '';
        this.actionButtonsEl.innerHTML = '';
        break;
    }
  }

  private showDeployBar(deployCounts: Record<UnitType, number>): void {
    this.deployBarEl.innerHTML = '';
    const types: UnitType[] = [UnitType.Infantry, UnitType.Cavalry, UnitType.Archer];

    for (const type of types) {
      const def = UNIT_DEFINITIONS[type];
      const remaining = deployCounts[type] ?? 0;
      const btn = document.createElement('button');
      btn.className = 'deploy-btn';
      btn.textContent = `${def.emoji} ${def.name} (剩余${remaining})`;
      btn.disabled = remaining <= 0;

      btn.addEventListener('click', () => {
        this.deployBarEl.querySelectorAll('.deploy-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.onDeploySelect) this.onDeploySelect(type);
      });

      this.deployBarEl.appendChild(btn);
    }
  }

  private showSelectUnitButtons(units: Unit[]): void {
    this.actionButtonsEl.innerHTML = '';
    const alive = units.filter(u => u.owner === Owner.Player && u.alive);
    for (const unit of alive) {
      const btn = document.createElement('button');
      btn.className = 'action-btn';
      btn.textContent = `${unit.emoji} ${unit.name} (${unit.hp}/${unit.maxHp})`;
      btn.addEventListener('click', () => {
        if (this.onUnitSelect) this.onUnitSelect(unit.id);
      });
      this.actionButtonsEl.appendChild(btn);
    }
  }

  private showSelectTargetButtons(units: Unit[]): void {
    this.actionButtonsEl.innerHTML = '';
    const enemies = units.filter(u => u.owner === Owner.AI && u.alive);
    for (const unit of enemies) {
      const btn = document.createElement('button');
      btn.className = 'action-btn';
      btn.textContent = `攻击 ${unit.emoji} ${unit.name} (${unit.hp}/${unit.maxHp})`;
      btn.addEventListener('click', () => {
        if (this.onUnitSelect) this.onUnitSelect(unit.id);
      });
      this.actionButtonsEl.appendChild(btn);
    }

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'action-btn';
    cancelBtn.textContent = '取消选择';
    cancelBtn.addEventListener('click', () => {
      if (this.onAction) this.onAction('cancel');
    });
    this.actionButtonsEl.appendChild(cancelBtn);
  }

  showTooltip(unit: Unit, x: number, y: number): void {
    this.tooltipEl.style.display = 'block';
    this.tooltipEl.style.left = `${x + 12}px`;
    this.tooltipEl.style.top = `${y + 12}px`;
    this.tooltipEl.innerHTML = `
      <strong>${unit.emoji} ${unit.name}</strong><br/>
      血量: ${unit.hp}/${unit.maxHp}<br/>
      攻击力: ${unit.attack}<br/>
      防御力: ${unit.defense}
    `;
  }

  hideTooltip(): void {
    this.tooltipEl.style.display = 'none';
  }

  showGameOver(winner: Owner): void {
    this.turnInfoEl.textContent = '游戏结束';
    this.hintTextEl.textContent = winner === Owner.Player ? '🎉 你赢了！' : '💀 AI 获胜！';
    this.deployBarEl.innerHTML = '';
    this.actionButtonsEl.innerHTML = '';

    const restartBtn = document.createElement('button');
    restartBtn.className = 'action-btn primary';
    restartBtn.textContent = '重新开始';
    restartBtn.addEventListener('click', () => {
      if (this.onAction) this.onAction('restart');
    });
    this.actionButtonsEl.appendChild(restartBtn);
  }
}
