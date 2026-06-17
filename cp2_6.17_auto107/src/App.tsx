import { useRef, useCallback, useState, useEffect } from 'react';
import { Play, Music, Volume2, Upload, X, Wand2 } from 'lucide-react';
import TimeLine from '@/components/TimeLine';
import CardEditor from '@/components/CardEditor';
import PreviewPlayer from '@/components/PreviewPlayer';
import { useAppStore } from '@/store';
import {
  loadAudio,
  unloadAudio,
  setVolume as setAudioVolume,
  getAudioProgress,
  playAudio,
  stopAudio,
} from '@/utils/audioManager';

export default function App() {
  const cards = useAppStore((s) => s.cards);
  const selectedCardId = useAppStore((s) => s.selectedCardId);
  const audio = useAppStore((s) => s.audio);
  const setAudio = useAppStore((s) => s.setAudio);
  const setVolume = useAppStore((s) => s.setVolume);
  const addCard = useAppStore((s) => s.addCard);
  const getTotalDuration = useAppStore((s) => s.getTotalDuration);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [audioProgress, setAudioProgress] = useState<{ seek: number; duration: number }>({
    seek: 0,
    duration: 0,
  });
  const audioInputRef = useRef<HTMLInputElement>(null);
  const progIntervalRef = useRef<number | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file) return;
      const url = URL.createObjectURL(file);
      loadAudio(url);
      playAudio();
      setAudio({
        src: url,
        fileName: file.name,
        volume: 70,
        isPlaying: true,
      });
      setAudioVolume(70);
    },
    [setAudio]
  );

  const openPreview = useCallback(() => {
    if (cards.length === 0) {
      addCard();
      return;
    }
    stopAudio();
    setPreviewOpen(true);
  }, [cards.length, addCard]);

  const closePreview = useCallback(() => {
    setPreviewOpen(false);
    if (audio) {
      setTimeout(() => {
        loadAudio(audio.src);
      }, 200);
    }
  }, [audio]);

  const removeAudio = useCallback(() => {
    unloadAudio();
    setAudio(null);
    if (progIntervalRef.current) {
      window.clearInterval(progIntervalRef.current);
      progIntervalRef.current = null;
    }
  }, [setAudio]);

  useEffect(() => {
    if (audio) {
      progIntervalRef.current = window.setInterval(() => {
        setAudioProgress(getAudioProgress());
      }, 100);
    }
    return () => {
      if (progIntervalRef.current) {
        window.clearInterval(progIntervalRef.current);
        progIntervalRef.current = null;
      }
    };
  }, [audio]);

  useEffect(() => {
    if (cards.length === 0) {
      const defaults: Array<{ title: string; content: string; bgColor: string; transition: string; duration: number }> = [
        {
          title: '故事的开始',
          content: '在一个遥远的地方，有一段等待被讲述的故事...',
          bgColor: '#dbeafe',
          transition: 'fadeInOut',
          duration: 3,
        },
        {
          title: '奇妙的旅程',
          content: '主人公踏上了一条充满未知与挑战的道路，每个转角都是新的机遇。',
          bgColor: '#f3e8ff',
          transition: 'slideLeft',
          duration: 4,
        },
        {
          title: '终章 · 希望',
          content: '当暮色降临，星光指引前行的方向，故事将被永远铭记。',
          bgColor: '#ffe4e6',
          transition: 'zoom',
          duration: 3.5,
        },
      ];
      const store = useAppStore.getState();
      defaults.forEach(() => {
        store.addCard();
      });
      const currentCards = useAppStore.getState().cards;
      defaults.forEach((d, idx) => {
        const card = currentCards[idx];
        if (card) {
          store.updateCard(card.id, {
            title: d.title,
            content: d.content,
            bgColor: d.bgColor,
            transition: d.transition as any,
            duration: d.duration,
          });
        }
      });
    }
  }, [cards.length]);

  const totalSec = getTotalDuration();

  return (
    <div className="h-screen w-screen flex flex-col" style={{ background: '#0f172a', color: '#e2e8f0' }}>
      <header
        className="flex items-center justify-between px-6 py-3 border-b"
        style={{ borderColor: 'rgba(71, 85, 105, 0.4)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
            }}
          >
            <Wand2 size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white">时间轴互动故事编辑器</h1>
            <p className="text-xs" style={{ color: '#94a3b8' }}>
              {cards.length} 张卡片 · 总时长 {totalSec.toFixed(1)}s
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(30, 41, 59, 0.8)' }}>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/mp3,audio/mpeg,audio/ogg,.mp3,.ogg"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                if (audioInputRef.current) audioInputRef.current.value = '';
              }}
            />
            {!audio ? (
              <button
                onClick={() => audioInputRef.current?.click()}
                className="flex items-center gap-1.5 text-sm text-indigo-300 hover:text-indigo-200 transition-colors"
              >
                <Upload size={14} />
                添加音频
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <Music size={14} className="text-violet-400" />
                <span className="text-xs truncate max-w-[140px]" style={{ color: '#cbd5e1' }}>
                  {audio.fileName}
                </span>
                <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(71,85,105,0.5)' }}>
                  <div
                    className="h-full"
                    style={{
                      width: audioProgress.duration > 0 ? `${(audioProgress.seek / audioProgress.duration) * 100}%` : '0%',
                      background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                      transition: 'width 120ms linear',
                    }}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <Volume2 size={13} className="text-slate-400" />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={audio.volume}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setVolume(v);
                      setAudioVolume(v);
                    }}
                    style={{ width: 70, accentColor: '#8b5cf6' }}
                  />
                </div>
                <button
                  onClick={removeAudio}
                  className="w-5 h-5 rounded flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>

          <button
            onClick={openPreview}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white
              bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400
              shadow-lg shadow-indigo-500/25 transition-all active:scale-95"
          >
            <Play size={15} fill="white" />
            播放预览
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <section
          className="flex-1 flex flex-col min-w-0"
          style={{ background: '#1e293b' }}
        >
          <div className="flex-1 overflow-hidden">
            <TimeLine />
          </div>
        </section>

        <aside
          className="w-[340px] flex-shrink-0 flex flex-col border-l max-md:hidden"
          style={{
            borderColor: 'rgba(71, 85, 105, 0.4)',
            background: 'rgba(15, 23, 42, 0.8)',
          }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(71, 85, 105, 0.4)' }}>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(99, 102, 241, 0.15)' }}
              >
                <Wand2 size={13} className="text-indigo-400" />
              </div>
              <h2 className="text-sm font-medium text-slate-200">
                {selectedCardId ? '编辑卡片' : '卡片属性'}
              </h2>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <CardEditor />
          </div>
        </aside>
      </main>

      <PreviewPlayer open={previewOpen} onClose={closePreview} />
    </div>
  );
}
