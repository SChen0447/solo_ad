import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Task,
  Priority,
  TaskStatus,
  FilterState,
  filterAndSortTasks,
} from './utils';
import TaskBoard from './TaskBoard';
import TaskDetailPanel from './TaskDetailPanel';

const createMockTasks = (): Task[] => {
  const now = Date.now();
  return [
    {
      id: uuidv4(),
      title: '完成产品需求文档 PRD',
      description: '## 待办看板\n\n编写完整的产品需求文档，包括：\n\n- **功能模块**描述\n- **用户流程**图\n- **界面设计**规范\n\n> 确保所有模块都有详细说明',
      priority: 'P1',
      status: 'todo',
      dueDate: new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtasks: [
        { id: uuidv4(), title: '整理用户故事', completed: true },
        { id: uuidv4(), title: '编写功能说明', completed: true },
        { id: uuidv4(), title: '绘制流程图', completed: false },
        { id: uuidv4(), title: '界面规范编写', completed: false },
      ],
      comments: [
        { id: uuidv4(), content: '请在周五前完成初稿', createdAt: now - 86400000 },
        { id: uuidv4(), content: '已收到，正在整理中', createdAt: now - 43200000 },
      ],
      createdAt: now - 3 * 86400000,
    },
    {
      id: uuidv4(),
      title: '设计系统架构方案',
      description: '设计完整的前后端架构方案，包含技术选型、模块划分、API接口定义等内容。',
      priority: 'P1',
      status: 'in-progress',
      dueDate: new Date(now + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtasks: [
        { id: uuidv4(), title: '技术选型分析', completed: true },
        { id: uuidv4(), title: '模块架构图', completed: true },
        { id: uuidv4(), title: '数据库设计', completed: true },
        { id: uuidv4(), title: 'API接口文档', completed: false },
        { id: uuidv4(), title: '部署方案', completed: false },
      ],
      comments: [
        { id: uuidv4(), content: '架构方案整体没问题', createdAt: now - 172800000 },
      ],
      createdAt: now - 5 * 86400000,
    },
    {
      id: uuidv4(),
      title: '代码审查规范制定',
      description: '- 命名规范\n- 代码格式\n- 最佳实践\n- 安全性检查',
      priority: 'P2',
      status: 'todo',
      dueDate: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtasks: [
        { id: uuidv4(), title: '收集团队意见', completed: false },
        { id: uuidv4(), title: '编写文档初稿', completed: false },
      ],
      comments: [],
      createdAt: now - 1 * 86400000,
    },
    {
      id: uuidv4(),
      title: '用户登录模块开发',
      description: '实现完整的用户登录功能\n\n支持：\n1. 邮箱密码登录\n2. 第三方登录\n3. 找回密码\n4. 记住密码',
      priority: 'P2',
      status: 'in-progress',
      dueDate: new Date(now + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtasks: [
        { id: uuidv4(), title: 'UI页面开发', completed: true },
        { id: uuidv4(), title: '接口对接', completed: true },
        { id: uuidv4(), title: '错误处理', completed: false },
      ],
      comments: [
        { id: uuidv4(), content: '界面看起来不错', createdAt: now - 3600000 * 5 },
      ],
      createdAt: now - 2 * 86400000,
    },
    {
      id: uuidv4(),
      title: '项目初始化脚手架',
      description: '搭建项目基础框架，配置开发环境和构建工具',
      priority: 'P3',
      status: 'done',
      dueDate: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtasks: [
        { id: uuidv4(), title: 'Vite + TS配置', completed: true },
        { id: uuidv4(), title: 'ESLint/Prettier', completed: true },
        { id: uuidv4(), title: '目录结构', completed: true },
      ],
      comments: [
        { id: uuidv4(), content: '脚手架已完成，可以开始开发', createdAt: now - 7 * 86400000 },
      ],
      createdAt: now - 8 * 86400000,
    },
    {
      id: uuidv4(),
      title: 'UI组件库选型调研',
      description: '调研主流React组件库，对比Ant Design、Material UI、Chakra UI等方案',
      priority: 'P3',
      status: 'done',
      dueDate: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtasks: [
        { id: uuidv4(), title: '功能对比', completed: true },
        { id: uuidv4(), title: '性能测试', completed: true },
        { id: uuidv4(), title: '社区活跃度', completed: true },
      ],
      comments: [],
      createdAt: now - 10 * 86400000,
    },
    {
      id: uuidv4(),
      title: '性能优化方案',
      description: '分析当前应用性能瓶颈，制定优化方案：\n\n```js\n// 懒加载示例\nconst Component = lazy(() => import(\'./Component\'));\n```',
      priority: 'P2',
      status: 'todo',
      dueDate: new Date(now + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtasks: [
        { id: uuidv4(), title: '性能指标采集', completed: false },
        { id: uuidv4(), title: '瓶颈分析', completed: false },
        { id: uuidv4(), title: '方案文档', completed: false },
      ],
      comments: [],
      createdAt: now - 43200000,
    },
  ];
};

const SearchIcon: React.FC = () => (
  <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const ChevronDownIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const ArrowUpIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"></line>
    <polyline points="5 12 12 5 19 12"></polyline>
  </svg>
);

const ArrowDownIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <polyline points="19 12 12 19 5 12"></polyline>
  </svg>
);

const CheckIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(createMockTasks);
  const [filter, setFilter] = useState<FilterState>({
    keyword: '',
    priorities: [],
    sortOrder: null,
  });
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [priorityDropdownOpen, setPriorityDropdownOpen] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const filterTimeoutRef = useRef<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debouncedKeyword = filter.keyword;

  const filteredTasks = useMemo(() => {
    return filterAndSortTasks(tasks, {
      ...filter,
      keyword: debouncedKeyword,
    });
  }, [tasks, filter, debouncedKeyword]);

  const selectedTask = useMemo(
    () => tasks.find(t => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  useEffect(() => {
    if (filterTimeoutRef.current) {
      window.clearTimeout(filterTimeoutRef.current);
    }
    setIsFiltering(true);
    filterTimeoutRef.current = window.setTimeout(() => {
      setIsFiltering(false);
    }, 250);

    return () => {
      if (filterTimeoutRef.current) {
        window.clearTimeout(filterTimeoutRef.current);
      }
    };
  }, [filter.keyword, filter.priorities, filter.sortOrder]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setPriorityDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTaskClick = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    setPanelOpen(true);
  }, []);

  const handlePanelClose = useCallback(() => {
    setPanelOpen(false);
  }, []);

  const handleTaskUpdate = useCallback((updates: Partial<Task>) => {
    if (!selectedTaskId) return;
    setTasks(prev =>
      prev.map(t => (t.id === selectedTaskId ? { ...t, ...updates } : t))
    );
  }, [selectedTaskId]);

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(f => ({ ...f, keyword: e.target.value }));
  };

  const togglePriority = (p: Priority) => {
    setFilter(f => {
      const exists = f.priorities.includes(p);
      return {
        ...f,
        priorities: exists
          ? f.priorities.filter(x => x !== p)
          : [...f.priorities, p],
      };
    });
  };

  const toggleSortOrder = () => {
    setFilter(f => {
      if (!f.sortOrder) return { ...f, sortOrder: 'asc' };
      if (f.sortOrder === 'asc') return { ...f, sortOrder: 'desc' };
      return { ...f, sortOrder: null };
    });
  };

  const clearFilters = () => {
    setFilter({ keyword: '', priorities: [], sortOrder: null });
  };

  const hasActiveFilters =
    filter.keyword || filter.priorities.length > 0 || filter.sortOrder;

  const priorityLabels = ['P1', 'P2', 'P3'];

  return (
    <div className="app">
      <div className="header">
        <div className="header-top">
          <div className="logo">
            <div className="logo-icon">K</div>
            <div className="logo-text">待办看板</div>
          </div>
          <div className="header-actions">
            {hasActiveFilters && (
              <button className="btn btn-secondary" onClick={clearFilters}>
                清除筛选
              </button>
            )}
            <button className="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              新建任务
            </button>
          </div>
        </div>

        <div className="filter-bar">
          <div className="search-box">
            <SearchIcon />
            <input
              type="text"
              className="search-input"
              value={filter.keyword}
              onChange={handleKeywordChange}
              placeholder="搜索任务标题或描述..."
            />
          </div>

          <div className="filter-group">
            <div className="multi-select" ref={dropdownRef}>
              <button
                className="multi-select-btn"
                onClick={() => setPriorityDropdownOpen(v => !v)}
              >
                <span>
                  优先级
                  {filter.priorities.length > 0 && (
                    <span
                      style={{
                        marginLeft: '8px',
                        padding: '1px 7px',
                        borderRadius: '999px',
                        background: 'var(--accent-gradient)',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      {filter.priorities.length}
                    </span>
                  )}
                </span>
                <ChevronDownIcon />
              </button>
              {priorityDropdownOpen && (
                <div className="multi-select-dropdown">
                  {(priorityLabels as Priority[]).map(p => {
                    const checked = filter.priorities.includes(p);
                    const colors: Record<Priority, string> = {
                      P1: '#ef4444',
                      P2: '#f97316',
                      P3: '#3b82f6',
                    };
                    return (
                      <div
                        key={p}
                        className="multi-select-option"
                        onClick={() => togglePriority(p)}
                      >
                        <div
                          className={`checkbox ${checked ? 'checked' : ''}`}
                          style={checked ? {} : { borderColor: colors[p] }}
                        >
                          {checked && <CheckIcon />}
                        </div>
                        <span style={{ fontWeight: 600, color: colors[p] }}>
                          {p}
                        </span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
                          {p === 'P1' ? '紧急' : p === 'P2' ? '重要' : '普通'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              className={`sort-toggle ${filter.sortOrder ? 'active' : ''}`}
              onClick={toggleSortOrder}
            >
              {filter.sortOrder === 'desc' ? (
                <ArrowDownIcon />
              ) : (
                <ArrowUpIcon />
              )}
              {!filter.sortOrder
                ? '到期日排序'
                : filter.sortOrder === 'asc'
                ? '最早到期'
                : '最晚到期'}
            </button>
          </div>
        </div>
      </div>

      <div className="board-wrapper">
        <TaskBoard
          tasks={filteredTasks}
          onTasksChange={setTasks}
          onTaskClick={handleTaskClick}
          isFiltering={isFiltering}
        />
      </div>

      <TaskDetailPanel
        task={selectedTask}
        open={panelOpen}
        onClose={handlePanelClose}
        onUpdate={handleTaskUpdate}
      />
    </div>
  );
};

export default App;
