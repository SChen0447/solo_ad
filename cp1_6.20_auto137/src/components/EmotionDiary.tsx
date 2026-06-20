import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDiaryStore } from '../store';
import { EMOTION_CONFIG, EMOTION_LIST, EMOJI_PALETTE, COLLAGE_TEMPLATES } from '../types';
import type { CollageTemplate } from '../types';
import { Plus, Sparkles, Trash2, ArrowLeft } from 'lucide-react';

export default function EmotionDiary() {
  const navigate = useNavigate();
  const {
    selectedEmotion, diaryText, emojiItems, selectedTemplate,
    isGenerating, collageUrl,
    setSelectedEmotion, setDiaryText, addEmoji, updateEmojiPosition,
    removeEmoji, setSelectedTemplate, saveDiary, generateCollageImage, resetEditor,
  } = useDiaryStore();

  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const emotionColor = selectedEmotion ? EMOTION_CONFIG[selectedEmotion].color : '#81B29A';

  const handleDragStart = useCallback((index: number, clientX: number, clientY: number) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const item = emojiItems[index];
    dragOffset.current = {
      x: clientX - rect.left - (item.x / 100) * rect.width,
      y: clientY - rect.top - (item.y / 100) * rect.height,
    };
    setDragIndex(index);
  }, [emojiItems]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (dragIndex === null || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left - dragOffset.current.x) / rect.width) * 100;
    const y = ((clientY - rect.top - dragOffset.current.y) / rect.height) * 100;
    const clampedX = Math.max(5, Math.min(95, x));
    const clampedY = Math.max(5, Math.min(95, y));
    updateEmojiPosition(dragIndex, clampedX, clampedY);
  }, [dragIndex, updateEmojiPosition]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
  }, []);

  const handleMouseDown = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(index, e.clientX, e.clientY);
    const onMouseMove = (ev: MouseEvent) => handleDragMove(ev.clientX, ev.clientY);
    const onMouseUp = () => {
      handleDragEnd();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleTouchStart = (index: number, e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleDragStart(index, touch.clientX, touch.clientY);
    const onTouchMove = (ev: TouchEvent) => {
      const t = ev.touches[0];
      handleDragMove(t.clientX, t.clientY);
    };
    const onTouchEnd = () => {
      handleDragEnd();
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
  };

  const handleSaveAndGenerate = async () => {
    const diary = await saveDiary();
    if (!diary) return;
    const url = await generateCollageImage();
    if (url && diary.id) {
      navigate(`/diary/${diary.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-30 bg-cream/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => { resetEditor(); navigate('/'); }}
            className="btn-bounce flex items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">返回</span>
          </button>
          <h1 className="font-display text-xl" style={{ color: emotionColor }}>
            灵感画布
          </h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-6">
            <section>
              <h2 className="font-display text-lg mb-3 text-gray-700">今天的心情是？</h2>
              <div className="grid grid-cols-4 gap-3">
                {EMOTION_LIST.map((emotion) => {
                  const config = EMOTION_CONFIG[emotion];
                  const isSelected = selectedEmotion === emotion;
                  return (
                    <motion.button
                      key={emotion}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSelectedEmotion(emotion)}
                      className={`btn-bounce relative flex flex-col items-center gap-1 p-3 rounded-2xl transition-all duration-300 ${
                        isSelected
                          ? 'ring-2 ring-offset-2 emotion-glow shadow-card'
                          : 'hover:shadow-md'
                      }`}
                      style={{
                        background: isSelected ? config.gradient : 'rgba(255,255,255,0.7)',
                        ringColor: config.color,
                        transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                      }}
                      animate={{ scale: isSelected ? 1.1 : 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    >
                      <span className="text-2xl">{config.emoji}</span>
                      <span className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-gray-600'}`}>
                        {config.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </section>

            <section>
              <h2 className="font-display text-lg mb-3 text-gray-700">写点什么吧...</h2>
              <textarea
                className="diary-textarea w-full h-28"
                style={{ '--emotion-color': emotionColor } as React.CSSProperties}
                value={diaryText}
                onChange={(e) => setDiaryText(e.target.value)}
                placeholder="用2-3句话记录此刻的心情..."
                maxLength={200}
              />
              <p className="text-right text-xs text-gray-400 mt-1">{diaryText.length}/200</p>
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-lg text-gray-700">Emoji 画布</h2>
                <span className="text-xs text-gray-400">{emojiItems.length}/5</span>
              </div>
              <div className="flex gap-2 mb-3 flex-wrap">
                {EMOJI_PALETTE.map((emoji) => (
                  <motion.button
                    key={emoji}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => addEmoji(emoji)}
                    disabled={emojiItems.length >= 5}
                    className="text-2xl p-1 rounded-lg hover:bg-white/60 transition-colors disabled:opacity-30"
                  >
                    {emoji}
                  </motion.button>
                ))}
              </div>
            </section>
          </div>

          <div className="lg:w-[360px] space-y-4">
            <div
              ref={canvasRef}
              className="relative w-full aspect-square rounded-2xl border-2 border-dashed overflow-hidden"
              style={{
                borderColor: `${emotionColor}60`,
                background: selectedEmotion
                  ? `${EMOTION_CONFIG[selectedEmotion].gradient.replace('135deg', '180deg')}, #FFF8F0`
                  : 'rgba(255,255,255,0.4)',
              }}
            >
              {emojiItems.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-gray-300">
                    <Plus size={32} className="mx-auto mb-1" />
                    <p className="text-sm">点击上方Emoji添加到画布</p>
                  </div>
                </div>
              )}
              {emojiItems.map((item, index) => (
                <motion.div
                  key={`${item.emoji}-${index}`}
                  className="emoji-draggable absolute text-3xl"
                  style={{
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    transform: 'translate(-50%, -50%)',
                    filter: dragIndex === index ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' : 'none',
                    zIndex: dragIndex === index ? 10 : 1,
                  }}
                  animate={{
                    scale: dragIndex === index ? 1.3 : 1,
                  }}
                  onMouseDown={(e) => handleMouseDown(index, e)}
                  onTouchStart={(e) => handleTouchStart(index, e)}
                >
                  {item.emoji}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeEmoji(index); }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-400 rounded-full flex items-center justify-center"
                  >
                    <Trash2 size={8} className="text-white" />
                  </button>
                </motion.div>
              ))}
            </div>

            <div>
              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="btn-bounce text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                🎨 拼贴模板：{COLLAGE_TEMPLATES.find(t => t.key === selectedTemplate)?.label}
              </button>
              <AnimatePresence>
                {showTemplates && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {COLLAGE_TEMPLATES.map((t) => (
                        <button
                          key={t.key}
                          onClick={() => { setSelectedTemplate(t.key as CollageTemplate); setShowTemplates(false); }}
                          className={`btn-bounce p-2 rounded-xl text-left transition-all text-xs ${
                            selectedTemplate === t.key
                              ? 'bg-white shadow-card ring-1 ring-gray-200'
                              : 'bg-white/50 hover:bg-white/80'
                          }`}
                        >
                          <div className="font-medium text-gray-700">{t.label}</div>
                          <div className="text-gray-400 mt-0.5">{t.desc}</div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSaveAndGenerate}
              disabled={!selectedEmotion || !diaryText.trim() || isGenerating}
              className="btn-bounce w-full py-3.5 rounded-2xl font-display text-white text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-shadow shadow-card hover:shadow-card-hover"
              style={{
                background: selectedEmotion ? EMOTION_CONFIG[selectedEmotion].gradient : 'linear-gradient(135deg, #81B29A, #52796F)',
              }}
            >
              {isGenerating ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles size={20} />
                  </motion.div>
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  保存并生成拼贴画
                </>
              )}
            </motion.button>

            {collageUrl && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl overflow-hidden shadow-card"
              >
                <img src={collageUrl} alt="拼贴画预览" className="w-full" />
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
