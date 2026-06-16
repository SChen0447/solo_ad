import { useState, useCallback, useRef, useEffect } from 'react';
import { FileText, Upload, Edit3, BarChart3, AlertTriangle, Menu, X } from 'lucide-react';
import type { DocumentData, RiskClause, ComplianceScore, PanelMode, Chapter } from './types';
import { uploadDocument, analyzeDocument, calculateScore, exportReport } from './api';
import DocViewer from './components/DocViewer';
import RiskPanel from './components/RiskPanel';
import Editor from './components/Editor';
import ScoreDashboard from './components/ScoreDashboard';
import { saveAs } from 'file-saver';

export default function App() {
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<RiskClause | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('risk');
  const [score, setScore] = useState<ComplianceScore | null>(null);
  const [modifiedContent, setModifiedContent] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [leftWidth, setLeftWidth] = useState(250);
  const [rightWidth, setRightWidth] = useState(400);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newWidth = e.clientX - containerRect.left;
        if (newWidth >= 180 && newWidth <= 400) {
          setLeftWidth(newWidth);
        }
      }
      if (isResizingRight && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newWidth = containerRect.right - e.clientX;
        if (newWidth >= 300 && newWidth <= 600) {
          setRightWidth(newWidth);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };

    if (isResizingLeft || isResizingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLeft, isResizingRight]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;

    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(pdf|docx|doc)$/i)) {
      alert('请上传PDF或Word格式的文件');
      return;
    }

    setIsAnalyzing(true);
    try {
      const uploadResult = await uploadDocument(file);
      const analyzeResult = await analyzeDocument(uploadResult.content, uploadResult.title);
      const scoreResult = await calculateScore(uploadResult.content, analyzeResult.risks);

      const docData: DocumentData = {
        id: uploadResult.documentId,
        title: uploadResult.title,
        content: uploadResult.content,
        chapters: analyzeResult.chapters.map((c: Chapter) => ({ ...c, expanded: true })),
        risks: analyzeResult.risks
      };

      setDocumentData(docData);
      setModifiedContent(uploadResult.content);
      setScore(scoreResult);
      setPanelMode('risk');
      setSelectedRisk(null);
    } catch (error) {
      console.error('文件处理失败:', error);
      alert('文件处理失败，请稍后重试');
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleExportReport = useCallback(async () => {
    if (!documentData) return;
    try {
      const blob = await exportReport(documentData.content, modifiedContent, documentData.risks);
      saveAs(blob, `${documentData.title}_审查报告.pdf`);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请稍后重试');
    }
  }, [documentData, modifiedContent]);

  const toggleChapter = useCallback((chapterId: string) => {
    if (!documentData) return;

    const toggleInTree = (chapters: Chapter[]): Chapter[] => {
      return chapters.map(ch => {
        if (ch.id === chapterId) {
          return { ...ch, expanded: !ch.expanded };
        }
        if (ch.children && ch.children.length > 0) {
          return { ...ch, children: toggleInTree(ch.children) };
        }
        return ch;
      });
    };

    setDocumentData(prev => prev ? { ...prev, chapters: toggleInTree(prev.chapters) } : null);
  }, [documentData]);

  const scrollToChapter = useCallback((startIndex: number) => {
    const docContent = document.querySelector('.doc-content');
    if (!docContent) return;

    const textBefore = documentData?.content.substring(0, startIndex) || '';
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = 'visibility:hidden;position:absolute;white-space:pre-wrap;font-size:16px;line-height:1.8;padding:24px;width:' + (docContent.clientWidth - 48) + 'px';
    tempDiv.textContent = textBefore;
    document.body.appendChild(tempDiv);
    const scrollTop = tempDiv.offsetHeight;
    document.body.removeChild(tempDiv);

    docContent.scrollTo({ top: scrollTop, behavior: 'smooth' });
  }, [documentData]);

  const renderChapterTree = (chapters: Chapter[], level = 0) => {
    return chapters.map(chapter => (
      <div key={chapter.id}>
        <div
          className="chapter-item"
          style={{ paddingLeft: `${16 + level * 16}px` }}
          onClick={() => {
            if (chapter.children && chapter.children.length > 0) {
              toggleChapter(chapter.id);
            } else {
              scrollToChapter(chapter.startIndex);
            }
          }}
        >
          {chapter.children && chapter.children.length > 0 && (
            <span className={`chapter-arrow ${chapter.expanded ? 'expanded' : ''}`}>
              ▶
            </span>
          )}
          <span className="chapter-title">{chapter.title}</span>
        </div>
        {chapter.expanded && chapter.children && renderChapterTree(chapter.children, level + 1)}
      </div>
    ));
  };

  const showLowScoreWarning = score && score.total < 60;

  return (
    <div className="app-container" ref={containerRef}>
      <header className="app-header">
        <div className="header-left">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
          <FileText size={24} className="header-icon" />
          <h1 className="app-title">法律文书智能审查助手</h1>
        </div>

        {showLowScoreWarning && (
          <div className="warning-banner" style={{ animation: 'pulse-warning 2s ease-in-out infinite' }}>
            <AlertTriangle size={18} />
            <span>合规评分较低（{score.total}分），存在较高法律风险，请重点审查</span>
          </div>
        )}

        <div className="header-right">
          {documentData && (
            <>
              <button
                className={`mode-btn ${panelMode === 'risk' ? 'active' : ''}`}
                onClick={() => setPanelMode('risk')}
              >
                <AlertTriangle size={16} />
                风险检测
              </button>
              <button
                className={`mode-btn ${panelMode === 'editor' ? 'active' : ''}`}
                onClick={() => setPanelMode('editor')}
              >
                <Edit3 size={16} />
                条款编辑
              </button>
              <button
                className={`mode-btn ${panelMode === 'score' ? 'active' : ''}`}
                onClick={() => setPanelMode('score')}
              >
                <BarChart3 size={16} />
                合规评分
              </button>
              <button className="export-btn" onClick={handleExportReport}>
                导出报告
              </button>
            </>
          )}
        </div>
      </header>

      <div className="app-body">
        {documentData && !sidebarCollapsed && (
          <>
            <aside className="sidebar" style={{ width: `${leftWidth}px` }}>
              <div className="sidebar-header">
                <h3>文档目录</h3>
              </div>
              <div className="sidebar-content">
                {renderChapterTree(documentData.chapters)}
              </div>
            </aside>

            <div
              className="resize-handle left"
              onMouseDown={() => setIsResizingLeft(true)}
            />
          </>
        )}

        <main className="main-content">
          {!documentData ? (
            <div
              className={`upload-area ${isDragging ? 'dragging' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                style={{ display: 'none' }}
                onChange={handleFileInput}
              />
              <div className="upload-icon">
                <Upload size={48} />
              </div>
              <h2>拖拽合同文件到此处</h2>
              <p>或点击选择文件</p>
              <p className="upload-hint">支持 PDF、DOC、DOCX 格式</p>
            </div>
          ) : isAnalyzing ? (
            <div className="loading-area">
              <div className="loading-spinner" />
              <p>正在分析文档，请稍候...</p>
            </div>
          ) : panelMode === 'editor' ? (
            <Editor
              originalContent={documentData.content}
              modifiedContent={modifiedContent}
              onModifiedChange={setModifiedContent}
            />
          ) : (
            <DocViewer
              content={documentData.content}
              risks={documentData.risks}
              selectedRisk={selectedRisk}
              onRiskClick={setSelectedRisk}
            />
          )}
        </main>

        {documentData && (
          <>
            <div
              className="resize-handle right"
              onMouseDown={() => setIsResizingRight(true)}
            />

            <aside className="right-panel" style={{ width: `${rightWidth}px` }}>
              <div className="fade-in">
                {panelMode === 'risk' && (
                  <RiskPanel
                    risk={selectedRisk}
                    allRisks={documentData.risks}
                    onRiskSelect={setSelectedRisk}
                  />
                )}
                {panelMode === 'editor' && (
                  <div className="editor-info">
                    <h3>编辑说明</h3>
                    <p>在左侧原文基础上进行修改，右侧将实时显示对比结果。</p>
                    <ul>
                      <li><span className="diff-tag removed">红色</span> 表示删除的内容</li>
                      <li><span className="diff-tag added">绿色</span> 表示新增的内容</li>
                    </ul>
                  </div>
                )}
                {panelMode === 'score' && score && (
                  <ScoreDashboard score={score} />
                )}
              </div>
            </aside>
          </>
        )}
      </div>

      <style>{`
        .app-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
        }

        .app-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          height: 60px;
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
          color: white;
          box-shadow: var(--shadow-md);
          z-index: 100;
          flex-shrink: 0;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .sidebar-toggle {
          color: white;
          padding: 8px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sidebar-toggle:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .header-icon {
          opacity: 0.9;
        }

        .app-title {
          font-size: 18px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .warning-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 20px;
          background: linear-gradient(90deg, var(--danger) 0%, #FF7875 100%);
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(245, 63, 63, 0.3);
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mode-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.8);
          font-size: 13px;
          font-weight: 500;
        }

        .mode-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }

        .mode-btn.active {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .export-btn {
          padding: 8px 20px;
          background: white;
          color: var(--primary);
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          margin-left: 8px;
        }

        .export-btn:hover {
          transform: scale(1.02);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .app-body {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .sidebar {
          background: var(--bg-primary);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          transition: var(--transition);
        }

        .sidebar-header {
          padding: 20px 16px;
          border-bottom: 1px solid var(--border);
        }

        .sidebar-header h3 {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .sidebar-content {
          flex: 1;
          overflow-y: auto;
          padding: 8px 0;
        }

        .chapter-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          cursor: pointer;
          transition: var(--transition);
          border-radius: 6px;
          margin: 0 8px;
        }

        .chapter-item:hover {
          background: var(--bg-secondary);
        }

        .chapter-arrow {
          font-size: 10px;
          color: var(--text-tertiary);
          transition: transform 200ms ease;
          flex-shrink: 0;
        }

        .chapter-arrow.expanded {
          transform: rotate(90deg);
        }

        .chapter-title {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .resize-handle {
          width: 4px;
          background: transparent;
          cursor: col-resize;
          transition: var(--transition);
          flex-shrink: 0;
        }

        .resize-handle:hover,
        .resize-handle:active {
          background: var(--primary);
        }

        .resize-handle.left {
          margin-right: -4px;
          z-index: 10;
        }

        .resize-handle.right {
          margin-left: -4px;
          z-index: 10;
        }

        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--bg-secondary);
          overflow: hidden;
          min-width: 0;
        }

        .upload-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin: 24px;
          border: 2px dashed var(--border);
          border-radius: 12px;
          background: var(--bg-primary);
          cursor: pointer;
          transition: var(--transition);
        }

        .upload-area:hover,
        .upload-area.dragging {
          border-color: var(--primary);
          background: rgba(22, 93, 255, 0.02);
        }

        .upload-area.dragging {
          transform: scale(1.005);
        }

        .upload-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(22, 93, 255, 0.1) 0%, rgba(22, 93, 255, 0.05) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--primary);
          margin-bottom: 24px;
        }

        .upload-area h2 {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 8px;
        }

        .upload-area > p {
          font-size: 14px;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }

        .upload-hint {
          font-size: 12px !important;
          color: var(--text-tertiary) !important;
          margin-top: 8px !important;
        }

        .loading-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 3px solid var(--border);
          border-top-color: var(--primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-area p {
          font-size: 14px;
          color: var(--text-secondary);
        }

        .right-panel {
          background: var(--bg-primary);
          border-left: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          overflow: hidden;
          transition: var(--transition);
        }

        .editor-info {
          padding: 24px;
        }

        .editor-info h3 {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 16px;
        }

        .editor-info p {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 16px;
        }

        .editor-info ul {
          list-style: none;
        }

        .editor-info li {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .diff-tag {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .diff-tag.removed {
          background: var(--diff-removed);
          color: var(--danger);
        }

        .diff-tag.added {
          background: var(--diff-added);
          color: var(--success);
        }

        @media (max-width: 1280px) {
          .sidebar {
            width: 60px !important;
          }

          .sidebar-header,
          .chapter-title {
            display: none;
          }

          .chapter-item {
            justify-content: center;
            padding: 12px 8px;
          }
        }
      `}</style>
    </div>
  );
}
