export interface StatusBarData {
  totalOutput: number;
  financialIncome: number;
  deployedCount: number;
  totalEfficiencyOutput: number;
}

const EPSILON_OUTPUT = 0.5;
const EPSILON_INCOME = 0.05;
const BATCH_THRESHOLD_MS = 16;

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
  private animStart: number = 0;
  private animRafId: number | null = null;

  private cachedData: StatusBarData | null = null;
  private pendingData: StatusBarData | null = null;
  private lastDomUpdate: number = 0;
  private batchRafPending: boolean = false;

  private lastDeployedCount: number = -1;

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
      contain: layout style paint;
    `;

    const items = [
      { key: 'output', label: '总开采量', unit: '吨', icon: '⛏️', value: '0' },
      { key: 'income', label: '财务收入', unit: '金币', icon: '💰', value: '0.0' },
      { key: 'deployed', label: '已部署矿场', unit: '座', icon: '🏭', value: '0' },
    ];

    for (const item of items) {
      const statItem = document.createElement('div');
      statItem.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        contain: layout style paint;
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
      labelEl.style.cssText = `font-size: 11px; color: #64748b;`;
      labelEl.textContent = item.label;

      const valueRow = document.createElement('div');
      valueRow.style.cssText = `
        display: flex;
        align-items: baseline;
        gap: 4px;
      `;

      const valueEl = document.createElement('span');
      valueEl.dataset.stat = item.key;
      const valueColors: Record<string, string> = {
        output: '#ffffff',
        income: '#fbbf24',
        deployed: '#60a5fa',
      };
      valueEl.style.cssText = `
        font-size: 19px;
        font-weight: 700;
        color: ${valueColors[item.key]};
        transition: color 0.5s ease-out;
      `;
      valueEl.textContent = item.value;

      const unitEl = document.createElement('span');
      unitEl.style.cssText = `font-size: 12px; color: #94a3b8;`;
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

  private isDataSignificantlyChanged(newData: StatusBarData): boolean {
    if (!this.cachedData) return true;
    const c = this.cachedData;
    if (newData.deployedCount !== c.deployedCount) return true;
    if (Math.abs(newData.totalOutput - c.totalOutput) >= EPSILON_OUTPUT) return true;
    if (Math.abs(newData.financialIncome - c.financialIncome) >= EPSILON_INCOME) return true;
    return false;
  }

  update(data: StatusBarData): void {
    this.pendingData = { ...data };

    if (!this.batchRafPending) {
      this.batchRafPending = true;
      requestAnimationFrame(() => this.batchUpdate());
    }
  }

  private batchUpdate(): void {
    this.batchRafPending = false;
    const data = this.pendingData;
    if (!data) return;

    const now = performance.now();
    const shouldUpdateDom =
      !this.cachedData ||
      this.isDataSignificantlyChanged(data) ||
      now - this.lastDomUpdate >= BATCH_THRESHOLD_MS * 4;

    if (!shouldUpdateDom) {
      this.pendingData = null;
      return;
    }

    const targetOutDiff = Math.abs(data.totalOutput - this.targetOutput);
    const targetIncDiff = Math.abs(data.financialIncome - this.targetIncome);
    const deployedChanged = data.deployedCount !== this.lastDeployedCount;

    const needsSmoothAnim =
      targetOutDiff >= 100 || targetIncDiff >= 50 || deployedChanged;

    if (deployedChanged) {
      this.deployedEl.textContent = data.deployedCount.toString();
      this.lastDeployedCount = data.deployedCount;
    }

    if (needsSmoothAnim) {
      this.targetOutput = data.totalOutput;
      this.targetIncome = data.financialIncome;
      if (this.animRafId === null) {
        this.animStart = now;
        this.startAnimation();
      }
    } else {
      this.targetOutput = data.totalOutput;
      this.targetIncome = data.financialIncome;
      this.displayOutput = data.totalOutput;
      this.displayIncome = data.financialIncome;
      if (this.animRafId !== null) {
        cancelAnimationFrame(this.animRafId);
        this.animRafId = null;
      }
      this.totalOutputEl.textContent = Math.floor(data.totalOutput).toString();
      this.incomeEl.textContent = data.financialIncome.toFixed(1);
    }

    this.cachedData = { ...data };
    this.lastDomUpdate = now;
    this.pendingData = null;
  }

  private startAnimation(): void {
    const duration = 500;
    const startOut = this.displayOutput;
    const startInc = this.displayIncome;

    const step = (now: number): void => {
      const t = Math.min((now - this.animStart) / duration, 1);
      const easeOut = 1 - Math.pow(1 - t, 3);

      const curOut = startOut + (this.targetOutput - startOut) * easeOut;
      const curInc = startInc + (this.targetIncome - startInc) * easeOut;

      this.displayOutput = curOut;
      this.displayIncome = curInc;

      const outText = Math.floor(curOut).toString();
      const incText = curInc.toFixed(1);
      if (this.totalOutputEl.textContent !== outText) {
        this.totalOutputEl.textContent = outText;
      }
      if (this.incomeEl.textContent !== incText) {
        this.incomeEl.textContent = incText;
      }

      if (t < 1) {
        this.animRafId = requestAnimationFrame(step);
      } else {
        this.displayOutput = this.targetOutput;
        this.displayIncome = this.targetIncome;
        const finalOut = Math.floor(this.targetOutput).toString();
        const finalInc = this.targetIncome.toFixed(1);
        if (this.totalOutputEl.textContent !== finalOut) {
          this.totalOutputEl.textContent = finalOut;
        }
        if (this.incomeEl.textContent !== finalInc) {
          this.incomeEl.textContent = finalInc;
        }
        this.animRafId = null;
      }
    };

    this.animRafId = requestAnimationFrame(step);
  }

  setDisplayedValues(output: number, income: number): void {
    this.displayOutput = output;
    this.displayIncome = income;
  }
}
