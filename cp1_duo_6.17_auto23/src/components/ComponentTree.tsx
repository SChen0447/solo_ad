import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import type { ComponentInfo } from '../App';

interface TreeNodeData {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  lastModified?: string;
  children?: TreeNodeData[];
}

interface ComponentTreeProps {
  onSelect: (comp: ComponentInfo) => void;
  selected: ComponentInfo | null;
}

const formatSize = (bytes: number): string => {
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
};

const formatTime = (isoString: string): string => {
  try {
    return new Date(isoString).toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

interface TreeNodeItemProps {
  node: TreeNodeData;
  depth: number;
  expanded: Set<string>;
  selected: ComponentInfo | null;
  onToggleExpand: (path: string) => void;
  onSelectFile: (node: TreeNodeData) => void;
}

const TreeNodeItem: React.FC<TreeNodeItemProps> = ({ node, depth, expanded, selected, onToggleExpand, onSelectFile }) => {
  const isExpanded = expanded.has(node.path);
  const isSelected = selected?.path === node.path;
  const childrenRef = useRef<HTMLDivElement>(null);
  const [childrenHeight, setChildrenHeight] = useState<number>(0);

  useEffect(() => {
    if (childrenRef.current) {
      const measure = () => {
        setChildrenHeight(childrenRef.current!.scrollHeight);
      };
      measure();
      const id = requestAnimationFrame(measure);
      return () => cancelAnimationFrame(id);
    }
  }, [node.children, isExpanded]);

  const handleClick = () => {
    if (node.type === 'folder') {
      onToggleExpand(node.path);
    } else {
      onSelectFile(node);
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 6,
          padding: '8px 8px 8px ' + (depth * 16 + 8) + 'px',
          cursor: 'pointer',
          background: isSelected ? 'rgba(137,180,250,0.15)' : 'transparent',
          borderRadius: 4,
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)';
        }}
        onMouseLeave={(e) => {
          if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
        }}
      >
        <span style={{ width: 16, textAlign: 'center', fontSize: 12, marginTop: 2, flexShrink: 0 }}>
          {node.type === 'folder' ? (isExpanded ? '▼' : '▶') : '⚛'}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: '#cdd6f4' }}>{node.name}</div>
          {node.type === 'file' && (node.size != null || node.lastModified) && (
            <div style={{ display: 'flex', gap: 10, marginTop: 2, fontSize: 10, color: '#6c7086' }}>
              {node.size != null && <span>{formatSize(node.size)}</span>}
              {node.lastModified && <span>{formatTime(node.lastModified)}</span>}
            </div>
          )}
        </div>
      </div>
      {node.type === 'folder' && node.children && node.children.length > 0 && (
        <div
          style={{
            height: isExpanded ? childrenHeight : 0,
            overflow: 'hidden',
            transition: 'height 0.2s ease-in-out',
          }}
        >
          <div ref={childrenRef}>
            {node.children.map((child) => (
              <TreeNodeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                selected={selected}
                onToggleExpand={onToggleExpand}
                onSelectFile={onSelectFile}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ComponentTree: React.FC<ComponentTreeProps> = ({ onSelect, selected }) => {
  const [tree, setTree] = useState<TreeNodeData[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);

  const fetchTree = useCallback(async () => {
    try {
      const res = await axios.get('/api/list');
      setTree(res.data.tree || []);
    } catch {
      setTree([]);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      await axios.post('/api/upload', form);
      await fetchTree();
    } catch {
      console.error('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const toggleExpand = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const handleSelectFile = useCallback(async (node: TreeNodeData) => {
    try {
      const res = await axios.get('/api/list', { params: { path: node.path } });
      const info: ComponentInfo = {
        name: node.name,
        path: node.path,
        size: node.size || 0,
        lastModified: node.lastModified || '',
        props: res.data.props || [],
        dependencies: res.data.dependencies || [],
      };
      onSelect(info);
    } catch {
      onSelect({
        name: node.name,
        path: node.path,
        size: node.size || 0,
        lastModified: node.lastModified || '',
        props: [],
        dependencies: [],
      });
    }
  }, [onSelect]);

  return (
    <div style={{ padding: 12, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#cdd6f4', margin: 0 }}>组件列表</h3>
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            borderRadius: 8,
            background: uploading ? '#45475a' : '#89b4fa',
            color: uploading ? '#6c7086' : '#1e1e2e',
            fontSize: 12,
            cursor: uploading ? 'wait' : 'pointer',
            fontWeight: 600,
            transition: 'background 0.2s',
          }}
        >
          {uploading ? '上传中...' : '上传 .zip'}
          <input type="file" accept=".zip" onChange={handleUpload} style={{ display: 'none' }} disabled={uploading} />
        </label>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {tree.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6c7086', padding: '40px 0', fontSize: 13 }}>
            请上传包含 React 组件的 .zip 压缩包
          </div>
        ) : (
          tree.map((node) => (
            <TreeNodeItem
              key={node.path}
              node={node}
              depth={0}
              expanded={expanded}
              selected={selected}
              onToggleExpand={toggleExpand}
              onSelectFile={handleSelectFile}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ComponentTree;
