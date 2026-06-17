import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, NavLink } from 'react-router-dom';

import EditorPanel from './components/EditorPanel';
import ConflictVisualizer from './components/ConflictVisualizer';
import { ConflictAnalyzer } from './services/conflictAnalyzer';
import { RepairGenerator } from './services/repairGenerator';
import type { Conflict, FixProposal, ExampleData } from './types';

const EXAMPLES: ExampleData[] = [
  {
    name: 'ID vs Class 选择器冲突',
    description: 'ID选择器特异性高于Class选择器',
    html: `<div id="main" class="container">
  <p class="text" id="title">Hello World</p>
  <button class="btn primary">点击我</button>
</div>`,
    css: `#title {
  color: #e74c3c;
  font-size: 24px;
  font-weight: bold;
}

.text {
  color: #3498db;
  font-size: 16px;
}

.container .btn {
  background-color: #2ecc71;
  padding: 10px 20px;
}

.btn.primary {
  background-color: #3498db;
  border-radius: 4px;
}

#main .btn {
  background-color: #9b59b6;
}`
  },
  {
    name: '后代选择器 vs 直接子选择器',
    description: '不同组合器的特异性对比',
    html: `<nav class="nav">
  <ul class="menu">
    <li class="item">
      <a href="#" class="link active">首页</a>
      <ul class="submenu">
        <li><a href="#" class="link">子菜单1</a></li>
        <li><a href="#" class="link">子菜单2</a></li>
      </ul>
    </li>
    <li class="item">
      <a href="#" class="link">关于我们</a>
    </li>
  </ul>
</nav>`,
    css: `.nav .menu .link {
  color: #2c3e50;
  padding: 8px 12px;
  text-decoration: none;
}

.nav > .menu > .item > .link {
  color: #e67e22;
  font-weight: 600;
  padding: 12px 16px;
}

.menu .item .link.active {
  color: #c0392b;
  background-color: #ecf0f1;
}

.submenu .link {
  color: #7f8c8d;
  font-size: 14px;
  padding: 6px 10px;
}`
  },
  {
    name: '!important 声明冲突',
    description: '!important声明会覆盖普通声明',
    html: `<section class="card-wrapper">
  <div class="card featured" id="special-card">
    <h2 class="card-title">特别推荐</h2>
    <p class="card-description">这是一段特别重要的描述文字</p>
    <span class="card-tag" style="color: #16a085;">热门</span>
  </div>
  <div class="card">
    <h2 class="card-title">普通卡片</h2>
    <p class="card-description">这是普通卡片的描述</p>
  </div>
</section>`,
    css: `.card {
  background-color: #ffffff;
  border: 1px solid #ddd;
  padding: 20px;
  margin: 10px 0;
}

.card .card-title {
  color: #34495e !important;
  font-size: 20px;
}

#special-card .card-title {
  color: #e74c3c;
  font-size: 24px;
}

.featured.card .card-description {
  color: #27ae60 !important;
  line-height: 1.6;
}

.card-description {
  color: #7f8c8d;
  line-height: 1.5;
}

.card-tag {
  display: inline-block;
  background-color: #f39c12;
  color: #fff !important;
  padding: 2px 8px;
  border-radius: 3px;
}`
  }
];

