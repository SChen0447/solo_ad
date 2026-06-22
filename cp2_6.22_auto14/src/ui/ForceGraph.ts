import * as d3 from 'd3';
import {
  MoleculeData,
  AtomData,
  BondData,
  ELEMENT_PROPERTIES
} from '../models/MoleculeData';

interface GraphNode {
  id: number;
  atom: AtomData;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  source: number | GraphNode;
  target: number | GraphNode;
  bond: BondData;
}

const BOND_LINK_COLORS: Record<'single' | 'double' | 'triple', string> = {
  single: '#AAAAAA',
  double: '#00BFFF',
  triple: '#FF6B6B'
};

const BOND_LINK_WIDTH: Record<'single' | 'double' | 'triple', number> = {
  single: 2,
  double: 4,
  triple: 6
};

const ELEMENT_NODE_COLORS: Record<string, string> = {
  C: '#808080',
  N: '#3050F8',
  O: '#FF0D0D',
  H: '#FFFFFF',
  S: '#FFFF00'
};

export class ForceGraph {
  private container: HTMLElement;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private width: number;
  private height: number;
  private onAtomClick: ((atomId: number) => void) | null = null;
  private simulation: d3.Simulation<GraphNode, GraphLink> | null = null;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;
    this.width = 300;
    this.height = 300;

    this.svg = d3
      .select(this.container)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height);
  }

  setOnAtomClick(callback: (atomId: number) => void): void {
    this.onAtomClick = callback;
  }

  update(molecule: MoleculeData): void {
    const self = this;

    if (this.simulation) {
      this.simulation.stop();
    }

    this.svg.selectAll('*').remove();

    const nodes: GraphNode[] = molecule.atoms.map((a) => ({
      id: a.id,
      atom: a
    }));

    const links: GraphLink[] = molecule.bonds.map((b) => ({
      source: b.atom1,
      target: b.atom2,
      bond: b
    }));

    const g = this.svg.append('g');

    const linkGroup = g.append('g').attr('class', 'links');
    const nodeGroup = g.append('g').attr('class', 'nodes');

    const linkSelection = linkGroup
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', (d) => BOND_LINK_COLORS[d.bond.type])
      .attr('stroke-opacity', 0.7)
      .attr('stroke-width', (d) => BOND_LINK_WIDTH[d.bond.type]);

    const nodeSelection = nodeGroup
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', (d) => {
        const props = ELEMENT_PROPERTIES[d.atom.element];
        return props.radius * 18 + 3;
      })
      .attr('fill', (d) => {
        const color = ELEMENT_NODE_COLORS[d.atom.element] || '#808080';
        return color;
      })
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer')
      .call(this.drag() as any);

    nodeSelection
      .on('mouseenter', function () {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('stroke', '#FFD700')
          .attr('stroke-width', 3);
      })
      .on('mouseleave', function (event: MouseEvent, d: GraphNode) {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('stroke', '#FFFFFF')
          .attr('stroke-width', 1.5);
        if (event.buttons === 0) {
          const sel = d3.select(this);
          const color = ELEMENT_NODE_COLORS[d.atom.element] || '#808080';
          sel.attr('fill', color);
        }
      })
      .on('click', function (_event: MouseEvent, d: GraphNode) {
        if (self.onAtomClick) {
          self.onAtomClick(d.id);
        }
        d3.select(this as any)
          .transition()
          .duration(150)
          .attr('stroke', '#FFD700')
          .attr('stroke-width', 4)
          .transition()
          .duration(300)
          .attr('stroke-width', 1.5);
      });

    const labelSelection = nodeGroup
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .text((d) => d.atom.element)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('fill', (d) => {
        const props = ELEMENT_PROPERTIES[d.atom.element];
        const brightness =
          (props.color >> 16) * 0.299 +
          ((props.color >> 8) & 0xff) * 0.587 +
          (props.color & 0xff) * 0.114;
        return brightness > 128 ? '#000000' : '#FFFFFF';
      })
      .attr('pointer-events', 'none');

    this.simulation = d3
      .forceSimulation<GraphNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance(50)
          .strength(0.8)
      )
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('collision', d3.forceCollide().radius(25))
      .on('tick', () => {
        linkSelection
          .attr('x1', (d: any) => d.source.x)
          .attr('y1', (d: any) => d.source.y)
          .attr('x2', (d: any) => d.target.x)
          .attr('y2', (d: any) => d.target.y);

        nodeSelection.attr('cx', (d) => d.x!).attr('cy', (d) => d.y!);

        labelSelection.attr('x', (d) => d.x!).attr('y', (d) => d.y!);
      });
  }

  private drag() {
    const simulation = this.simulation;

    function dragstarted(
      event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>,
      d: GraphNode
    ) {
      if (!event.active && simulation) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(
      event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>,
      d: GraphNode
    ) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(
      event: d3.D3DragEvent<SVGCircleElement, GraphNode, GraphNode>,
      d: GraphNode
    ) {
      if (!event.active && simulation) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return d3
      .drag<SVGCircleElement, GraphNode>()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  }

  highlightAtom(atomId: number): void {
    this.svg
      .selectAll('.nodes circle')
      .filter(function (d: any) {
        return d.id === atomId;
      })
      .transition()
      .duration(150)
      .attr('stroke', '#FFD700')
      .attr('stroke-width', 4)
      .transition()
      .delay(300)
      .duration(150)
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 1.5);
  }
}
