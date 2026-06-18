export interface StatusBarData {
  totalOutput: number;
  financialIncome: number;
  deployedCount: number;
  totalEfficiencyOutput: number;
}

export class StatusBar {
  private container: HTMLElement;
  private bar: HTMLDivElement;
  private totalOutputEl: HTMLElement;
  private incomeEl: HTMLElement;
  private deployedEl: HTMLElement;

  private displayOutput: number = 0;
  private displayIncome: number = 0;
  private targetOutput: number = 0;
  private targetIncome: number = 0;
  private outputAnimStart: number = 0;
  private incomeAnimStart: number = 0;
  private animating: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.bar = this.createBar();
    this.container.appendChild(this.bar);
    this.totalOutputEl = this.bar.querySelector('[data-stat="output"]')!;
    this.incomeEl = this.bar.querySelector('[data-stat="income"]')!;
    this.deployedEl = this.bar.querySelector('[data-stat="deployed"]')!;
  }

  private createBar(): HTMLDivElement {
    const bar = document.createElement('div');
    bar.style.cssText = `
      width: 100%;
      height: 48px;
      min-height: 48px;
      background: #0f172a;
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding: 0 40px;
      border-top: 1px solid #1e293b;
      flex-shrink: 0;
    `;

    const items = [
      {
        key: 'output',
        label: '总开采量',
        unit: '吨',
        icon: '⛏️',
        value: '0',
      },
      {
        key: 'income',
        label: '财务收入',
        unit: '金币',
        icon: '💰',
        value: '0.0',
      },
      {
        key: 'deployed',
        label: '已部署矿场',
        unit: '座',
        icon: '🏭',
        value: '0',
      },
    ];

    for (const item of items) {
      const statItem = document.createElement('div');
      statItem.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
      `;

      const icon = document.createElement('span');
      icon.style.cssText = 'font-size: 18px;';
      icon.textContent = item.icon;

      const textGroup = document.createElement('div');
      textGroup.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 2px;
      `;

      const labelEl = document.createElement('span');
      labelEl.style.cssText = `
        font-size: 11px;
        color: #64748b;
      `;
      labelEl.textContent = item.label;

      const valueRow = document.createElement('div');
      valueRow.style.cssText = `
        display: flex;
        align-items: baseline;
        gap: 4px;
      `;

      const valueEl = document.createElement('span');
      valueEl.dataset.stat = item.key;
      if (item.key === 'output') {
        valueEl.style.cssText = `
          font-size: 19px;
          font-weight: 700;
          color: #ffffff;
          transition: color 0.5s ease-out;
        `;
      } else if (item.key === 'income') {
        valueEl.style.cssText = `
          font-size: 19px;
          font-weight: 700;
          color: #fbbf24;
        `;
      } else {
        valueEl.style.cssText = `
          font-size: 19px;
          font-weight: 700;
          color: #60a5fa;
        `;
      }
      valueEl.textContent = item.value;

      const unitEl = document.createElement('span');
      unitEl.style.cssText = `
        font-size: 12px;
        color: #94a3b8;
      `;
      unitEl.textContent = item.unit;

      valueRow.appendChild(valueEl);
      valueRow.appendChild(unitEl);
      textGroup.appendChild(labelEl);
      textGroup.appendChild(valueRow);
      statItem.appendChild(icon);
      statItem.appendChild(textGroup);
      bar.appendChild(statItem);
    }

    return bar;
  }

  update(data: StatusBarData): void {
    this.targetOutput = data.totalOutput;
    this.targetIncome = data.financialIncome;
    this.deployedEl.textContent = data.deployedCount.toString();

    if (!this.animating) {
      this.animating = true;
      this.outputAnimStart = performance.now();
      this.incomeAnimStart = performance.now();
      this.animate();
    }
  }

  private animate = (): void => {
    const now = performance.now();
    const outT = Math.min((now - this.outputAnimStart) / 500, 1);
    const incT = Math.min((now - this.incomeAnimStart) / 500, 1);

    const outEase = 1 - Math.pow(1 - outT, 3);
    const incEase = 1 - Math.pow(1 - incT, 3);

    const newOutput =
      this.displayOutput + (this.targetOutput - this.displayOutput) * outEase;
    const newIncome =
      this.displayIncome + (this.targetIncome - this.displayIncome) * incEase;

    this.displayOutput = newOutput;
    this.displayIncome = newIncome;

    this.totalOutputEl.textContent = Math.floor(newOutput).toString();
    this.incomeEl.textContent = newIncome.toFixed(1);

    const outputDone =
      Math.abs(this.displayOutput - this.targetOutput) < 0.5;
    const incomeDone =
      Math.abs(this.displayIncome - this.targetIncome) < 0.05;

    if (!outputDone || !incomeDone) {
      requestAnimationFrame(this.animate);
    } else {
      this.displayOutput = this.targetOutput;
      this.displayIncome = this.targetIncome;
      this.totalOutputEl.textContent = Math.floor(this.targetOutput).toString();
      this.incomeEl.textContent = this.targetIncome.toFixed(1);
      this.animating = false;
    }
  };

  setDisplayedValues(output: number, income: number): void {
    this.displayOutput = output;
    this.displayIncome = income;
  }
}
