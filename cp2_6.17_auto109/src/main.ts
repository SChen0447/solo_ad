import { analyseArtwork, type ArtworkAnalysis } from './artAnalyzer';
import { ParticleAnimation } from './particleRenderer';
import confetti from 'canvas-confetti';

interface PresetArtwork {
  id: string;
  name: string;
  artist: string;
  year: string;
  thumbnail: string;
  defaultColors: string[];
  defaultComposition: ArtworkAnalysis['composition'];
}

const presetArtworks: PresetArtwork[] = [
  {
    id: 'kandinsky-8',
    name: '构成第八号',
    artist: 'Wassily Kandinsky',
    year: '1923',
    thumbnail: generateKandinskySVG(),
    defaultColors: ['#e94560', '#0f3460', '#f9d923', '#2d6a4f', '#16213e', '#eee', '#e76f51', '#264653'],
    defaultComposition: {
      pointDensity: 0.7,
      lineDensity: 0.8,
      blockDensity: 0.3,
      dominantDirection: 45,
    },
  },
  {
    id: 'mondrian-broadway',
    name: '百老汇布吉伍吉',
    artist: 'Piet Mondrian',
    year: '1943',
    thumbnail: generateMondrianSVG(),
    defaultColors: ['#e94560', '#0f3460', '#f9d923', '#16213e', '#eee', '#0066cc', '#ff6600'],
    defaultComposition: {
      pointDensity: 0.2,
      lineDensity: 0.9,
      blockDensity: 0.8,
      dominantDirection: 0,
    },
  },
  {
    id: 'pollock-1',
    name: '第1号 1950',
    artist: 'Jackson Pollock',
    year: '1950',
    thumbnail: generatePollockSVG(),
    defaultColors: ['#1a1a2e', '#e94560', '#0f3460', '#eee', '#8b4513', '#2d6a4f', '#f9d923'],
    defaultComposition: {
      pointDensity: 0.9,
      lineDensity: 0.85,
      blockDensity: 0.1,
      dominantDirection: 90,
    },
  },
  {
    id: 'rothko-1',
    name: 'No. 61',
    artist: 'Mark Rothko',
    year: '1953',
    thumbnail: generateRothkoSVG(),
    defaultColors: ['#8b0000', '#1a1a2e', '#0f3460', '#e94560', '#2d6a4f', '#f9d923'],
    defaultComposition: {
      pointDensity: 0.1,
      lineDensity: 0.1,
      blockDensity: 0.95,
      dominantDirection: 0,
    },
  },
  {
    id: 'miro-1',
    name: '哈里昆的狂欢',
    artist: 'Joan Miró',
    year: '1925',
    thumbnail: generateMiroSVG(),
    defaultColors: ['#1a1a2e', '#e94560', '#0f3460', '#f9d923', '#2d6a4f', '#eee', '#ff6b6b'],
    defaultComposition: {
      pointDensity: 0.6,
      lineDensity: 0.4,
      blockDensity: 0.5,
      dominantDirection: 135,
    },
  },
];

function generateKandinskySVG(): string {
  return `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80">
      <rect width="120" height="80" fill="#f5f5f0"/>
      <line x1="10" y1="10" x2="110" y2="70" stroke="#e94560" stroke-width="2"/>
      <line x1="20" y1="60" x2="100" y2="20" stroke="#0f3460" stroke-width="1.5"/>
      <circle cx="40" cy="30" r="8" fill="#f9d923"/>
      <circle cx="80" cy="50" r="5" fill="#2d6a4f"/>
      <polygon points="60,15 70,35 50,35" fill="#e94560"/>
      <rect x="85" y="55" width="20" height="15" fill="#0f3460"/>
      <line x1="5" y1="40" x2="35" y2="40" stroke="#16213e" stroke-width="3"/>
      <circle cx="25" cy="65" r="6" fill="none" stroke="#e76f51" stroke-width="2"/>
    </svg>
  `)}`;
}

function generateMondrianSVG(): string {
  return `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80">
      <rect width="120" height="80" fill="#fff"/>
      <rect x="0" y="0" width="35" height="30" fill="#e94560"/>
      <rect x="40" y="0" width="25" height="30" fill="#f9d923"/>
      <rect x="70" y="0" width="50" height="30" fill="#0f3460"/>
      <rect x="0" y="35" width="35" height="45" fill="#fff"/>
      <rect x="40" y="35" width="25" height="20" fill="#0066cc"/>
      <rect x="40" y="60" width="25" height="20" fill="#fff"/>
      <rect x="70" y="35" width="25" height="45" fill="#ff6600"/>
      <rect x="100" y="35" width="20" height="45" fill="#16213e"/>
      <line x1="37" y1="0" x2="37" y2="80" stroke="#000" stroke-width="3"/>
      <line x1="68" y1="0" x2="68" y2="80" stroke="#000" stroke-width="3"/>
      <line x1="97" y1="0" x2="97" y2="80" stroke="#000" stroke-width="3"/>
      <line x1="0" y1="32" x2="120" y2="32" stroke="#000" stroke-width="3"/>
      <line x1="0" y1="57" x2="120" y2="57" stroke="#000" stroke-width="2"/>
    </svg>
  `)}`;
}

