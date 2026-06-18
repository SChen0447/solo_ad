import React from 'react';
import type { Category } from './types';
import { CATEGORY_CONFIG } from './types';

interface SearchFilterProps {
  categories: Category[] | 'all';
  setCategories: (c: Category[] | 'all') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  mobileOpen: boolean;
  setMobileOpen: (o: boolean) => void;
}

const ALL_CATEGORIES: (Category | 'all')[] = ['all', 'frontend', 'backend', 'tool', 'pitfall'];

const CATEGORY_LABELS: Record<Category | 'all', string> = {
  all: '全部',
  frontend: '前端',
  backend: '后端',
  tool: '工具',
  pitfall: '踩坑'
};

export default function SearchFilter({
  categories,
  setCategories,
  searchQuery,
  setSearchQuery,
  mobileOpen,
  setMobileOpen
}: SearchFilterProps) {
  const isActive = (cat: Category | 'all') => {
    if (cat === 'all') return categories === 'all';
    return Array.isArray(categories) && categories.includes(cat);
  };

  const toggleCategory = (cat: Category | 'all') => {
    if (cat === 'all') {
      setCategories('all');
      return;
    }
    if (categories === 'all') {
      setCategories([cat]);
      return;
    }
    if (categories.includes(cat)) {
      const next = categories.filter(c => c !== cat);
      setCategories(next.length === 0 ? 'all' : next);
    } else {
      setCategories([...categories, cat]);
    }
  };

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{
          display: 'none',
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 100,
          width: 40,
          height: 40,
          borderRadius: 8,
          border: '1px solid #e5e7eb',
          background: '#fff',
          cursor: 'pointer',
          fontSize: 20
        }}
        className="mobile-menu-btn"
      >
        ☰
      </button>

      <aside
        style={{
          width: '20%',
          minWidth: 240,
          background: '#f9fafb',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          borderRight: '1px solid #e5e7eb',
          height: '100vh',
          position: 'sticky',
          top: 0,
          overflowY: 'auto'
        }}
        className={mobileOpen ? 'sidebar-open' : ''}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
            知识卡片
          </h1>
          <p style={{ fontSize: 12, color: '#6b7280' }}>记录每日技术收获</p>
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 600,
            color: '#374151',
            marginBottom: 8
          }}>
            搜索
          </label>
          <div style={{ position: 'relative', width: 300, maxWidth: '100%' }}>
            <span style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af',
              fontSize: 14
            }}>
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索标题或内容..."
              style={{
                width: '100%',
                height: 40,
                padding: '0 14px 0 38px',
                borderRadius: 20,
                border: '1px solid #e5e7eb',
                background: '#fff',
                fontSize: 14,
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
            />
          </div>
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 600,
            color: '#374151',
            marginBottom: 8
          }}>
            分类筛选
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ALL_CATEGORIES.map((cat) => {
              const active = isActive(cat);
              const color = cat !== 'all' ? CATEGORY_CONFIG[cat].color : undefined;
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    background: active ? '#3b82f6' : '#f3f4f6',
                    color: active ? '#fff' : '#374151',
                    transition: 'background-color 0.2s, color 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {color && (
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: active ? '#fff' : color,
                      display: 'inline-block'
                    }} />
                  )}
                  {CATEGORY_LABELS[cat]}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{
          marginTop: 'auto',
          paddingTop: 24,
          borderTop: '1px solid #e5e7eb'
        }}>
          <p style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.6 }}>
            支持 Markdown 格式正文<br />
            搜索响应时间 &lt; 100ms<br />
            支持 1000+ 卡片流畅渲染
          </p>
        </div>
      </aside>

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: block !important;
          }
          aside {
            position: fixed !important;
            top: 0;
            left: 0;
            width: 280px !important;
            min-width: 280px !important;
            height: 100vh;
            transform: translateX(-100%);
            transition: transform 0.3s ease-out;
            z-index: 99;
            box-shadow: 4px 0 20px rgba(0,0,0,0.1);
          }
          aside.sidebar-open {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
