import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import type { ComponentInfo } from '../App';

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  lastModified?: string;
  children?: TreeNode[];
}

interface ComponentTreeProps {
  onSelect: (comp: ComponentInfo) => void;
  selected: ComponentInfo | null;
}

const ComponentTree: React.FC<ComponentTreeProps> = ({ onSelect, selected }) => {
  const [tree, setTree] = useState<TreeNode[]>([]);
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

  const toggleExpand = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const handleClick = async (node: TreeNode) => {
    if (node.type === 'folder') {
      toggleExpand(node.path);
      return;
    }
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
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderNode = (node: TreeNode, depth: number) => {
    const isExpanded = expanded.has(node.path);
    const isSelected = selected?.path === node.path;

    return (
      <div key={node.path}>
        <div
          onClick={() => handleClick(node)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 8px 6px ' + (depth * 16 + 8) + 'px',
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
          <span style={{ width: 16, textAlign: 'center', fontSize: 12 }}>
            {node.type === 'folder' ? (isExpanded ? '▼' : '▶') : '⚛'}
          </span>
          <span style={{ flex: 1, fontSize: 13, color: '#cdd6f4' }}>{node.name}</span>
          {node.type === 'file' && node.size != null && (
            <span style={{ fontSize: 11, color: '#6c7086' }}>{formatSize(node.size)}</span>
          )}
        </div>
        {node.type === 'folder' && isExpanded && node.children?.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

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
          tree.map((node) => renderNode(node, 0))
        )}
      </div>
    </div>
  );
};

export default ComponentTree;
