import App, { DataPoint, ClusterResult } from './main.js';

const BACKEND_URL = 'http://localhost:5000';

const IRIS_DATA: number[][] = [
  [5.1, 3.5, 1.4], [4.9, 3.0, 1.4], [4.7, 3.2, 1.3], [4.6, 3.1, 1.5], [5.0, 3.6, 1.4],
  [5.4, 3.9, 1.7], [4.6, 3.4, 1.4], [5.0, 3.4, 1.5], [4.4, 2.9, 1.4], [4.9, 3.1, 1.5],
  [5.4, 3.7, 1.5], [4.8, 3.4, 1.6], [4.8, 3.0, 1.4], [4.3, 3.0, 1.1], [5.8, 4.0, 1.2],
  [5.7, 4.4, 1.5], [5.4, 3.9, 1.3], [5.1, 3.5, 1.4], [5.7, 3.8, 1.7], [5.1, 3.8, 1.5],
  [5.4, 3.4, 1.7], [5.1, 3.7, 1.5], [4.6, 3.6, 1.0], [5.1, 3.3, 1.7], [4.8, 3.4, 1.9],
  [5.0, 3.0, 1.6], [5.0, 3.4, 1.6], [5.2, 3.5, 1.5], [5.2, 3.4, 1.4], [4.7, 3.2, 1.6],
  [4.8, 3.1, 1.6], [5.4, 3.4, 1.5], [5.2, 4.1, 1.5], [5.5, 4.2, 1.4], [4.9, 3.1, 1.5],
  [5.0, 3.2, 1.2], [5.5, 3.5, 1.3], [4.9, 3.6, 1.4], [4.4, 3.0, 1.3], [5.1, 3.4, 1.5],
  [5.0, 3.5, 1.3], [4.5, 2.3, 1.3], [4.4, 3.2, 1.3], [5.0, 3.5, 1.6], [5.1, 3.8, 1.9],
  [4.8, 3.0, 1.4], [5.1, 3.8, 1.6], [4.6, 3.2, 1.4], [5.3, 3.7, 1.5], [5.0, 3.3, 1.4],
  [7.0, 3.2, 4.7], [6.4, 3.2, 4.5], [6.9, 3.1, 4.9], [5.5, 2.3, 4.0], [6.5, 2.8, 4.6],
  [5.7, 2.8, 4.5], [6.3, 3.3, 4.7], [4.9, 2.4, 3.3], [6.6, 2.9, 4.6], [5.2, 2.7, 3.9],
  [5.0, 2.0, 3.5], [5.9, 3.0, 4.2], [6.0, 2.2, 4.0], [6.1, 2.9, 4.7], [5.6, 2.9, 3.6],
  [6.7, 3.1, 4.4], [5.6, 3.0, 4.5], [5.8, 2.7, 4.1], [6.2, 2.2, 4.5], [5.6, 2.5, 3.9],
  [5.9, 3.2, 4.8], [6.1, 2.8, 4.0], [6.3, 2.5, 4.9], [6.1, 2.8, 4.7], [6.4, 2.9, 4.3],
  [6.6, 3.0, 4.4], [6.8, 2.8, 4.8], [6.7, 3.0, 5.0], [6.0, 2.9, 4.5], [5.7, 2.6, 3.5],
  [5.5, 2.4, 3.8], [5.5, 2.8, 4.0], [6.1, 3.0, 4.6], [5.8, 2.6, 4.0], [5.0, 2.3, 3.3],
  [5.6, 2.7, 4.2], [5.7, 3.0, 4.2], [5.7, 2.9, 4.2], [6.2, 2.9, 4.3], [5.1, 2.5, 3.0],
  [5.7, 2.8, 4.1], [6.3, 3.3, 6.0], [5.8, 2.7, 5.1], [7.1, 3.0, 5.9], [6.3, 2.9, 5.6],
  [6.5, 3.0, 5.8], [7.6, 3.0, 6.6], [4.9, 2.5, 4.5], [7.3, 2.9, 6.3], [6.7, 2.5, 5.8],
  [7.2, 3.6, 6.1], [6.5, 3.2, 5.1], [6.4, 2.7, 5.3], [6.8, 3.0, 5.5], [5.7, 2.5, 5.0],
  [5.8, 2.8, 5.1], [6.4, 3.2, 5.3], [6.5, 3.0, 5.5], [7.7, 3.8, 6.7], [7.7, 2.6, 6.9],
  [6.0, 2.2, 5.0], [6.9, 3.2, 5.7], [5.6, 2.8, 4.9], [7.7, 2.8, 6.7], [6.3, 2.7, 4.9],
  [6.7, 3.3, 5.7], [7.2, 3.2, 6.0], [6.2, 2.8, 4.8], [6.1, 3.0, 4.9], [6.4, 2.8, 5.6],
  [7.2, 3.0, 5.8], [7.4, 2.8, 6.1], [7.9, 3.8, 6.4], [6.4, 2.8, 5.6], [6.3, 2.8, 5.1],
  [6.1, 2.6, 5.6], [7.7, 3.0, 6.1], [6.3, 3.4, 5.6], [6.4, 3.1, 5.5], [6.0, 3.0, 4.8],
  [6.9, 3.1, 5.4], [6.7, 3.1, 5.6], [6.9, 3.1, 5.1], [5.8, 2.7, 5.1], [6.8, 3.2, 5.9],
  [6.7, 3.3, 5.7], [6.7, 3.0, 5.2], [6.3, 2.5, 5.0], [6.5, 3.0, 5.2], [6.2, 3.4, 5.4],
  [5.9, 3.0, 5.1]
];

