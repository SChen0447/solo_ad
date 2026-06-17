import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { bookmarkDataService, type Bookmark, type TimeRange } from '@/data/BookmarkDataService';
import TimelinePanel from '@/components/TimelinePanel';
import BookmarkGrid from '@/components/BookmarkGrid';
import FilterBar from '@/components/FilterBar';
import './App.css';

function App() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    const sample = createSampleBookmarks();
    sample.forEach((b) => bookmarkDataService.add(b));
    return bookmarkDataService.getAll();
  });
  const [timeRange, setTimeRange] = useState<TimeRange>(() => bookmarkDataService.getTimeRange());
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newTags, setNewTags] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const allBookmarks = bookmarkDataService.getAll();
    if (allBookmarks.length > 0) {
      const fullRange = bookmarkDataService.getTimeRange();
      const padding = (fullRange.end - fullRange.start) * 0.1 || 86400000;
      setTimeRange({
        start: fullRange.start - padding,
        end: fullRange.end + padding,
      });
    }
  }, []);

  const filteredBookmarks = useMemo(() => {
    if (selectedTag) {
      return bookmarkDataService.getByTag(selectedTag);
    }
    return bookmarkDataService.getByTimeRange(timeRange);
  }, [timeRange, selectedTag]);

  const allTags = useMemo(() => bookmarkDataService.getAllTags(), [bookmarks]);

  const filteredIds = useMemo(() => {
    if (!selectedTag) return null;
    return new Set(filteredBookmarks.map((b) => b.id));
  }, [selectedTag, filteredBookmarks]);

  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    setTimeRange(range);
  }, []);

  const handleTagSelect = useCallback((tag: string | null) => {
    setSelectedTag(tag);
  }, []);

  const handleTagFilter = useCallback((tag: string) => {
    setSelectedTag((prev) => (prev === tag ? null : tag));
  }, []);

  const refreshBookmarks = useCallback(() => {
    setBookmarks(bookmarkDataService.getAll());
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      bookmarkDataService.remove(id);
      refreshBookmarks();
    },
    [refreshBookmarks]
  );

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = bookmarkDataService.importFromHtml(text);
      if (imported.length > 0) {
        const fullRange = bookmarkDataService.getTimeRange();
        const padding = (fullRange.end - fullRange.start) * 0.1 || 86400000;
        setTimeRange({
          start: fullRange.start - padding,
          end: fullRange.end + padding,
        });
        refreshBookmarks();
        alert(`成功导入 ${imported.length} 个书签`);
      } else {
        alert('未找到可导入的书签');
      }
    } catch (err) {
      console.error('导入失败:', err);
      alert('导入失败，请检查文件格式');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddBookmark = () => {
    if (!newUrl.trim()) {
      alert('请输入URL');
      return;
    }

    let url = newUrl.trim();
    if (!url.match(/^https?:\/\//)) {
      url = 'https://' + url;
    }

    const tags = newTags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, 5);

    bookmarkDataService.add({
      title: newTitle.trim() || url,
      url,
      tags,
    });

    setNewTitle('');
    setNewUrl('');
    setNewTags('');
    setShowAddModal(false);
    refreshBookmarks();

    const fullRange = bookmarkDataService.getTimeRange();
    const padding = (fullRange.end - fullRange.start) * 0.1 || 86400000;
    setTimeRange({
      start: fullRange.start - padding,
      end: fullRange.end + padding,
    });
  };

  const handleExport = () => {
    const allBookmarks = bookmarkDataService.getAll();
    const jsonStr = JSON.stringify(allBookmarks, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmarks_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">📚 Timeline Bookmarks</h1>
          <div className="header-actions">
            <button className="btn btn-primary" onClick={handleImportClick}>
              导入书签
            </button>
            <button className="btn btn-secondary" onClick={() => setShowAddModal(true)}>
              + 添加
            </button>
          </div>
        </div>
        <div className="header-right">
          <button className="btn btn-primary btn-export" onClick={handleExport}>
            导出
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".html,.htm"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </header>

      <div className="filter-bar-wrapper">
        <FilterBar tags={allTags} selectedTag={selectedTag} onTagSelect={handleTagSelect} />
      </div>

      <div className="timeline-section">
        <TimelinePanel
          bookmarks={bookmarks}
          timeRange={timeRange}
          filteredIds={filteredIds}
          onTimeRangeChange={handleTimeRangeChange}
        />
        <div className="timeline-hint">
          <span>拖拽时间轴浏览不同时段</span>
          <span className="timeline-range">
            {formatDate(timeRange.start)} — {formatDate(timeRange.end)}
          </span>
        </div>
      </div>

      <main className="main-content">
        {selectedTag && (
          <div className="filter-info">
            当前标签：<span className="filter-tag-name">#{selectedTag}</span>
            <button className="filter-info-clear" onClick={() => setSelectedTag(null)}>
              清除
            </button>
          </div>
        )}
        <BookmarkGrid
          bookmarks={filteredBookmarks}
          onTagFilter={handleTagFilter}
          onDelete={handleDelete}
        />
      </main>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">添加书签</h2>
            <div className="form-group">
              <label>URL</label>
              <input
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://example.com"
                className="form-input"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>标题</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="网页标题（可选）"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>标签（用逗号分隔，最多5个）</label>
              <input
                type="text"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="工作, 学习, 前端"
                className="form-input"
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleAddBookmark}>
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function createSampleBookmarks(): Array<{ title: string; url: string; tags: string[]; createdAt: number }> {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const base = [
    {
      title: 'React 官方文档',
      url: 'https://react.dev',
      tags: ['前端', 'React', '学习'],
    },
    {
      title: 'TypeScript Handbook',
      url: 'https://www.typescriptlang.org/docs/',
      tags: ['前端', 'TypeScript', '学习'],
    },
    {
      title: 'MDN Web Docs',
      url: 'https://developer.mozilla.org',
      tags: ['前端', '文档'],
    },
    {
      title: 'GitHub',
      url: 'https://github.com',
      tags: ['工具', '开发'],
    },
    {
      title: 'Dribbble - 设计灵感',
      url: 'https://dribbble.com',
      tags: ['设计', '灵感'],
    },
    {
      title: 'Notion',
      url: 'https://www.notion.so',
      tags: ['工具', '效率', '工作'],
    },
    {
      title: 'Figma',
      url: 'https://www.figma.com',
      tags: ['设计', '工具', '工作'],
    },
    {
      title: '掘金社区',
      url: 'https://juejin.cn',
      tags: ['学习', '前端', '社区'],
    },
  ];

  return base.map((b, i) => ({
    ...b,
    createdAt: now - (base.length - 1 - i) * day - Math.random() * day * 0.5,
  }));
}

export default App;
