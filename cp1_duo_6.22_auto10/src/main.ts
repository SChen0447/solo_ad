import { renderBookShelf } from './components/bookShelf';
import { renderReadingDetail } from './components/readingDetail';
import { renderStatsDashboard } from './components/statsDashboard';
import { getAllBooks, addBook } from './utils/bookStorage';

type PageKey = 'shelf' | 'stats' | 'settings' | 'detail';

let currentPage: PageKey = 'shelf';
let currentBookId: string | null = null;

const app = document.getElementById('app') as HTMLElement;

function seedSampleData(): void {
  const books = getAllBooks();
  if (books.length > 0) return;

  const samples = [
    { title: '人类简史', author: '尤瓦尔·赫拉利', totalPages: 440, status: 'reading' as const },
    { title: '活着', author: '余华', totalPages: 191, status: 'finished' as const },
    { title: '三体', author: '刘慈欣', totalPages: 302, status: 'shelved' as const }
  ];

  samples.forEach(s => {
    addBook({
      title: s.title,
      author: s.author,
      coverUrl: '',
      totalPages: s.totalPages,
      status: s.status
    });
  });
}

function navigate(route: string): void {
  if (route.startsWith('/book/')) {
    const bookId = route.replace('/book/', '');
    currentPage = 'detail';
    currentBookId = bookId;
  } else if (route === '/shelf') {
    currentPage = 'shelf';
    currentBookId = null;
  } else if (route === '/stats') {
    currentPage = 'stats';
    currentBookId = null;
  } else if (route === '/settings') {
    currentPage = 'settings';
    currentBookId = null;
  } else {
    currentPage = 'shelf';
    currentBookId = null;
  }

  try {
    window.location.hash = route;
  } catch {
    // ignore
  }

  renderApp();
}

function renderBottomNav(): string {
  const isShelf = currentPage === 'shelf';
  const isStats = currentPage === 'stats';
  const isSettings = currentPage === 'settings';
  const hidden = currentPage === 'detail' ? 'style="display:none;"' : '';

  return `
    <nav class="nav-bottom" ${hidden}>
      <div class="nav-item ${isShelf ? 'active' : ''}" data-nav="/shelf">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
        <span>书架</span>
      </div>
      <div class="nav-item ${isStats ? 'active' : ''}" data-nav="/stats">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
        <span>统计</span>
      </div>
      <div class="nav-item ${isSettings ? 'active' : ''}" data-nav="/settings">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
        <span>设置</span>
      </div>
    </nav>
  `;
}

function renderSettings(root: HTMLElement): void {
  const bookCount = getAllBooks().length;
  const bytes = new Blob([JSON.stringify(getAllBooks())]).size;
  const sizeKB = (bytes / 1024).toFixed(1);

  root.innerHTML = `
    <div class="page-header">
      <h1>⚙️ 设置</h1>
    </div>

    <div class="settings-section">
      <div class="settings-title">数据管理</div>
      <div class="settings-row">
        <div>
          <div class="settings-label">本地存储数据</div>
          <div class="settings-desc">${bookCount} 本书 · 约 ${sizeKB} KB</div>
        </div>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-label">导出数据</div>
          <div class="settings-desc">将所有数据导出为 JSON 文件</div>
        </div>
        <button class="btn btn-secondary" id="export-btn" style="padding:0.4rem 0.8rem;font-size:0.8rem;">导出</button>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-label">导入数据</div>
          <div class="settings-desc">从 JSON 文件恢复数据</div>
        </div>
        <button class="btn btn-secondary" id="import-btn" style="padding:0.4rem 0.8rem;font-size:0.8rem;">导入</button>
        <input type="file" id="import-file" accept=".json,application/json" style="display:none;" />
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-label" style="color:#EF5350;">清空所有数据</div>
          <div class="settings-desc">删除书架上的全部书籍和记录</div>
        </div>
        <button class="btn btn-danger" id="clear-btn" style="padding:0.4rem 0.8rem;font-size:0.8rem;">清空</button>
      </div>
    </div>

    <div class="settings-section">
      <div class="settings-title">关于</div>
      <div class="settings-row">
        <div class="settings-label">版本</div>
        <div style="font-size:0.85rem;color:#795548;">1.0.0</div>
      </div>
      <div class="settings-row">
        <div>
          <div class="settings-label">阅读追踪</div>
          <div class="settings-desc">你的私人书房，记录每一次阅读</div>
        </div>
      </div>
    </div>
  `;

  root.querySelector('#export-btn')?.addEventListener('click', () => {
    const data = getAllBooks();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reading-tracker-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  const importFile = root.querySelector('#import-file') as HTMLInputElement;
  root.querySelector('#import-btn')?.addEventListener('click', () => {
    importFile?.click();
  });
  importFile?.addEventListener('change', () => {
    const file = importFile.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (!Array.isArray(imported)) throw new Error('格式不正确');
        if (confirm(`导入将覆盖现有数据，确认导入 ${imported.length} 本书？`)) {
          localStorage.setItem('reading_tracker_books', JSON.stringify(imported));
          alert('导入成功！');
          navigate('/shelf');
        }
      } catch (err) {
        alert('导入失败：文件格式不正确');
      }
    };
    reader.readAsText(file);
  });

  root.querySelector('#clear-btn')?.addEventListener('click', () => {
    if (confirm('⚠️ 确定要清空所有数据吗？\n此操作无法撤销！')) {
      localStorage.removeItem('reading_tracker_books');
      navigate('/shelf');
    }
  });
}

function renderApp(): void {
  if (!app) return;

  let pageHTML = '';
  if (currentPage !== 'detail') {
    pageHTML += renderBottomNav();
  }
  app.innerHTML = `<div class="page active" id="page-content"></div>${pageHTML}`;

  const pageContent = document.getElementById('page-content') as HTMLElement;

  switch (currentPage) {
    case 'shelf':
      renderBookShelf(pageContent, navigate);
      break;
    case 'stats':
      renderStatsDashboard(pageContent, navigate);
      break;
    case 'settings':
      renderSettings(pageContent);
      break;
    case 'detail':
      if (currentBookId) {
        renderReadingDetail(pageContent, currentBookId, navigate);
      } else {
        navigate('/shelf');
      }
      break;
    default:
      renderBookShelf(pageContent, navigate);
  }

  app.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => {
      const route = (el as HTMLElement).getAttribute('data-nav');
      if (route) navigate(route);
    });
  });
}

function init(): void {
  seedSampleData();

  const hash = window.location.hash.replace('#', '');
  if (hash.startsWith('/book/')) {
    navigate(hash);
  } else if (hash === '/stats') {
    navigate('/stats');
  } else if (hash === '/settings') {
    navigate('/settings');
  } else {
    navigate('/shelf');
  }

  window.addEventListener('hashchange', () => {
    const h = window.location.hash.replace('#', '');
    if (h) navigate(h);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
