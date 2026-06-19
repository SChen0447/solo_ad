import React, { useState, useMemo, useRef, useEffect } from 'react';
import { JSONTree } from 'react-json-tree';
import { ComponentNode, ComponentType } from '../interfaces';
import './JsonTreePanel.css';

interface JsonTreePanelProps {
  componentTree: ComponentNode;
  selectedId: string | null;
  rootId: string;
  onSelect: (id: string) => void;
  onAdd: (parentId: string, type: ComponentType) => void;
  onDelete: (id: string) => void;
  onUpload: (tree: ComponentNode) => void;
  onReset: () => void;
}

const ADDABLE_TYPES: ComponentType[] = ['Button', 'Card', 'Input', 'Image', 'Badge', 'Container', 'Text'];

const JsonTreePanel: React.FC<JsonTreePanelProps> = ({
  componentTree,
  selectedId,
  rootId,
  onSelect,
  onAdd,
  onDelete,
  onUpload,
  onReset,
}) => {
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const findIdFromKeyPath = (keyPath: (string | number)[]): string | null => {
    let node: any = componentTree;
    for (let i = keyPath.length - 1; i >= 0; i--) {
      const key = keyPath[i];
      if (typeof key === 'number' && Array.isArray(node)) {
        node = node[key];
      } else if (typeof key === 'string' && node && typeof node === 'object') {
        node = node[key];
      } else {
        return null;
      }
    }
    if (node && typeof node === 'object' && 'id' in node) {
      return node.id as string;
    }
    return null;
  };

  const isValueHighlighted = (keyPath: (string | number)[]) => {
    const id = findIdFromKeyPath(keyPath);
    return id === selectedId;
  };

  const handleItemClick = (keyPath: (string | number)[]) => {
    const id = findIdFromKeyPath(keyPath);
    if (id) {
      onSelect(id);
    }
  };

  const handleAddClick = (e: React.MouseEvent) => {
    const rect = addBtnRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPosition({ x: rect.left, y: rect.bottom + 4 });
    }
    setAddMenuOpen((prev) => !prev);
  };

  const handleSelectAddType = (type: ComponentType) => {
    const parentId = selectedId || rootId;
    onAdd(parentId, type);
    setAddMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        addMenuOpen &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        addBtnRef.current &&
        !addBtnRef.current.contains(e.target as Node)
      ) {
        setAddMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [addMenuOpen]);

  const jsonTreeTheme = useMemo(
    () => ({
      scheme: 'solo-dark',
      base00: '#1E293B',
      base01: '#334155',
      base02: '#334155',
      base03: '#64748B',
      base04: '#94A3B8',
      base05: '#CBD5E1',
      base06: '#E2E8F0',
      base07: '#F8FAFC',
      base08: '#F87171',
      base09: '#FB923C',
      base0A: '#FBBF24',
      base0B: '#86EFAC',
      base0C: '#67E8F9',
      base0D: '#4A90D9',
      base0E: '#C084FC',
      base0F: '#FCA5A5',
      tree: {
        backgroundColor: 'transparent',
      },
      value: {
        textDecoration: 'none',
      },
      label: {
        wordBreak: 'break-all',
      },
    }),
    [],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          onUpload(parsed);
        } catch {
          alert('JSON 格式解析失败，请检查文件格式');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          onUpload(parsed);
        } catch {
          alert('JSON 格式解析失败，请检查文件格式');
        }
      };
      reader.readAsText(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className="jtp-container"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={isDragging ? { boxShadow: 'inset 0 0 0 2px #4A90D9' } : {}}
    >
      <div className="jtp-header">
        <h3 className="jtp-title">组件树结构</h3>
        <div className="jtp-toolbar">
          <button
            className="jtp-btn jtp-btn-primary"
            onClick={handleAddClick}
            ref={addBtnRef}
            disabled={!selectedId && rootId !== null ? false : false}
            title={selectedId ? '添加子组件到选中节点' : '添加子组件到根节点'}
          >
            + 添加
          </button>
          <button
            className="jtp-btn jtp-btn-danger"
            onClick={() => selectedId && onDelete(selectedId)}
            disabled={!selectedId || selectedId === rootId}
            title="删除选中组件（根节点不可删除）"
          >
            删除
          </button>
          <button className="jtp-btn jtp-btn-primary" onClick={handleFileClick} style={{ background: '#334155' }}>
            上传
          </button>
          <button className="jtp-btn" onClick={onReset} style={{ background: '#475569', color: '#e2e8f0' }}>
            重置
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </div>

      {addMenuOpen && (
        <div
          ref={menuRef}
          className="jtp-add-menu"
          style={{ position: 'fixed', left: menuPosition.x, top: menuPosition.y }}
        >
          {ADDABLE_TYPES.map((type) => (
            <div
              key={type}
              className="jtp-add-menu-item"
              onClick={() => handleSelectAddType(type)}
            >
              {type}
            </div>
          ))}
        </div>
      )}

      <div className="jtp-tree-wrapper">
        <JSONTree
          data={componentTree}
          theme={jsonTreeTheme}
          invertTheme={false}
          hideRoot={false}
          shouldExpandNodeInitially={(keyPath, data, level) => level < 3}
          keyPath={[]}
          getItemString={(type, data) => {
            if (type === 'Object' && data && (data as any).type) {
              return ` <${(data as any).type}>`;
            }
            return '';
          }}
          isCustomNode={() => false}
          collectionLimit={100}
          labelRenderer={(keyPath, nodeType, expanded) => {
            const label = keyPath[0];
            return (
              <span
                onClick={() => handleItemClick(keyPath as (string | number)[])}
                style={{
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  padding: '2px 4px',
                  borderRadius: 4,
                  backgroundColor: isValueHighlighted(keyPath as (string | number)[])
                    ? 'rgba(74, 144, 217, 0.3)'
                    : 'transparent',
                  transition: 'background-color 0.2s ease',
                  color:
                    keyPath[0] === 'type'
                      ? '#C084FC'
                      : keyPath[0] === 'id'
                      ? '#67E8F9'
                      : '#E2E8F0',
                }}
                title="点击选中该组件"
              >
                {String(label)}:
                <span style={{ opacity: 0.6, fontSize: 11, marginLeft: 4 }}>
                  {nodeType} {expanded ? '▾' : '▸'}
                </span>
              </span>
            );
          }}
          valueRenderer={(valueAsString, value, ...keyPath) => {
            const finalKeyPath = keyPath[0] as (string | number)[];
            const highlighted = isValueHighlighted(finalKeyPath);
            const isTypeField = finalKeyPath[finalKeyPath.length - 1] === 'type';
            const isIdField = finalKeyPath[finalKeyPath.length - 1] === 'id';
            return (
              <span
                onClick={() => handleItemClick(finalKeyPath)}
                style={{
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: 4,
                  backgroundColor: highlighted ? 'rgba(74, 144, 217, 0.35)' : 'transparent',
                  color: isTypeField ? '#C084FC' : isIdField ? '#67E8F9' : '#86EFAC',
                  transition: 'all 0.2s ease',
                }}
              >
                {valueAsString}
              </span>
            );
          }}
          arrowStyle={{ color: '#94A3B8', marginLeft: 2, marginRight: 4 }}
          style={{ fontFamily: 'Consolas, Monaco, monospace', fontSize: 12, lineHeight: '1.7' }}
        />
      </div>
    </div>
  );
};

export default JsonTreePanel;
