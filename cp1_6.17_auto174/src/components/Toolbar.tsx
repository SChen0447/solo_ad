import React, { useState, useEffect } from 'react';
import { ToolButton } from './ToolButton';

interface ToolbarProps {
  onAddRootNode: () => void;
  onAddChildNode: () => void;
  onExportPNG: () => void;
  onExportMarkdown: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onAddRootNode,
  onAddChildNode,
  onExportPNG,
  onExportMarkdown,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  hasSelection,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toolbarContent = (
    <>
      <ToolButton icon="＋" label="根节点" onClick={onAddRootNode} title="添加根节点 (双击画布)" />
      <ToolButton
        icon="⊕"
        label="子节点"
        onClick={onAddChildNode}
        disabled={!hasSelection}
        title="添加子节点 (Tab)"
      />
      <div style={{ width: '1px', height: '30px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 8px' }} />
      <ToolButton icon="🖼" label="导出PNG" onClick={onExportPNG} title="导出为PNG图片" />
      <ToolButton icon="📝" label="导出MD" onClick={onExportMarkdown} title="导出为Markdown大纲" />
      <div style={{ width: '1px', height: '30px', backgroundColor: 'rgba(255,255,255,0.2)', margin: '0 8px' }} />
      <ToolButton icon="↶" label="撤销" onClick={onUndo} disabled={!canUndo} title="撤销 (Ctrl+Z)" />
      <ToolButton icon="↷" label="重做" onClick={onRedo} disabled={!canRedo} title="重做 (Ctrl+Shift+Z)" />
    </>
  );

  if (isMobile) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: 'rgba(30, 30, 46, 0.9)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{
            width: '100%',
            padding: '12px 16px',
            backgroundColor: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span>☰</span>
          <span style={{ fontSize: '16px', fontWeight: 500 }}>灵感瀑布</span>
        </button>
        {isMobileMenuOpen && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              borderTop: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', padding: '8px' }}>
              {toolbarContent}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(30, 30, 46, 0.8)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        height: '60px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div
        style={{
          fontSize: '18px',
          fontWeight: 600,
          marginRight: '24px',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '24px' }}>💡</span>
        灵感瀑布
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {toolbarContent}
      </div>
    </div>
  );
};
