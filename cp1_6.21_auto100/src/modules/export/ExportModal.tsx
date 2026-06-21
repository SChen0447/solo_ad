import { useState, useCallback } from 'react';
import { Copy, Check, X } from 'lucide-react';
import { useAnimationStore } from '@/store/useAnimationStore';
import { exportCSSKeyframes, exportJSAnimation } from '@/utils/exporter';
import type { ExportFormat } from '@/types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TABS: { key: ExportFormat; label: string }[] = [
  { key: 'css', label: 'CSS @keyframes' },
  { key: 'js', label: 'JS 动画API' },
];

export default function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const slices = useAnimationStore((s) => s.slices);
  const [activeTab, setActiveTab] = useState<ExportFormat>('css');
  const [copied, setCopied] = useState(false);

  const code = activeTab === 'css' ? exportCSSKeyframes(slices) : exportJSAnimation(slices);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [code]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-[640px] max-h-[80vh] rounded-xl bg-[#1E1E1E] shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex gap-1 bg-white/10 rounded-lg p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.key ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="relative flex-1 overflow-auto px-5 pb-5">
          <pre className="rounded-lg bg-[#1E1E1E] p-4 overflow-auto text-sm leading-relaxed">
            <code className="font-mono" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#98C379' }}>
              {code}
            </code>
          </pre>
        </div>

        <div className="px-5 pb-4 flex justify-end">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
          >
            {copied ? (
              <span className="flex items-center gap-2" style={{ animation: 'springIn 0.3s ease-out' }}>
                <Check size={16} className="text-green-400" />
                <span className="text-green-400">已复制</span>
              </span>
            ) : (
              <>
                <Copy size={16} />
                复制
              </>
            )}
          </button>
        </div>

        <style>{`
          @keyframes springIn {
            0% { transform: translateY(8px); opacity: 0; }
            60% { transform: translateY(-2px); opacity: 1; }
            100% { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}
