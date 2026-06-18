export interface StatusBarData {
  totalMined: number;
  revenue: number;
  mineCount: number;
}

export class StatusBar {
  private container: HTMLElement;

  private totalMinedEl!: HTMLElement;
  private revenueEl!: HTMLElement;
  private mineCountEl!: HTMLElement;

  private lastTotalMined = 0;
  private lastRevenue = 0;
  private totalMinedAnimationId: number | null = null;
  private revenueAnimationId: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.createBar();
  }

  private createBar(): void {
    this.container.innerHTML = '';
    this.container.className = 'status-bar';

    const leftSection = document.createElement('div');
    leftSection.className = 'status-section';
    
    const minedLabel = document.createElement('span');
    minedLabel.className = 'status-label';
    minedLabel.textContent = '总开采量:';
    leftSection.appendChild(minedLabel);

    this.totalMinedEl = document.createElement('span');
    this.totalMinedEl.className = 'status-value status-value-bold';
    this.totalMinedEl.textContent = '0';
    leftSection.appendChild(this.totalMinedEl);

    this.container.appendChild(leftSection);

    const centerSection = document.createElement('div');
    centerSection.className = 'status-section';

    const revenueLabel = document.createElement('span');
    revenueLabel.className = 'status-label';
    revenueLabel.textContent = '财务收入:';
    centerSection.appendChild(revenueLabel);

    this.revenueEl = document.createElement('span');
    this.revenueEl.className = 'status-value status-value-bold';
    this.revenueEl.textContent = '0 金币';
    centerSection.appendChild(this.revenueEl);

    this.container.appendChild(centerSection);

    const rightSection = document.createElement('div');
    rightSection.className = 'status-section';

    const countLabel = document.createElement('span');
    countLabel.className = 'status-label';
    countLabel.textContent = '已部署矿场:';
    rightSection.appendChild(countLabel);

    this.mineCountEl = document.createElement('span');
    this.mineCountEl.className = 'status-value status-value-bold';
    this.mineCountEl.textContent = '0';
    rightSection.appendChild(this.mineCountEl);

    this.container.appendChild(rightSection);
  }

  public update(data: StatusBarData): void {
    this.animateTotalMined(data.totalMined);
    this.animateRevenue(data.revenue);
    this.mineCountEl.textContent = data.mineCount.toString();
  }

  private animateTotalMined(targetValue: number): void {
    if (this.totalMinedAnimationId) {
      cancelAnimationFrame(this.totalMinedAnimationId);
    }

    const startValue = this.lastTotalMined;
    const diff = targetValue - startValue;
    const duration = 500;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + diff * eased;

      this.totalMinedEl.textContent = Math.floor(current).toLocaleString();
      this.lastTotalMined = current;

      if (progress < 1) {
        this.totalMinedAnimationId = requestAnimationFrame(animate);
      }
    };

    this.totalMinedAnimationId = requestAnimationFrame(animate);
  }

  private animateRevenue(targetValue: number): void {
    if (this.revenueAnimationId) {
      cancelAnimationFrame(this.revenueAnimationId);
    }

    const startValue = this.lastRevenue;
    const diff = targetValue - startValue;
    const duration = 500;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + diff * eased;

      this.revenueEl.textContent = Math.floor(current).toLocaleString() + ' 金币';
      this.lastRevenue = current;

      if (progress < 1) {
        this.revenueAnimationId = requestAnimationFrame(animate);
      }
    };

    this.revenueAnimationId = requestAnimationFrame(animate);
  }

  public updateInstant(data: StatusBarData): void {
    this.lastTotalMined = data.totalMined;
    this.lastRevenue = data.revenue;
    this.totalMinedEl.textContent = Math.floor(data.totalMined).toLocaleString();
    this.revenueEl.textContent = Math.floor(data.revenue).toLocaleString() + ' 金币';
    this.mineCountEl.textContent = data.mineCount.toString();
  }
}
