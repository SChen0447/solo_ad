import React, { useEffect } from 'react';
import { Search, Plus, KanbanSquare } from 'lucide-react';
import Board from './components/Board';
import CardModal from './components/CardModal';
import AddColumnModal from './components/AddColumnModal';
import { useBoardStore } from './store/useBoardStore';

const App: React.FC = () => {
  const { fetchData, searchQuery, setSearchQuery, openAddColumn } = useBoardStore();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <header
        className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b"
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <KanbanSquare size={24} style={{ color: 'var(--bg-primary)' }} />
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--accent)' }}>
            团队协作看板
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-secondary)' }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索任务..."
              className="pl-10 pr-4 py-2 rounded-lg w-64 transition-transform hover-scale focus:outline-none focus:ring-2"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <button
            onClick={openAddColumn}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-transform hover-scale"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--bg-primary)',
              border: 'none',
            }}
          >
            <Plus size={18} />
            添加列
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <Board />
      </main>

      <CardModal />
      <AddColumnModal />
    </div>
  );
};

export default App;
