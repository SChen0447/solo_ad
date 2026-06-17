import { useState, useCallback, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import type { ApiConfig } from '../context/AppContext';

interface KeyValueItem {
  key: string;
  value: string;
}

function recordToItems(record: Record<string, string>): KeyValueItem[] {
  return Object.entries(record).map(([key, value]) => ({ key, value }));
}

function itemsToRecord(items: KeyValueItem[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const item of items) {
    if (item.key.trim()) {
      record[item.key.trim()] = item.value;
    }
  }
  return record;
}

function KeyValueEditor({
  items,
  onChange,
  placeholder,
}: {
  items: KeyValueItem[];
  onChange: (items: KeyValueItem[]) => void;
  placeholder: { key: string; value: string };
}) {
  const addItem = () => onChange([...items, { key: '', value: '' }]);
  const removeItem = (index: number) => onChange(items.filter((_, i) => i !== index));
  const updateItem = (index: number, field: 'key' | 'value', val: string) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: val };
    onChange(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            placeholder={placeholder.key}
            value={item.key}
            onChange={e => updateItem(i, 'key', e.target.value)}
            style={{ flex: 1, minWidth: 0, fontSize: 12, padding: '4px 8px' }}
          />
          <input
            placeholder={placeholder.value}
            value={item.value}
            onChange={e => updateItem(i, 'value', e.target.value)}
            style={{ flex: 1, minWidth: 0, fontSize: 12, padding: '4px 8px' }}
          />
          <button
            type="button"
            onClick={() => removeItem(i)}
            style={{
              background: 'none',
              border: 'none',
              color: '#ff4d4d',
              cursor: 'pointer',
              fontSize: 14,
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addItem}
        style={{
          background: 'none',
          border: '1px dashed rgba(255,255,255,0.3)',
          color: 'rgba(255,255,255,0.6)',
          borderRadius: 6,
          padding: '4px 8px',
          cursor: 'pointer',
          fontSize: 12,
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => {
          (e.target as HTMLElement).style.borderColor = 'rgba(0,173,181,0.6)';
          (e.target as HTMLElement).style.color = '#00adb5';
        }}
        onMouseLeave={e => {
          (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)';
          (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.6)';
        }}
      >
        + 添加
      </button>
    </div>
  );
}

function ApiCard({
  config,
  index,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}: {
  config: ApiConfig;
  index: number;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, index: number) => void;
}) {
  const { updateConfig, removeConfig, toggleCollapse } = useAppContext();
  const [headerItems, setHeaderItems] = useState<KeyValueItem[]>(() =>
    recordToItems(config.headers)
  );
  const [paramItems, setParamItems] = useState<KeyValueItem[]>(() =>
    recordToItems(config.params)
  );

  const syncHeaders = useCallback(
    (items: KeyValueItem[]) => {
      setHeaderItems(items);
      updateConfig(config.id, { headers: itemsToRecord(items) });
    },
    [config.id, updateConfig]
  );

  const syncParams = useCallback(
    (items: KeyValueItem[]) => {
      setParamItems(items);
      updateConfig(config.id, { params: itemsToRecord(items) });
    },
    [config.id, updateConfig]
  );

  const summary = config.url
    ? `${config.method} ${config.url.length > 30 ? config.url.slice(0, 30) + '…' : config.url}`
    : '未配置';

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, index)}
      onDragOver={e => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onDrop={e => onDrop(e, index)}
      style={{
        position: 'relative',
        background: '#16213e',
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'grab',
        transition: 'transform 0.3s, box-shadow 0.3s',
        marginBottom: 8,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = 'translateX(4px)';
        el.style.boxShadow = '-3px 0 0 0 #00adb5, 0 2px 12px rgba(0,0,0,0.2)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = 'translateX(0)';
        el.style.boxShadow = 'none';
      }}
    >
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 2,
          background: 'linear-gradient(90deg, #00adb5, #0a9396)',
        }}
      />

      <div
        onClick={() => toggleCollapse(config.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          cursor: 'pointer',
          userSelect: 'none',
          minHeight: config.collapsed ? 56 : 56,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 20,
              height: 20,
              borderRadius: 4,
              background: 'rgba(0,173,181,0.15)',
              color: '#00adb5',
              fontSize: 10,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {index + 1}
          </span>
          <span
            style={{
              color: '#eee',
              fontSize: 14,
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {config.name}
          </span>
          {!config.collapsed && (
            <span
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontSize: 11,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {summary}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {config.collapsed && (
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{summary}</span>
          )}
          <span
            style={{
              color: '#00adb5',
              fontSize: 12,
              transition: 'transform 0.3s',
              transform: config.collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
              display: 'inline-block',
            }}
          >
            ▼
          </span>
        </div>
      </div>

      {!config.collapsed && (
        <div
          style={{
            padding: '0 16px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 4, display: 'block' }}>
              名称
            </label>
            <input
              value={config.name}
              onChange={e => updateConfig(config.id, { name: e.target.value })}
              style={{ width: '100%', fontSize: 12, padding: '6px 10px' }}
              onClick={e => e.stopPropagation()}
            />
          </div>

          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 4, display: 'block' }}>
              请求 URL
            </label>
            <input
              value={config.url}
              onChange={e => updateConfig(config.id, { url: e.target.value })}
              placeholder="https://api.example.com/data"
              style={{ width: '100%', fontSize: 12, padding: '6px 10px' }}
              onClick={e => e.stopPropagation()}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: '0 0 100px' }}>
              <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 4, display: 'block' }}>
                方法
              </label>
              <select
                value={config.method}
                onChange={e =>
                  updateConfig(config.id, { method: e.target.value as 'GET' | 'POST' })
                }
                style={{ width: '100%', fontSize: 12, padding: '6px 10px' }}
                onClick={e => e.stopPropagation()}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </div>
            <div style={{ flex: 1 }} />
          </div>

          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 4, display: 'block' }}>
              请求头
            </label>
            <KeyValueEditor
              items={headerItems}
              onChange={syncHeaders}
              placeholder={{ key: 'Header名', value: '值' }}
            />
          </div>

          <div>
            <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 4, display: 'block' }}>
              查询参数
            </label>
            <KeyValueEditor
              items={paramItems}
              onChange={syncParams}
              placeholder={{ key: '参数名', value: '值' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                removeConfig(config.id);
              }}
              style={{
                background: 'rgba(255,77,77,0.15)',
                border: 'none',
                color: '#ff4d4d',
                borderRadius: 6,
                padding: '4px 12px',
                cursor: 'pointer',
                fontSize: 12,
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => {
                (e.target as HTMLElement).style.background = 'rgba(255,77,77,0.3)';
              }}
              onMouseLeave={e => {
                (e.target as HTMLElement).style.background = 'rgba(255,77,77,0.15)';
              }}
            >
              删除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConfigPanel() {
  const { configs, addConfig, reorderConfigs, exportConfig, importConfig } = useAppContext();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIndex(index);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (dragIndex !== null && dragIndex !== index) {
        reorderConfigs(dragIndex, index);
      }
      setDragIndex(null);
      setOverIndex(null);
    },
    [dragIndex, reorderConfigs]
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setOverIndex(null);
    document.querySelectorAll('[draggable]').forEach(el => {
      if (el instanceof HTMLElement) {
        el.style.opacity = '1';
      }
    });
  }, []);

  return (
    <div
      style={{
        width: 380,
        minWidth: 380,
        background: '#1a1a2e',
        padding: 24,
        borderRadius: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        overflow: 'auto',
        height: '100vh',
      }}
    >
      <h2 style={{ color: '#eee', fontSize: 16, fontWeight: 600, margin: 0 }}>
        API 配置面板
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1, overflow: 'auto' }}>
        {configs.map((config, index) => (
          <div key={config.id}>
            {overIndex === index && dragIndex !== null && dragIndex !== index && (
              <div
                style={{
                  border: '2px dashed rgba(0,173,181,0.5)',
                  borderRadius: 12,
                  height: 8,
                  marginBottom: 8,
                  background: 'rgba(0,173,181,0.05)',
                }}
              />
            )}
            <ApiCard
              config={config}
              index={index}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDrop={handleDrop}
            />
          </div>
        ))}

        {configs.length === 0 && (
          <div
            style={{
              color: 'rgba(255,255,255,0.3)',
              textAlign: 'center',
              padding: '40px 0',
              fontSize: 14,
            }}
          >
            点击下方按钮添加 API
          </div>
        )}
      </div>

      <button
        onClick={addConfig}
        style={{
          background: 'rgba(0,173,181,0.15)',
          border: '1px dashed rgba(0,173,181,0.4)',
          color: '#00adb5',
          borderRadius: 12,
          padding: '10px 0',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 500,
          transition: 'all 0.2s',
          width: '100%',
        }}
        onMouseEnter={e => {
          (e.target as HTMLElement).style.background = 'rgba(0,173,181,0.25)';
          (e.target as HTMLElement).style.borderColor = '#00adb5';
        }}
        onMouseLeave={e => {
          (e.target as HTMLElement).style.background = 'rgba(0,173,181,0.15)';
          (e.target as HTMLElement).style.borderColor = 'rgba(0,173,181,0.4)';
        }}
      >
        + 添加 API
      </button>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={exportConfig}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.6)',
            borderRadius: 8,
            padding: '8px 0',
            cursor: 'pointer',
            fontSize: 12,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            (e.target as HTMLElement).style.color = '#fff';
            (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)';
          }}
          onMouseLeave={e => {
            (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.6)';
            (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
          }}
        >
          导出配置
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.6)',
            borderRadius: 8,
            padding: '8px 0',
            cursor: 'pointer',
            fontSize: 12,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            (e.target as HTMLElement).style.color = '#fff';
            (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)';
          }}
          onMouseLeave={e => {
            (e.target as HTMLElement).style.color = 'rgba(255,255,255,0.6)';
            (e.target as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
          }}
        >
          导入配置
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) importConfig(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
