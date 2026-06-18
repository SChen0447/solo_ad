export interface StatusBarOptions {
  container: HTMLElement;
}

export class StatusBar {
  private container: HTMLElement;
  private statusBarEl: HTMLElement | null = null;
  private totalOutputEl: HTMLElement | null = null;
  private incomeEl: HTMLElement | null = null;
  private mineCountEl: HTMLElement | null = null;

  private totalOutput = 0;
  private income = 0;
  private mineCount = 0;
  private outputPerSecond = 0;

  private animationFrameId: number | null = null;
  private lastTime = 0;

  private displayedOutput = 0;
  private displayedIncome = 0;

  constructor(options: StatusBarOptions) {
    this.container = options.container;
    this.createStatusBar();
    this.startAnimationLoop();
  }

  private createStatusBar(): void {
    const bar = document.createElement('div');
    bar.className = 'status-bar';

    const outputItem = document.createElement('div');
    outputItem.className = 'status-item';
    const outputLabel = document.createElement('span');
    outputLabel.className = 'status-label';
    outputLabel.textContent = '总开采量';
    this.totalOutputEl = document.createElement('span');
    this.totalOutputEl.className = 'status-value';
    this.totalOutputEl.textContent = '0';
    outputItem.appendChild(outputLabel);
    outputItem.appendChild(this.totalOutputEl);
    bar.appendChild(outputItem);

    const incomeItem = document.createElement('div');
    incomeItem.className = 'status-item';
    const incomeLabel = document.createElement('span');
    incomeLabel.className = 'status-label';
    incomeLabel.textContent = '财务收入';
    this.incomeEl = document.createElement('span');
    this.incomeEl.className = 'status-value';
    this.incomeEl.textContent = '0 金币';
    incomeItem.appendChild(incomeLabel);
    incomeItem.appendChild(this.incomeEl);
    bar.appendChild(incomeItem);

    const mineItem = document.createElement('div');
    mineItem.className = 'status-item';
    const mineLabel = document.createElement('span');
    mineLabel.className = 'status-label';
    mineLabel.textContent = '已部署矿场';
    this.mineCountEl = document.createElement('span');
    this.mineCountEl.className = 'status-value';
    this.mineCountEl.textContent = '0';
    mineItem.appendChild(mineLabel);
    mineItem.appendChild(this.mineCountEl);
    bar.appendChild(mineItem);

    this.statusBarEl = bar;
    this.container.appendChild(bar);
  }

  private startAnimationLoop(): void {
    const loop = (time: number) => {
      const deltaTime = this.lastTime ? (time - this.lastTime) / 1000 : 0;
      this.lastTime = time;

      if (deltaTime > 0 && this.outputPerSecond > 0) {
        this.totalOutput += this.outputPerSecond * deltaTime;
        this.income += this.outputPerSecond * deltaTime * 0.5;
      }

      const outputDiff = this.totalOutput - this.displayedOutput;
      if (Math.abs(outputDiff) > 0.01) {
        this.displayedOutput += outputDiff * Math.min(deltaTime * 5, 1);
      } else {
        this.displayedOutput = this.totalOutput;
      }

      const incomeDiff = this.income - this.displayedIncome;
      if (Math.abs(incomeDiff) > 0.01) {
        this.displayedIncome += incomeDiff * Math.min(deltaTime * 5, 1);
      } else {
        this.displayedIncome = this.income;
      }

      if (this.totalOutputEl) {
        this.totalOutputEl.textContent = this.displayedOutput.toFixed(1);
      }
      if (this.incomeEl) {
        this.incomeEl.textContent = this.displayedIncome.toFixed(1) + ' 金币';
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  public setOutputPerSecond(output: number): void {
    this.outputPerSecond = output;
  }

  public setMineCount(count: number): void {
    this.mineCount = count;
    if (this.mineCountEl) {
      this.mineCountEl.textContent = count.toString();
    }
  }

  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.statusBarEl) {
      this.statusBarEl.remove();
    }
  }
}
