import {
  Unit,
  UnitType,
  Owner,
  MAP_SIZE,
  createUnit,
  UNIT_DEFINITIONS,
} from '../data/unitData';
import { MapRenderer } from '../renderer/MapRenderer';
import { UIManager, GamePhase } from '../renderer/UIManager';
import {
  CombatResult,
  AIDecision,
  calculateDamage,
  applyCombatResult,
  getAIAction,
} from './CombatResolver';

const DEPLOY_PER_TYPE = 3;
const AI_DEPLOY_REGION = { xMin: 0, xMax: 11, yMin: 0, yMax: 3 };
const PLAYER_DEPLOY_REGION = { xMin: 0, xMax: 11, yMin: 8, yMax: 11 };

export class GameEngine {
  private renderer: MapRenderer;
  private ui: UIManager;
  private units: Unit[] = [];
  private phase: GamePhase = 'deploy';
  private turn = 1;
  private selectedUnitId: string | null = null;
  private selectedDeployType: UnitType | null = null;
  private deployCounts: Record<UnitType, number> = {
    [UnitType.Infantry]: DEPLOY_PER_TYPE,
    [UnitType.Cavalry]: DEPLOY_PER_TYPE,
    [UnitType.Archer]: DEPLOY_PER_TYPE,
  };
  private aiDeployCounts: Record<UnitType, number> = {
    [UnitType.Infantry]: DEPLOY_PER_TYPE,
    [UnitType.Cavalry]: DEPLOY_PER_TYPE,
    [UnitType.Archer]: DEPLOY_PER_TYPE,
  };
  private animFrameId: number = 0;
  private aiDeployed = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new MapRenderer(canvas);
    this.ui = new UIManager();

    this.ui.setCallbacks(
      (type) => this.onDeployTypeSelect(type),
      (unitId) => this.onUnitClick(unitId),
      (action) => this.onAction(action)
    );

