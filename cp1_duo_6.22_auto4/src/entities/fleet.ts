import { FormationType, Team } from '../types';
import type { Ship } from './ship';

let fleetIdCounter = 0;

export class Fleet {
  id: string;
  ships: Ship[];
  formation: FormationType;
  centerX: number;
  centerY: number;
  targetX: number;
  targetY: number;
  team: Team;
  formationTransition: number;
  isUnderAttack: boolean;
  attackTimer: number;
  spacing: number;

  constructor(team: Team, ships: Ship[] = []) {
    this.id = `fleet_${++fleetIdCounter}`;
    this.ships = [];
    this.formation = 'triangle';
    this.centerX = 0;
    this.centerY = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.team = team;
    this.formationTransition = 2;
    this.isUnderAttack = false;
    this.attackTimer = 0;
    this.spacing = 40;

    ships.forEach(ship => this.addShip(ship));
    this.updateCenter();
  }

  addShip(ship: Ship): void {
    if (ship.team !== this.team) return;
    if (ship.fleet) {
      ship.fleet.removeShip(ship);
    }
    ship.fleet = this;
    this.ships.push(ship);
    this.updateFormationOffsets();
    this.updateCenter();
  }

  removeShip(ship: Ship): void {
    const index = this.ships.indexOf(ship);
    if (index !== -1) {
      this.ships.splice(index, 1);
      ship.fleet = null;
      ship.formationOffset = { x: 0, y: 0 };
      ship.desiredFormationOffset = { x: 0, y: 0 };
      this.updateFormationOffsets();
      this.updateCenter();
    }
  }

  setFormation(formation: FormationType): void {
    this.formation = formation;
    this.formationTransition = 2;
    this.updateFormationOffsets();
  }

  setTarget(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  updateFormationOffsets(): void {
    const count = this.ships.length;
    if (count === 0) return;

    const offsets = this.calculateFormationOffsets(count, this.formation);
    this.ships.forEach((ship, index) => {
      let offset = offsets[index] || { x: 0, y: 0 };
      if (this.isUnderAttack) {
        offset = {
          x: offset.x * 0.5,
          y: offset.y * 0.5
        };
      }
      ship.setFormationOffset(offset);
    });
  }

  calculateFormationOffsets(count: number, formation: FormationType): Array<{ x: number; y: number }> {
    const offsets: Array<{ x: number; y: number }> = [];
    const s = this.spacing;

    if (formation === 'triangle') {
      let row = 0;
      let posInRow = 0;
      let shipsInRow = 1;
      for (let i = 0; i < count; i++) {
        const x = (posInRow - (shipsInRow - 1) / 2) * s;
        const y = row * s;
        offsets.push({ x, y });
        posInRow++;
        if (posInRow >= shipsInRow) {
          row++;
          posInRow = 0;
          shipsInRow++;
        }
      }
    } else if (formation === 'wedge') {
      for (let i = 0; i < count; i++) {
        if (i === 0) {
          offsets.push({ x: 0, y: 0 });
        } else {
          const side = Math.ceil(i / 2);
          const isLeft = i % 2 === 1;
          offsets.push({
            x: isLeft ? -side * s * 0.8 : side * s * 0.8,
            y: side * s * 0.6
          });
        }
      }
    } else if (formation === 'column') {
      for (let i = 0; i < count; i++) {
        offsets.push({
          x: (i % 2 === 0 ? -1 : 1) * Math.floor(i / 2) * s * 0.3,
          y: i * s * 0.8
        });
      }
    }

    return offsets;
  }

  updateCenter(): void {
    if (this.ships.length === 0) {
      this.centerX = 0;
      this.centerY = 0;
      return;
    }

    let sumX = 0;
    let sumY = 0;
    this.ships.forEach(ship => {
      sumX += ship.x;
      sumY += ship.y;
    });
    this.centerX = sumX / this.ships.length;
    this.centerY = sumY / this.ships.length;

    if (this.ships.length > 0 && this.targetX === 0 && this.targetY === 0) {
      this.targetX = this.centerX;
      this.targetY = this.centerY;
    }
  }

  update(dt: number): void {
    this.ships = this.ships.filter(ship => ship.isAlive);

    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.isUnderAttack = false;
        this.updateFormationOffsets();
      }
    }

    if (this.formationTransition > 0) {
      this.formationTransition -= dt;
    }

    this.updateCenter();
  }

  notifyUnderAttack(): void {
    this.isUnderAttack = true;
    this.attackTimer = 3;
    this.updateFormationOffsets();

    this.ships.forEach(ship => {
      if (Math.random() < 0.3) {
        ship.startDodge();
      }
    });
  }

  setSelected(selected: boolean): void {
    this.ships.forEach(ship => {
      ship.isSelected = selected;
    });
  }

  getAliveCount(): number {
    return this.ships.filter(s => s.isAlive).length;
  }

  getTotalHealth(): number {
    return this.ships.reduce((sum, s) => sum + Math.max(0, s.health), 0);
  }

  getMaxHealth(): number {
    return this.ships.reduce((sum, s) => sum + s.maxHealth, 0);
  }

  render(ctx: CanvasRenderingContext2D, currentTime: number): void {
    if (this.ships.length === 0) return;

    if (this.ships[0].isSelected) {
      const pulsePhase = (currentTime % 2000) / 2000;
      const radius = Math.max(...this.ships.map(s => {
        const dx = s.x - this.centerX;
        const dy = s.y - this.centerY;
        return Math.sqrt(dx * dx + dy * dy);
      })) + 30;

      ctx.save();
      ctx.strokeStyle = `rgba(74, 158, 255, ${0.3 + Math.sin(pulsePhase * Math.PI * 2) * 0.2})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}
