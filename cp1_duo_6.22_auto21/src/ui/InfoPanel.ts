import * as THREE from 'three';
import type { AtomData, MoleculeData } from '../parser/MoleculeParser';
import type { AtomMesh } from '../renderer/AtomRenderer';

export class InfoPanel {
  private container: HTMLElement;
  private panel: HTMLDivElement;
  private titleEl: HTMLDivElement;
  private coordinatesEl: HTMLDivElement;
  private bondLengthsEl: HTMLDivElement;
  private bondAnglesEl: HTMLDivElement;
  private noSelectionEl: HTMLDivElement;
  private contentWrapper: HTMLDivElement;

  private moleculeData: MoleculeData | null = null;
  private adjacency: Map<number, number[]> = new Map();
  private atomPositionMap: Map<number, { element: string; pos: THREE.Vector3 }> = new Map();

  constructor(container: HTMLElement) {
    this.container = container;
    this.panel = document.createElement('div');
    this.titleEl = document.createElement('div');
    this.noSelectionEl = document.createElement('div');
    this.contentWrapper = document.createElement('div');
    this.coordinatesEl = document.createElement('div');
    this.bondLengthsEl = document.createElement('div');
    this.bondAnglesEl = document.createElement('div');

    this.setupStyles();
    this.buildDOM();
  }

  public setMoleculeData(data: MoleculeData): void {
    this.moleculeData = data;
    this.buildAdjacency();
  }

  private buildAdjacency(): void {
    this.adjacency.clear();
    if (!this.moleculeData) return;

    for (const atom of this.moleculeData.atoms) {
      this.adjacency.set(atom.id, []);
    }

    for (const bond of this.moleculeData.bonds) {
      const neighbors1 = this.adjacency.get(bond.atom1);
      const neighbors2 = this.adjacency.get(bond.atom2);
      if (neighbors1) neighbors1.push(bond.atom2);
      if (neighbors2) neighbors2.push(bond.atom1);
    }
  }

  public updateAtomPositions(atomMeshes: AtomMesh[]): void {
    this.atomPositionMap.clear();
    for (const mesh of atomMeshes) {
      const worldPos = new THREE.Vector3();
      mesh.getWorldPosition(worldPos);
      this.atomPositionMap.set(mesh.userData.atomData.id, {
        element: mesh.userData.atomData.element,
        pos: worldPos
      });
    }
  }

  private setupStyles(): void {
    this.panel.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      width: 300px;
      padding: 20px;
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
      color: #e0e0f0;
      font-family: 'Consolas', 'Monaco', 'Courier New', 'SF Mono', monospace;
      font-size: 13px;
      line-height: 1.7;
      z-index: 100;
      user-select: none;
      transition: opacity 0.2s ease;
    `;

    this.titleEl.style.cssText = `
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      letter-spacing: 0.5px;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    this.noSelectionEl.style.cssText = `
      color: rgba(255, 255, 255, 0.4);
      font-style: italic;
      text-align: center;
      padding: 20px 0;
    `;
    this.noSelectionEl.textContent = '悬停原子查看详细信息';

    this.contentWrapper.style.cssText = `
      display: none;
    `;

    this.coordinatesEl.innerHTML = `<div style="color: #7aa2ff; font-weight: 600; margin-top: 14px; margin-bottom: 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">原子坐标</div>`;
    this.bondLengthsEl.innerHTML = `<div style="color: #7aa2ff; font-weight: 600; margin-top: 14px; margin-bottom: 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">键长信息</div>`;
    this.bondAnglesEl.innerHTML = `<div style="color: #7aa2ff; font-weight: 600; margin-top: 14px; margin-bottom: 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">键角信息</div>`;
  }

  private buildDOM(): void {
    const dot = document.createElement('span');
    dot.textContent = '◈';
    dot.style.color = '#4f8cff';
    this.titleEl.appendChild(dot);

    const titleText = document.createElement('span');
    titleText.textContent = '分子信息面板';
    this.titleEl.appendChild(titleText);

    this.contentWrapper.appendChild(this.coordinatesEl);
    this.contentWrapper.appendChild(this.bondLengthsEl);
    this.contentWrapper.appendChild(this.bondAnglesEl);

    this.panel.appendChild(this.titleEl);
    this.panel.appendChild(this.noSelectionEl);
    this.panel.appendChild(this.contentWrapper);
    this.container.appendChild(this.panel);
  }

  public update(atom: AtomMesh | null): void {
    if (!atom) {
      this.noSelectionEl.style.display = 'block';
      this.contentWrapper.style.display = 'none';
      return;
    }

    this.noSelectionEl.style.display = 'none';
    this.contentWrapper.style.display = 'block';

    const atomData = atom.userData.atomData;
    const posInfo = this.atomPositionMap.get(atomData.id);

    this.updateCoordinates(atomData, posInfo?.pos ?? new THREE.Vector3(atomData.x, atomData.y, atomData.z));
    this.updateBondLengths(atomData.id);
    this.updateBondAngles(atomData.id);
  }

