import * as THREE from 'three';
import type { AtomMesh } from '../renderer/AtomRenderer';
import type { BondRenderer } from '../renderer/BondRenderer';

export interface SelectedInfo {
  atom: AtomMesh;
  position: THREE.Vector3;
}

export class InfoPanel {
  private container: HTMLElement;
  private panel: HTMLDivElement;
  private titleEl: HTMLDivElement;
  private coordinatesEl: HTMLDivElement;
  private bondLengthsEl: HTMLDivElement;
  private bondAnglesEl: HTMLDivElement;
  private noSelectionEl: HTMLDivElement;
  private contentWrapper: HTMLDivElement;
  private currentAtom: AtomMesh | null = null;

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
    this.noSelectionEl.textContent = '点击原子查看详细信息';

    this.contentWrapper.style.cssText = `
      display: none;
    `;

    const sectionHeader = (text: string) => `
      <div style="color: #7aa2ff; font-weight: 600; margin-top: 14px; margin-bottom: 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">${text}</div>
    `;

    this.coordinatesEl.innerHTML = sectionHeader('原子坐标');
    this.coordinatesEl.style.cssText += `
      background: rgba(0, 0, 0, 0.2);
      padding: 10px 12px;
      border-radius: 8px;
      margin-top: 4px;
    `;

    this.bondLengthsEl.innerHTML = sectionHeader('键长信息');
    this.bondLengthsEl.style.cssText += `
      margin-top: 4px;
    `;

    this.bondAnglesEl.innerHTML = sectionHeader('键角信息');
    this.bondAnglesEl.style.cssText += `
      margin-top: 4px;
    `;
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

  public update(atom: AtomMesh | null, bondRenderer: BondRenderer): void {
    if (!atom) {
      this.currentAtom = null;
      this.noSelectionEl.style.display = 'block';
      this.contentWrapper.style.display = 'none';
      return;
    }

    this.currentAtom = atom;
    this.noSelectionEl.style.display = 'none';
    this.contentWrapper.style.display = 'block';

    const atomData = atom.userData.atomData;
    const worldPos = new THREE.Vector3();
    atom.getWorldPosition(worldPos);

    this.updateCoordinates(atomData, worldPos);
    this.updateBondLengths(atomData.id, bondRenderer);
    this.updateBondAngles(atomData.id, bondRenderer);
  }

  private updateCoordinates(atomData: { id: number; element: string }, pos: THREE.Vector3): void {
    const header = this.coordinatesEl.querySelector('div')!;
    const rows = `
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
    const data = document.createElement('div');
    data.style.cssText = `
      background: rgba(0, 0, 0, 0.2);
      padding: 10px 12px;
      border-radius: 8px;
      margin-top: 4px;
    `;
    data.innerHTML = rows;
    this.coordinatesEl.appendChild(data);
  }

  private updateBondLengths(atomId: number, bondRenderer: BondRenderer): void {
    const header = this.bondLengthsEl.querySelector('div')!;
    const bondLengths = bondRenderer.getBondLengthsByAtomId(atomId);
    const atomMap = new Map<number, string>();

    for (const bondInfo of bondRenderer.bondMeshes) {
      atomMap.set(bondInfo.atom1Mesh.userData.atomData.id, bondInfo.atom1Mesh.userData.atomData.element);
      atomMap.set(bondInfo.atom2Mesh.userData.atomData.id, bondInfo.atom2Mesh.userData.atomData.element);
    }

    this.bondLengthsEl.innerHTML = '';
    this.bondLengthsEl.appendChild(header);

    if (bondLengths.size === 0) {
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

    bondLengths.forEach((length, otherId) => {
      const element = atomMap.get(otherId) ?? '?';
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 3px;';
      row.innerHTML = `
        <span style="color: #a8e6cf;">${atomMap.get(atomId) ?? '?'}—${element} (${otherId})</span>
        <span>${length.toFixed(3)} Å</span>
      `;
      container.appendChild(row);
    });

    this.bondLengthsEl.appendChild(container);
  }

  private updateBondAngles(atomId: number, bondRenderer: BondRenderer): void {
    const header = this.bondAnglesEl.querySelector('div')!;
    const connectedIds = bondRenderer.getConnectedAtomIds(atomId);

    this.bondAnglesEl.innerHTML = '';
    this.bondAnglesEl.appendChild(header);

    if (connectedIds.length < 2) {
      const empty = document.createElement('div');
      empty.style.color = 'rgba(255,255,255,0.4)';
      empty.style.fontStyle = 'italic';
      empty.textContent = '连接原子不足，无法计算键角';
      this.bondAnglesEl.appendChild(empty);
      return;
    }

    const atomMap = new Map<number, { element: string; pos: THREE.Vector3 }>();
    const centralPos = new THREE.Vector3();

    for (const bondInfo of bondRenderer.bondMeshes) {
      const a1 = bondInfo.atom1Mesh;
      const a2 = bondInfo.atom2Mesh;
      const p1 = new THREE.Vector3();
      const p2 = new THREE.Vector3();
      a1.getWorldPosition(p1);
      a2.getWorldPosition(p2);
      atomMap.set(a1.userData.atomData.id, { element: a1.userData.atomData.element, pos: p1 });
      atomMap.set(a2.userData.atomData.id, { element: a2.userData.atomData.element, pos: p2 });

      if (a1.userData.atomData.id === atomId) {
        centralPos.copy(p1);
      }
      if (a2.userData.atomData.id === atomId) {
        centralPos.copy(p2);
      }
    }

    const centralInfo = atomMap.get(atomId);
    if (!centralInfo) return;

    const container = document.createElement('div');
    container.style.cssText = `
      background: rgba(0, 0, 0, 0.2);
      padding: 10px 12px;
      border-radius: 8px;
      margin-top: 4px;
      max-height: 120px;
      overflow-y: auto;
    `;

    for (let i = 0; i < connectedIds.length; i++) {
      for (let j = i + 1; j < connectedIds.length; j++) {
        const id1 = connectedIds[i];
        const id2 = connectedIds[j];
        const info1 = atomMap.get(id1);
        const info2 = atomMap.get(id2);
        if (!info1 || !info2) continue;

        const v1 = new THREE.Vector3().subVectors(info1.pos, centralPos);
        const v2 = new THREE.Vector3().subVectors(info2.pos, centralPos);
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
