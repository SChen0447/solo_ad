import React, { useState } from 'react';

interface SidePanelProps {
  onAddNote: (title: string, content: string, creator: string) => void;
  isSorting: boolean;
  onToggleSort: () => void;
  onExport: () => void;
  onImport: () => void;
  isMobile: boolean;
  isMobileCollapsed: boolean;
  onToggleMobile: () => void;
}

const SidePanel: React.FC<SidePanelProps> = ({
  onAddNote,
  isSorting,
  onToggleSort,
  onExport,
  onImport,
  isMobile,
  isMobileCollapsed,
  onToggleMobile
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [creator, setCreator] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onAddNote(title.trim(), content.trim(), creator.trim() || '匿名用户');
    setTitle('');
    setContent('');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (data.notes) {
            fetch('/api/import', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ notes: data.notes })
            }).then(() => {
              onImport();
            });
          }
        } catch (err) {
          console.error('Import failed:', err);
        }
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const panelContent = (
    <>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: '#374151', marginBottom: 20 }}>
        创意脑暴板
      </h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="text"
          placeholder="你的昵称"
          value={creator}
          onChange={(e) => setCreator(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            fontSize: 14,
            backgroundColor: '#fff',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
            outline: 'none',
            transition: 'border-color 0.2s ease'
          }}
          onFocus={(e) => (e.target.style.borderColor = '#f97316')}
          onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
        />
        <input
          type="text"
          placeholder="便签标题（可选）"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            fontSize: 14,
            backgroundColor: '#fff',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
            outline: 'none',
            transition: 'border-color 0.2s ease'
          }}
          onFocus={(e) => (e.target.style.borderColor = '#f97316')}
          onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
        />
        <textarea
          placeholder="写下你的创意想法..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          style={{
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            fontSize: 14,
            backgroundColor: '#fff',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
            outline: 'none',
            resize: 'vertical',
            minHeight: 80,
            fontFamily: 'inherit',
            transition: 'border-color 0.2s ease'
          }}
          onFocus={(e) => (e.target.style.borderColor = '#f97316')}
          onBlur={(e) => (e.target.style.borderColor = '#e5e7eb')}
        />
        <button
          type="submit"
          disabled={!content.trim()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#f97316',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: content.trim() ? 'pointer' : 'not-allowed',
            transition: 'background-color 0.2s ease',
            opacity: content.trim() ? 1 : 0.5
          }}
          onMouseEnter={(e) => {
            if (content.trim()) e.currentTarget.style.backgroundColor = '#ea580c';
          }}
          onMouseLeave={(e) => {
            if (content.trim()) e.currentTarget.style.backgroundColor = '#f97316';
          }}
        >
          添加便签
        </button>
      </form>

      <div style={{ marginTop: 20, borderTop: '1px solid #e5e7eb', paddingTop: 20 }}>
        <button
          onClick={onToggleSort}
          style={{
            width: '100%',
            padding: '10px 20px',
            backgroundColor: isSorting ? '#ea580c' : '#f97316',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
            marginBottom: 10
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ea580c')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isSorting ? '#ea580c' : '#f97316')}
        >
          {isSorting ? '取消排序' : '按点赞数排序'}
        </button>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onExport}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: 'transparent',
              color: '#f97316',
              border: '1px solid #f97316',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f97316';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#f97316';
            }}
          >
            导出
          </button>
          <button
            onClick={handleImportClick}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: 'transparent',
              color: '#f97316',
              border: '1px solid #f97316',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f97316';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#f97316';
            }}
          >
            导入
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <div
        style={{
          width: '100%',
          backgroundColor: '#fff',
          borderBottom: '1px solid #e5e7eb',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          zIndex: 100
        }}
      >
        <div
          onClick={onToggleMobile}
          style={{
            padding: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer'
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#374151' }}>
            创意脑暴板
          </h2>
          <span style={{ fontSize: 18, color: '#6b7280' }}>
            {isMobileCollapsed ? '▼' : '▲'}
          </span>
        </div>
        {!isMobileCollapsed && (
          <div style={{ padding: '0 16px 16px' }}>
            {panelContent}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        width: 300,
        height: '100vh',
        backgroundColor: '#fff',
        borderLeft: '1px solid #e5e7eb',
        padding: 24,
        overflowY: 'auto',
        boxShadow: '-2px 0 8px rgba(0,0,0,0.05)'
      }}
    >
      {panelContent}
    </div>
  );
};

export default SidePanel;
