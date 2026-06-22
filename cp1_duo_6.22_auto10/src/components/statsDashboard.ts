import {
  Chart,
  ChartConfiguration,
  registerables
} from 'chart.js';
import { getAllBooks } from '../utils/bookStorage';
import {
  getTrendData,
  getOverallStats,
  downsampleData,
  type TrendData
} from '../utils/statsCalculator';

Chart.register(...registerables);

const MAX_CHART_POINTS = 200;
const COLORS = {
  bar: 'rgba(141, 110, 99, 0.8)',
  barBorder: 'rgba(141, 110, 99, 1)',
  line: 'rgba(78, 52, 46, 1)',
  lineBg: 'rgba(188, 170, 164, 0.15)',
  grid: 'rgba(78, 52, 46, 0.08)'
};

type DayRange = 7 | 30;

export function renderStatsDashboard(
  root: HTMLElement,
  _onNavigate: (route: string) => void
): void {
  let dayRange: DayRange = 7;
  let chartInstance: Chart | null = null;

  function render(): void {
    const books = getAllBooks();

    const stats = getOverallStats(books);
    const rawTrend = getTrendData(books, dayRange);
    const trend = rawTrend.labels.length > MAX_CHART_POINTS
      ? downsampleData(rawTrend, MAX_CHART_POINTS)
      : rawTrend;

    const totalDaysWithRecords = trend.dailyPages.filter(p => p > 0).length;

    root.innerHTML = `
      <div class="page-header">
        <h1>📊 阅读统计</h1>
      </div>

      <div class="stats-cards">
        <div class="stats-card">
          <div class="stats-card-value">${stats.totalPages}</div>
          <div class="stats-card-label">累计阅读页</div>
        </div>
        <div class="stats-card">
          <div class="stats-card-value">${stats.avgMinutesPerDay}</div>
          <div class="stats-card-label">日均阅读分</div>
        </div>
        <div class="stats-card">
          <div class="stats-card-value">${stats.readingBooksCount}</div>
          <div class="stats-card-label">在读书数</div>
        </div>
      </div>

      <div class="chart-section">
        <div class="chart-header">
          <h2 class="chart-title">📈 阅读趋势</h2>
          <div class="chart-toggle">
            <button class="chart-toggle-btn ${dayRange === 7 ? 'active' : ''}" data-range="7">
              近7天
            </button>
            <button class="chart-toggle-btn ${dayRange === 30 ? 'active' : ''}" data-range="30">
              近30天
            </button>
          </div>
        </div>
        <div class="chart-container">
          <canvas id="trend-chart"></canvas>
        </div>
        <div style="display:flex;gap:1.5rem;justify-content:center;margin-top:0.8rem;font-size:0.8rem;color:#795548;">
          <div style="display:flex;align-items:center;gap:0.4rem;">
            <span style="display:inline-block;width:14px;height:14px;background:${COLORS.bar};border-radius:3px;"></span>
            <span>每日阅读页数</span>
          </div>
          <div style="display:flex;align-items:center;gap:0.4rem;">
            <span style="display:inline-block;width:14px;height:2px;background:${COLORS.line};"></span>
            <span>累计页数</span>
          </div>
        </div>
        <div id="days-counter" style="margin-top:0.6rem;font-size:0.8rem;color:#795548;text-align:center;">
          这${dayRange}天中有 <strong style="color:#4E342E;">${totalDaysWithRecords}</strong> 天记录到阅读
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-title">💡 阅读小贴士</div>
        ${stats.totalPages === 0 ? `
          <div style="font-size:0.85rem;color:#795548;line-height:1.7;">
            <p>• 坚持每天阅读，哪怕只读几页也是进步！</p>
            <p>• 试着每天同一时间阅读，培养习惯。</p>
            <p>• 读完一章后，写一条笔记帮助记忆。</p>
          </div>
        ` : `
          <div style="font-size:0.85rem;color:#795548;line-height:1.7;">
            <p>• 已累计阅读 <strong style="color:#4E342E;">${stats.totalPages}</strong> 页，太棒了！</p>
            <p>• 保持每天 <strong style="color:#4E342E;">${stats.avgMinutesPerDay}</strong> 分钟，继续加油！</p>
            <p>• 别忘了定期回顾笔记，巩固记忆。</p>
          </div>
        `}
      </div>
    `;

    bindEvents();
    initChart(trend);
  }

  function bindEvents(): void {
    root.querySelectorAll('.chart-toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const range = parseInt((btn as HTMLElement).getAttribute('data-range') as string);
        if (range === 7 || range === 30) {
          dayRange = range;
          updateChart();
          root.querySelectorAll('.chart-toggle-btn').forEach(b => {
            const r = parseInt((b as HTMLElement).getAttribute('data-range') as string);
            if (r === dayRange) {
              b.classList.add('active');
            } else {
              b.classList.remove('active');
            }
          });
        }
      });
    });
  }

  function getChartConfig(trend: TrendData): ChartConfiguration {
    const dailyBooksMap = trend.dailyBooks;
    const is7 = dayRange === 7;
    const barThickness = is7
      ? 28
      : Math.max(8, Math.min(24, 320 / trend.labels.length));

    return {
      type: 'bar',
      data: {
        labels: trend.labels,
        datasets: [
          {
            type: 'bar',
            label: '每日阅读页数',
            data: trend.dailyPages,
            backgroundColor: trend.dailyPages.map(() => COLORS.bar),
            borderColor: COLORS.barBorder,
            borderWidth: 1,
            borderSkipped: false,
            borderRadius: 4,
            order: 2,
            yAxisID: 'y',
            barThickness: barThickness,
            maxBarThickness: 32
          },
          {
            type: 'line',
            label: '累计阅读页数',
            data: trend.cumulativePages,
            borderColor: COLORS.line,
            backgroundColor: COLORS.lineBg,
            borderWidth: 2.5,
            tension: 0.35,
            fill: true,
            pointRadius: 3,
            pointBackgroundColor: COLORS.line,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: COLORS.line,
            pointHoverBorderWidth: 2,
            order: 1,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 600,
          easing: 'easeInOutQuart'
        },
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(78, 52, 46, 0.95)',
            titleColor: '#FAF3E0',
            bodyColor: '#FDF8EC',
            borderColor: 'rgba(253, 248, 236, 0.2)',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            titleFont: {
              size: 13,
              weight: 'bold'
            },
            bodyFont: {
              size: 12
            },
            callbacks: {
              title: (items) => {
                if (!items.length) return '';
                return `📅 ${items[0].label}`;
              },
              label: (item) => {
                const label = item.dataset.label || '';
                const value = item.parsed.y ?? 0;
                if (label === '每日阅读页数') {
                  return ` 📖 阅读页数: ${value}`;
                } else {
                  return ` 📚 累计页数: ${value}`;
                }
              },
              afterBody: (items) => {
                if (!items.length) return [];
                const dataIndex = items[0].dataIndex;
                const booksData = dailyBooksMap.get(dataIndex);
                if (!booksData || booksData.length === 0) return [];
                const lines: string[] = ['', '— 当日书籍 —'];
                booksData.forEach(b => {
                  lines.push(`  • ${b.title} (${b.pages}页)`);
                });
                return lines;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: COLORS.grid
            } as any,
            ticks: {
              color: '#795548',
              font: { size: 11 },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: is7 ? 7 : 10
            } as any
          } as any,
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            beginAtZero: true,
            grid: {
              color: COLORS.grid
            },
            ticks: {
              color: '#795548',
              font: { size: 11 },
              precision: 0
            },
            title: {
              display: true,
              text: '每日',
              color: '#795548',
              font: { size: 11 },
              padding: { bottom: 0 }
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            beginAtZero: true,
            grid: {
              drawOnChartArea: false
            },
            ticks: {
              color: '#795548',
              font: { size: 11 },
              precision: 0
            },
            title: {
              display: true,
              text: '累计',
              color: '#795548',
              font: { size: 11 }
            }
          }
        }
      }
    };
  }

  function initChart(trend: TrendData): void {
    const canvas = root.querySelector('#trend-chart') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    chartInstance = new Chart(ctx, getChartConfig(trend));
  }

  function updateChart(): void {
    const books = getAllBooks();
    const rawTrend = getTrendData(books, dayRange);
    const trend = rawTrend.labels.length > MAX_CHART_POINTS
      ? downsampleData(rawTrend, MAX_CHART_POINTS)
      : rawTrend;

    const totalDaysWithRecords = trend.dailyPages.filter(p => p > 0).length;

    const counterEl = root.querySelector('#days-counter') as HTMLElement;
    if (counterEl) {
      counterEl.innerHTML =
        `这${dayRange}天中有 <strong style="color:#4E342E;">${totalDaysWithRecords}</strong> 天记录到阅读`;
    }

    if (chartInstance && chartInstance.data.datasets.length >= 2) {
      chartInstance.data.labels = trend.labels;
      chartInstance.data.datasets[0].data = trend.dailyPages as number[];
      chartInstance.data.datasets[1].data = trend.cumulativePages as number[];
      (chartInstance.data.datasets[0] as any).barThickness = dayRange === 7
        ? 28
        : Math.max(8, Math.min(24, 320 / trend.labels.length));
      const scales = (chartInstance.options as any).scales;
      if (scales && scales.x && scales.x.ticks) {
        scales.x.ticks.maxTicksLimit = dayRange === 7 ? 7 : 10;
      }
      chartInstance.update();
    }
  }

  render();
}
