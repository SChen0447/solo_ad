import { useState, useEffect, useCallback } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useMindStore } from '@/store/useMindStore';
import { Tag } from '@/model/CardModel';

export default function FloatingNote() {
  const floatingNoteVisible = useMindStore(s => s.floatingNoteVisible);
  const setFloatingNoteVisible = useMindStore(s => s.setFloatingNoteVisible);
  const addCard = useMindStore(s => s.addCard);

  const [text, setText] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setFloatingNoteVisible(false);
      setIsClosing(false);
      setText('');
      setSelectedTags([]);
    }, 280);
  }, [setFloatingNoteVisible]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        setFloatingNoteVisible(true);
      }
      if (e.key === 'Escape' && floatingNoteVisible) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [floatingNoteVisible, handleClose, setFloatingNoteVisible]);

  const handleSave = useCallback(() => {
    if (!text.trim()) return;
    const tagString = selectedTags.map(t => `#${t}`).join(' ');
    addCard(`${tagString} ${text}`.trim());
    handleClose();
  }, [text, selectedTags, addCard, handleClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  const toggleTag = (tag: Tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  if (!floatingNoteVisible) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      <div
        className={`relative backdrop-blur-[16px] bg-white/[0.1] border border-white/[0.18] rounded-[20px] p-6 w-[400px] max-w-[90vw] shadow-2xl ${
          isClosing ? 'animate-fade-out' : 'animate-scale-in'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white/70 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-[#667eea]" />
          <h2 className="font-display text-white/90 text-base font-medium">
            灵感速记
          </h2>
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-white/[0.06] border border-white/[0.12] rounded-xl px-4 py-3 text-white/90 text-sm font-body outline-none resize-none min-h-[100px] focus:border-white/25 transition-colors placeholder:text-white/30"
          placeholder="记录你的灵感、想法或待办事项..."
          autoFocus
        />

        <div className="flex flex-wrap gap-2 mt-3">
          {Object.values(Tag).map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1 rounded-full text-xs font-body transition-all duration-200 ${
                selectedTags.includes(tag)
                  ? 'bg-[#667eea]/30 text-[#667eea] border border-[#667eea]/40'
                  : 'bg-white/[0.06] text-white/40 border border-white/[0.1] hover:bg-white/[0.1]'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center mt-4">
          <span className="text-white/30 text-[10px] font-body">
            Ctrl+Enter 保存 · Esc 关闭
          </span>
          <button
            onClick={handleSave}
            disabled={!text.trim()}
            className="px-5 py-2 rounded-full text-sm font-display font-medium bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
