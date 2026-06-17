import { useState, useEffect, useRef } from 'react';
import { Upload, Download, Plus, X } from 'lucide-react';
import { bookmarkDataService } from './data/BookmarkDataService';
import { TimelinePanel } from './components/TimelinePanel';
import { BookmarkGrid } from './components/BookmarkGrid';
import { FilterBar } from './components/FilterBar';
import { parseBookmarksHTML, exportToJSON } from './utils/bookmarkParser';
import type { Bookmark, TimeRange } from './types/bookmark';
import './App.css';

function App() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBookmarkUrl, setNewBookmarkUrl] = useState('');
  const [newBookmarkTitle, setNewBookmarkTitle] = useState('');
  const [newBookmarkTags, setNewBookmarkTags] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSampleData();
    refreshData();
  }, []);

  const loadSampleData = () => {
    const sampleBookmarks = [
      { title: 'React 官方文档', url: 'https://react.dev', tags: ['前端', 'React'], timestamp: Date.now() - 86400000 * 2 },
      { title: 'TypeScript 手册', url: 'https://www.typescriptlang.org/docs/', tags: ['前端', 'TypeScript'], timestamp: Date.now() - 86400000 * 5 },
      { title: 'MDN Web Docs', url: 'https://developer.mozilla.org', tags: ['前端', '文档'], timestamp: Date.now() - 86400000 * 8 },
      { title: 'GitHub', url: 'https://github.com', tags: ['工具', '代码'], timestamp: Date.now() - 86400000 * 12 },
      { title: 'Stack Overflow', url: 'https://stackoverflow.com', tags: ['工具', '问答'], timestamp: Date.now() - 86400000 * 15 },
      { title: 'Vite 官方文档', url: 'https://vitejs.dev', tags: ['前端', '构建工具'], timestamp: Date.now() - 86400000 * 20 },
      { title: 'Node.js 官网', url: 'https://nodejs.org', tags: ['后端', 'Node.js'], timestamp: Date.now() - 86400000 * 25 },
      { title: 'Figma 设计', url: 'https://figma.com', tags: ['设计', '工具'], timestamp: Date.now() - 86400000 * 30 },
    ];

    sampleBookmarks.forEach(b => {
      bookmarkDataService.add(b);
    });
  };

  const refreshData = () => {
    const allBookmarks = bookmarkDataService.getAll();
    setBookmarks(allBookmarks);
    setAllTags(bookmarkDataService.getAllTags());
  };

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range);
  };

  const handleTagSelect = (tag: string | null) => {
    setSelectedTag(tag);
  };

  const handleTagFilter = (tag: string) => {
    setSelectedTag(prev => prev === tag ? null : tag);
  };

  const handleDeleteBookmark = (id: string) => {
    bookmarkDataService.remove(id);
    refreshData();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const html = event.target?.result as string;
      const parsedBookmarks = parseBookmarksHTML(html);

      parsedBookmarks.forEach(parsed => {
        bookmarkDataService.add({
          title: parsed.title,
          url: parsed.url,
          tags: parsed.folder ? [parsed.folder.split('/').pop() || ''] : [],
          timestamp: parsed.timestamp || Date.now(),
        });
      });

      refreshData();
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportClick = () => {
    exportToJSON(bookmarks);
  };

  const handleAddBookmark = () => {
    if (!newBookmarkUrl.trim()) return;

    const tags = newBookmarkTags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0)
      .slice(0, 5);

    bookmarkDataService.add({
      title: newBookmarkTitle.trim() || newBookmarkUrl,
      url: newBookmarkUrl.trim(),
      tags,
      timestamp: Date.now(),
    });

    setNewBookmarkUrl('');
    setNewBookmarkTitle('');
    setNewBookmarkTags('');
    setShowAddModal(false);
    refreshData();
  };

  const getFilteredBookmarks = (): Bookmark[] => {
    let filtered = bookmarks;

    if (selectedTag) {
      filtered = bookmarkDataService.getByTag(selectedTag);
    } else if (timeRange) {
      filtered = bookmarkDataService.getByTimeRange(timeRange);
    }

    return filtered;
  };

  const filteredBookmarks = getFilteredBookmarks();

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <button className="btn btn-primary" onClick={handleImportClick} title="导入书签">
              <Upload size={16} />
              <span className="btn-text">导入书签</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".html,.htm"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <button className="btn btn-secondary" onClick={() => setShowAddModal(true)} title="添加书签">
              <Plus size={16} />
              <span className="btn-text">添加</span>
            </button>
          </div>

          <h1 className="app-title">书签时间轴</h1>

          <div className="header-right">
            <button className="btn btn-primary" onClick={handleExportClick} title="导出">
              <Download size={16} />
              <span className="btn-text">导出</span>
            </button>
          </div>
        </div>

        <div className="filter-bar-wrapper">
          <FilterBar
            tags={allTags}
            selectedTag={selectedTag}
            onTagSelect={handleTagSelect}
          />
        </div>
      </header>

      <div className="timeline-wrapper">
        <TimelinePanel
          bookmarks={bookmarks}
          onTimeRangeChange={handleTimeRangeChange}
          selectedTag={selectedTag}
        />
      </div>

      <main className="main-content">
        <BookmarkGrid
          bookmarks={filteredBookmarks}
          onTagFilter={handleTagFilter}
          onDelete={handleDeleteBookmark}
        />
      </main>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>添加书签</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>URL</label>
                <input
                  type="url"
                  value={newBookmarkUrl}
                  onChange={e => setNewBookmarkUrl(e.target.value)}
                  placeholder="https://example.com"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>标题</label>
                <input
                  type="text"
                  value={newBookmarkTitle}
                  onChange={e => setNewBookmarkTitle(e.target.value)}
                  placeholder="书签标题（可选）"
                />
              </div>
              <div className="form-group">
                <label>标签（最多5个，逗号分隔）</label>
                <input
                  type="text"
                  value={newBookmarkTags}
                  onChange={e => setNewBookmarkTags(e.target.value)}
                  placeholder="前端, React, 教程"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-cancel" onClick={() => setShowAddModal(false)}>
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

export default App;
