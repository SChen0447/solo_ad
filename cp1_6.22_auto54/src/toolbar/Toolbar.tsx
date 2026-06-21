import React from 'react';

interface ToolbarProps {
  onAddNode: () => void;
  onDeleteSelected: () => void;
  onExportHtml: () => void;
  onImport: () => void;
  onResetView: () => void;
  hasSelection: boolean;
}

const toolbarButtonStyle: React.CSSProperties = {
  width: '48px',
  height: '48px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.15s ease-in-out',
  color: 'white',
};

const toolbarButtonHoverStyle: React.CSSProperties = {
  backgroundColor: '#4a5568',
  transform: 'scale(1.1)',
};

const ToolbarButton: React.FC<{
  onClick: () => void;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ onClick, title, disabled, children }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...toolbarButtonStyle,
        ...(isHovered && !disabled ? toolbarButtonHoverStyle : {}),
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
};

const AddIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const DeleteIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);

const ExportIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const ImportIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const ResetIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

const Toolbar: React.FC<ToolbarProps> = ({
  onAddNode,
  onDeleteSelected,
  onExportHtml,
  onImport,
  onResetView,
  hasSelection,
}) => {
  return (
    <div
      style={{
        width: '64px',
        backgroundColor: '#2d3748',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: '16px',
        gap: '8px',
        flexShrink: 0,
      }}
    >
      <ToolbarButton onClick={onAddNode} title="新建节点">
        <AddIcon />
      </ToolbarButton>
      <ToolbarButton
        onClick={onDeleteSelected}
        title="删除选中"
        disabled={!hasSelection}
      >
        <DeleteIcon />
      </ToolbarButton>
      <ToolbarButton onClick={onExportHtml} title="导出HTML">
        <ExportIcon />
      </ToolbarButton>
      <ToolbarButton onClick={onImport} title="导入文件">
        <ImportIcon />
      </ToolbarButton>
      <ToolbarButton onClick={onResetView} title="重置视图">
        <ResetIcon />
      </ToolbarButton>
    </div>
  );
};

export default Toolbar;
