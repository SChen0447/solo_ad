import { v4 as uuidv4 } from 'uuid';
import './components/nav-bar.js';
import './components/theme-panel.js';
import './components/card-grid.js';

export interface WorkItem {
  id: string;
  title: string;
  summary: string;
  coverImage: string;
}

export interface ThemeConfig {
  primaryColor: string;
  fontFamily: string;
  cardGap: number;
  backgroundPattern: number;
}

const patterns: string[] = [
  `<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'><g fill='none' fill-rule='evenodd'><g fill='currentColor' fill-opacity='0.06'><path d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/></g></g></svg>`,
  `<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'><g fill='none' fill-rule='evenodd'><g fill='currentColor' fill-opacity='0.05'><path d='M28 0L0 28l28 28 28-28L28 0zm0 8.5L47.5 28 28 47.5 8.5 28 28 8.5z'/></g></g></svg>`,
  `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'><g fill='none' fill-rule='evenodd'><g fill='currentColor' fill-opacity='0.04'><circle cx='24' cy='24' r='3'/><circle cx='8' cy='8' r='2'/><circle cx='40' cy='8' r='2'/><circle cx='8' cy='40' r='2'/><circle cx='40' cy='40' r='2'/></g></g></svg>`,
  `<svg xmlns='http://www.w3.org/2000/svg' width='72' height='72' viewBox='0 0 72 72'><g fill='none' fill-rule='evenodd'><g fill='currentColor' fill-opacity='0.05'><path d='M36 0L72 36l-36 36L0 36 36 0zm0 8L64 36 36 64 8 36 36 8z'/><circle cx='36' cy='36' r='6'/></g></g></svg>`,
  `<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'><g fill='none' fill-rule='evenodd'><g stroke='currentColor' stroke-opacity='0.06' stroke-width='1'><path d='M0 40h80M40 0v80'/><circle cx='40' cy='40' r='12'/><circle cx='40' cy='40' r='28'/></g></g></svg>`,
  `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><g fill='none' fill-rule='evenodd'><g fill='currentColor' fill-opacity='0.04'><rect x='0' y='0' width='8' height='8'/><rect x='16' y='16' width='8' height='8'/><rect x='32' y='0' width='8' height='8'/><rect x='48' y='16' width='8' height='8'/><rect x='0' y='32' width='8' height='8'/><rect x='16' y='48' width='8' height='8'/><rect x='32' y='32' width='8' height='8'/><rect x='48' y='48' width='8' height='8'/></g></g></svg>`
];

const mockWorks: WorkItem[] = [
  {
    id: uuidv4(),
    title: '极简主义品牌设计系统',
    summary: '为一家独立咖啡品牌打造的完整视觉识别系统，涵盖Logo、色彩、字体规范及包装设计，追求克制而温暖的表达。',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=minimalist%20coffee%20brand%20design%20system%20warm%20aesthetic%20flat%20lay&image_size=landscape_4_3'
  },
  {
    id: uuidv4(),
    title: '城市摄影集《呼吸之间》',
    summary: '历时两年记录的城市街头影像，探索现代都市中人的孤独与联结，黑白与彩色交织的视觉叙事。',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=urban%20street%20photography%20cinematic%20black%20and%20white%20city%20moment&image_size=landscape_4_3'
  },
  {
    id: uuidv4(),
    title: '交互装置「声波花园」',
    summary: '将环境声音转化为可视化植物生长的沉浸式交互装置，观众的声音会影响虚拟花园的形态与色彩。',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=immersive%20interactive%20sound%20wave%20garden%20installation%20colorful%20projection&image_size=landscape_4_3'
  },
  {
    id: uuidv4(),
    title: '独立出版物《纸间》创刊号',
    summary: '探讨数字时代纸张阅读体验的独立杂志，特邀12位创作者共同完成，采用特种纸四色印刷。',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=indie%20magazine%20editorial%20design%20paper%20texture%20typography%20aesthetic&image_size=landscape_4_3'
  },
  {
    id: uuidv4(),
    title: '动态字体实验「流变」',
    summary: '基于物理模拟的可变字体实验项目，探索文字在不同外力作用下的形变可能性与视觉表现力。',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=kinetic%20typography%20fluid%20variable%20font%20experimental%20motion%20design&image_size=landscape_4_3'
  },
  {
    id: uuidv4(),
    title: '社区空间视觉改造',
    summary: '为老城社区公共空间进行的视觉焕新项目，结合在地文化符号与现代图形语言，重建邻里归属感。',
    coverImage: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=community%20public%20space%20mural%20design%20colorful%20cultural%20graphics%20modern&image_size=landscape_4_3'
  }
];

