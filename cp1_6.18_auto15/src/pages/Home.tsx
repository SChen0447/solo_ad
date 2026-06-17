import { useEffect } from 'react';
import { Lightbulb } from 'lucide-react';
import { useMindStore } from '@/store/useMindStore';
import CanvasView from '@/components/CanvasView';
import FloatingNote from '@/components/FloatingNote';
import SearchBar from '@/components/SearchBar';
import TimelineSlider from '@/components/TimelineSlider';

export default function Home() {
  const loadFromStorage = useMindStore(s => s.loadFromStorage);
  const setFloatingNoteVisible = useMindStore(s => s.setFloatingNoteVisible);
  const cards = useMindStore(s => s.cards);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gradient-to-br from-[#667eea] to-[#764ba2] font-body">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(118,75,162,0.3),transparent_50%)]" />

      <header className="relative z-10 backdrop-blur-[12px] bg-white/[0.06] border-b border-white/[0.1]">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center shadow-lg shadow-[#667eea]/30">
              <Lightbulb size={16} className="text-white" />
            </div>
            <span className="font-display text-white/90 text-lg font-semibold tracking-wide">
              MindFlow
            </span>
          </div>

          <button
            onClick={() => setFloatingNoteVisible(true)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.1] border border-white/[0.15] text-white/80 text-xs font-body hover:bg-white/[0.15] transition-all duration-200"
          >
            <Lightbulb size={14} />
            新建灵感
          </button>
        </div>

        <SearchBar />
      </header>

      <main className="relative z-[5]" style={{ height: 'calc(100vh - 110px)' }}>
        <CanvasView />

        {cards.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.06] flex items-center justify-center">
                <Lightbulb size={28} className="text-white/20" />
              </div>
              <p className="text-white/30 text-sm font-body mb-1">还没有灵感卡片</p>
              <p className="text-white/20 text-xs font-body">
                按 Ctrl+Shift+N 快速记录灵感
              </p>
            </div>
          </div>
        )}
      </main>

      <TimelineSlider />
      <FloatingNote />

      <div className="fixed bottom-4 left-4 z-10 text-white/20 text-[10px] font-display">
        Ctrl+Shift+N 新建 · 双击连线编辑
      </div>
    </div>
  );
}
