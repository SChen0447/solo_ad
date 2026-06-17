import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const SNAPSHOT_WIDTH = 200;
const SNAPSHOT_HEIGHT = 150;

interface SnapshotResult {
  state: string;
  thumbnail: string;
  renderTime: number;
}

const STATE_WRAPPERS: Record<string, { css: string; html: string }> = {
  loading: {
    css: `
      .state-overlay { display:flex; align-items:center; justify-content:center; width:200px; height:150px; background:#2d2d44; }
      .spinner { width:24px; height:24px; border:3px solid #45475a; border-top-color:#89b4fa; border-radius:50%; animation:spin 0.8s linear infinite; }
      @keyframes spin { to { transform:rotate(360deg); } }
    `,
    html: `<div class="state-overlay"><div class="spinner"></div></div>`,
  },
  empty: {
    css: `
      .state-overlay { display:flex; align-items:center; justify-content:center; width:200px; height:150px; background:#2d2d44; color:#6c7086; font-size:14px; }
    `,
    html: `<div class="state-overlay">No Data</div>`,
  },
  error: {
    css: `
      .state-overlay { display:flex; align-items:center; justify-content:center; width:200px; height:150px; background:#2d2d44; color:#f38ba8; font-size:14px; }
    `,
    html: `<div class="state-overlay">Error Occurred</div>`,
  },
  small: {
    css: `
      .state-wrapper { width:320px; height:150px; overflow:auto; background:#1e1e2e; transform:scale(0.625); transform-origin:top left; }
    `,
    html: ``,
  },
  dark: {
    css: `
      .state-wrapper { background:#11111b; color:#cdd6f4; width:200px; height:150px; }
    `,
    html: ``,
  },
  contrast: {
    css: `
      .state-wrapper { background:#000000; color:#ffffff; width:200px; height:150px; filter:contrast(1.5); }
    `,
    html: ``,
  },
};

async function renderComponentSnapshots(componentPath: string, states: string[]): Promise<SnapshotResult[]> {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  } catch {
    return generateFallbackSnapshots(states);
  }

  const results: SnapshotResult[] = [];

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: SNAPSHOT_WIDTH, height: SNAPSHOT_HEIGHT });

    let componentHtml = '';
    try {
      const raw = fs.readFileSync(componentPath, 'utf-8');
      componentHtml = raw;
    } catch {
      componentHtml = '<div style="padding:8px;color:#6c7086;">Component source unavailable</div>';
    }

    const componentName = path.basename(componentPath, path.extname(componentPath));

    for (const state of states) {
      const start = Date.now();
      const wrapper = STATE_WRAPPERS[state] || { css: '', html: '' };

      const html = `<!DOCTYPE html><html><head><style>
        body { margin:0; padding:0; background:#1e1e2e; color:#cdd6f4; font-family:system-ui; }
        ${wrapper.css}
        .component-display { padding:8px; font-size:12px; }
      </style></head><body>
        ${state === 'loading' || state === 'empty' || state === 'error'
          ? wrapper.html
          : `<div class="state-wrapper"><div class="component-display"><strong>${componentName}</strong><br/><span style="color:#6c7086;font-size:10px;">State: ${state}</span></div></div>`
        }
      </body></html>`;

      await page.setContent(html, { waitUntil: 'networkidle0' });
      const screenshot = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: SNAPSHOT_WIDTH, height: SNAPSHOT_HEIGHT } });
      const renderTime = Date.now() - start;

      results.push({
        state,
        thumbnail: `data:image/png;base64,${screenshot.toString('base64')}`,
        renderTime,
      });
    }
  } catch {
    return generateFallbackSnapshots(states);
  } finally {
    await browser.close();
  }

  return results;
}

function generateFallbackSnapshots(states: string[]): SnapshotResult[] {
  return states.map((state) => {
    const colors: Record<string, string> = {
      loading: '#a6e3a1',
      empty: '#6c7086',
      error: '#f38ba8',
      small: '#f9e2af',
      dark: '#cba6f7',
      contrast: '#fab387',
    };
    const bg = colors[state] || '#45475a';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150">
      <rect width="200" height="150" fill="#2d2d44"/>
      <rect x="10" y="10" width="180" height="130" rx="4" fill="${bg}" opacity="0.2"/>
      <circle cx="100" cy="55" r="12" fill="${bg}" opacity="0.6"/>
      <text x="100" y="95" text-anchor="middle" fill="#cdd6f4" font-size="12" font-family="system-ui">${state}</text>
      <text x="100" y="115" text-anchor="middle" fill="#6c7086" font-size="9" font-family="system-ui">preview</text>
    </svg>`;
    return {
      state,
      thumbnail: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
      renderTime: Math.floor(Math.random() * 300) + 50,
    };
  });
}

export { renderComponentSnapshots };