function generatePollockSVG(): string {
  return `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80">
      <rect width="120" height="80" fill="#1a1a2e"/>
      <path d="M5,10 Q30,5 50,20 T100,15" stroke="#e94560" stroke-width="2" fill="none"/>
      <path d="M10,60 Q40,40 70,55 T115,50" stroke="#f9d923" stroke-width="1.5" fill="none"/>
      <path d="M20,30 Q50,50 80,35 T110,45" stroke="#0f3460" stroke-width="2" fill="none"/>
      <path d="M5,75 Q30,65 60,70 T115,65" stroke="#8b4513" stroke-width="1" fill="none"/>
      <circle cx="25" cy="25" r="2" fill="#eee"/>
      <circle cx="55" cy="45" r="3" fill="#2d6a4f"/>
      <circle cx="85" cy="20" r="2" fill="#e94560"/>
      <circle cx="40" cy="65" r="2" fill="#f9d923"/>
      <circle cx="95" cy="55" r="1.5" fill="#0f3460"/>
      <circle cx="15" cy="50" r="2" fill="#eee"/>
      <circle cx="70" cy="15" r="1.5" fill="#e94560"/>
      <circle cx="105" cy="35" r="2" fill="#2d6a4f"/>
    </svg>
  `)}`;
}

function generateRothkoSVG(): string {
  return `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80">
      <rect width="120" height="80" fill="#1a1a2e"/>
      <rect x="5" y="5" width="110" height="22" fill="#8b0000"/>
      <rect x="5" y="30" width="110" height="18" fill="#0f3460"/>
      <rect x="5" y="51" width="110" height="24" fill="#2d6a4f"/>
    </svg>
  `)}`;
}

