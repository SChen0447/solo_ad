import { MazeGrid, GridCell } from '../core/MazeGrid';

export interface MazeScore {
  pathLength: number;
  deadEnds: number;
  tortuosity: number;
  rating: '简单' | '中等' | '困难' | '无解';
}

interface GaugeRef {
  path: SVGPathElement;
  value: HTMLElement;
}

export class ScorePanel {
  private container: HTMLElement;
  private pathLengthGauge: GaugeRef;
  private deadEndsGauge: GaugeRef;
  private tortuosityGauge: GaugeRef;
  private ratingLabel: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.pathLengthGauge = { path: null as any, value: null as any };
    this.deadEndsGauge = { path: null as any, value: null as any };
    this.tortuosityGauge = { path: null as any, value: null as any };
    this.ratingLabel = document.createElement('div');
    this.buildUI();
  }

  private createGaugeSVG(color: string): { svg: SVGSVGElement; path: SVGPathElement } {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 60');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '80');

    const bgCircle = document.createElementNS(svgNS, 'path');
    bgCircle.setAttribute('d', 'M 15 50 A 35 35 0 0 1 85 50');
    bgCircle.setAttribute('fill', 'none');
    bgCircle.setAttribute('stroke', '#2a2a3a');
    bgCircle.setAttribute('stroke-width', '8');
    bgCircle.setAttribute('stroke-linecap', 'round');
    svg.appendChild(bgCircle);

    const fgCircle = document.createElementNS(svgNS, 'path');
    fgCircle.setAttribute('d', 'M 15 50 A 35 35 0 0 1 85 50');
    fgCircle.setAttribute('fill', 'none');
    fgCircle.setAttribute('stroke', color);
    fgCircle.setAttribute('stroke-width', '8');
    fgCircle.setAttribute('stroke-linecap', 'round');
    fgCircle.setAttribute('stroke-dasharray', '110');
    fgCircle.setAttribute('stroke-dashoffset', '110');
    fgCircle.style.transition = 'stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    fgCircle.style.filter = `drop-shadow(0 0 4px ${color})`;
    svg.appendChild(fgCircle);

    return { svg, path: fgCircle };
  }

  private createGaugeRow(label: string, color: string): GaugeRef {
    const row = document.createElement('div');
    row.className = 'gauge-row';

    const header = document.createElement('div');
    header.className = 'gauge-header';

    const labelEl = document.createElement('span');
    labelEl.className = 'gauge-label';
    labelEl.textContent = label;
    labelEl.style.color = color;

    const valueEl = document.createElement('span');
    valueEl.className = 'gauge-value';
    valueEl.textContent = '—';

    header.appendChild(labelEl);
    header.appendChild(valueEl);

    const gaugeWrap = document.createElement('div');
    gaugeWrap.className = 'gauge-wrap';
    const { svg, path } = this.createGaugeSVG(color);
    gaugeWrap.appendChild(svg);

    row.appendChild(header);
    row.appendChild(gaugeWrap);
    this.container.appendChild(row);

    return { path, value: valueEl };
  }

  private buildUI(): void {
    this.container.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'score-title';
    title.textContent = '难度评分';
    this.container.appendChild(title);

    this.pathLengthGauge = this.createGaugeRow('路径长度', '#3b82f6');
    this.deadEndsGauge = this.createGaugeRow('死胡同数', '#ef4444');
    this.tortuosityGauge = this.createGaugeRow('曲折度', '#f97316');

    this.ratingLabel.className = 'rating-label';
    this.ratingLabel.textContent = '—';
    this.container.appendChild(this.ratingLabel);
  }

  calculate(mazeGrid: MazeGrid): MazeScore {
    const start: GridCell = { x: 0, z: 0 };
    const end: GridCell = { x: mazeGrid.size - 1, z: mazeGrid.size - 1 };
    const path = mazeGrid.findPath(start, end);

    if (!path || path.length === 0) {
      return {
        pathLength: 0,
        deadEnds: mazeGrid.countDeadEnds(),
        tortuosity: 0,
        rating: '无解'
      };
    }

    const pathLength = path.length - 1;
    const deadEnds = mazeGrid.countDeadEnds();

    let directionChanges = 0;
    for (let i = 2; i < path.length; i++) {
      const dx1 = path[i - 1].x - path[i - 2].x;
      const dz1 = path[i - 1].z - path[i - 2].z;
      const dx2 = path[i].x - path[i - 1].x;
      const dz2 = path[i].z - path[i - 1].z;
      if (dx1 !== dx2 || dz1 !== dz2) {
        directionChanges++;
      }
    }

    const tortuosity = pathLength > 0 ? directionChanges / pathLength : 0;

    const maxPath = (mazeGrid.size - 1) * 2;
    const pathScore = Math.min(pathLength / Math.max(maxPath, 1), 1);
    const deadEndScore = Math.min(deadEnds / 15, 1);
    const tortuosityScore = Math.min(tortuosity * 2, 1);

    const totalScore = pathScore * 0.4 + deadEndScore * 0.35 + tortuosityScore * 0.25;

    let rating: '简单' | '中等' | '困难' = '简单';
    if (totalScore >= 0.65) rating = '困难';
    else if (totalScore >= 0.35) rating = '中等';

    return { pathLength, deadEnds, tortuosity, rating };
  }

  update(mazeGrid: MazeGrid): MazeScore {
    const score = this.calculate(mazeGrid);

    const maxPath = 18;
    const pathPercent = Math.min(score.pathLength / maxPath, 1);
    const deadPercent = Math.min(score.deadEnds / 15, 1);
    const tortPercent = Math.min(score.tortuosity * 2, 1);

    requestAnimationFrame(() => {
      this.pathLengthGauge.path.setAttribute('stroke-dashoffset', String(110 * (1 - pathPercent)));
      this.deadEndsGauge.path.setAttribute('stroke-dashoffset', String(110 * (1 - deadPercent)));
      this.tortuosityGauge.path.setAttribute('stroke-dashoffset', String(110 * (1 - tortPercent)));
    });

    this.pathLengthGauge.value.textContent = score.rating === '无解' ? '—' : String(score.pathLength);
    this.deadEndsGauge.value.textContent = String(score.deadEnds);
    this.tortuosityGauge.value.textContent = score.rating === '无解' ? '—' : score.tortuosity.toFixed(2);

    this.ratingLabel.textContent = score.rating;
    const ratingClass = score.rating === '简单' ? 'rating-easy' :
                        score.rating === '中等' ? 'rating-medium' :
                        score.rating === '困难' ? 'rating-hard' : 'rating-none';
    this.ratingLabel.className = 'rating-label ' + ratingClass;

    return score;
  }

  reset(): void {
    this.pathLengthGauge.path.setAttribute('stroke-dashoffset', '110');
    this.deadEndsGauge.path.setAttribute('stroke-dashoffset', '110');
    this.tortuosityGauge.path.setAttribute('stroke-dashoffset', '110');
    this.pathLengthGauge.value.textContent = '—';
    this.deadEndsGauge.value.textContent = '—';
    this.tortuosityGauge.value.textContent = '—';
    this.ratingLabel.textContent = '—';
    this.ratingLabel.className = 'rating-label';
  }
}