const IRIS_FEATURES: number[][] = [
  [0.2], [0.2], [0.2], [0.2], [0.2], [0.4], [0.3], [0.2], [0.2], [0.1],
  [0.2], [0.2], [0.1], [0.1], [0.2], [0.4], [0.4], [0.3], [0.3], [0.3],
  [0.2], [0.4], [0.2], [0.5], [0.2], [0.2], [0.4], [0.2], [0.2], [0.2],
  [0.2], [0.4], [0.1], [0.2], [0.1], [0.2], [0.2], [0.1], [0.2], [0.2],
  [0.3], [0.3], [0.2], [0.6], [0.4], [0.3], [0.2], [0.2], [0.2], [0.2],
  [1.4], [1.5], [1.5], [1.3], [1.5], [1.3], [1.6], [1.0], [1.3], [1.4],
  [1.0], [1.5], [1.0], [1.4], [1.3], [1.4], [1.5], [1.0], [1.5], [1.1],
  [1.8], [1.3], [1.5], [1.2], [1.3], [1.4], [1.4], [1.7], [1.5], [1.0],
  [1.1], [1.0], [1.2], [1.6], [1.5], [1.6], [1.5], [1.3], [1.3], [1.3],
  [1.2], [1.4], [2.5], [1.9], [2.1], [1.8], [2.2], [2.1], [1.7], [1.8],
  [1.8], [2.5], [2.0], [1.9], [2.1], [2.0], [2.4], [2.3], [1.8], [2.2],
  [2.3], [1.5], [2.3], [2.0], [2.0], [1.8], [2.1], [1.8], [1.8], [1.8],
  [2.1], [1.6], [1.9], [2.0], [2.2], [1.5], [1.4], [2.3], [2.4], [1.8],
  [1.8], [2.1], [2.4], [2.3], [1.9], [2.3], [2.5], [2.3], [1.9], [2.0],
  [2.3], [1.8]
];

let clusterWorker: Worker | null = null;
let currentParams = {
  algorithm: 'kmeans' as 'kmeans' | 'dbscan',
  k: 3,
  epsilon: 0.5
};
let recomputeTimeout: number | null = null;

