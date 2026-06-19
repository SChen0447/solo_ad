import {
  ShipType,
  PlacedShip,
  ShipPreset,
  getShipPreset,
  SHIP_TYPE_LIST,
  MAX_FLEET_SIZE,
  SHIP_PRESETS
} from './ShipConfig';

const STORAGE_KEY = 'space_fleet_fleet_v1';
const GRID_COLS = 12;
const GRID_ROWS = 10;
const CELL_SIZE = 48;

export interface FleetData {
  ships: PlacedShip[];
}

export class FleetManager {
  private ships: PlacedShip[] = [];
  private container: HTMLElement | null = null;
  private selectedId: string | null = null;
  private draggingShip: PlacedShip | null = null;
  private dragOffset = { x: 0, y: 0 };
  private onChange: ((fleet: FleetData) => void) | null = null;
  private idCounter = 0;

  constructor() {
    this.loadFleet();
  }

  getFleet(): FleetData {
    return { ships: [...this.ships.map(s => ({ ...s, stats: { ...s.stats } }))] };
  }

  saveFleet(): void {
    try {
      const data: FleetData = {
        ships: this.ships.map(s => ({
          id: s.id,
          type: s.type,
          gridX: s.gridX,
          gridY: s.gridY,
          facing: s.facing,
          name: s.name,
          stats: s.stats
        }))
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save fleet', e);
    }
  }

  loadFleet(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data: FleetData = JSON.parse(raw);
        this.ships = data.ships || [];
        if (this.ships.length > 0) {
          const maxId = Math.max(...this.ships.map(s => parseInt(s.id.split('_')[1] || '0', 10)), 0);
          this.idCounter = maxId + 1;
        }
      }
      if (this.ships.length === 0) {
        this.createDefaultFleet();
      }
    } catch (e) {
      console.error('Failed to load fleet', e);
      this.createDefaultFleet();
    }
  }

  private createDefaultFleet(): void {
    this.ships = [
      this.makeShip(ShipType.Battleship, 2, 2, 0),
      this.makeShip(ShipType.Cruiser, 2, 5, 0),
      this.makeShip(ShipType.Cruiser, 2, 7, 0),
      this.makeShip(ShipType.Destroyer, 4, 3, 0),
      this.makeShip(ShipType.Destroyer, 4, 6, 0),
      this.makeShip(ShipType.Frigate, 6, 2, 0),
      this.makeShip(ShipType.Frigate, 6, 5, 0),
      this.makeShip(ShipType.Frigate, 6, 8, 0)
    ];
    this.saveFleet();
  }

  private makeShip(type: ShipType, gridX: number, gridY: number, facing: number): PlacedShip {
    const preset: ShipPreset = getShipPreset(type);
    return {
      id: `ship_${this.idCounter++}`,
      type,
      gridX,
      gridY,
      facing,
      name: preset.name + '-' + (this.idCounter),
      stats: { ...preset.stats }
    };
  }

  addShip(type: ShipType): boolean {
    if (this.ships.length >= MAX_FLEET_SIZE) return false;
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        if (!this.getShipAt(x, y)) {
          this.ships.push(this.makeShip(type, x, y, 0));
          this.saveFleet();
          this.emitChange();
          return true;
        }
      }
    }
    return false;
  }

  removeShip(id: string): void {
    this.ships = this.ships.filter(s => s.id !== id);
    if (this.selectedId === id) this.selectedId = null;
    this.saveFleet();
    this.emitChange();
  }

  getShipAt(gridX: number, gridY: number): PlacedShip | undefined {
    return this.ships.find(s => s.gridX === gridX && s.gridY === gridY);
  }

  setOnChange(cb: (fleet: FleetData) => void): void {
    this.onChange = cb;
  }

  private emitChange(): void {
    if (this.onChange) this.onChange(this.getFleet());
  }

  render(root: HTMLElement, onStartBattle: () => void): void {
    this.container = root;
    root.innerHTML = '';

    const layout = document.createElement('div');
    layout.style.cssText = 'width:100%;height:100%;display:flex;position:relative;';

    const stage = document.createElement('div');
    stage.id = 'fleet-stage';
    stage.style.cssText = `
      flex:1;display:flex;align-items:center;justify-content:center;
      background: radial-gradient(ellipse at center, #0f1544 0%, #050818 100%);
      position:relative;overflow:hidden;
    `;

    const stars = document.createElement('canvas');
    stars.width = 1920; stars.height = 1080;
    stars.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:0.7;';
    this.drawStars(stars);
    stage.appendChild(stars);

    const gridWrap = document.createElement('div');
    gridWrap.style.cssText = 'position:relative;animation: slideInLeft 0.3s ease-out;';

    const gridW = GRID_COLS * CELL_SIZE;
    const gridH = GRID_ROWS * CELL_SIZE;
    gridWrap.style.width = gridW + 'px';
    gridWrap.style.height = gridH + 'px';

    const gridCanvas = document.createElement('canvas');
    gridCanvas.width = gridW; gridCanvas.height = gridH;
    gridCanvas.style.cssText = 'position:absolute;top:0;left:0;border:1px solid rgba(0,212,255,0.2);border-radius:6px;';
    this.drawGrid(gridCanvas, gridW, gridH);
    gridWrap.appendChild(gridCanvas);

    const shipLayer = document.createElement('div');
    shipLayer.id = 'ship-layer';
    shipLayer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
    gridWrap.appendChild(shipLayer);

    this.renderShips(shipLayer, gridCanvas);

    gridWrap.addEventListener('click', (e) => {
      const rect = gridWrap.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
      const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);
      if (x >= 0 && x < GRID_COLS && y >= 0 && y < GRID_ROWS) {
        const s = this.getShipAt(x, y);
        this.selectedId = s ? s.id : null;
        this.renderShips(shipLayer, gridCanvas);
      }
    });

    stage.appendChild(gridWrap);

    const sidePanel = document.createElement('div');
    sidePanel.className = 'panel';
    sidePanel.style.cssText = `
      width:380px;flex-shrink:0;padding:20px;overflow-y:auto;
      animation: slideInRight 0.3s ease-out;border-left:1px solid rgba(0,212,255,0.3);
      border-radius:0;background:rgba(8,12,40,0.92);
    `;

    const title = document.createElement('h2');
    title.textContent = '舰队配置';
    title.style.cssText = 'color:#00d4ff;margin-bottom:12px;font-size:20px;text-shadow:0 0 10px rgba(0,212,255,0.6);';
    sidePanel.appendChild(title);

    const countBar = document.createElement('div');
    countBar.style.cssText = 'margin-bottom:18px;padding:10px;border:1px solid rgba(0,212,255,0.2);border-radius:4px;background:rgba(0,212,255,0.05);';
    const countInfo = document.createElement('div');
    countInfo.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:6px;font-size:14px;';
    countInfo.innerHTML = `<span>舰船数量</span><span style="color:#00d4ff;font-weight:bold;">${this.ships.length} / ${MAX_FLEET_SIZE}</span>`;
    const barBg = document.createElement('div');
    barBg.style.cssText = 'height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;';
    const barFill = document.createElement('div');
    barFill.style.cssText = `height:100%;width:${(this.ships.length / MAX_FLEET_SIZE) * 100}%;background:linear-gradient(90deg,#00d4ff,#7aff9a);border-radius:3px;transition:width 0.3s;`;
    barBg.appendChild(barFill);
    countBar.appendChild(countInfo);
    countBar.appendChild(barBg);
    sidePanel.appendChild(countBar);

    const listTitle = document.createElement('h3');
    listTitle.textContent = '舰船类型';
    listTitle.style.cssText = 'color:#e0e8ff;margin:16px 0 10px;font-size:14px;letter-spacing:2px;';
    sidePanel.appendChild(listTitle);

    SHIP_TYPE_LIST.forEach(t => {
      const preset = SHIP_PRESETS[t];
      const card = document.createElement('div');
      card.style.cssText = `
        margin-bottom:10px;padding:12px;border:1px solid rgba(0,212,255,0.2);
        border-radius:4px;cursor:pointer;transition:all 0.2s ease-out;
        background:rgba(255,255,255,0.02);display:flex;align-items:center;gap:12px;
      `;
      card.onmouseenter = () => {
        card.style.background = 'rgba(0,212,255,0.12)';
        card.style.borderColor = 'rgba(0,212,255,0.6)';
        card.style.boxShadow = '0 0 12px rgba(0,212,255,0.3)';
      };
      card.onmouseleave = () => {
        card.style.background = 'rgba(255,255,255,0.02)';
        card.style.borderColor = 'rgba(0,212,255,0.2)';
        card.style.boxShadow = 'none';
      };
      card.onclick = () => {
        if (this.ships.length >= MAX_FLEET_SIZE) {
          alert('舰队已达到最大数量 ' + MAX_FLEET_SIZE);
          return;
        }
        if (this.addShip(t)) {
          this.renderShips(shipLayer, gridCanvas);
          countInfo.innerHTML = `<span>舰船数量</span><span style="color:#00d4ff;font-weight:bold;">${this.ships.length} / ${MAX_FLEET_SIZE}</span>`;
          barFill.style.width = `${(this.ships.length / MAX_FLEET_SIZE) * 100}%`;
        }
      };

      const icon = document.createElement('div');
      icon.style.cssText = `
        width:42px;height:42px;border-radius:50%;flex-shrink:0;
        background:radial-gradient(circle, ${preset.stats.color}33 0%, transparent 70%);
        border:2px solid ${preset.stats.color};position:relative;
        animation: breathe 2s ease-in-out infinite;
        display:flex;align-items:center;justify-content:center;
      `;
      icon.innerHTML = `<div style="width:20px;height:12px;background:${preset.stats.accentColor};clip-path:polygon(0 50%,40% 0,100% 30%,100% 70%,40% 100%);"></div>`;

      const info = document.createElement('div');
      info.style.cssText = 'flex:1;';
      const nm = document.createElement('div');
      nm.style.cssText = `font-family:'Orbitron',sans-serif;font-size:14px;color:${preset.stats.color};letter-spacing:1px;`;
      nm.textContent = preset.name;
      const desc = document.createElement('div');
      desc.style.cssText = 'font-size:11px;color:#aac;opacity:0.85;margin-top:3px;';
      desc.textContent = preset.description;
      const stats = document.createElement('div');
      stats.style.cssText = 'font-size:10px;color:#889;margin-top:4px;display:flex;gap:8px;flex-wrap:wrap;';
      stats.innerHTML = `<span>HP ${preset.stats.hp}</span><span>攻 ${preset.stats.attack}</span><span>射 ${preset.stats.range}</span><span>造 ${preset.cost}</span>`;
      info.appendChild(nm); info.appendChild(desc); info.appendChild(stats);

      card.appendChild(icon);
      card.appendChild(info);
      sidePanel.appendChild(card);
    });

    const selectedTitle = document.createElement('h3');
    selectedTitle.textContent = '当前编队';
    selectedTitle.style.cssText = 'color:#e0e8ff;margin:20px 0 10px;font-size:14px;letter-spacing:2px;';
    sidePanel.appendChild(selectedTitle);

    const fleetList = document.createElement('div');
    fleetList.id = 'fleet-list';
    fleetList.style.cssText = 'max-height:180px;overflow-y:auto;padding-right:4px;';
    this.renderFleetList(fleetList, () => {
      this.renderShips(shipLayer, gridCanvas);
      this.renderFleetList(fleetList, () => { this.renderShips(shipLayer, gridCanvas); this.renderFleetList(fleetList, () => {}); }, 'dummy');
      countInfo.innerHTML = `<span>舰船数量</span><span style="color:#00d4ff;font-weight:bold;">${this.ships.length} / ${MAX_FLEET_SIZE}</span>`;
      barFill.style.width = `${(this.ships.length / MAX_FLEET_SIZE) * 100}%`;
    });
    sidePanel.appendChild(fleetList);

    const spacer = document.createElement('div');
    spacer.style.flex = '1';
    sidePanel.appendChild(spacer);

    const startBtn = document.createElement('button');
    startBtn.textContent = '⚔ 开始战斗';
    startBtn.style.cssText = `
      width:100%;padding:14px;margin-top:18px;font-size:16px;
      background:linear-gradient(135deg, rgba(0,212,255,0.3), rgba(122,255,154,0.2));
      border:1px solid #00d4ff;color:#fff;letter-spacing:4px;
    `;
    startBtn.onclick = () => {
      if (this.ships.length === 0) {
        alert('请先添加至少一艘舰船！');
        return;
      }
      this.saveFleet();
      onStartBattle();
    };
    sidePanel.appendChild(startBtn);

    layout.appendChild(stage);
    layout.appendChild(sidePanel);
    root.appendChild(layout);
  }

  private renderFleetList(container: HTMLElement, afterRemove: () => void, _dummy?: string): void {
    container.innerHTML = '';
    if (this.ships.length === 0) {
      container.innerHTML = '<div style="padding:20px;text-align:center;color:#667;font-size:12px;">暂无舰船，请从上方选择添加</div>';
      return;
    }
    this.ships.forEach(s => {
      const preset = SHIP_PRESETS[s.type];
      const row = document.createElement('div');
      row.style.cssText = `
        display:flex;align-items:center;justify-content:space-between;
        padding:7px 10px;margin-bottom:5px;border-radius:3px;
        border:1px solid ${this.selectedId === s.id ? '#00d4ff' : 'rgba(0,212,255,0.15)'};
        background:${this.selectedId === s.id ? 'rgba(0,212,255,0.1)' : 'rgba(255,255,255,0.02)'};
        transition:all 0.2s;cursor:pointer;
        ${this.selectedId === s.id ? 'box-shadow:0 0 10px rgba(0,212,255,0.5);' : ''}
      `;
      row.onclick = () => {
        this.selectedId = s.id;
        this.renderFleetList(container, afterRemove, 'inner');
        const layer = document.getElementById('ship-layer') as HTMLElement;
        const grid = (container.closest('.panel')?.previousElementSibling?.querySelectorAll('canvas')[1]) as HTMLCanvasElement | undefined;
        if (layer && grid) this.renderShips(layer, grid);
      };
      const left = document.createElement('div');
      left.style.cssText = 'display:flex;align-items:center;gap:8px;';
      const dot = document.createElement('div');
      dot.style.cssText = `width:10px;height:10px;border-radius:50%;background:${preset.stats.color};box-shadow:0 0 6px ${preset.stats.color};`;
      const lbl = document.createElement('span');
      lbl.style.cssText = `font-size:12px;color:${preset.stats.color};`;
      lbl.textContent = preset.name;
      left.appendChild(dot); left.appendChild(lbl);

      const right = document.createElement('div');
      right.style.cssText = 'display:flex;gap:6px;';

      const rotBtn = document.createElement('button');
      rotBtn.textContent = '↻';
      rotBtn.style.cssText = 'padding:2px 8px;font-size:12px;min-width:auto;';
      rotBtn.onclick = (e) => {
        e.stopPropagation();
        s.facing = (s.facing + 90) % 360;
        this.saveFleet();
        const layer = document.getElementById('ship-layer') as HTMLElement;
        const grid = ((container.ownerDocument.getElementById('fleet-stage') as HTMLElement)?.querySelectorAll('canvas')[1]) as HTMLCanvasElement | undefined;
        if (layer && grid) this.renderShips(layer, grid);
      };

      const delBtn = document.createElement('button');
      delBtn.textContent = '✕';
      delBtn.style.cssText = 'padding:2px 8px;font-size:12px;min-width:auto;border-color:rgba(255,100,100,0.5);color:#ff8080;';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        this.removeShip(s.id);
        afterRemove();
      };
      right.appendChild(rotBtn); right.appendChild(delBtn);

      row.appendChild(left);
      row.appendChild(right);
      container.appendChild(row);
    });
  }

  private renderShips(layer: HTMLElement, gridCanvas: HTMLCanvasElement): void {
    layer.innerHTML = '';
    this.ships.forEach(s => {
      const preset = SHIP_PRESETS[s.type];
      const el = document.createElement('div');
      const isSel = this.selectedId === s.id;
      el.style.cssText = `
        position:absolute;left:${s.gridX * CELL_SIZE}px;top:${s.gridY * CELL_SIZE}px;
        width:${CELL_SIZE}px;height:${CELL_SIZE}px;
        display:flex;align-items:center;justify-content:center;
        cursor:grab;z-index:${isSel ? 10 : 1};
      `;

      const inner = document.createElement('div');
      inner.style.cssText = `
        width:38px;height:38px;display:flex;align-items:center;justify-content:center;
        background:radial-gradient(circle, ${preset.stats.color}40 0%, transparent 70%);
        border:2px solid ${isSel ? '#00d4ff' : preset.stats.color};
        border-radius:6px;transition:all 0.2s;
        animation: ${isSel ? 'pulse' : 'breathe'} 1.8s ease-in-out infinite;
        transform: rotate(${s.facing}deg);
      `;

      const body = document.createElement('div');
      const sz = preset.stats.size;
      body.style.cssText = `
        width:${sz + 6}px;height:${Math.max(8, sz * 0.6)}px;
        background:linear-gradient(90deg, ${preset.stats.color}aa, ${preset.stats.accentColor});
        clip-path:polygon(0 50%, 40% 0, 85% 25%, 100% 50%, 85% 75%, 40% 100%);
        box-shadow:0 0 8px ${preset.stats.color};
      `;
      inner.appendChild(body);
      el.appendChild(inner);

      el.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        this.draggingShip = s;
        const rect = el.getBoundingClientRect();
        this.dragOffset = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
        el.style.zIndex = '100';
        el.style.pointerEvents = 'none';
      });

      el.addEventListener('dblclick', () => {
        s.facing = (s.facing + 90) % 360;
        this.saveFleet();
        this.selectedId = s.id;
        this.renderShips(layer, gridCanvas);
      });

      layer.appendChild(el);
    });

    const globalMouseMove = (ev: MouseEvent) => {
      if (!this.draggingShip || !layer.parentElement) return;
      const rect = layer.getBoundingClientRect();
      const nx = ev.clientX - rect.left - this.dragOffset.x + CELL_SIZE / 2;
      const ny = ev.clientY - rect.top - this.dragOffset.y + CELL_SIZE / 2;
      const gx = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(nx / CELL_SIZE)));
      const gy = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(ny / CELL_SIZE)));
      if (gx !== this.draggingShip.gridX || gy !== this.draggingShip.gridY) {
        const occupant = this.getShipAt(gx, gy);
        if (occupant && occupant.id !== this.draggingShip.id) {
          const tmpX = this.draggingShip.gridX;
          const tmpY = this.draggingShip.gridY;
          occupant.gridX = tmpX;
          occupant.gridY = tmpY;
        }
        this.draggingShip.gridX = gx;
        this.draggingShip.gridY = gy;
        this.saveFleet();
        this.renderShips(layer, gridCanvas);
      }
    };

    const globalMouseUp = () => {
      if (this.draggingShip) {
        this.draggingShip = null;
        document.removeEventListener('mousemove', globalMouseMove);
        document.removeEventListener('mouseup', globalMouseUp);
      }
    };

    document.addEventListener('mousemove', globalMouseMove);
    document.addEventListener('mouseup', globalMouseUp);
  }

  private drawGrid(canvas: HTMLCanvasElement, w: number, h: number): void {
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(0,20,60,0.4)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,212,255,0.15)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= GRID_COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL_SIZE + 0.5, 0);
      ctx.lineTo(x * CELL_SIZE + 0.5, h);
      ctx.stroke();
    }
    for (let y = 0; y <= GRID_ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL_SIZE + 0.5);
      ctx.lineTo(w, y * CELL_SIZE + 0.5);
      ctx.stroke();
    }
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, 'rgba(122,255,154,0.12)');
    grad.addColorStop(0.6, 'rgba(0,212,255,0.05)');
    grad.addColorStop(1, 'rgba(255,100,100,0.1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  private drawStars(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#050818';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const colors = ['#ffffff', '#aaccff', '#ccddff', '#ffeecc'];
    for (let i = 0; i < 380; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const r = Math.random() * 1.6 + 0.2;
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.globalAlpha = Math.random() * 0.9 + 0.1;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
