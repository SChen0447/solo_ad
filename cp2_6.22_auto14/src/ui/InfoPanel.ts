import * as d3 from 'd3';
import {
  AtomData,
  BondData,
  ELEMENT_PROPERTIES,
  getBondLength,
  MoleculeData
} from '../models/MoleculeData';

export interface AtomInfo {
  atom: AtomData;
  neighbors: Array<{
    atom: AtomData;
    bond: BondData;
    length: number;
  }>;
}

export class InfoPanel {
  private container: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;
  private content: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;

  constructor(containerId: string) {
    this.container = d3.select<HTMLDivElement, unknown>(`#${containerId}`);
    this.content = this.container.select<HTMLDivElement>('#info-content');
  }

  showEmpty(): void {
    this.content.html('<div class="empty">点击原子查看详细信息</div>');
  }

  showAtomInfo(info: AtomInfo, _molecule: MoleculeData): void {
    const { atom, neighbors } = info;
    const props = ELEMENT_PROPERTIES[atom.element];

    this.content.html('');

    const rows = this.content
      .selectAll('.info-row')
      .data([
        { label: '元素', value: `${props.name} (${atom.element})` },
        { label: '原子序号', value: `#${atom.id}` },
        { label: '原子质量', value: `${props.mass.toFixed(2)} u` },
        { label: '原子半径', value: `${props.radius.toFixed(2)} Å` },
        {
          label: '坐标',
          value: `(${atom.x.toFixed(2)}, ${atom.y.toFixed(2)}, ${atom.z.toFixed(2)})`
        },
        { label: '成键数量', value: `${neighbors.length}` }
      ]);

    const rowEnter = rows.enter().append('div').attr('class', 'info-row');

    rowEnter
      .append('span')
      .attr('class', 'info-label')
      .text((d) => d.label);

    rowEnter
      .append('span')
      .attr('class', 'info-value')
      .text((d) => d.value);

    if (neighbors.length > 0) {
      this.content
        .append('div')
        .attr('class', 'neighbor-title')
        .text(`相邻原子 (${neighbors.length})`);

      const neighborItems = this.content
        .selectAll('.neighbor-item')
        .data(neighbors);

      const itemEnter = neighborItems
        .enter()
        .append('div')
        .attr('class', 'neighbor-item');

      itemEnter.append('div').html((d) => {
        const nProps = ELEMENT_PROPERTIES[d.atom.element];
        const bondType =
          d.bond.order === 1 ? '单键' : d.bond.order === 2 ? '双键' : '三键';
        const length = getBondLength(atom, d.atom).toFixed(2);
        return `
          <div style="color: #88CCFF; margin-bottom: 4px;">
            ${nProps.name} ${d.atom.element} (原子 #${d.atom.id})
          </div>
          <div>键类型: ${bondType}</div>
          <div>键长: <span class="bond-length">${length} Å</span></div>
        `;
      });
    }

    this.content.style('animation', 'none');
    this.content.node()!.offsetHeight;
    this.content.style('animation', 'fadeIn 0.3s ease-in-out');
  }

  showBondInfo(
    bond: BondData,
    atom1: AtomData,
    atom2: AtomData
  ): void {
    const p1 = ELEMENT_PROPERTIES[atom1.element];
    const p2 = ELEMENT_PROPERTIES[atom2.element];
    const bondType =
      bond.order === 1 ? '单键' : bond.order === 2 ? '双键' : '三键';
    const length = getBondLength(atom1, atom2).toFixed(2);

    this.content.html('');

    this.content
      .append('div')
      .attr('class', 'info-row')
      .html(`
        <span class="info-label">键类型</span>
        <span class="info-value" style="color: #FFD700;">${bondType}</span>
      `);

    this.content
      .append('div')
      .attr('class', 'info-row')
      .html(`
        <span class="info-label">键长</span>
        <span class="info-value bond-length">${length} Å</span>
      `);

    this.content
      .append('div')
      .attr('class', 'neighbor-title')
      .text('连接原子');

    this.content
      .append('div')
      .attr('class', 'neighbor-item')
      .html(`
        <div style="color: #88CCFF; margin-bottom: 4px;">
          ${p1.name} ${atom1.element} (原子 #${atom1.id})
        </div>
        <div>质量: ${p1.mass.toFixed(2)} u</div>
      `);

    this.content
      .append('div')
      .attr('class', 'neighbor-item')
      .html(`
        <div style="color: #88CCFF; margin-bottom: 4px;">
          ${p2.name} ${atom2.element} (原子 #${atom2.id})
        </div>
        <div>质量: ${p2.mass.toFixed(2)} u</div>
      `);
  }
}
