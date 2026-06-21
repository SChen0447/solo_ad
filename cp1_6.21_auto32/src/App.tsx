import { useEffect, useState, useCallback, useRef } from 'react';
import type { Diary, StatsItem, EmotionTag } from './types';
import DiaryEditor from './DiaryEditor';
import DiaryList from './DiaryList';
import StatsChart from './StatsChart';

type FilterParams = {
  startDate: string;
  endDate: string;
  emotions: string[];
};

const STORAGE_KEY = 'emotion_diary_filter';

export default function App() {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDiary, setEditingDiary] = useState<Diary | null>(null);
  const [stats, setStats] = useState<StatsItem[]>([]);
  const [statsRange, setStatsRange] = useState<'7' | '30'>('7');
  const [loading, setLoading] = useState(false);
  const [isMobileEditor, setIsMobileEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultFilter: FilterParams = {
    startDate: '',
    endDate: '',
    emotions: [],
  };

  const [filter, setFilter] = useState<FilterParams>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : defaultFilter;
    } catch {
      return defaultFilter;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filter));
  }, [filter]);

  const fetchDiaries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.startDate) params.set('startDate', filter.startDate);
      if (filter.endDate) params.set('endDate', filter.endDate);
      if (filter.emotions.length > 0) params.set('emotions', filter.emotions.join(','));
      const qs = params.toString();
      const res = await fetch(`/api/diaries${qs ? `?${qs}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        setDiaries(data);
      }
    } catch (e) {
      console.error('获取日记失败:', e);
    } finally {
      setTimeout(() => setLoading(false), 80);
    }
  }, [filter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/stats?range=${statsRange}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('获取统计失败:', e);
    }
  }, [statsRange]);

  useEffect(() => {
    fetchDiaries();
  }, [fetchDiaries]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleSave = async (content: string, emotions: EmotionTag[]) => {
    try {
      if (editingId) {
        const res = await fetch(`/api/diaries/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, emotions }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(err.error || '保存失败');
          return;
        }
      } else {
        const res = await fetch('/api/diaries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, emotions }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(err.error || '保存失败');
          return;
        }
      }
      setEditingId(null);
      setEditingDiary(null);
      setIsMobileEditor(false);
      await Promise.all([fetchDiaries(), fetchStats()]);
    } catch (e) {
      console.error(e);
      alert('保存失败，请检查网络');
    }
  };

  const handleEdit = (diary: Diary) => {
    setEditingId(diary.id);
    setEditingDiary(diary);
    if (window.innerWidth <= 960) {
      setIsMobileEditor(true);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条日记吗？')) return;
    try {
      const res = await fetch(`/api/diaries/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (editingId === id) {
          setEditingId(null);
          setEditingDiary(null);
        }
        await Promise.all([fetchDiaries(), fetchStats()]);
      }
    } catch (e) {
      console.error(e);
      alert('删除失败');
    }
  };

  const handleNew = () => {
    setEditingId(null);
    setEditingDiary(null);
    if (window.innerWidth <= 960) {
      setIsMobileEditor(true);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/diaries');
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const today = new Date().toISOString().slice(0, 10);
        a.download = `diaries-${today}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error(e);
      alert('导出失败');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      if (res.ok) {
        const r = await res.json();
        alert(`成功导入 ${r.imported} 条日记`);
        await Promise.all([fetchDiaries(), fetchStats()]);
      } else {
        alert('导入失败');
      }
    } catch (err) {
      console.error(err);
      alert('导入失败，文件格式错误');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="app-container">
      <div className="left-panel">
        <div className="card">
          <div className="app-header">
            <h1 className="app-title">📔 心情日记</h1>
            <div className="header-actions">
              <button className="btn btn-secondary btn-sm" onClick={handleImportClick}>
                📥 导入
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleExport}>
                📤 导出
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleNew}>
                ✏️ 新日记
              </button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
        </div>

        <DiaryList
          diaries={diaries}
          loading={loading}
          filter={filter}
          onFilterChange={setFilter}
          onEdit={handleEdit}
          onDelete={handleDelete}
          selectedId={editingId}
        />
      </div>

      <div className="right-panel">
        {!isMobileEditor && (
          <>
            <div className="card">
              <div className="stats-header">
                <h2 className="section-title">📊 情绪趋势</h2>
                <div className="view-toggle">
                  <button
                    className={statsRange === '7' ? 'active' : ''}
                    onClick={() => setStatsRange('7')}
                  >
                    最近7天
                  </button>
                  <button
                    className={statsRange === '30' ? 'active' : ''}
                    onClick={() => setStatsRange('30')}
                  >
                    最近30天
                  </button>
                </div>
              </div>
              <StatsChart data={stats} range={statsRange} />
            </div>

            <div className="card">
              <div className="editor-header">
                <h2 className="section-title" style={{ marginBottom: 0 }}>
                  {editingId ? '✏️ 编辑日记' : '📝 写日记'}
                </h2>
                {editingId && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setEditingId(null);
                      setEditingDiary(null);
                    }}
                  >
                    取消编辑
                  </button>
                )}
              </div>
              <DiaryEditor
                key={editingId || 'new'}
                diary={editingDiary}
                onSave={handleSave}
              />
            </div>
          </>
        )}

        {isMobileEditor && (
          <div className="modal-overlay" onClick={() => setIsMobileEditor(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="editor-header">
                <h2 className="section-title" style={{ marginBottom: 0 }}>
                  {editingId ? '✏️ 编辑日记' : '📝 写日记'}
                </h2>
                <div className="editor-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsMobileEditor(false)}
                  >
                    关闭
                  </button>
                </div>
              </div>
              <DiaryEditor
                key={editingId || 'new-mobile'}
                diary={editingDiary}
                onSave={(content, emotions) => {
                  handleSave(content, emotions);
                }}
              />
            </div>
          </div>
        )}

        {isMobileEditor && null}
      </div>
    </div>
  );
}
