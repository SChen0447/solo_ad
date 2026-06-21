import React, { useState, memo, useCallback } from 'react';
import { marked } from 'marked';
import {
  Plus,
  Trash2,
  Eye,
  Share2,
  ChevronLeft,
  ChevronRight,
  History,
  Link as LinkIcon,
  X,
  Calendar,
  Image,
  Palette,
  Type,
} from 'lucide-react';
import { useStoryStore } from '@/store';
import { NODE_COLORS, NodeColor, StoryNode } from '@/types';

interface ToolPanelProps {
  nodePositions: StoryNode[];
}

const ToolPanel: React.FC<ToolPanelProps> = memo(({ nodePositions }) => {
  const {
    story,
    selectedNodeId,
    addNode,
    deleteNode,
    updateNode,
    updateStoryTitle,
    updateThemeColor,
    setMode,
    createShareLink,
    historySnapshots,
    restoreSnapshot,
    selectNode,
  } = useStoryStore();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showRelationshipModal, setShowRelationshipModal] = useState(false);
  const [relationshipFrom, setRelationshipFrom] = useState('');
  const [relationshipTo, setRelationshipTo] = useState('');
  const [relationshipType, setRelationshipType] = useState<'causal' | 'parallel'>('causal');
  const [isNarrowScreen, setIsNarrowScreen] = useState(false);
  const [isFloating, setIsFloating] = useState(false);

  React.useEffect(() => {
    const checkWidth = () => {
      const narrow = window.innerWidth < 1024;
      setIsNarrowScreen(narrow);
      setIsFloating(narrow);
    };
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  const selectedNode = story.nodes.find((n) => n.id === selectedNodeId);

  const handleAddNode = useCallback(() => {
    addNode();
  }, [addNode]);

  const handleDeleteNode = useCallback(() => {
    if (selectedNodeId) {
      deleteNode(selectedNodeId);
    }
  }, [selectedNodeId, deleteNode]);

  const handlePreview = useCallback(() => {
    setMode('preview');
  }, [setMode]);

  const handleShare = useCallback(() => {
    const link = createShareLink();
    setShareLink(link);
    setShowShareModal(true);
  }, [createShareLink]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      alert('链接已复制到剪贴板');
    } catch {
      alert('复制失败，请手动复制');
    }
  }, [shareLink]);

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && selectedNodeId) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          updateNode(selectedNodeId, { imageUrl: dataUrl });
        };
        reader.readAsDataURL(file);
      }
    },
    [selectedNodeId, updateNode]
  );

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (selectedNodeId) {
        const date = e.target.value;
        const timestamp = new Date(date).getTime();
        updateNode(selectedNodeId, { date, timestamp });
      }
    },
    [selectedNodeId, updateNode]
  );

  const sortedNodes = [...story.nodes].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <>
      {isFloating && !isCollapsed && (
        <div className="tool-panel__overlay" onClick={() => setIsCollapsed(true)} />
      )}
      <div
        className={`tool-panel ${isCollapsed ? 'collapsed' : ''} ${
          isFloating ? 'floating' : ''
        }`}
      >
        <div className="tool-panel__header">
          <div className="tool-panel__title-section">
            {!isCollapsed && (
              <input
                type="text"
                className="tool-panel__title-input"
                value={story.title}
                onChange={(e) => updateStoryTitle(e.target.value)}
                placeholder="故事标题"
              />
            )}
            <button
              className="tool-panel__collapse-btn"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>

          {!isCollapsed && (
            <div className="tool-panel__theme-colors">
              {NODE_COLORS.map((color) => (
                <button
                  key={color}
                  className={`theme-color-btn ${
                    story.themeColor === color ? 'active' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => updateThemeColor(color)}
                />
              ))}
            </div>
          )}
        </div>

        {!isCollapsed && (
          <div className="tool-panel__content">
            {selectedNode ? (
              <div className="node-editor">
                <div className="node-editor__header">
                  <h3>编辑节点</h3>
                  <button
                    className="node-editor__delete-btn"
                    onClick={handleDeleteNode}
                    title="删除节点"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="node-editor__field">
                  <label>
                    <Type size={16} /> 标题
                  </label>
                  <input
                    type="text"
                    value={selectedNode.title}
                    onChange={(e) =>
                      updateNode(selectedNodeId!, { title: e.target.value })
                    }
                    placeholder="节点标题"
                  />
                </div>

                <div className="node-editor__field">
                  <label>
                    <Calendar size={16} /> 日期
                  </label>
                  <input
                    type="date"
                    value={selectedNode.date}
                    onChange={handleDateChange}
                  />
                </div>

                <div className="node-editor__field">
                  <label>
                    <Palette size={16} /> 颜色
                  </label>
                  <div className="node-editor__colors">
                    {NODE_COLORS.map((color: NodeColor) => (
                      <button
                        key={color}
                        className={`color-option ${
                          selectedNode.color === color ? 'active' : ''
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => updateNode(selectedNodeId!, { color })}
                      />
                    ))}
                  </div>
                </div>

                <div className="node-editor__field">
                  <label>
                    <Image size={16} /> 图片
                  </label>
                  <div className="node-editor__image">
                    {selectedNode.imageUrl && (
                      <img
                        src={selectedNode.imageUrl}
                        alt="预览"
                        className="node-editor__image-preview"
                      />
                    )}
                    <div className="node-editor__image-actions">
                      <label className="image-upload-btn">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          style={{ display: 'none' }}
                        />
                        上传图片
                      </label>
                      <input
                        type="text"
                        placeholder="或粘贴图片URL"
                        value={selectedNode.imageUrl.startsWith('http') ? selectedNode.imageUrl : ''}
                        onChange={(e) =>
                          updateNode(selectedNodeId!, { imageUrl: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="node-editor__field">
                  <label>内容 (支持 Markdown)</label>
                  <textarea
                    value={selectedNode.content}
                    onChange={(e) =>
                      updateNode(selectedNodeId!, { content: e.target.value })
                    }
                    placeholder="在此输入详细内容..."
                    rows={6}
                  />
                  {selectedNode.content && (
                    <div
                      className="markdown-preview"
                      dangerouslySetInnerHTML={{
                        __html: marked.parse(selectedNode.content) as string,
                      }}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="nodes-list">
                <h3>节点列表 ({story.nodes.length})</h3>
                {sortedNodes.length === 0 ? (
                  <div className="nodes-list__empty">
                    <p>暂无节点</p>
                    <p>点击右下角 + 按钮添加</p>
                  </div>
                ) : (
                  <div className="nodes-list__container">
                    {sortedNodes.map((node) => (
                      <div
                        key={node.id}
                        className={`nodes-list__item ${
                          selectedNodeId === node.id ? 'selected' : ''
                        }`}
                        onClick={() => selectNode(node.id)}
                      >
                        <div
                          className="nodes-list__dot"
                          style={{ backgroundColor: node.color }}
                        />
                        <div className="nodes-list__info">
                          <div className="nodes-list__title">{node.title}</div>
                          <div className="nodes-list__date">{node.date}</div>
                        </div>
                        {node.imageUrl && (
                          <img
                            src={node.imageUrl}
                            alt=""
                            className="nodes-list__thumb"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="tool-panel__actions">
              <button className="action-btn action-btn--secondary" onClick={handlePreview}>
                <Eye size={18} />
                {!isCollapsed && '预览'}
              </button>
              <button className="action-btn action-btn--secondary" onClick={handleShare}>
                <Share2 size={18} />
                {!isCollapsed && '分享'}
              </button>
              <button
                className="action-btn action-btn--secondary"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History size={18} />
                {!isCollapsed && '历史版本'}
              </button>
            </div>

            {showHistory && (
              <div className="history-panel">
                <h4>历史版本</h4>
                {historySnapshots.length === 0 ? (
                  <p className="history-panel__empty">暂无历史版本</p>
                ) : (
                  <div className="history-panel__list">
                    {historySnapshots.map((snapshot) => (
                      <div
                        key={snapshot.id}
                        className="history-panel__item"
                        onClick={() => {
                          if (confirm('确定要恢复到此版本吗？')) {
                            restoreSnapshot(snapshot);
                            setShowHistory(false);
                          }
                        }}
                      >
                        <span>
                          {new Date(snapshot.timestamp).toLocaleString('zh-CN')}
                        </span>
                        <span>{snapshot.story.nodes.length} 个节点</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!isCollapsed && (
          <button className="add-node-btn" onClick={handleAddNode} title="添加节点">
            <Plus size={24} />
          </button>
        )}
      </div>

      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h3>分享链接</h3>
              <button onClick={() => setShowShareModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal__content">
              <div className="share-link-input">
                <LinkIcon size={18} />
                <input type="text" value={shareLink} readOnly />
                <button onClick={handleCopyLink}>复制</button>
              </div>
              <p className="share-note">
                链接包含完整故事数据，任何人都可以通过此链接查看。
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

ToolPanel.displayName = 'ToolPanel';

export default ToolPanel;