let activeSection: 'about' | 'works' | 'contact' = 'works';
let themeMode: 'light' | 'dark' = 'light';
let panelOpen = false;
let themeConfig: ThemeConfig = {
  primaryColor: '#6366f1',
  fontFamily: "'Playfair Display', serif",
  cardGap: 24,
  backgroundPattern: 0
};

function applyThemeConfig(config: ThemeConfig) {
  const root = document.documentElement;
  root.style.setProperty('--primary', config.primaryColor);
  const rgb = hexToRgb(config.primaryColor);
  root.style.setProperty('--primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
  root.style.setProperty('--font-heading', config.fontFamily);
  root.style.setProperty('--card-gap', `${config.cardGap}px`);
  root.style.setProperty('--bg-pattern', String(config.backgroundPattern));
  applyBackgroundPattern(config.backgroundPattern, config.primaryColor);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 99, g: 102, b: 241 };
}

function applyBackgroundPattern(index: number, color: string) {
  const patternEl = document.querySelector<HTMLDivElement>('.bg-pattern');
  if (patternEl && patterns[index]) {
    const svg = patterns[index].replace(/currentColor/g, color);
    patternEl.style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    patternEl.style.backgroundRepeat = 'repeat';
  }
}

function setThemeMode(mode: 'light' | 'dark') {
  themeMode = mode;
  document.documentElement.setAttribute('data-theme', mode);
  const navBar = document.querySelector('nav-bar');
  if (navBar) {
    navBar.setAttribute('theme-mode', mode);
  }
}

function setActiveSection(section: 'about' | 'works' | 'contact') {
  activeSection = section;
  const navBar = document.querySelector('nav-bar');
  if (navBar) {
    navBar.setAttribute('active-section', section);
  }
  renderContent();
}

function toggleThemePanel(open: boolean) {
  panelOpen = open;
  const panel = document.querySelector('theme-panel');
  if (panel) {
    panel.setAttribute('open', String(open));
  }
}

