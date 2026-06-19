import * as dat from 'dat.gui';
import { SunPosition, MarkedTime } from '../types';
import { Environment } from '../scene/Environment';

export class TimeSlider {
  private environment: Environment;
  private gui: dat.GUI;
  private currentDate: string = '2024-06-21';
  private currentHour: number = 12;
  private markedTimes: MarkedTime[] = [];
  private maxMarkedTimes: number = 3;
  
  private onTimeChange?: (date: string, hour: number) => void;
  private onSunPositionChange?: (position: SunPosition) => void;
  private onMarkTime?: (markedTime: MarkedTime) => void;
  private onClearMark?: (id: number) => void;

  constructor(environment: Environment, containerId?: string) {
    this.environment = environment;
    
    const container = containerId ? document.getElementById(containerId) : undefined;
    this.gui = new dat.GUI({ 
      container: container || undefined,
      closed: true,
      width: 300
    });
    this.gui.domElement.style.display = 'none';
    
    this.setupControls();
    this.updateSun();
  }

  private setupControls(): void {
    const timeFolder = this.gui.addFolder('时间控制');
    timeFolder.open();
    
    const timeObj = {
      日期: this.currentDate,
      小时: this.currentHour,
      标记时段1: () => this.markTime(1, '#0088FF'),
      标记时段2: () => this.markTime(2, '#FF4444'),
      标记时段3: () => this.markTime(3, '#FFD700'),
      清除标记: () => this.clearAllMarks()
    };
    
    timeFolder.add(timeObj, '日期')
      .name('日期')
      .onChange((value: string) => {
        this.currentDate = value;
        this.updateSun();
        this.updateUIFromGUI();
      });
    
    timeFolder.add(timeObj, '小时', 6, 19, 0.1)
      .name('小时')
      .onChange((value: number) => {
        this.currentHour = value;
        this.updateSun();
        this.updateUIFromGUI();
      });
    
    timeFolder.add(timeObj, '标记时段1');
    timeFolder.add(timeObj, '标记时段2');
    timeFolder.add(timeObj, '标记时段3');
    timeFolder.add(timeObj, '清除标记');
  }

  private updateUIFromGUI(): void {
    const datePicker = document.getElementById('date-picker') as HTMLInputElement;
    const timeSlider = document.getElementById('time-slider') as HTMLInputElement;
    
    if (datePicker && datePicker.value !== this.currentDate) {
      datePicker.value = this.currentDate;
    }
    if (timeSlider && parseFloat(timeSlider.value) !== this.currentHour) {
      timeSlider.value = this.currentHour.toString();
    }
    
    this.updateDisplay();
  }

  private updateSun(): void {
    this.environment.updateSun(this.currentDate, this.currentHour);
    
    const sunPosition = this.environment.getSunPosition();
    if (this.onSunPositionChange) {
      this.onSunPositionChange(sunPosition);
    }
    
    if (this.onTimeChange) {
      this.onTimeChange(this.currentDate, this.currentHour);
    }
    
    this.updateDisplay();
    this.updateLightInfo();
  }

  private updateDisplay(): void {
    const dateDisplay = document.getElementById('current-date');
    const timeDisplay = document.getElementById('current-time');
    const timeSlider = document.getElementById('time-slider') as HTMLInputElement;
    
    if (dateDisplay) {
      const d = new Date(this.currentDate);
      dateDisplay.textContent = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    }
    
    if (timeDisplay && timeSlider) {
      const hours = Math.floor(this.currentHour);
      const minutes = Math.round((this.currentHour - hours) * 60);
      timeDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }

  private updateLightInfo(): void {
    const sunPosition = this.environment.getSunPosition();
    const lightParams = this.environment.getLightParams();
    
    const azimuthEl = document.getElementById('sun-azimuth');
    const elevationEl = document.getElementById('sun-elevation');
    const intensityEl = document.getElementById('light-intensity');
    
    if (azimuthEl) {
      azimuthEl.textContent = `${sunPosition.azimuth.toFixed(1)}°`;
    }
    if (elevationEl) {
      elevationEl.textContent = `${sunPosition.elevation.toFixed(1)}°`;
    }
    if (intensityEl) {
      const intensityPercent = Math.round((lightParams.intensity / 1.5) * 100);
      intensityEl.textContent = `${intensityPercent}%`;
    }
  }

  public setTime(date: string, hour: number): void {
    this.currentDate = date;
    this.currentHour = Math.max(6, Math.min(19, hour));
    this.updateSun();
    
    const controller = this.gui.controllersRecursive().find(c => c.property === '日期');
    if (controller) {
      controller.setValue(this.currentDate);
    }
    
    const hourController = this.gui.controllersRecursive().find(c => c.property === '小时');
    if (hourController) {
      hourController.setValue(this.currentHour);
    }
  }

  public getTime(): { date: string; hour: number } {
    return { date: this.currentDate, hour: this.currentHour };
  }

  public getSunPosition(): SunPosition {
    return this.environment.getSunPosition();
  }

  private markTime(id: number, color: string): void {
    const existingIndex = this.markedTimes.findIndex(m => m.id === id);
    
    if (existingIndex >= 0) {
      if (this.onClearMark) {
        this.onClearMark(id);
      }
      this.markedTimes.splice(existingIndex, 1);
      this.updateMarkerLabel(id, null);
      return;
    }
    
    if (this.markedTimes.length >= this.maxMarkedTimes) {
      return;
    }
    
    const markedTime: MarkedTime = {
      id,
      date: this.currentDate,
      hour: this.currentHour,
      color
    };
    
    this.markedTimes.push(markedTime);
    this.updateMarkerLabel(id, markedTime);
    
    if (this.onMarkTime) {
      this.onMarkTime(markedTime);
    }
  }

  private clearAllMarks(): void {
    this.markedTimes.forEach(m => {
      if (this.onClearMark) {
        this.onClearMark(m.id);
      }
      this.updateMarkerLabel(m.id, null);
    });
    this.markedTimes = [];
  }

  private updateMarkerLabel(id: number, markedTime: MarkedTime | null): void {
    const labelEl = document.getElementById(`marker-label-${id}`);
    const btnEl = document.getElementById(`mark-time-${id}`);
    
    if (labelEl) {
      if (markedTime) {
        const hours = Math.floor(markedTime.hour);
        const minutes = Math.round((markedTime.hour - hours) * 60);
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        const d = new Date(markedTime.date);
        const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
        labelEl.textContent = `${dateStr} ${timeStr} (点击清除)`;
      } else {
        labelEl.textContent = `标记时段${id}`;
      }
    }
    
    if (btnEl) {
      btnEl.classList.toggle('marked', markedTime !== null);
    }
  }

  public setOnTimeChange(callback: (date: string, hour: number) => void): void {
    this.onTimeChange = callback;
  }

  public setOnSunPositionChange(callback: (position: SunPosition) => void): void {
    this.onSunPositionChange = callback;
  }

  public setOnMarkTime(callback: (markedTime: MarkedTime) => void): void {
    this.onMarkTime = callback;
  }

  public setOnClearMark(callback: (id: number) => void): void {
    this.onClearMark = callback;
  }

  public getMarkedTimes(): MarkedTime[] {
    return [...this.markedTimes];
  }

  public dispose(): void {
    this.gui.destroy();
  }
}