function initWorker(): Worker {
  return new Worker(new URL('./clusterWorker.ts', import.meta.url), {
    type: 'module'
  });
}

function normalizePoints(raw: number[][]): { x: number; y: number; z: number }[] {
  if (raw.length === 0) return [];
  const dims = raw[0].length;
  const mins: number[] = new Array(dims).fill(Infinity);
  const maxs: number[] = new Array(dims).fill(-Infinity);
  raw.forEach(p => {
    for (let d = 0; d < dims; d++) {
      mins[d] = Math.min(mins[d], p[d]);
      maxs[d] = Math.max(maxs[d], p[d]);
    }
  });
  const ranges = mins.map((m, i) => Math.max(0.0001, maxs[i] - m));
  return raw.map(p => ({
    x: ((p[0] - mins[0]) / ranges[0] - 0.5) * 10,
    y: ((p[1] - mins[1]) / ranges[1] - 0.5) * 10,
    z: dims >= 3 ? ((p[2] - mins[2]) / ranges[2] - 0.5) * 10 : (Math.random() - 0.5) * 8
  }));
}

function buildDataPoints(
  coords: { x: number; y: number; z: number }[],
  extraFeatures: number[][] = []
): DataPoint[] {
  return coords.map((c, i) => ({
    id: i,
    x: c.x,
    y: c.y,
    z: c.z,
    features: extraFeatures[i] || []
  }));
}

function generateRandomSphericalClusters(count: number = 2500): {
  coords: { x: number; y: number; z: number }[];
  features: number[][];
} {
  const clusterCenters = [
    { x: -3, y: 2, z: -2 },
    { x: 3, y: -1, z: 2 },
    { x: 0, y: 3, z: 3 },
    { x: -2, y: -3, z: 1 },
    { x: 2.5, y: 1.5, z: -3 }
  ];
  const nCenters = clusterCenters.length;
  const coords: { x: number; y: number; z: number }[] = [];
  const features: number[][] = [];

  for (let i = 0; i < count; i++) {
    const center = clusterCenters[i % nCenters];
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.pow(Math.random(), 0.5) * 1.8;
    coords.push({
      x: center.x + r * Math.sin(phi) * Math.cos(theta),
      y: center.y + r * Math.sin(phi) * Math.sin(theta),
      z: center.z + r * Math.cos(phi)
    });
    features.push([
      Math.random() * 10,
      Math.random() * 5 + 2
    ]);
  }
  return { coords, features };
}

function generateIrisData(): DataPoint[] {
  const normalized = normalizePoints(IRIS_DATA);
  return buildDataPoints(normalized, IRIS_FEATURES);
}

function generateRandomData(): DataPoint[] {
  const { coords, features } = generateRandomSphericalClusters(2500);
  return buildDataPoints(coords, features);
}

function showLoading(show: boolean): void {
  const overlay = document.getElementById('loading-overlay')!;
  if (show) {
    overlay.classList.add('visible');
    setTimeout(() => {
      if (overlay.classList.contains('visible')) {
        overlay.classList.remove('visible');
      }
    }, 2000);
  } else {
    overlay.classList.remove('visible');
  }
}

function renderStats(result: ClusterResult): void {
  const container = document.getElementById('stats-container')!;
  container.innerHTML = '';
  const sorted = [...result.stats].sort((a, b) => a.label - b.label);
  sorted.forEach(stat => {
    const color = getClusterColorHex(stat.label, result.centroids.length);
    const div = document.createElement('div');
    div.className = 'cluster-stat';
    div.style.setProperty('--cluster-color', color);
    div.innerHTML = `
      <div class="cluster-stat-header">
        <span class="cluster-name">聚类 C${stat.label}</span>
        <span class="cluster-count">${stat.count} 个点</span>
      </div>
      <div class="cluster-stat-detail">
        质心: (${stat.centroid[0].toFixed(2)}, ${stat.centroid[1].toFixed(2)}, ${stat.centroid[2].toFixed(2)})<br/>
        平均距离: ${stat.avgDistance.toFixed(3)}
      </div>
    `;
    container.appendChild(div);
  });
}

