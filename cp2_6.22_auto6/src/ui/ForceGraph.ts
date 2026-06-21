import * as d3 from 'd3';
import { MoleculeData, ELEMENT_COLORS } from '@/models/MoleculeData';

export type NodeClickCallback = (atomIndex: number) => void;

const ELEMENT_CSS_COLORS: Record<string, string> = {
  C: '#404040',
  N: '#3050F8',
  O: '#FF0D0D',
  H: '#FFFFFF',
};

export class ForceGraph {
  private svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
  private width = 300;
  private height = 300;
  private simulation: d3.Simulation<d3.SimulationNodeDatum, undefined> | null = null;
  private onNodeClick: NodeClickCallback | null = null;
  private nodes: any = null;
  private graphGroup: d3.Selection<SVGGElement, unknown, HTMLElement, any>;
  private container: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;

  constructor(parentId: string) {
    this.container = d3
      .select(parentId)
      .append('div')
      .attr('id', 'force-graph-container')
      .style('position', 'absolute')
      .style('left', '16px')
      .style('bottom', '16px')
      .style('width', `${this.width}px`)
      .style('height', `${this.height}px`)
      .style('background', '#0F0F2FCC')
      .style('border-radius', '12px')
      .style('overflow', 'hidden')
      .style('opacity', 0)
      .style('transition', 'opacity 0.3s ease-in-out')
      .style('z-index', '10');

    this.svg = this.container
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .style('background', 'transparent');

    this.graphGroup = this.svg.append('g');

    this.container.transition().duration(300).style('opacity', 1);
  }

  setOnNodeClick(cb: NodeClickCallback): void {
    this.onNodeClick = cb;
  }

  update(data: MoleculeData): void {
    this.graphGroup.selectAll('*').remove();
    if (this.simulation) {
      this.simulation.stop();
      this.simulation = null;
    }

    const graphNodes = data.atoms.map((atom) => ({
      id: atom.id,
      element: atom.element,
    }));

    const graphLinks = data.bonds.map((bond) => ({
      source: bond.from,
      target: bond.to,
    }));

    this.simulation = d3
      .forceSimulation(graphNodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(graphLinks as any).id((d: any) => d.id).distance(30))
      .force('charge', d3.forceManyBody().strength(-80))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .alphaDecay(0.15);

    const link = this.graphGroup
      .append('g')
      .selectAll('line')
      .data(graphLinks)
      .join('line')
      .attr('stroke', '#556677')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.7);

    this.nodes = this.graphGroup
      .append('g')
      .selectAll('circle')
      .data(graphNodes)
      .join('circle')
      .attr('r', (d: any) => (d.element === 'H' ? 4 : 7))
      .attr('fill', (d: any) => ELEMENT_CSS_COLORS[d.element] ?? '#808080')
      .attr('stroke', '#FFF')
      .attr('stroke-width', 0.5)
      .style('cursor', 'pointer')
      .on('click', (_event: any, d: any) => {
        if (this.onNodeClick) {
          this.onNodeClick(d.id);
        }
      });

    const labels = this.graphGroup
      .append('g')
      .selectAll('text')
      .data(graphNodes)
      .join('text')
      .text((d: any) => d.element)
      .attr('fill', '#FFF')
      .attr('font-size', '8px')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .style('pointer-events', 'none');

    this.simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      this.nodes!
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);

      labels
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y);
    });
  }

  highlightNode(atomIndex: number): void {
    if (!this.nodes) return;
    this.nodes!
      .attr('stroke', (d: any) => (d.id === atomIndex ? '#FFD700' : '#FFF'))
      .attr('stroke-width', (d: any) => (d.id === atomIndex ? 3 : 0.5));
  }

  destroy(): void {
    if (this.simulation) {
      this.simulation.stop();
    }
  }
}
