import React, { useState, useEffect, useRef, useCallback } from 'react';
import DiffPanel from './components/DiffPanel';
import MergePanel from './components/MergePanel';
import TemplateEditor from './components/TemplateEditor';
import {
  uploadDocument,
  getDocumentVersions,
  type DocumentVersion,
} from './utils/api';

type ViewMode = 'diff' | 'merge' | 'template';

const SAMPLE_LEFT = `# Markdown 文档示例

这是一份示例文档，用于演示差异对比功能。

## 第一章：引言

本文档介绍了项目的基本情况。
这是一段旧版本的内容。
旧的描述信息。

## 第二章：功能列表

- 功能一：文档上传
- 功能二：版本管理
- 功能三：差异对比

## 第三章：使用说明

请按照以下步骤操作：
1. 上传文档
2. 选择版本
3. 查看差异

### 3.1 注意事项

- 请确保文档格式正确
- 支持 Markdown 格式

## 附录

暂无附录内容。
`;

const SAMPLE_RIGHT = `# Markdown 文档示例 v2

这是一份示例文档的第二版，用于演示差异对比功能。

## 第一章：引言

本文档介绍了项目的基本情况和背景。
这是一段更新后的内容。
新增加的说明文字。

## 第二章：功能列表

- 功能一：文档上传
- 功能二：版本管理
- 功能三：差异对比
- 功能四：模板生成
- 功能五：历史回溯

## 第三章：使用指南

请按照以下步骤操作：
1. 上传或粘贴文档
2. 选择比较版本
3. 查看并合并差异
4. 生成标准文档

### 3.1 注意事项

- 请确保文档格式正确
- 支持 Markdown 格式
- 建议使用统一的模板

## 第四章：API 接口

本章介绍 REST API 接口说明。

## 附录

更新了附录内容，包含更多参考资料。
`;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ViewMode>('diff');
  const [documents, setDocuments] = useState<DocumentVersion[]>([]);
  const [leftDoc, setLeftDoc] = useState<DocumentVersion | null>(null);
  const [rightDoc, setRightDoc] = useState<DocumentVersion | null>(null);
  const [mergedDoc, setMergedDoc] = useState<DocumentVersion | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadContent, setUploadContent] = useState('');
  const [uploadFilename, setUploadFilename] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionModalType, setVersionModalType] = useState<'left' | 'right'>('left');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const docs = await getDocumentVersions();
      setDocuments(docs);
      if (docs.length >= 2) {
        setLeftDoc(docs[1]);
        setRightDoc(docs[0]);
      } else if (docs.length === 1) {
        setLeftDoc(docs[0]);
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
      initSampleDocs();
    }
  };

  const initSampleDocs = useCallback(() => {
    const sampleLeft: DocumentVersion = {
      id: 'sample-1',
      version: 1,
      content: SAMPLE_LEFT,
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      operationType: 'upload',
      filename: 'document_v1.md',
    };
    const sampleRight: DocumentVersion = {
      id: 'sample-2',
      version: 2,
      content: SAMPLE_RIGHT,
      timestamp: new Date().toISOString(),
      operationType: 'upload',
      filename: 'document_v2.md',
    };
    setDocuments([sampleRight, sampleLeft]);
    setLeftDoc(sampleLeft);
    setRightDoc(sampleRight);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setUploadContent(content);
      setUploadFilename(file.name);
      setShowUploadModal(true);
    };
    reader.readAsText(file);
  };

  const handlePasteUpload = () => {
    setUploadContent('');
    setUploadFilename('');
    setShowUploadModal(true);
  };

  const handleSubmitUpload = async () => {
    if (!uploadContent.trim()) {
      alert('请输入文档内容');
      return;
    }

    setIsLoading(true);
    try {
      const newDoc = await uploadDocument(uploadContent, uploadFilename || undefined);
      setDocuments((prev) => [newDoc, ...prev]);
      setRightDoc(newDoc);
      setShowUploadModal(false);
      setUploadContent('');
      setUploadFilename('');
    } catch (error) {
      console.error('Upload failed:', error);
      const newDoc: DocumentVersion = {
        id: `doc-${Date.now()}`,
        version: documents.length + 1,
        content: uploadContent,
        timestamp: new Date().toISOString(),
        operationType: 'upload',
        filename: uploadFilename || 'untitled.md',
      };
      setDocuments((prev) => [newDoc, ...prev]);
      setRightDoc(newDoc);
      setShowUploadModal(false);
      setUploadContent('');
      setUploadFilename('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectVersion = (doc: DocumentVersion, type: 'left' | 'right') => {
    if (type === 'left') {
      setLeftDoc(doc);
    } else {
      setRightDoc(doc);
    }
    setShowVersionModal(false);
  };

  const handleMergeComplete = (merged: DocumentVersion) => {
    setDocuments((prev) => [merged, ...prev]);
    setMergedDoc(merged);
    alert('合并成功！已保存为新版本');
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getOpLabel = (op: string) => {
    switch (op) {
      case 'upload':
        return '上传';
      case 'merge':
        return '合并';
      case 'edit':
        return '编辑';
      default:
        return op;
    }
  };

  const openVersionModal = (type: 'left' | 'right') => {
    setVersionModalType(type);
    setShowVersionModal(true);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>📄 Markdown 文档版本对比与模板生成</h1>
        <p>高效比对文档差异，快速生成统一格式模板</p>
      </header>

      <div className="tabs">
        <div
          className={`tab ${activeTab === 'diff' ? 'active' : ''}`}
          onClick={() => setActiveTab('diff')}
        >
          差异对比
        </div>
        <div
          className={`tab ${activeTab === 'merge' ? 'active' : ''}`}
          onClick={() => setActiveTab('merge')}
        >
          合并操作
        </div>
        <div
          className={`tab ${activeTab === 'template' ? 'active' : ''}`}
          onClick={() => setActiveTab('template')}
        >
          模板生成
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-group">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".md,.markdown,.txt"
            style={{ display: 'none' }}
          />
          <button
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
          >
            <span>📁</span>
            <span className="btn-text">上传文件</span>
          </button>
          <button className="btn btn-outline" onClick={handlePasteUpload}>
            <span>✏️</span>
            <span className="btn-text">粘贴内容</span>
          </button>
        </div>

        <div className="toolbar-group">
          <label>基准版本:</label>
          <select
            value={leftDoc?.id || ''}
            onChange={(e) => {
              const doc = documents.find((d) => d.id === e.target.value);
              if (doc) setLeftDoc(doc);
            }}
            style={{ minWidth: '180px' }}
          >
            <option value="">请选择</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                v{doc.version} - {doc.filename || '未命名'}
              </option>
            ))}
          </select>
          <button
            className="btn btn-outline"
            onClick={() => openVersionModal('left')}
            style={{ padding: '6px 10px' }}
          >
            📋
          </button>
        </div>

        <div className="toolbar-group">
          <label>比较版本:</label>
          <select
            value={rightDoc?.id || ''}
            onChange={(e) => {
              const doc = documents.find((d) => d.id === e.target.value);
              if (doc) setRightDoc(doc);
            }}
            style={{ minWidth: '180px' }}
          >
            <option value="">请选择</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                v{doc.version} - {doc.filename || '未命名'}
              </option>
            ))}
          </select>
          <button
            className="btn btn-outline"
            onClick={() => openVersionModal('right')}
            style={{ padding: '6px 10px' }}
          >
            📋
          </button>
        </div>

        <div className="toolbar-group" style={{ marginLeft: 'auto' }}>
          {leftDoc && rightDoc && (
            <button
              className="btn btn-success"
              onClick={() => {
                if (activeTab !== 'merge') setActiveTab('merge');
              }}
            >
              <span>🔀</span>
              <span className="btn-text">开始合并</span>
            </button>
          )}
        </div>
      </div>

      <div className="content-area">
        {activeTab === 'diff' && leftDoc && rightDoc && (
          <DiffPanel
            leftContent={leftDoc.content}
            rightContent={rightDoc.content}
            leftTitle={`基准版本 v${leftDoc.version}${leftDoc.filename ? ` - ${leftDoc.filename}` : ''}`}
            rightTitle={`比较版本 v${rightDoc.version}${rightDoc.filename ? ` - ${rightDoc.filename}` : ''}`}
            showCheckboxes={false}
          />
        )}

        {activeTab === 'merge' && leftDoc && rightDoc && (
          <MergePanel
            leftContent={leftDoc.content}
            rightContent={rightDoc.content}
            leftVersion={leftDoc}
            rightVersion={rightDoc}
            onMergeComplete={handleMergeComplete}
          />
        )}

        {activeTab === 'template' && (
          <TemplateEditor
            mergedContent={mergedDoc?.content || rightDoc?.content || ''}
          />
        )}

        {!leftDoc && !rightDoc && (
          <div className="empty-state">
            <div className="empty-state-icon">📄</div>
            <p>暂无文档，请上传或粘贴 Markdown 文档开始使用</p>
          </div>
        )}
      </div>

      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>上传文档</h3>
              <button className="modal-close" onClick={() => setShowUploadModal(false)}>
                ×
              </button>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#666' }}>
                文件名称
              </label>
              <input
                type="text"
                value={uploadFilename}
                onChange={(e) => setUploadFilename(e.target.value)}
                placeholder="请输入文件名"
                className="textarea-input"
                style={{ minHeight: 'auto', padding: '8px 12px' }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#666' }}>
                文档内容
              </label>
              <textarea
                value={uploadContent}
                onChange={(e) => setUploadContent(e.target.value)}
                placeholder="在此粘贴或输入 Markdown 内容..."
                className="textarea-input"
                style={{ minHeight: '300px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowUploadModal(false)}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmitUpload}
                disabled={isLoading}
              >
                {isLoading ? '上传中...' : '上传'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showVersionModal && (
        <div className="modal-overlay" onClick={() => setShowVersionModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>选择{versionModalType === 'left' ? '基准' : '比较'}版本</h3>
              <button className="modal-close" onClick={() => setShowVersionModal(false)}>
                ×
              </button>
            </div>
            <div className="version-list">
              {documents.length === 0 ? (
                <div className="empty-state" style={{ height: '100px' }}>
                  <p>暂无历史版本</p>
                </div>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="version-item"
                    onClick={() => handleSelectVersion(doc, versionModalType)}
                  >
                    <div className="version-title">
                      v{doc.version} - {doc.filename || '未命名文档'}
                    </div>
                    <div className="version-meta">
                      <span className={`op-tag ${doc.operationType}`}>
                        {getOpLabel(doc.operationType)}
                      </span>
                      <span>{formatDate(doc.timestamp)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