function getClusterColorHex(label: number, total: number): string {
  const COLOR_START = [52, 152, 219];
  const COLOR_END = [231, 76, 60];
  if (label < 0 || total <= 1) {
    if (label < 0) return '#7D8590';
    return `rgb(${COLOR_START.join(',')})`;
  }
  const t = label / (total - 1);
  const r = Math.round(COLOR_START[0] + (COLOR_END[0] - COLOR_START[0]) * t);
  const g = Math.round(COLOR_START[1] + (COLOR_END[1] - COLOR_START[1]) * t);
  const b = Math.round(COLOR_START[2] + (COLOR_END[2] - COLOR_START[2]) * t);
  return `rgb(${r},${g},${b})`;
}

function triggerRecompute(app: App): void {
  if (recomputeTimeout !== null) {
    clearTimeout(recomputeTimeout);
  }
  recomputeTimeout = window.setTimeout(() => {
    recomputeClusters(app);
  }, 150);
}

function recomputeClusters(app: App): void {
  const pc = app.getPointCloudManager();
  const data = pc.getDataPoints();
  if (data.length === 0) return;

  if (!clusterWorker) {
    clusterWorker = initWorker();
  }

  showLoading(true);

  clusterWorker.onmessage = (e: MessageEvent) => {
    showLoading(false);
    if (e.data.success && e.data.result) {
      pc.applyClusterResult(e.data.result as ClusterResult);
      renderStats(e.data.result as ClusterResult);
    } else {
      console.error('Cluster compute error:', e.data.error);
    }
  };

  clusterWorker.postMessage({
    type: 'compute',
    points: data.map(d => ({ x: d.x, y: d.y, z: d.z })),
    params: { ...currentParams },
    useBackend: true,
    backendUrl: BACKEND_URL
  });
}

function parseCSV(text: string): DataPoint[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return [];

  let headerLine = 0;
  const firstLine = lines[0].split(/[,\t;]/);
  const hasHeader = firstLine.some(v => isNaN(parseFloat(v.trim())));
  if (hasHeader) headerLine = 1;

  const rawCoords: number[][] = [];
  const rawFeatures: number[][] = [];
  const maxCols = 10;

  for (let i = headerLine; i < lines.length; i++) {
    const parts = lines[i].split(/[,\t;]/).map(v => parseFloat(v.trim()));
    if (parts.length < 3 || parts.some(v => isNaN(v))) continue;
    const limited = parts.slice(0, maxCols);
    rawCoords.push(limited.slice(0, 3));
    rawFeatures.push(limited.slice(3));
  }

  const normalized = normalizePoints(rawCoords);
  return buildDataPoints(normalized, rawFeatures);
}

async function loadSampleFromBackend(): Promise<DataPoint[] | null> {
  try {
    const resp = await fetch(`${BACKEND_URL}/sample`);
    if (!resp.ok) throw new Error('Failed');
    const data = await resp.json();
    if (data && data.points) {
      const normalized = normalizePoints(data.points);
      return buildDataPoints(normalized, data.features || []);
    }
  } catch (e) {
    console.warn('Sample backend failed, using built-in');
  }
  return null;
}

