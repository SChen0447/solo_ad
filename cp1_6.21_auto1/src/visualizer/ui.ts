import Chart from 'chart.js/auto';
import type { Ecosystem } from '@/core/ecosystem';

const MAX_DATA_POINTS = 30;
const UPDATE_INTERVAL = 2000;

export class EnvironmentUI {
  private tempChart: Chart;
  private salinityChart: Chart;
  private tempData: number[] = [];
  private salinityData: number[] = [];
  private labels: string[] = [];
  private intervalId: number;
  private ecosystem: Ecosystem;
  private dataCounter = 0;

  constructor(ecosystem: Ecosystem) {
    this.ecosystem = ecosystem;

    const sharedOptions: Partial<Chart['options']> = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          display: false,
        },
        y: {
          ticks: {
            color: 'rgba(0, 212, 170, 0.7)',
            font: { size: 10, family: 'Rajdhani' },
          },
          grid: {
            color: 'rgba(0, 212, 170, 0.08)',
          },
          border: { color: 'rgba(0, 212, 170, 0.15)' },
        },
      },
      elements: {
        point: { radius: 0 },
        line: { tension: 0.4, borderWidth: 2 },
      },
    };

    const tempCtx = document.getElementById('temp-chart') as HTMLCanvasElement;
    this.tempChart = new Chart(tempCtx, {
      type: 'line',
      data: {
        labels: this.labels,
        datasets: [
          {
            label: '水温 (°C)',
            data: this.tempData,
            borderColor: '#00d4aa',
            backgroundColor: 'rgba(0, 212, 170, 0.1)',
            fill: true,
          },
        ],
      },
      options: {
        ...sharedOptions,
        scales: {
          ...sharedOptions.scales,
          y: {
            ...(sharedOptions.scales as any).y,
            min: 18,
            max: 32,
            title: {
              display: true,
              text: '水温 °C',
              color: 'rgba(0, 212, 170, 0.8)',
              font: { size: 11, family: 'Rajdhani', weight: '600' as const },
            },
          },
        },
      } as any,
    });

    const salinityCtx = document.getElementById('salinity-chart') as HTMLCanvasElement;
    this.salinityChart = new Chart(salinityCtx, {
      type: 'line',
      data: {
        labels: this.labels,
        datasets: [
          {
            label: '盐度 (ppt)',
            data: this.salinityData,
            borderColor: '#4a9eff',
            backgroundColor: 'rgba(74, 158, 255, 0.1)',
            fill: true,
          },
        ],
      },
      options: {
        ...sharedOptions,
        scales: {
          ...sharedOptions.scales,
          y: {
            ...(sharedOptions.scales as any).y,
            min: 28,
            max: 37,
            title: {
              display: true,
              text: '盐度 ppt',
              color: 'rgba(74, 158, 255, 0.8)',
              font: { size: 11, family: 'Rajdhani', weight: '600' as const },
            },
          },
        },
      } as any,
    });

    this.intervalId = window.setInterval(() => this.updateData(), UPDATE_INTERVAL);
  }

  private updateData() {
    this.dataCounter++;
    const label = `${this.dataCounter * 2}s`;

    this.labels.push(label);
    this.tempData.push(this.ecosystem.temperature);
    this.salinityData.push(this.ecosystem.salinity);

    if (this.labels.length > MAX_DATA_POINTS) {
      this.labels.shift();
      this.tempData.shift();
      this.salinityData.shift();
    }

    this.tempChart.update('none');
    this.salinityChart.update('none');
  }

  setEcosystem(ecosystem: Ecosystem) {
    this.ecosystem = ecosystem;
  }

  destroy() {
    clearInterval(this.intervalId);
    this.tempChart.destroy();
    this.salinityChart.destroy();
  }
}
