import { GUI } from 'dat.gui';
import { eventBus } from './eventBus';
import { getAllBands, getBandByIndex } from './waveData';

interface Settings {
  currentBand: number;
  autoPlay: boolean;
  playSpeed: number;
  prevBand: () => void;
  nextBand: () => void;
}

let gui: GUI;
let autoPlayTimer: number | null = null;
let currentBandIndex = 0;

const settings: Settings = {
  currentBand: 0,
  autoPlay: false,
  playSpeed: 3,
  prevBand: () => {
    const bands = getAllBands();
    currentBandIndex = (currentBandIndex - 1 + bands.length) % bands.length;
    changeBand(currentBandIndex);
  },
  nextBand: () => {
    const bands = getAllBands();
    currentBandIndex = (currentBandIndex + 1) % bands.length;
    changeBand(currentBandIndex);
  },
};

function changeBand(index: number): void {
  currentBandIndex = index;
  settings.currentBand = index;
  const band = getBandByIndex(index);
  if (band) {
    const bandNameEl = document.getElementById('band-name');
    const bandDetailsEl = document.getElementById('band-details');
    if (bandNameEl) {
      bandNameEl.textContent = band.name;
      bandNameEl.style.color = `rgb(${Math.floor(band.color.r * 255)}, ${Math.floor(band.color.g * 255)}, ${Math.floor(band.color.b * 255)})`;
    }
    if (bandDetailsEl) {
      bandDetailsEl.innerHTML = `
        <div>频率: ${formatFrequencyRange(band.frequencyMin, band.frequencyMax)}</div>
        <div>波长: ${formatWavelengthRange(band.wavelengthMin, band.wavelengthMax)}</div>
      `;
    }
  }
  eventBus.emit('bandChange', index);
  updateGUIControllers();
}

function formatFrequencyRange(min: number, max: number): string {
  const format = (v: number): string => {
    if (v >= 1e21) return `${(v / 1e21).toFixed(2)} ZHz`;
    if (v >= 1e18) return `${(v / 1e18).toFixed(2)} EHz`;
    if (v >= 1e15) return `${(v / 1e15).toFixed(2)} PHz`;
    if (v >= 1e12) return `${(v / 1e12).toFixed(2)} THz`;
    if (v >= 1e9) return `${(v / 1e9).toFixed(2)} GHz`;
    if (v >= 1e6) return `${(v / 1e6).toFixed(2)} MHz`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(2)} kHz`;
    return `${v.toFixed(2)} Hz`;
  };
  return `${format(min)} ~ ${format(max)}`;
}

function formatWavelengthRange(min: number, max: number): string {
  const format = (v: number): string => {
    if (v >= 1) return `${v.toFixed(2)} m`;
    if (v >= 1e-3) return `${(v * 1e3).toFixed(2)} mm`;
    if (v >= 1e-6) return `${(v * 1e6).toFixed(2)} μm`;
    if (v >= 1e-9) return `${(v * 1e9).toFixed(2)} nm`;
    return `${(v * 1e12).toFixed(2)} pm`;
  };
  return `${format(min)} ~ ${format(max)}`;
}

function updateGUIControllers(): void {
  for (const c of gui.__controllers) {
    if (c.property === 'currentBand') {
      c.updateDisplay();
    }
  }
}

function startAutoPlay(): void {
  if (autoPlayTimer !== null) return;
  const interval = (1 / settings.playSpeed) * 1500 + 500;
  autoPlayTimer = window.setInterval(() => {
    settings.nextBand();
  }, interval);
}

function stopAutoPlay(): void {
  if (autoPlayTimer !== null) {
    clearInterval(autoPlayTimer);
    autoPlayTimer = null;
  }
}

export function createControls(): void {
  const bands = getAllBands();
  const bandOptions: Record<string, number> = {};
  bands.forEach((band) => {
    bandOptions[band.name] = band.index;
  });

  gui = new GUI({ width: 300 } as unknown as ConstructorParameters<typeof GUI>[0]);
  const titleEl = gui.domElement.querySelector('.close-button') as HTMLElement | null;
  if (titleEl) titleEl.textContent = '频谱控制面板';

  gui
    .add(settings, 'currentBand', bandOptions)
    .name('选择波段')
    .onChange((value: number) => {
      changeBand(value);
    });

  const navFolder = gui.addFolder('导航控制');
  navFolder.add(settings, 'prevBand').name('← 上一波段');
  navFolder.add(settings, 'nextBand').name('下一波段 →');
  navFolder.open();

  const autoFolder = gui.addFolder('自动播放');
  autoFolder
    .add(settings, 'autoPlay')
    .name('启用自动播放')
    .onChange((value: boolean) => {
      if (value) {
        startAutoPlay();
      } else {
        stopAutoPlay();
      }
    });
  autoFolder
    .add(settings, 'playSpeed', 0.5, 5, 0.5)
    .name('播放速度')
    .onChange(() => {
      if (settings.autoPlay) {
        stopAutoPlay();
        startAutoPlay();
      }
    });
  autoFolder.open();

  changeBand(0);
}

export function disposeControls(): void {
  stopAutoPlay();
  if (gui) {
    gui.destroy();
  }
}
