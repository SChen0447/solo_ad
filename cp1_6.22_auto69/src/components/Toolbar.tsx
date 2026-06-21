import { useCallback } from 'react';
import {
  Type,
  Square,
  Circle,
  LayoutTemplate,
  Undo2,
  Redo2,
  Download,
  Trash2,
  Menu,
} from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import type { CanvasApi } from '../types/types';

interface ToolbarProps {
  canvasApi: CanvasApi | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
}

export function Toolbar({
  canvasApi,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onExport,
}: ToolbarProps) {
  const {
    setActivePanel,
    leftPanelOpen,
    setLeftPanelOpen,
    setRightPanelOpen,
    rightPanelOpen,
  } = useEditorStore();

  const handleAddText = useCallback(() => {
    canvasApi?.addText();
  }, [canvasApi]);

  const handleAddRect = useCallback(() => {
    canvasApi?.addRect();
  }, [canvasApi]);

  const handleAddCircle = useCallback(() => {
    canvasApi?.addCircle();
  }, [canvasApi]);

  const handleDelete = useCallback(() => {
    canvasApi?.deleteSelected();
  }, [canvasApi]);

  const handleShowTemplates = useCallback(() => {
    setActivePanel('templates');
    if (!rightPanelOpen) {
      setRightPanelOpen(true);
    }
  }, [setActivePanel, rightPanelOpen, setRightPanelOpen]);

  const toolButtons = [
    {
      icon: Type,
      label: '添加文字',
      onClick: handleAddText,
    },
    {
      icon: Square,
      label: '添加矩形',
      onClick: handleAddRect,
    },
    {
      icon: Circle,
      label: '添加圆形',
      onClick: handleAddCircle,
    },
    {
      icon: LayoutTemplate,
      label: '选择模板',
      onClick: handleShowTemplates,
    },
    {
      icon: Trash2,
      label: '删除选中',
      onClick: handleDelete,
    },
  ];

  const historyButtons = [
    {
      icon: Undo2,
      label: '撤销',
      onClick: onUndo,
      disabled: !canUndo,
    },
    {
      icon: Redo2,
      label: '重做',
      onClick: onRedo,
      disabled: !canRedo,
    },
  ];

  const actionButtons = [
    {
      icon: Download,
      label: '导出图片',
      onClick: onExport,
      primary: true,
    },
  ];

  return (
    <>
      <button
        onClick={() => setLeftPanelOpen(!leftPanelOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md hover:bg-gray-100 transition-colors"
      >
        <Menu size={20} className="text-gray-700" />
      </button>

      <div
        className={`
          fixed lg:static left-0 top-0 h-full w-16 bg-white shadow-lg z-40
          flex flex-col items-center py-4 gap-1
          transition-transform duration-300 ease-in-out
          ${leftPanelOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex flex-col items-center gap-1 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#4a90d9] flex items-center justify-center">
            <Type size={20} className="text-white" />
          </div>
          <span className="text-[10px] text-gray-500 font-medium">海报编辑器</span>
        </div>

        <div className="w-10 h-px bg-gray-200 my-2" />

        {toolButtons.map((tool, index) => (
          <button
            key={index}
            onClick={tool.onClick}
            className="w-12 h-12 flex flex-col items-center justify-center rounded-lg hover:bg-[#e2e8f0] transition-colors duration-200 group"
            title={tool.label}
          >
            <tool.icon size={20} className="text-gray-700 group-hover:text-[#4a90d9] transition-colors" />
            <span className="text-[9px] text-gray-500 mt-1">{tool.label}</span>
          </button>
        ))}

        <div className="w-10 h-px bg-gray-200 my-2" />

        {historyButtons.map((tool, index) => (
          <button
            key={index}
            onClick={tool.onClick}
            disabled={tool.disabled}
            className={`
              w-12 h-12 flex flex-col items-center justify-center rounded-lg transition-colors duration-200 group
              ${tool.disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-[#e2e8f0] cursor-pointer'
              }
            `}
            title={tool.label}
          >
            <tool.icon
              size={20}
              className={`
                transition-colors
                ${tool.disabled
                  ? 'text-gray-300'
                  : 'text-gray-700 group-hover:text-[#4a90d9]'
                }
              `}
            />
            <span className="text-[9px] text-gray-500 mt-1">{tool.label}</span>
          </button>
        ))}

        <div className="flex-1" />

        {actionButtons.map((tool, index) => (
          <button
            key={index}
            onClick={tool.onClick}
            className={`
              w-12 h-12 flex flex-col items-center justify-center rounded-lg transition-all duration-200 group
              ${tool.primary
                ? 'bg-[#4a90d9] hover:bg-[#3a7bc8] shadow-md hover:shadow-lg'
                : 'hover:bg-[#e2e8f0]'
              }
            `}
            title={tool.label}
          >
            <tool.icon
              size={20}
              className={tool.primary ? 'text-white' : 'text-gray-700 group-hover:text-[#4a90d9]'}
            />
            <span className={`text-[9px] mt-1 ${tool.primary ? 'text-white' : 'text-gray-500'}`}>
              {tool.label}
            </span>
          </button>
        ))}
      </div>

      {leftPanelOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-30"
          onClick={() => setLeftPanelOpen(false)}
        />
      )}
    </>
  );
}
