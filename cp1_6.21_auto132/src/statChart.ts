import type { BodyPart, DayStats } from './trainingStore';
import { BODY_PARTS, getWeekDates, hasTrainingOnDate } from './trainingStore';

interface BarSegment {
  x: number;
  y: number;
  width: number;
  height: number;
  bodyPart: BodyPart;
  sets: number;
  volume: number;
  dayIndex: number;
}

export class StatChart {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dayMarkersContainer: HTMLElement;
  private data: DayStats[] = [];
  private barSegments: BarSegment[] = [];
  private hoveredSegment: BarSegment | null = null;
  private tooltip: HTMLElement;
  private onDayClick: ((date: string) => void) | null = null;
  private currentDate: string;
  private animationProgress: number = 0;
  private animationId: number | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    dayMarkersContainer: HTMLElement,
    tooltip: HTMLElement,
    currentDate: string
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dayMarkersContainer = dayMarkersContainer;
    this.tooltip = tooltip;
    this.currentDate = currentDate;
    this.setupCanvas();
    this.setupEventListeners();
  }

  private setupCanvas(): void {
    const container = this.canvas.parentElement!;
    const width = container.clientWidth;
    const height = 200;
    this.canvas.width = width * window.devicePixelRatio;
    this.canvas.height = height * window.devicePixelRatio;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    let found = false;
    for (const segment of this.barSegments) {
      if (
        x >= segment.x &&
        x <= segment.x + segment.width &&
        y >= segment.y &&
        y <= segment.y + segment.height
      ) {
        this.hoveredSegment = segment;
        this.showTooltip(segment, event.clientX, event.clientY);
        found = true;
        break;
      }
    }

    if (!found) {
      this.hoveredSegment = null;
      this.hideTooltip();
    }

    this.draw();
  }

  private onMouseLeave(): void {
    this.hoveredSegment = null;
    this.hideTooltip();
    this.draw();
  }

  private onResize(): void {
    this.setupCanvas();
    this.draw();
    this.renderDayMarkers();
  }

  private showTooltip(segment: BarSegment, clientX: number, clientY: number): void {
    const partInfo = BODY_PARTS[segment.bodyPart];
    const weekDates = getWeekDates();
    const date = weekDates[segment.dayIndex];
    const dateObj = new Date(date);
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const dayName = dayNames[dateObj.getDay()];

    this.tooltip.innerHTML = `
      <div style="font-weight: bold; color: ${partInfo.color}; margin-bottom: 4px;">
        ${dayName} - ${partInfo.name}
      </div>
      <div>总组数: <span style="color: #fff;">${segment.sets}</span></div>
      <div>总容量: <span style="color: #fff;">${segment.volume.toLocaleString()} kg</span></div>
    `;
    this.tooltip.style.left = clientX + 15 + 'px';
    this.tooltip.style.top = clientY + 15 + 'px';
    this.tooltip.classList.remove('hidden');
  }

  private hideTooltip(): void {
    this.tooltip.classList.add('hidden');
  }

  public updateData(data: DayStats[], currentDate: string): void {
    this.data = data;
    this.currentDate = currentDate;
    this.animationProgress = 0;
    this.animateIn();
  }

  private animateIn(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    const animate = () => {
      this.animationProgress += 0.05;
      if (this.animationProgress >= 1) {
        this.animationProgress = 1;
        this.draw();
        return;
      }
      this.draw();
      this.animationId = requestAnimationFrame(animate);
    };

    animate();
  }

  public draw(): void {
    const width = this.canvas.width / window.devicePixelRatio;
    const height = this.canvas.height / window.devicePixelRatio;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);

    if (this.data.length === 0) return;

    const padding = { top: 20, right: 20, bottom: 30, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const barHeight = Math.min(28, chartHeight / this.data.length - 10);
    const barGap = (chartHeight - barHeight * this.data.length) / (this.data.length + 1);

    const maxVolume = Math.max(...this.data.map(d => d.totalVolume), 1);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const x = padding.left + (chartWidth / 4) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        Math.round((maxVolume / 4) * i).toLocaleString(),
        x,
        height - padding.bottom + 18
      );
    }

    this.barSegments = [];
    const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const weekDates = getWeekDates();

    this.data.forEach((dayStats, dayIndex) => {
      const y = padding.top + barGap + dayIndex * (barHeight + barGap);
      let currentX = padding.left;

      ctx.fillStyle = weekDates[dayIndex] === this.currentDate ? '#4ade80' : 'rgba(255, 255, 255, 0.6)';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(dayNames[dayIndex], padding.left - 8, y + barHeight / 2 + 4);

      const bodyParts = Object.keys(BODY_PARTS) as BodyPart[];
      bodyParts.forEach(part => {
        const partData = dayStats.byBodyPart[part];
        if (partData.volume > 0) {
          const barWidth = (partData.volume / maxVolume) * chartWidth * this.animationProgress;
          const color = BODY_PARTS[part].color;

          const isHovered = this.hoveredSegment?.bodyPart === part && 
                           this.hoveredSegment?.dayIndex === dayIndex;

          ctx.fillStyle = color;
          ctx.globalAlpha = isHovered ? 1 : 0.85;

          this.roundRect(ctx, currentX, y, barWidth, barHeight, 4);
          ctx.fill();
          ctx.globalAlpha = 1;

          this.barSegments.push({
            x: currentX,
            y: y,
            width: barWidth,
            height: barHeight,
            bodyPart: part,
            sets: partData.sets,
            volume: partData.volume,
            dayIndex
          });

          if (barWidth > 30) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(
              `${partData.sets}组`,
              currentX + barWidth / 2,
              y + barHeight / 2 + 3
            );
          }

          currentX += barWidth;
        }
      });

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      this.roundRect(ctx, padding.left, y, chartWidth, barHeight, 4);
      ctx.stroke();
    });

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('总容量 (kg)', width / 2, height - 5);
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    if (width < radius * 2) radius = width / 2;
    if (height < radius * 2) radius = height / 2;

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  public renderDayMarkers(): void {
    this.dayMarkersContainer.innerHTML = '';
    const weekDates = getWeekDates();
    const dayNames = ['一', '二', '三', '四', '五', '六', '日'];

    weekDates.forEach((date, index) => {
      const hasTraining = hasTrainingOnDate(date);
      const isCurrentDate = date === this.currentDate;
      const isToday = date === new Date().toISOString().split('T')[0];

      const wrapper = document.createElement('div');
      wrapper.className = 'day-marker-wrapper';
      wrapper.style.textAlign = 'center';
      wrapper.style.flex = '1';

      const label = document.createElement('div');
      label.className = 'day-marker-label';
      label.textContent = dayNames[index];
      label.style.color = isCurrentDate ? '#4ade80' : 'rgba(255, 255, 255, 0.5)';
      label.style.fontSize = '11px';
      label.style.marginBottom = '4px';

      const marker = document.createElement('div');
      marker.className = `day-marker ${hasTraining ? 'trained' : 'untrained'} ${isCurrentDate ? 'active' : ''} ${isToday ? 'today' : ''}`;
      marker.style.width = '12px';
      marker.style.height = '12px';
      marker.style.borderRadius = '50%';
      marker.style.margin = '0 auto';
      marker.style.cursor = 'pointer';
      marker.style.transition = 'all 0.2s ease';
      marker.style.border = '2px solid ' + (hasTraining ? '#4ade80' : 'rgba(255, 255, 255, 0.3)');
      marker.style.backgroundColor = hasTraining ? '#4ade80' : 'transparent';

      if (isCurrentDate) {
        marker.style.boxShadow = '0 0 10px rgba(74, 222, 128, 0.6)';
        marker.style.transform = 'scale(1.2)';
      }

      marker.addEventListener('click', () => {
        if (this.onDayClick) {
          this.onDayClick(date);
        }
      });

      marker.addEventListener('mouseenter', () => {
        marker.style.transform = 'scale(1.3)';
      });

      marker.addEventListener('mouseleave', () => {
        marker.style.transform = isCurrentDate ? 'scale(1.2)' : 'scale(1)';
      });

      wrapper.appendChild(label);
      wrapper.appendChild(marker);
      this.dayMarkersContainer.appendChild(wrapper);
    });
  }

  public setOnDayClick(callback: (date: string) => void): void {
    this.onDayClick = callback;
  }

  public dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.removeEventListener('mouseleave', this.onMouseLeave.bind(this));
    window.removeEventListener('resize', this.onResize.bind(this));
  }
}
