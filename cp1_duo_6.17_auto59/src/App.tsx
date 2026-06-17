import React from 'react';
import { Routes, Route } from 'react-router-dom';
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
  const [html, setHtml] = React.useState('');
  const [css, setCss] = React.useState('');
  const [conflicts, setConflicts] = React.useState<Conflict[]>([]);
  const [selectedConflictId, setSelectedConflictId] = React.useState<string | null>(null);
  const [fixProposal, setFixProposal] = React.useState<FixProposal | null>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [leftPanelWidth, setLeftPanelWidth] = React.useState(55);

  React.useEffect(() => {
    const savedHtml = localStorage.getItem('css-analyzer-html');
    const savedCss = localStorage.getItem('css-analyzer-css');
    if (savedHtml) setHtml(savedHtml);
    if (savedCss) setCss(savedCss);
    if (!savedHtml && !savedCss && EXAMPLES.length > 0) {
      setHtml(EXAMPLES[0].html);
      setCss(EXAMPLES[0].css);
    }
  }, []);

  React.useEffect(() => {
    const debounceTimer = setTimeout(() => {
      localStorage.setItem('css-analyzer-html', html);
      localStorage.setItem('css-analyzer-css', css);
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [html, css]);

  const handleAnalyze = React.useCallback(async () => {
    if (!html.trim() || !css.trim()) {
      alert('请输入HTML和CSS内容');
      return;
    }
    setIsAnalyzing(true);
    setConflicts([]);
    setFixProposal(null);
    setSelectedConflictId(null);
    try {
      const result = await ConflictAnalyzer.analyze(html, css);
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

  const handleLoadExample = React.useCallback((index: number) => {
    if (EXAMPLES[index]) {
      setHtml(EXAMPLES[index].html);
      setCss(EXAMPLES[index].css);
      setConflicts([]);
      setFixProposal(null);
      setSelectedConflictId(null);
    }
  }, []);

  const handleCopyFixedCss = React.useCallback((_text: string) => {}, []);

  const exampleOptions = EXAMPLES.map(ex => ({
    name: ex.name,
    description: ex.description
  }));

  const onDividerMouseDown = React.useCallback((e: React.MouseEvent) => {
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
  }, [leftPanelWidth]);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">CSS Conflict Analyzer</span>
        </div>
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
        <div className="panel-divider" onMouseDown={onDividerMouseDown}>
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

const PlaceholderPage: React.FC<{ title: string; desc: string }> = ({ title, desc }) => (
  <div className="app-container">
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40
    }}>
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: 48,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        maxWidth: 520,
        textAlign: 'center',
        border: '1px solid #d1d5db'
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>�</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1f2937', marginBottom: 12 }}>{title}</h1>
        <p style={{ fontSize: 16, color: '#6b7280', lineHeight: 1.7 }}>{desc}</p>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/about"
        element={
          <PlaceholderPage
            title="关于页面"
            desc="这是一个路由占位页面，用于验证 React Router 配置是否正常工作。"
          />
        }
      />
      <Route
        path="*"
        element={
          <PlaceholderPage
            title="404 Not Found"
            desc="路由占位页面，你访问的路径尚未配置对应组件。"
          />
        }
      />
    </Routes>
  );
};

export default App;
