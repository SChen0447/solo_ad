import React, { useMemo, useCallback } from 'react';
import { X, Settings, Trash2, Copy, Check, AlertCircle } from 'lucide-react';
import { usePipelineStore } from '../stores/pipelineStore';
import { NodeConfig, ConfigField } from '../types';

interface NodeConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({ isOpen, onClose }) => {
  const {
    selectedNodeId,
    updateNodeConfig,
    deleteNode,
    getCurrentPipeline,
    nodeTemplates,
    nodeStatus,
  } = usePipelineStore();

  const currentPipeline = getCurrentPipeline();
  const selectedNode = useMemo(() => {
    if (!currentPipeline || !selectedNodeId) return null;
    return currentPipeline.nodes.find(n => n.id === selectedNodeId);
  }, [currentPipeline, selectedNodeId]);

  const nodeTemplate = useMemo(() => {
    if (!selectedNode) return null;
    return nodeTemplates.find(t => t.type === selectedNode.type);
  }, [selectedNode, nodeTemplates]);

  const status = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodeStatus[selectedNodeId];
  }, [selectedNodeId, nodeStatus]);

  const handleConfigChange = useCallback((key: string, value: string | number | boolean) => {
    if (!selectedNodeId) return;
    const newConfig: NodeConfig = { ...selectedNode?.config };
    newConfig[key] = value;
    updateNodeConfig(selectedNodeId, newConfig);
  }, [selectedNodeId, selectedNode?.config, updateNodeConfig]);

  const handleCopyId = useCallback(() => {
    if (selectedNodeId) {
      navigator.clipboard.writeText(selectedNodeId);
    }
  }, [selectedNodeId]);

  const handleDelete = useCallback(() => {
    if (selectedNodeId && window.confirm('确定要删除这个节点吗？')) {
      deleteNode(selectedNodeId);
      onClose();
    }
  }, [selectedNodeId, deleteNode, onClose]);

  const renderField = useCallback((field: ConfigField) => {
    if (!selectedNode) return null;
    const value = selectedNode.config[field.key];

    const baseClassName = "w-full px-3 py-2 text-sm border border-slateblue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all bg-white";

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            className={baseClassName}
            placeholder={field.placeholder}
            value={(value as string) || ''}
            onChange={(e) => handleConfigChange(field.key, e.target.value)}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            className={baseClassName}
            placeholder={field.placeholder}
            value={(value as number) || ''}
            onChange={(e) => handleConfigChange(field.key, Number(e.target.value))}
          />
        );
      case 'textarea':
        return (
          <textarea
            className={`${baseClassName} resize-none min-h-[80px]`}
            placeholder={field.placeholder}
            value={(value as string) || ''}
            onChange={(e) => handleConfigChange(field.key, e.target.value)}
          />
        );
      case 'select':
        return (
          <select
            className={baseClassName}
            value={(value as string) || ''}
            onChange={(e) => handleConfigChange(field.key, e.target.value)}
          >
            {field.options?.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 text-primary-500 border-slateblue-300 rounded focus:ring-primary-400"
              checked={(value as boolean) || false}
              onChange={(e) => handleConfigChange(field.key, e.target.checked)}
            />
            <span className="text-sm text-slateblue-700">{field.label}</span>
          </label>
        );
      case 'password':
        return (
          <input
            type="password"
            className={baseClassName}
            placeholder={field.placeholder}
            value={(value as string) || ''}
            onChange={(e) => handleConfigChange(field.key, e.target.value)}
          />
        );
      default:
        return null;
    }
  }, [selectedNode, handleConfigChange]);

  if (!isOpen || !selectedNode || !nodeTemplate) {
    return null;
  }

  const statusConfig = {
    pending: { color: 'bg-slateblue-400', label: '待执行', icon: null },
    running: { color: 'bg-amber-400', label: '执行中', icon: <span className="animate-pulse">●</span> },
    success: { color: 'bg-emerald-400', label: '成功', icon: <Check size={14} /> },
    failed: { color: 'bg-red-400', label: '失败', icon: <AlertCircle size={14} /> },
  };

  const currentStatus = status ? statusConfig[status] : null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-[380px] bg-white border-l border-slateblue-200 shadow-2xl z-50 animate-slide-in flex flex-col">
        <div className="p-4 border-b border-slateblue-200">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Settings className="text-slateblue-500" size={18} />
                <h3 className="font-semibold text-slateblue-800">节点配置</h3>
                {currentStatus && (
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white ${currentStatus.color}`}>
                    {currentStatus.icon}
                    {currentStatus.label}
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-slateblue-500 font-mono">
                  {selectedNode.label}
                </span>
                <button
                  onClick={handleCopyId}
                  className="text-xs text-slateblue-400 hover:text-slateblue-600 transition-colors"
                  title="复制节点ID"
                >
                  <Copy size={12} />
                </button>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slateblue-100 text-slateblue-500 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-6">
            <label className="block text-sm font-medium text-slateblue-700 mb-1.5">
              节点名称
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 text-sm border border-slateblue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
              value={selectedNode.label}
              onChange={(e) => {
                const newConfig = { ...selectedNode.config };
                updateNodeConfig(selectedNodeId, newConfig);
              }}
            />
          </div>

          <div className="space-y-5">
            <h4 className="text-xs font-semibold text-slateblue-500 uppercase tracking-wider">
              节点参数
            </h4>
            {nodeTemplate.configFields.map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-slateblue-700 mb-1.5">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {field.description && (
                  <p className="text-xs text-slateblue-500 mb-1">{field.description}</p>
                )}
                {renderField(field)}
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-slateblue-200">
            <h4 className="text-xs font-semibold text-slateblue-500 uppercase tracking-wider mb-3">
              节点信息
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slateblue-500">类型</span>
                <span className="text-slateblue-700 font-medium">{selectedNode.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slateblue-500">节点ID</span>
                <span className="text-slateblue-700 font-mono text-xs">{selectedNode.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slateblue-500">位置</span>
                <span className="text-slateblue-700 font-mono text-xs">
                  ({Math.round(selectedNode.position.x)}, {Math.round(selectedNode.position.y)})
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slateblue-200">
            <h4 className="text-xs font-semibold text-slateblue-500 uppercase tracking-wider mb-3">
              节点描述
            </h4>
            <p className="text-sm text-slateblue-600">
              {nodeTemplate.description}
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-slateblue-200">
          <button
            onClick={handleDelete}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
          >
            <Trash2 size={16} />
            删除节点
          </button>
        </div>
      </div>
    </>
  );
};

export default NodeConfigPanel;
