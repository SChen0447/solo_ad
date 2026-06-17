import React, { useState, useRef } from 'react';
import { useAppContext } from '../context/AppContext';
import { ApiConfig, HttpMethod, HeaderParam, QueryParam, CacheDuration, CACHE_DURATION_OPTIONS } from '../types';

interface ApiCardProps {
  config: ApiConfig;
  isExpanded: boolean;
  onToggle: () => void;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  index: number;
}

const ApiCard: React.FC<ApiCardProps> = ({
  config,
  isExpanded,
  onToggle,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  index
}) => {
  const { updateConfig, removeConfig } = useAppContext();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateConfig(config.id, { name: e.target.value });
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateConfig(config.id, { url: e.target.value });
  };

  const handleMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateConfig(config.id, { method: e.target.value as HttpMethod });
  };

  const handleCacheDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateConfig(config.id, { cacheDuration: e.target.value as CacheDuration });
  };

  const handleHeaderKeyChange = (idx: number, key: string) => {
    const newHeaders = [...config.headers];
    newHeaders[idx] = { ...newHeaders[idx], key };
    updateConfig(config.id, { headers: newHeaders });
  };

  const handleHeaderValueChange = (idx: number, value: string) => {
    const newHeaders = [...config.headers];
    newHeaders[idx] = { ...newHeaders[idx], value };
    updateConfig(config.id, { headers: newHeaders });
  };

  const addHeader = () => {
    const newHeaders = [...config.headers, { key: '', value: '' }];
    updateConfig(config.id, { headers: newHeaders });
  };

  const removeHeader = (idx: number) => {
    const newHeaders = config.headers.filter((_, i) => i !== idx);
    updateConfig(config.id, { headers: newHeaders });
  };

  const handleParamKeyChange = (idx: number, key: string) => {
    const newParams = [...config.params];
    newParams[idx] = { ...newParams[idx], key };
    updateConfig(config.id, { params: newParams });
  };

  const handleParamValueChange = (idx: number, value: string) => {
    const newParams = [...config.params];
    newParams[idx] = { ...newParams[idx], value };
    updateConfig(config.id, { params: newParams });
  };

  const addParam = () => {
    const newParams = [...config.params, { key: '', value: '' }];
    updateConfig(config.id, { params: newParams });
  };

  const removeParam = (idx: number) => {
    const newParams = config.params.filter((_, i) => i !== idx);
    updateConfig(config.id, { params: newParams });
  };

  const cardClasses = [
    'api-card',
    isExpanded ? 'expanded' : '',
    isDragging ? 'dragging' : '',
    isDragOver ? 'drag-over' : ''
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClasses}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
    >
      <div className="api-card-header" onClick={(e) => {
        if (!(e.target as HTMLElement).closest('.api-card-actions') &&
            !(e.target as HTMLElement).closest('.drag-handle')) {
          onToggle();
        }
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
          <span className="drag-handle" draggable onMouseDown={(e) => e.stopPropagation()}>⋮⋮</span>
          <span className="api-card-name" style={{ 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap' 
          }}>
            {config.name || '未命名API'}
          </span>
        </div>
        <div className="api-card-actions">
          <button
            className="icon-btn"
            onClick={(e) => {
              e.stopPropagation();
              removeConfig(config.id);
            }}
            title="删除"
          >
            🗑️
          </button>
          <button
            className="icon-btn"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            title={isExpanded ? '收起' : '展开'}
          >
            {isExpanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="api-form" onClick={(e) => e.stopPropagation()}>
          <div>
            <div className="form-label">API名称</div>
            <input
              type="text"
              className="input-field"
              value={config.name}
              onChange={handleNameChange}
              placeholder="输入API名称"
            />
          </div>

          <div>
            <div className="form-label">请求地址</div>
            <div className="form-row">
              <select
                className="select-field"
                value={config.method}
                onChange={handleMethodChange}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
              <input
                type="text"
                className="input-field"
                value={config.url}
                onChange={handleUrlChange}
                placeholder="https://api.example.com/data"
              />
            </div>
          </div>

          <div>
            <div className="form-label">缓存有效期</div>
            <select
              className="select-field"
              value={config.cacheDuration}
              onChange={handleCacheDurationChange}
              style={{ width: '100%' }}
            >
              {CACHE_DURATION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>请求头 (Headers)</span>
              <button className="icon-btn" onClick={addHeader} style={{ color: '#00adb5', padding: '2px 8px' }}>
                + 添加
              </button>
            </div>
            {config.headers.map((header, idx) => (
              <div key={idx} className="form-row" style={{ marginBottom: '8px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Key"
                  value={header.key}
                  onChange={(e) => handleHeaderKeyChange(idx, e.target.value)}
                />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Value"
                  value={header.value}
                  onChange={(e) => handleHeaderValueChange(idx, e.target.value)}
                />
                <button
                  className="icon-btn"
                  onClick={() => removeHeader(idx)}
                  style={{ color: '#ff4d4d' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div>
            <div className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>查询参数</span>
              <button className="icon-btn" onClick={addParam} style={{ color: '#00adb5', padding: '2px 8px' }}>
                + 添加
              </button>
            </div>
            {config.params.map((param, idx) => (
              <div key={idx} className="form-row" style={{ marginBottom: '8px' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Key"
                  value={param.key}
                  onChange={(e) => handleParamKeyChange(idx, e.target.value)}
                />
                <input
                  type="text"
                  className="input-field"
                  placeholder="Value"
                  value={param.value}
                  onChange={(e) => handleParamValueChange(idx, e.target.value)}
                />
                <button
                  className="icon-btn"
                  onClick={() => removeParam(idx)}
                  style={{ color: '#ff4d4d' }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ConfigPanel: React.FC = () => {
  const {
    state,
    addConfig,
    reorderConfigs,
    toggleCard,
    executeQueries,
    exportConfig,
    importConfig
  } = useAppContext();

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      reorderConfigs(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await importConfig(file);
        alert('配置导入成功！');
      } catch (error) {
        alert(`导入失败：${error instanceof Error ? error.message : '未知错误'}`);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="config-panel">
      <div className="config-panel-title">API 配置</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
        {state.configs.map((config, index) => (
          <ApiCard
            key={config.id}
            config={config}
            isExpanded={state.expandedCards.has(config.id)}
            onToggle={() => toggleCard(config.id)}
            isDragging={draggedIndex === index}
            isDragOver={dragOverIndex === index && draggedIndex !== index}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            index={index}
          />
        ))}
      </div>

      <button className="add-api-btn" onClick={addConfig}>
        + 添加新API
      </button>

      <div className="panel-actions">
        <button className="export-btn" onClick={exportConfig}>
          📤 导出配置
        </button>
        <button className="import-btn" onClick={handleImportClick}>
          📥 导入配置
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
        />
      </div>

      <button
        className="query-btn"
        onClick={executeQueries}
        disabled={state.isLoading || state.configs.length === 0}
        style={{ opacity: state.isLoading || state.configs.length === 0 ? 0.5 : 1 }}
      >
        {state.isLoading ? '查询中...' : '⚡ 批量查询'}
      </button>
    </div>
  );
};

export default ConfigPanel;