  private updateCoordinates(atomData: AtomData, pos: THREE.Vector3): void {
    const header = this.coordinatesEl.querySelector('div')!;
    const data = document.createElement('div');
    data.style.cssText = `
      background: rgba(0, 0, 0, 0.2);
      padding: 10px 12px;
      border-radius: 8px;
      margin-top: 4px;
    `;
    data.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: rgba(255,255,255,0.6);">元素:</span>
        <span style="color: #ffd166; font-weight: 600;">${atomData.element} (编号 ${atomData.id})</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #ff6b6b;">X:</span>
        <span>${pos.x.toFixed(3)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span style="color: #4ecdc4;">Y:</span>
        <span>${pos.y.toFixed(3)}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #45b7d1;">Z:</span>
        <span>${pos.z.toFixed(3)}</span>
      </div>
    `;
    this.coordinatesEl.innerHTML = '';
    this.coordinatesEl.appendChild(header);
    this.coordinatesEl.appendChild(data);
  }

  private updateBondLengths(atomId: number): void {
    const header = this.bondLengthsEl.querySelector('div')!;
    this.bondLengthsEl.innerHTML = '';
    this.bondLengthsEl.appendChild(header);

    const neighbors = this.adjacency.get(atomId) ?? [];
    const centralInfo = this.atomPositionMap.get(atomId);

    if (neighbors.length === 0 || !centralInfo) {
      const empty = document.createElement('div');
      empty.style.color = 'rgba(255,255,255,0.4)';
      empty.style.fontStyle = 'italic';
      empty.textContent = '无化学键';
      this.bondLengthsEl.appendChild(empty);
      return;
    }

    const container = document.createElement('div');
    container.style.cssText = `
      background: rgba(0, 0, 0, 0.2);
      padding: 10px 12px;
      border-radius: 8px;
      margin-top: 4px;
      max-height: 120px;
      overflow-y: auto;
    `;

    const seen = new Set<number>();
    for (const neighborId of neighbors) {
      if (seen.has(neighborId)) continue;
      seen.add(neighborId);

      const neighborInfo = this.atomPositionMap.get(neighborId);
      if (!neighborInfo) continue;

      const bondLength = centralInfo.pos.distanceTo(neighborInfo.pos);
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 3px;';
      row.innerHTML = `
        <span style="color: #a8e6cf;">${centralInfo.element}—${neighborInfo.element} (${neighborId})</span>
        <span>${bondLength.toFixed(3)} Å</span>
      `;
      container.appendChild(row);
    }

    this.bondLengthsEl.appendChild(container);
  }

  private updateBondAngles(atomId: number): void {
    const header = this.bondAnglesEl.querySelector('div')!;
    this.bondAnglesEl.innerHTML = '';
    this.bondAnglesEl.appendChild(header);

    const neighbors = this.adjacency.get(atomId) ?? [];
    const centralInfo = this.atomPositionMap.get(atomId);

    if (neighbors.length < 2 || !centralInfo) {
      const empty = document.createElement('div');
      empty.style.color = 'rgba(255,255,255,0.4)';
      empty.style.fontStyle = 'italic';
      empty.textContent = '连接原子不足，无法计算键角';
      this.bondAnglesEl.appendChild(empty);
      return;
    }

    const container = document.createElement('div');
    container.style.cssText = `
      background: rgba(0, 0, 0, 0.2);
      padding: 10px 12px;
      border-radius: 8px;
      margin-top: 4px;
      max-height: 120px;
      overflow-y: auto;
    `;

    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        const id1 = neighbors[i];
        const id2 = neighbors[j];
        const info1 = this.atomPositionMap.get(id1);
        const info2 = this.atomPositionMap.get(id2);
        if (!info1 || !info2) continue;

        const v1 = new THREE.Vector3().subVectors(info1.pos, centralInfo.pos);
        const v2 = new THREE.Vector3().subVectors(info2.pos, centralInfo.pos);

        if (v1.lengthSq() < 1e-10 || v2.lengthSq() < 1e-10) continue;

        const angle = v1.angleTo(v2) * (180 / Math.PI);

        const row = document.createElement('div');
        row.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 3px;';
        row.innerHTML = `
          <span style="color: #dda0dd;">${info1.element}(${id1})-${centralInfo.element}(${atomId})-${info2.element}(${id2})</span>
          <span style="color: #ffb347;">${angle.toFixed(2)}°</span>
        `;
        container.appendChild(row);
      }
    }

    this.bondAnglesEl.appendChild(container);
  }

  public destroy(): void {
    this.panel.remove();
  }
}