function renderContent(): void {
  const app = document.getElementById('app');
  if (!app) return;

  let content = '';

  if (activeSection === 'about') {
    content = `
      <section class="section">
        <div class="section-header">
          <span class="section-label">About Me</span>
          <h1 class="section-title">在设计与生活之间<br/>寻找有温度的表达</h1>
          <p class="section-subtitle">
            我是一名独立设计师与内容创作者，专注于品牌视觉、编辑设计与交互装置。过去八年里，我与超过四十家独立品牌和文化机构合作，
            试图用设计的力量讲述那些被忽略的故事。工作之余，我用相机记录城市，用纸笔书写思考，相信好的设计应该像呼吸一样自然。
          </p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; margin-top: 48px;">
          <div style="padding: 32px; background: var(--surface); border-radius: 16px; border: 1px solid var(--border); transition: all var(--transition-standard);">
            <div style="font-family: var(--font-heading); font-size: 48px; font-weight: 700; color: var(--primary); margin-bottom: 8px;">8+</div>
            <div style="font-size: 14px; color: var(--text-secondary); font-weight: 500; letter-spacing: 0.05em;">年设计经验</div>
          </div>
          <div style="padding: 32px; background: var(--surface); border-radius: 16px; border: 1px solid var(--border); transition: all var(--transition-standard);">
            <div style="font-family: var(--font-heading); font-size: 48px; font-weight: 700; color: var(--primary); margin-bottom: 8px;">40+</div>
            <div style="font-size: 14px; color: var(--text-secondary); font-weight: 500; letter-spacing: 0.05em;">合作品牌</div>
          </div>
          <div style="padding: 32px; background: var(--surface); border-radius: 16px; border: 1px solid var(--border); transition: all var(--transition-standard);">
            <div style="font-family: var(--font-heading); font-size: 48px; font-weight: 700; color: var(--primary); margin-bottom: 8px;">120+</div>
            <div style="font-size: 14px; color: var(--text-secondary); font-weight: 500; letter-spacing: 0.05em;">完成项目</div>
          </div>
        </div>
      </section>
    `;
  } else if (activeSection === 'works') {
    content = `
      <section class="section">
        <div class="section-header">
          <span class="section-label">Selected Works</span>
          <h1 class="section-title">精选作品集</h1>
          <p class="section-subtitle">收录近两年最具代表性的项目，涵盖品牌设计、视觉出版、交互装置等多个领域。</p>
        </div>
        <card-grid></card-grid>
      </section>
    `;
  } else if (activeSection === 'contact') {
    content = `
      <section class="section">
        <div class="section-header">
          <span class="section-label">Get in Touch</span>
          <h1 class="section-title">聊聊你的想法</h1>
          <p class="section-subtitle">无论是品牌合作、创作邀约还是单纯想交流，都欢迎通过以下方式与我取得联系。</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 32px; margin-top: 48px;">
          <div style="padding: 48px; background: var(--surface); border-radius: 20px; border: 1px solid var(--border);">
            <div style="font-size: 13px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 16px;">电子邮箱</div>
            <div style="font-family: var(--font-heading); font-size: 28px; font-weight: 600; color: var(--text-primary); margin-bottom: 32px;">hello@portfolio.design</div>
            <div style="font-size: 13px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 16px;">工作时间</div>
            <div style="font-size: 16px; color: var(--text-secondary); line-height: 1.8;">
              周一至周五 10:00 — 19:00<br/>
              通常会在 24 小时内回复
            </div>
          </div>
          <div style="padding: 48px; background: linear-gradient(135deg, var(--primary), rgba(var(--primary-rgb), 0.7)); border-radius: 20px; color: white;">
            <div style="font-size: 13px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.8; margin-bottom: 16px;">社交媒体</div>
            <div style="display: flex; flex-direction: column; gap: 20px; margin-top: 32px;">
              <a href="#" style="display: flex; align-items: center; gap: 16px; color: white; text-decoration: none; font-size: 18px; font-weight: 500; transition: transform var(--transition-standard);">
                <span style="width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; font-weight: 600;">IG</span>
                Instagram — @portfolio.design
              </a>
              <a href="#" style="display: flex; align-items: center; gap: 16px; color: white; text-decoration: none; font-size: 18px; font-weight: 500; transition: transform var(--transition-standard);">
                <span style="width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; font-weight: 600;">BE</span>
                Behance — portfoliodesign
              </a>
              <a href="#" style="display: flex; align-items: center; gap: 16px; color: white; text-decoration: none; font-size: 18px; font-weight: 500; transition: transform var(--transition-standard);">
                <span style="width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; font-weight: 600;">DR</span>
                Dribbble — portfolio
              </a>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  app.innerHTML = `
    <nav-bar active-section="${activeSection}" theme-mode="${themeMode}"></nav-bar>
    <theme-panel open="${panelOpen}" primary-color="${themeConfig.primaryColor}" font-family="${encodeURIComponent(themeConfig.fontFamily)}" card-gap="${themeConfig.cardGap}" background-pattern="${themeConfig.backgroundPattern}"></theme-panel>
    <main>${content}</main>
  `;

  const cardGrid = document.querySelector('card-grid');
  if (cardGrid) {
    cardGrid.dispatchEvent(new CustomEvent('set-works', { detail: { works: mockWorks } }));
  }
}

function initEventListeners(): void {
  document.addEventListener('navigate', ((e: CustomEvent) => {
    setActiveSection(e.detail.section);
  }) as EventListener);

  document.addEventListener('toggle-theme', (() => {
    setThemeMode(themeMode === 'light' ? 'dark' : 'light');
  }) as EventListener);

  document.addEventListener('open-panel', (() => {
    toggleThemePanel(true);
  }) as EventListener);

  document.addEventListener('close-panel', (() => {
    toggleThemePanel(false);
  }) as EventListener);

  document.addEventListener('theme-change', ((e: CustomEvent) => {
    themeConfig = { ...themeConfig, ...e.detail };
    applyThemeConfig(themeConfig);
  }) as EventListener);
}

function init(): void {
  applyThemeConfig(themeConfig);
  applyBackgroundPattern(0, themeConfig.primaryColor);
  initEventListeners();
  renderContent();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