    this.setupCanvasEvents(canvas);
  }

  start(): void {
    this.phase = 'deploy';
    this.turn = 1;
    this.units = [];
    this.selectedUnitId = null;
    this.selectedDeployType = null;
    this.deployCounts = {
      [UnitType.Infantry]: DEPLOY_PER_TYPE,
      [UnitType.Cavalry]: DEPLOY_PER_TYPE,
      [UnitType.Archer]: DEPLOY_PER_TYPE,
    };
    this.aiDeployCounts = {
      [UnitType.Infantry]: DEPLOY_PER_TYPE,
      [UnitType.Cavalry]: DEPLOY_PER_TYPE,
      [UnitType.Archer]: DEPLOY_PER_TYPE,
    };
    this.aiDeployed = false;

    this.autoDeployAI();
    this.updateUI();
    this.gameLoop(performance.now());
  }

  private autoDeployAI(): void {
    const positions: [number, number][] = [];
    for (let y = AI_DEPLOY_REGION.yMin; y <= AI_DEPLOY_REGION.yMax; y++) {
      for (let x = AI_DEPLOY_REGION.xMin; x <= AI_DEPLOY_REGION.xMax; x++) {
        positions.push([x, y]);
      }
    }

    const shuffled = positions.sort(() => Math.random() - 0.5);
    let idx = 0;

    const types: UnitType[] = [UnitType.Infantry, UnitType.Cavalry, UnitType.Archer];
    for (const type of types) {
      for (let i = 0; i < DEPLOY_PER_TYPE; i++) {
        if (idx < shuffled.length) {
          const [x, y] = shuffled[idx++];
          const unit = createUnit(type, Owner.AI, x, y, i);
          this.units.push(unit);
        }
      }
    }
    this.aiDeployed = true;
  }

  private setupCanvasEvents(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('click', (e) => this.onCanvasClick(e));
    canvas.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
    canvas.addEventListener('mouseleave', () => {
      this.renderer.setHoveredCell(null);
      this.renderer.setDeployGhost(null, -1, -1);
      this.ui.hideTooltip();
    });
  }

  private onCanvasClick(e: MouseEvent): void {
    const cell = this.renderer.cellFromPixel(e.clientX, e.clientY);
    if (!cell) return;

    if (this.phase === 'deploy') {
      this.handleDeployClick(cell.x, cell.y);
    } else if (this.phase === 'select_unit') {
      this.handleSelectUnitFromMap(cell.x, cell.y);
    } else if (this.phase === 'select_target') {
      this.handleSelectTargetFromMap(cell.x, cell.y);
    }
  }

  private onCanvasMouseMove(e: MouseEvent): void {
    const cell = this.renderer.cellFromPixel(e.clientX, e.clientY);
    if (!cell) {
      this.renderer.setHoveredCell(null);
      this.renderer.setDeployGhost(null, -1, -1);
      this.ui.hideTooltip();
      return;
    }

    this.renderer.setHoveredCell(cell);

    if (this.phase === 'deploy' && this.selectedDeployType) {
      this.renderer.setDeployGhost(
        UNIT_DEFINITIONS[this.selectedDeployType].emoji,
        cell.x,
        cell.y
      );
    } else {
      this.renderer.setDeployGhost(null, -1, -1);
    }

    const hoveredUnit = this.findUnitAt(cell.x, cell.y);
    if (hoveredUnit && hoveredUnit.alive) {
      this.ui.showTooltip(hoveredUnit, e.clientX, e.clientY);
    } else {
      this.ui.hideTooltip();
    }
  }

  private onDeployTypeSelect(type: UnitType): void {
    if (this.deployCounts[type] <= 0) return;
    this.selectedDeployType = type;
  }

  private handleDeployClick(x: number, y: number): void {
    if (!this.selectedDeployType) return;
    if (this.deployCounts[this.selectedDeployType] <= 0) return;

    if (y < PLAYER_DEPLOY_REGION.yMin || y > PLAYER_DEPLOY_REGION.yMax) return;

    const existing = this.findUnitAt(x, y);
    if (existing) return;

    const type = this.selectedDeployType;
    const count = DEPLOY_PER_TYPE - this.deployCounts[type];
    const unit = createUnit(type, Owner.Player, x, y, count);
    this.units.push(unit);
    this.deployCounts[type]--;

    this.renderer.addBounceAnimation(unit);

    if (this.deployCounts[type] <= 0) {
      this.selectedDeployType = null;
    }

    const totalRemaining =
      this.deployCounts[UnitType.Infantry] +
      this.deployCounts[UnitType.Cavalry] +
      this.deployCounts[UnitType.Archer];

    if (totalRemaining <= 0) {
      this.startBattle();
    }

    this.updateUI();
  }

  private startBattle(): void {
    this.phase = 'select_unit';
    this.selectedDeployType = null;
    this.renderer.startFlipAnimation();
    this.updateUI();
  }

  private handleSelectUnitFromMap(x: number, y: number): void {
    const unit = this.findUnitAt(x, y);
    if (!unit || unit.owner !== Owner.Player || !unit.alive) return;

    this.selectedUnitId = unit.id;
    this.phase = 'select_target';
    this.renderer.setSelectedCell({ x: unit.x, y: unit.y });
    this.updateUI();
  }

  private handleSelectTargetFromMap(x: number, y: number): void {
    const unit = this.findUnitAt(x, y);
    if (!unit || unit.owner !== Owner.AI || !unit.alive) return;

    this.executeCombat(this.selectedUnitId!, unit.id);
  }

  private onUnitClick(unitId: string): void {
    if (this.phase === 'select_unit') {
      const unit = this.units.find(u => u.id === unitId);
      if (!unit || unit.owner !== Owner.Player || !unit.alive) return;
      this.selectedUnitId = unitId;
      this.phase = 'select_target';
      this.renderer.setSelectedCell({ x: unit.x, y: unit.y });
      this.updateUI();
    } else if (this.phase === 'select_target') {
      const unit = this.units.find(u => u.id === unitId);
      if (!unit || !unit.alive) return;

      if (unit.owner === Owner.AI) {
        this.executeCombat(this.selectedUnitId!, unitId);
      } else if (unit.owner === Owner.Player) {
        this.selectedUnitId = unitId;
        this.renderer.setSelectedCell({ x: unit.x, y: unit.y });
        this.updateUI();
      }
    }
  }

  private onAction(action: string): void {
    if (action === 'cancel') {
      this.selectedUnitId = null;
      this.phase = 'select_unit';
      this.renderer.setSelectedCell(null);
      this.updateUI();
    } else if (action === 'restart') {
      this.start();
    }
  }

  private executeCombat(attackerId: string, defenderId: string): void {
    const attacker = this.units.find(u => u.id === attackerId)!;
    const defender = this.units.find(u => u.id === defenderId)!;

    const result = calculateDamage(attacker, defender);
    applyCombatResult(this.units, result);

    this.renderer.addFloatingText(defender.x, defender.y, `-${result.damageToDefender}`, '#f44336');

    if (result.counterAttack && result.damageToAttacker > 0) {
      this.renderer.addFloatingText(attacker.x, attacker.y, `-${result.damageToAttacker}`, '#2196f3');
    }

    if (result.defenderDied) {
      const deadUnit = this.units.find(u => u.id === defenderId)!;
      this.renderer.addDeathAnimation(deadUnit);
    }

    if (result.attackerDied) {
      const deadUnit = this.units.find(u => u.id === attackerId)!;
      this.renderer.addDeathAnimation(deadUnit);
    }

    this.selectedUnitId = null;
    this.renderer.setSelectedCell(null);

    const winner = this.checkGameOver();
    if (winner) {
      this.phase = 'game_over';
      this.updateUI();
      this.ui.showGameOver(winner);
      return;
    }

    this.phase = 'ai_turn';
    this.updateUI();

    setTimeout(() => {
      this.executeAITurn();
    }, 800 + Math.random() * 700);
  }

  private executeAITurn(): void {
    const aiUnits = this.units.filter(u => u.owner === Owner.AI && u.alive);
    const playerUnits = this.units.filter(u => u.owner === Owner.Player && u.alive);

    const decision = getAIAction(aiUnits, playerUnits);
    if (!decision) {
      this.phase = 'game_over';
      this.ui.showGameOver(Owner.Player);
      return;
    }

    const attacker = this.units.find(u => u.id === decision.attackerId)!;
    const defender = this.units.find(u => u.id === decision.targetId)!;

    const result = calculateDamage(attacker, defender);
    applyCombatResult(this.units, result);

    this.renderer.addFloatingText(defender.x, defender.y, `-${result.damageToDefender}`, '#f44336');

    if (result.counterAttack && result.damageToAttacker > 0) {
      this.renderer.addFloatingText(attacker.x, attacker.y, `-${result.damageToAttacker}`, '#2196f3');
    }

    if (result.defenderDied) {
      const deadUnit = this.units.find(u => u.id === decision.targetId)!;
      this.renderer.addDeathAnimation(deadUnit);
    }

    if (result.attackerDied) {
      const deadUnit = this.units.find(u => u.id === decision.attackerId)!;
      this.renderer.addDeathAnimation(deadUnit);
    }

    const winner = this.checkGameOver();
    if (winner) {
      this.phase = 'game_over';
      this.updateUI();
      this.ui.showGameOver(winner);
      return;
    }

    this.turn++;
    this.phase = 'select_unit';
    this.renderer.startFlipAnimation();
    this.updateUI();
  }

  private checkGameOver(): Owner | null {
    const playerAlive = this.units.some(u => u.owner === Owner.Player && u.alive);
    const aiAlive = this.units.some(u => u.owner === Owner.AI && u.alive);

    if (!playerAlive) return Owner.AI;
    if (!aiAlive) return Owner.Player;
    return null;
  }

  private findUnitAt(x: number, y: number): Unit | undefined {
    return this.units.find(u => u.x === x && u.y === y && u.alive);
  }

  private updateUI(): void {
    this.ui.setPhase(this.phase, this.turn, this.deployCounts, this.units);
    this.ui.updateStatusCards(this.units, this.selectedUnitId);
  }

  private gameLoop = (now: number): void => {
    this.renderer.render(this.units, now, this.phase === 'deploy', []);
    this.animFrameId = requestAnimationFrame(this.gameLoop);
  };

  destroy(): void {
    cancelAnimationFrame(this.animFrameId);
  }
}
