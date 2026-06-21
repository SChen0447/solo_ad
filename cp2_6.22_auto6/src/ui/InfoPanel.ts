import * as d3 from 'd3';
import { MoleculeData, ELEMENT_MASS } from '@/models/MoleculeData';
import { AtomMesh, BondMesh, getBondTypeLabel } from '@/models/MoleculeLoader';

export class InfoPanel {
  private container: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;
  private currentAtom: AtomMesh | null = null;
  private currentBond: BondMesh | null = null;
  private moleculeData: MoleculeData | null = null;

  constructor(parentId: string) {
    this.container = d3
      .select(parentId)
      .append('div')
      .attr('id', 'info-panel')
      .style('position', 'absolute')
      .style('right', '16px')
      .style('top', '16px')
      .style('width', '280px')
      .style('background', '#1A1A3ECC')
      .style('border-radius', '12px')
      .style('padding', '16px')
      .style('color', 'white')
      .style('font-family', 'monospace')
      .style('font-size', '14px')
      .style('opacity', 0)
      .style('transition', 'opacity 0.3s ease-in-out')
      .style('pointer-events', 'none')
      .style('z-index', '10');

    this.container.transition().duration(300).style('opacity', 1);
  }

  setMoleculeData(data: MoleculeData): void {
    this.moleculeData = data;
    this.clear();
  }

  showAtomInfo(atomMesh: AtomMesh): void {
    if (!this.moleculeData) return;
    this.currentAtom = atomMesh;
    this.currentBond = null;

    const atom = this.moleculeData.atoms[atomMesh.userData.atomIndex];
    const element = atomMesh.userData.element;
    const mass = ELEMENT_MASS[element] ?? 0;

    const connectedAtoms: { index: number; element: string; bondType: string; bondLength: number }[] = [];
    this.moleculeData.bonds.forEach((bond) => {
      if (bond.from === atom.id) {
        const otherAtom = this.moleculeData!.atoms[bond.to];
        const dx = atom.x - otherAtom.x;
        const dy = atom.y - otherAtom.y;
        const dz = atom.z - otherAtom.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        connectedAtoms.push({
          index: bond.to,
          element: otherAtom.element,
          bondType: getBondTypeLabel(bond.order),
          bondLength: dist,
        });
      } else if (bond.to === atom.id) {
        const otherAtom = this.moleculeData!.atoms[bond.from];
        const dx = atom.x - otherAtom.x;
        const dy = atom.y - otherAtom.y;
        const dz = atom.z - otherAtom.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        connectedAtoms.push({
          index: bond.from,
          element: otherAtom.element,
          bondType: getBondTypeLabel(bond.order),
          bondLength: dist,
        });
      }
    });

    this.container.selectAll('*').remove();

    this.container
      .append('div')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .style('margin-bottom', '12px')
      .text(`Atom: ${element}`);

    this.container
      .append('div')
      .style('margin-bottom', '6px')
      .html(`Mass: <span style="color:#00FF88">${mass.toFixed(3)} u</span>`);

    this.container
      .append('div')
      .style('margin-bottom', '6px')
      .text(`Position: (${atom.x.toFixed(2)}, ${atom.y.toFixed(2)}, ${atom.z.toFixed(2)})`);

    this.container
      .append('div')
      .style('margin-bottom', '6px')
      .text(`Index: ${atom.id}`);

    if (connectedAtoms.length > 0) {
      this.container
        .append('div')
        .style('margin-top', '10px')
        .style('font-weight', 'bold')
        .text('Bonds:');

      const bondList = this.container.append('div').style('margin-top', '4px');
      connectedAtoms.forEach((ca) => {
        const item = bondList.append('div').style('margin-bottom', '4px').style('padding-left', '8px');
        item.append('span').text(`${ca.element}(${ca.index}) `);
        item
          .append('span')
          .style('color', '#00FF88')
          .text(`${ca.bondLength.toFixed(2)}Å`);
        item.append('span').text(` [${ca.bondType}]`);
      });
    }
  }

  showBondInfo(bondMesh: BondMesh): void {
    if (!this.moleculeData) return;
    this.currentBond = bondMesh;
    this.currentAtom = null;

    const atomA = this.moleculeData.atoms[bondMesh.userData.from];
    const atomB = this.moleculeData.atoms[bondMesh.userData.to];
    const bondType = getBondTypeLabel(bondMesh.userData.order);

    this.container.selectAll('*').remove();

    this.container
      .append('div')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .style('margin-bottom', '12px')
      .text('Bond Info');

    this.container
      .append('div')
      .style('margin-bottom', '6px')
      .text(`Type: ${bondType}`);

    this.container
      .append('div')
      .style('margin-bottom', '6px')
      .html(`Length: <span style="color:#00FF88">${bondMesh.userData.bondLength.toFixed(2)} Å</span>`);

    this.container
      .append('div')
      .style('margin-bottom', '6px')
      .text(`Atoms: ${atomA.element}(${atomA.id}) — ${atomB.element}(${atomB.id})`);

    this.container
      .append('div')
      .style('margin-bottom', '6px')
      .text(`Order: ${bondMesh.userData.order}`);
  }

  clear(): void {
    this.container.selectAll('*').remove();
    this.container
      .append('div')
      .style('color', '#888')
      .style('text-align', 'center')
      .text('Click an atom or bond for details');
    this.currentAtom = null;
    this.currentBond = null;
  }
}