function generateMiroSVG(): string {
  return `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="80" viewBox="0 0 120 80">
      <rect width="120" height="80" fill="#f0f0f0"/>
      <ellipse cx="30" cy="25" rx="15" ry="12" fill="#1a1a2e"/>
      <circle cx="30" cy="25" r="5" fill="#e94560"/>
      <path d="M50,15 Q60,5 70,15 Q80,25 70,35 Q60,45 50,35 Q40,25 50,15" fill="#0f3460"/>
      <circle cx="85" cy="25" r="8" fill="#f9d923"/>
      <line x1="95" y1="35" x2="110" y2="15" stroke="#e94560" stroke-width="2"/>
      <circle cx="95" cy="55" r="10" fill="#2d6a4f"/>
      <circle cx="95" cy="55" r="4" fill="#eee"/>
      <path d="M20,50 Q35,60 50,55" stroke="#1a1a2e" stroke-width="2" fill="none"/>
      <polygon points="65,50 75,45 80,55 70,60" fill="#ff6b6b"/>
      <circle cx="15" cy="65" r="3" fill="#0f3460"/>
      <line x1="55" y1="65" x2="100" y2="70" stroke="#1a1a2e" stroke-width="1.5" stroke-dasharray="4,2"/>
      <circle cx="105" cy="65" r="5" fill="#f9d923"/>
    </svg>
  `)}`;
}

let currentArtwork: PresetArtwork | null = null;
let currentAnalysis: ArtworkAnalysis | null = null;
let animation: ParticleAnimation | null = null;

const elements = {
  loading: document.getElementById('loading') as HTMLDivElement,
  progressBar: document.getElementById('progress-bar') as HTMLDivElement,
  artworkSelector: document.getElementById('artwork-selector') as HTMLDivElement,
  canvas: document.getElementById('animation-canvas') as HTMLCanvasElement,
  uploadBtn: document.getElementById('upload-btn') as HTMLButtonElement,
  fileInput: document.getElementById('file-input') as HTMLInputElement,
  artworkTitle: document.getElementById('artwork-title') as HTMLDivElement,
  artworkArtist: document.getElementById('artwork-artist') as HTMLDivElement,
  colorPalette: document.getElementById('color-palette') as HTMLDivElement,
  statParticles: document.getElementById('stat-particles') as HTMLSpanElement,
  statFps: document.getElementById('stat-fps') as HTMLSpanElement,
};

function updateProgress(percent: number): void {
  elements.progressBar.style.width = `${percent}%`;
}

function initArtworkSelector(): void {
  presetArtworks.forEach((artwork) => {
    const card = document.createElement('div');
    card.className = 'artwork-card';
    card.dataset.id = artwork.id;
    card.innerHTML = `
      <img src="${artwork.thumbnail}" alt="${artwork.name}" />
      <div class="overlay">
        <span class="artwork-name">${artwork.name}</span>
      </div>
    `;
    card.addEventListener('click', () => selectPresetArtwork(artwork));
    elements.artworkSelector.appendChild(card);
  });
}

function updateSelectedCard(artworkId: string): void {
  document.querySelectorAll('.artwork-card').forEach((card) => {
    card.classList.toggle('active', card.getAttribute('data-id') === artworkId);
  });
}

function updateColorPalette(colors: string[]): void {
  elements.colorPalette.innerHTML = '';
  colors.forEach((color) => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.style.backgroundColor = color;
    elements.colorPalette.appendChild(swatch);
  });
}

function applyAnalysis(
  analysis: ArtworkAnalysis,
  fallbackColors: string[],
  fallbackComposition: ArtworkAnalysis['composition']
): void {
  const colors = analysis.colors.length > 0 ? analysis.colors : fallbackColors;
  const composition = analysis.composition || fallbackComposition;
  const flowField = analysis.flowField || null;
  const edgeImageData = analysis.edgeImageData || null;
  const colorsWithWeight = analysis.colorsWithWeight || fallbackColors.map(c => ({ color: c, weight: 1 / fallbackColors.length }));

  updateColorPalette(colors);

  const particleCount = 3000 + Math.floor(
    (composition.pointDensity + composition.lineDensity) * 1000
  );
  const finalParticleCount = Math.min(5000, Math.max(3000, particleCount));

  const fullConfig = {
    colors,
    particleCount: finalParticleCount,
    composition,
    flowField,
    edgeImageData,
    colorsWithWeight,
  };

  if (animation) {
    animation.stop();
    animation.updateConfig(fullConfig);
    animation.start();
  } else {
    animation = new ParticleAnimation(
      elements.canvas,
      fullConfig,
      (fps) => {
        elements.statFps.textContent = fps.toString();
      }
    );
    animation.start();
  }

  elements.statParticles.textContent = animation.getParticleCount().toString();
}

async function selectPresetArtwork(artwork: PresetArtwork): Promise<void> {
  currentArtwork = artwork;
  updateSelectedCard(artwork.id);

  elements.artworkTitle.textContent = `${artwork.name}`;
  elements.artworkArtist.textContent = `${artwork.artist}, ${artwork.year}`;

  updateProgress(20);

  const img = new Image();
  img.crossOrigin = 'anonymous';

  const fallbackAnalysis: ArtworkAnalysis = {
    colors: artwork.defaultColors,
    colorsWithWeight: artwork.defaultColors.map(c => ({ color: c, weight: 1 / artwork.defaultColors.length })),
    composition: artwork.defaultComposition,
    flowField: null,
    edgeImageData: null,
  };

  img.onload = async () => {
    updateProgress(50);

    try {
      const analysis = await analyseArtwork(img);
      currentAnalysis = analysis;
      updateProgress(80);
      applyAnalysis(analysis, artwork.defaultColors, artwork.defaultComposition);
    } catch (error) {
      console.error('Analysis failed, using defaults:', error);
      currentAnalysis = fallbackAnalysis;
      applyAnalysis(fallbackAnalysis, artwork.defaultColors, artwork.defaultComposition);
    }

    updateProgress(100);
    setTimeout(() => updateProgress(0), 1000);
  };

  img.onerror = () => {
    console.warn('Image load failed, using fallback');
    currentAnalysis = fallbackAnalysis;
    applyAnalysis(fallbackAnalysis, artwork.defaultColors, artwork.defaultComposition);
    updateProgress(100);
    setTimeout(() => updateProgress(0), 1000);
  };

  img.src = artwork.thumbnail;
}

function handleUpload(): void {
  elements.fileInput.click();
}

function handleFileSelect(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) return;

  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    alert('请上传 JPG 或 PNG 格式的图片');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert('图片大小不能超过 5MB');
    return;
  }

  updateSelectedCard('');
  currentArtwork = null;

  const fallbackColors = ['#e94560', '#0f3460', '#f9d923', '#2d6a4f', '#16213e', '#eee'];
  const fallbackComposition = {
    pointDensity: 0.5,
    lineDensity: 0.5,
    blockDensity: 0.5,
    dominantDirection: 0,
  };

  const reader = new FileReader();
  updateProgress(10);

  reader.onload = async (e) => {
    const dataUrl = e.target?.result as string;
    updateProgress(30);

    const img = new Image();

    img.onload = async () => {
      updateProgress(50);

      try {
        const analysis = await analyseArtwork(img);
        currentAnalysis = analysis;
        updateProgress(80);

        elements.artworkTitle.textContent = '自定义画作';
        elements.artworkArtist.textContent = file.name;

        applyAnalysis(analysis, fallbackColors, fallbackComposition);

        updateProgress(100);

        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
          colors: analysis.colors,
        });

        setTimeout(() => updateProgress(0), 1000);
      } catch (error) {
        console.error('Analysis failed:', error);
        alert('图片解析失败，请尝试其他图片');
        updateProgress(0);
      }
    };

    img.onerror = () => {
      alert('图片加载失败');
      updateProgress(0);
    };

    img.src = dataUrl;
  };

  reader.onerror = () => {
    alert('文件读取失败');
    updateProgress(0);
  };

  reader.readAsDataURL(file);
  input.value = '';
}

function initEventListeners(): void {
  elements.uploadBtn.addEventListener('click', handleUpload);
  elements.fileInput.addEventListener('change', handleFileSelect);
  
  elements.canvas.addEventListener('mousemove', (e) => {
    animation?.handleMouseMove(e.clientX, e.clientY);
  });
  
  elements.canvas.addEventListener('mouseleave', () => {
    animation?.handleMouseLeave();
  });
  
  elements.canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    animation?.handleWheel(e.deltaY);
  }, { passive: false });
  
  elements.canvas.addEventListener('click', (e) => {
    animation?.handleClick(e.clientX, e.clientY);
  });
  
  window.addEventListener('resize', () => {
    animation?.handleResize();
  });
}

async function init(): Promise<void> {
  initArtworkSelector();
  initEventListeners();
  
  await selectPresetArtwork(presetArtworks[0]);
  
  setTimeout(() => {
    elements.loading.classList.add('hidden');
  }, 500);
}

init().catch((error) => {
  console.error('Initialization failed:', error);
  elements.loading.classList.add('hidden');
});

declare global {
  interface Window {
    __currentArtwork: typeof currentArtwork;
    __currentAnalysis: typeof currentAnalysis;
  }
}

Object.defineProperty(window, '__currentArtwork', {
  get: () => currentArtwork,
  configurable: true,
});

Object.defineProperty(window, '__currentAnalysis', {
  get: () => currentAnalysis,
  configurable: true,
});