const HomePage: React.FC = () => {
  const [html, setHtml] = useState('');
  const [css, setCss] = useState('');
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>(null);
  const [fixProposal, setFixProposal] = useState<FixProposal | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = useState(55);

  useEffect(() => {
    const savedHtml = localStorage.getItem('css-analyzer-html');
    const savedCss = localStorage.getItem('css-analyzer-css');
    if (savedHtml) setHtml(savedHtml);
    if (savedCss) setCss(savedCss);

    if (!savedHtml && !savedCss && EXAMPLES.length > 0) {
      setHtml(EXAMPLES[0].html);
      setCss(EXAMPLES[0].css);
    }
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      localStorage.setItem('css-analyzer-html', html);
      localStorage.setItem('css-analyzer-css', css);
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [html, css]);

  const handleAnalyze = useCallback(async () => {
    if (!html.trim() || !css.trim()) {
      alert('请输入HTML和CSS内容');
      return;
    }

    setIsAnalyzing(true);
    setConflicts([]);
    setFixProposal(null);
    setSelectedConflictId(null);

    try {
      const startTime = performance.now();
      const result = await ConflictAnalyzer.analyze(html, css);
      const endTime = performance.now();
      console.log(`冲突检测耗时: ${(endTime - startTime).toFixed(2)}ms`);

      setConflicts(result);

      if (result.length > 0) {
        const proposal = await RepairGenerator.generateRepair(result, css);
        setFixProposal(proposal);
      }
    } catch (error: any) {
      console.error('分析错误:', error);
      alert(`分析失败: ${error.message || '未知错误'}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, [html, css]);

  const handleLoadExample = useCallback((index: number) => {
    if (EXAMPLES[index]) {
      setHtml(EXAMPLES[index].html);
      setCss(EXAMPLES[index].css);
      setConflicts([]);
      setFixProposal(null);
      setSelectedConflictId(null);
    }
  }, []);

  const handleCopyFixedCss = useCallback((_text: string) => {
  }, []);

  const exampleOptions = EXAMPLES.map(ex => ({
    name: ex.name,
    description: ex.description
  }));

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">CSS Conflict Analyzer</span>
        </div>

        <nav className="header-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            🏠 主页
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            ℹ️ 关于
          </NavLink>
        </nav>

        <div className="header-info">
          {conflicts.length > 0 && (
            <span className="result-badge">
              检测到 <strong>{conflicts.length}</strong> 处冲突
            </span>
          )}
        </div>
      </header>

      <div className="app-body">
        <div className="panel-left" style={{ width: `${leftPanelWidth}%` }}>
          <EditorPanel
            htmlValue={html}
            cssValue={css}
            onHtmlChange={setHtml}
            onCssChange={setCss}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
            exampleOptions={exampleOptions}
            onLoadExample={handleLoadExample}
          />
        </div>

        <div
          className="panel-divider"
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = leftPanelWidth;
            const container = e.currentTarget.parentElement;
            if (!container) return;
            const containerWidth = container.getBoundingClientRect().width;

            const onMove = (moveE: MouseEvent) => {
              const delta = moveE.clientX - startX;
              const newWidth = startWidth + (delta / containerWidth) * 100;
              if (newWidth >= 35 && newWidth <= 75) {
                setLeftPanelWidth(newWidth);
              }
            };

            const onUp = () => {
              document.removeEventListener('mousemove', onMove);
              document.removeEventListener('mouseup', onUp);
              document.body.style.cursor = '';
              document.body.style.userSelect = '';
            };

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          }}
        >
          <div className="divider-line" />
        </div>

        <div className="panel-right" style={{ width: `${100 - leftPanelWidth}%` }}>
          <ConflictVisualizer
            htmlValue={html}
            cssValue={css}
            conflicts={conflicts}
            selectedConflictId={selectedConflictId}
            onSelectConflict={setSelectedConflictId}
            fixProposal={fixProposal}
            onCopyFixedCss={handleCopyFixedCss}
          />
        </div>
      </div>
    </div>
  );
};

const AboutPage: React.FC = () => {
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">CSS Conflict Analyzer</span>
        </div>

        <nav className="header-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            🏠 主页
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            ℹ️ 关于
          </NavLink>
        </nav>

        <div className="header-info" />
      </header>

      <div className="about-page">
        <div className="about-card">
          <h1 className="about-title">关于本工具</h1>
          <p className="about-desc">
            CSS选择器冲突排查与修复提案生成工具，帮助开发者快速定位CSS样式冲突，
            并智能生成无副作用的修复方案。
          </p>

          <div className="feature-grid">
            <div className="feature-item">
              <div className="feature-icon">🔍</div>
              <h3>智能检测</h3>
              <p>自动分析CSS选择器特异性与覆盖冲突</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🌳</div>
              <h3>可视化定位</h3>
              <p>DOM树中高亮冲突节点，一目了然</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🔧</div>
              <h3>一键修复</h3>
              <p>生成Diff格式修复建议，支持一键复制</p>
            </div>
            <div className="feature-item">
              <div className="feature-icon">⚡</div>
              <h3>极速响应</h3>
              <p>1.5秒内完成解析与检测，毫秒级交互</p>
            </div>
          </div>

          <div className="about-actions">
            <Link to="/" className="back-home-btn">
              ← 返回主页开始使用
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotFoundPage: React.FC = () => {
  return (
    <div className="app-container">
      <div className="not-found-page">
        <div className="not-found-card">
          <div className="not-found-icon">😵</div>
          <h1 className="not-found-title">404 页面未找到</h1>
          <p className="not-found-desc">你访问的页面不存在，请检查URL是否正确</p>
          <Link to="/" className="back-home-btn">
            ← 返回主页
          </Link>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default App;
