import { useState } from 'react';
import {
  Undo2,
  Redo2,
  Trash2,
  Save,
  FolderOpen,
  X,
  Copy,
  Check,
  Sunrise,
  Sun,
  Sunset,
  Moon,
} from 'lucide-react';

interface ToolbarProps {
  timeHour: number;
  onTimeChange: (hour: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  hasSelection: boolean;
  onDelete: () => void;
  onSave: () => Promise<string | null>;
  onLoad: (id: string) => Promise<boolean>;
}

export default function Toolbar(props: ToolbarProps) {
  const {
    timeHour,
    onTimeChange,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    hasSelection,
    onDelete,
    onSave,
    onLoad,
  } = props;

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [savedId, setSavedId] = useState('');
  const [copied, setCopied] = useState(false);
  const [loadId, setLoadId] = useState('');
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSaveClick = async () => {
    setSaving(true);
    setSavedId('');
    setSaveModalOpen(true);
    const id = await onSave();
    setSaving(false);
    if (id) setSavedId(id);
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(savedId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      /* ignore */
    }
  };

  const handleLoadClick = async () => {
    setLoadError('');
    setLoading(true);
    const success = await onLoad(loadId.trim().toUpperCase());
    setLoading(false);
    if (success) {
      setLoadModalOpen(false);
      setLoadId('');
    } else {
      setLoadError('未找到该方案，请确认6位随机码是否正确。');
    }
  };

  const getTimeIcon = () => {
    if (timeHour >= 5 && timeHour < 8) return <Sunrise className="w-4 h-4 text-orange-400" />;
    if (timeHour >= 8 && timeHour < 17) return <Sun className="w-4 h-4 text-yellow-400" />;
    if (timeHour >= 17 && timeHour < 19) return <Sunset className="w-4 h-4 text-orange-500" />;
    return <Moon className="w-4 h-4 text-indigo-300" />;
  };

  return (
    <>
      <div className="h-[60px] flex items-center px-4 bg-[#1e293b] border-b border-[#334155] gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="撤销 (Ctrl+Z)"
            className="h-9 w-9 flex items-center justify-center rounded-lg bg-gradient-to-b from-[#3b82f6] to-[#2563eb] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-95 transition-all"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="重做 (Ctrl+Y)"
            className="h-9 w-9 flex items-center justify-center rounded-lg bg-gradient-to-b from-[#3b82f6] to-[#2563eb] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-95 transition-all"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-[#334155] mx-1" />
          <button
            onClick={onDelete}
            disabled={!hasSelection}
            title="删除选中组件 (Delete)"
            className="h-9 w-9 flex items-center justify-center rounded-lg bg-gradient-to-b from-[#ef4444] to-[#b91c1c] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 active:scale-95 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center gap-3">
          {getTimeIcon()}
          <span className="text-[#94a3b8] text-xs w-6 text-right">0</span>
          <div className="relative w-[400px] h-6 flex items-center">
            <div className="absolute left-0 right-0 h-[6px] rounded-full bg-[#334155]" />
            <div
              className="absolute left-0 h-[6px] rounded-full bg-gradient-to-r from-[#38bdf8] to-[#3b82f6]"
              style={{ width: `${(timeHour / 24) * 100}%` }}
            />
            {[0, 6, 12, 18, 24].map((t) => (
              <div
                key={t}
                className="absolute top-1/2 -translate-y-1/2 w-1 h-3 rounded-sm bg-[#64748b]"
                style={{ left: `${(t / 24) * 100}%` }}
              />
            ))}
            <input
              type="range"
              min={0}
              max={24}
              step={0.1}
              value={timeHour}
              onChange={(e) => onTimeChange(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-gradient-to-br from-[#38bdf8] to-[#3b82f6] shadow-lg pointer-events-none transition-transform hover:scale-110"
              style={{ left: `${(timeHour / 24) * 100}%` }}
            />
          </div>
          <span className="text-[#94a3b8] text-xs w-6">24</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveClick}
            className="h-9 px-3 flex items-center gap-2 rounded-lg bg-gradient-to-b from-[#3b82f6] to-[#2563eb] text-white hover:brightness-110 active:scale-95 transition-all text-sm font-medium"
          >
            <Save className="w-4 h-4" />
            <span>保存方案</span>
          </button>
          <button
            onClick={() => {
              setLoadId('');
              setLoadError('');
              setLoadModalOpen(true);
            }}
            className="h-9 px-3 flex items-center gap-2 rounded-lg bg-gradient-to-b from-[#6366f1] to-[#4338ca] text-white hover:brightness-110 active:scale-95 transition-all text-sm font-medium"
          >
            <FolderOpen className="w-4 h-4" />
            <span>加载方案</span>
          </button>
        </div>
      </div>

      {saveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-[#1e293b] rounded-2xl p-6 w-[420px] shadow-2xl border border-[#334155]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">保存方案</h3>
              <button
                onClick={() => setSaveModalOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-[#94a3b8] hover:bg-[#334155] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {saving ? (
              <div className="py-8 flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin" />
                <p className="text-[#94a3b8] text-sm">正在保存方案...</p>
              </div>
            ) : savedId ? (
              <div className="py-4">
                <p className="text-[#94a3b8] text-sm mb-3">方案已保存，请记录以下6位随机码：</p>
                <div className="bg-[#0f172a] rounded-xl p-4 flex items-center justify-between mb-4 border border-[#334155]">
                  <span className="text-4xl font-bold tracking-[0.4em] text-[#38bdf8] font-mono">
                    {savedId}
                  </span>
                  <button
                    onClick={handleCopyId}
                    className="h-9 w-9 flex items-center justify-center rounded-lg bg-[#334155] text-white hover:bg-[#475569] transition-colors"
                    title="复制"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={() => setSaveModalOpen(false)}
                  className="w-full h-9 rounded-lg bg-gradient-to-b from-[#3b82f6] to-[#2563eb] text-white text-sm font-medium hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  确认关闭
                </button>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-red-400 text-sm">保存失败，请稍后重试。</p>
                <button
                  onClick={() => setSaveModalOpen(false)}
                  className="mt-4 w-full h-9 rounded-lg bg-[#334155] text-white text-sm font-medium hover:bg-[#475569] transition-colors"
                >
                  关闭
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {loadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-[#1e293b] rounded-2xl p-6 w-[420px] shadow-2xl border border-[#334155]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">加载方案</h3>
              <button
                onClick={() => setLoadModalOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-[#94a3b8] hover:bg-[#334155] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[#94a3b8] text-sm mb-3">请输入6位方案随机码：</p>
            <input
              type="text"
              value={loadId}
              maxLength={6}
              onChange={(e) => {
                setLoadId(e.target.value.toUpperCase());
                setLoadError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && loadId.trim().length === 6) handleLoadClick();
              }}
              placeholder="例如：A7K2X9"
              className="w-full h-12 rounded-xl bg-[#0f172a] border border-[#334155] text-3xl font-mono tracking-[0.5em] text-center text-[#38bdf8] placeholder:text-[#475569] focus:outline-none focus:border-[#3b82f6] transition-colors uppercase"
              autoFocus
            />

            {loadError && <p className="mt-3 text-sm text-red-400">{loadError}</p>}

            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={() => setLoadModalOpen(false)}
                className="flex-1 h-9 rounded-lg bg-[#334155] text-white text-sm font-medium hover:bg-[#475569] transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleLoadClick}
                disabled={loadId.trim().length !== 6 || loading}
                className="flex-1 h-9 rounded-lg bg-gradient-to-b from-[#6366f1] to-[#4338ca] text-white text-sm font-medium hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? '加载中...' : '确认加载'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