export function setupUIControls(app: App): void {
  const algoSelect = document.getElementById('algo-select') as HTMLSelectElement;
  const kSlider = document.getElementById('k-slider') as HTMLInputElement;
  const kValue = document.getElementById('k-value') as HTMLElement;
  const epsilonSlider = document.getElementById('epsilon-slider') as HTMLInputElement;
  const epsilonValue = document.getElementById('epsilon-value') as HTMLElement;
  const kmeansGroup = document.getElementById('kmeans-group') as HTMLElement;
  const dbscanGroup = document.getElementById('dbscan-group') as HTMLElement;
  const btnSample = document.getElementById('btn-sample') as HTMLButtonElement;
  const btnRandom = document.getElementById('btn-random') as HTMLButtonElement;
  const btnTogglePerf = document.getElementById('btn-toggle-perf') as HTMLButtonElement;
  const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
  const csvFile = document.getElementById('csv-file') as HTMLInputElement;

  const updateSliderTrack = (slider: HTMLInputElement, valueEl: HTMLElement) => {
    const min = parseFloat(slider.min);
    const max = parseFloat(slider.max);
    const val = parseFloat(slider.value);
    const pct = ((val - min) / (max - min)) * 100;
    slider.style.setProperty('--track-color', '#3498DB');
    slider.style.background = `linear-gradient(to right, #30363D 0%, #3498DB ${pct}%, #30363D ${pct}%, #30363D 100%)`;
    valueEl.textContent = val.toString();
  };

  algoSelect.addEventListener('change', () => {
    const algo = algoSelect.value as 'kmeans' | 'dbscan';
    currentParams.algorithm = algo;
    kmeansGroup.style.display = algo === 'kmeans' ? 'block' : 'none';
    dbscanGroup.style.display = algo === 'dbscan' ? 'block' : 'none';
    triggerRecompute(app);
  });

  kSlider.addEventListener('input', () => {
    const v = parseInt(kSlider.value);
    currentParams.k = v;
    kValue.textContent = v.toString();
    updateSliderTrack(kSlider, kValue);
    triggerRecompute(app);
  });

  epsilonSlider.addEventListener('input', () => {
    const v = parseFloat(epsilonSlider.value);
    currentParams.epsilon = v;
    epsilonValue.textContent = v.toFixed(2);
    updateSliderTrack(epsilonSlider, epsilonValue);
    triggerRecompute(app);
  });

  btnSample.addEventListener('click', async () => {
    showLoading(true);
    let data = await loadSampleFromBackend();
    if (!data) {
      data = generateIrisData();
    }
    app.getPointCloudManager().loadData(data);
    showLoading(true);
    setTimeout(() => {
      triggerRecompute(app);
    }, 100);
  });

  btnRandom.addEventListener('click', () => {
    showLoading(true);
    const data = generateRandomData();
    app.getPointCloudManager().loadData(data);
    showLoading(true);
    setTimeout(() => {
      triggerRecompute(app);
    }, 100);
  });

  btnTogglePerf.addEventListener('click', () => {
    app.togglePerfMonitor();
  });

  btnReset.addEventListener('click', () => {
    app.resetCamera();
    app.getPointCloudManager().clearSelection();
  });

  csvFile.addEventListener('change', async (ev) => {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    showLoading(true);
    try {
      let points: DataPoint[] | null = null;
      try {
        const formData = new FormData();
        formData.append('file', file);
        const resp = await fetch(`${BACKEND_URL}/csv-parse`, {
          method: 'POST',
          body: formData
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data && data.points) {
            const normalized = normalizePoints(data.points);
            points = buildDataPoints(normalized, data.features || []);
          }
        }
      } catch (e) {
        console.warn('Backend CSV parse failed, fallback to client');
      }
      if (!points) {
        const text = await file.text();
        points = parseCSV(text);
      }
      if (points.length === 0) {
        alert('CSV文件解析失败或数据为空');
        return;
      }
      app.getPointCloudManager().loadData(points);
      setTimeout(() => triggerRecompute(app), 100);
    } catch (err) {
      console.error(err);
      alert('加载CSV文件出错');
    } finally {
      csvFile.value = '';
    }
  });

  updateSliderTrack(kSlider, kValue);
  updateSliderTrack(epsilonSlider, epsilonValue);

  setTimeout(async () => {
    showLoading(true);
    const data = generateRandomData();
    app.getPointCloudManager().loadData(data);
    setTimeout(() => {
      triggerRecompute(app);
    }, 200);
  }, 100);
}
