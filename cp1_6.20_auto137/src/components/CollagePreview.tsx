import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDiaryStore } from '../store';
import { EMOTION_CONFIG, COLLAGE_TEMPLATES } from '../types';
import { ArrowLeft, Download, Trash2 } from 'lucide-react';
import { toPng } from 'html-to-image';

export default function CollagePreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentDiary, loadDiary, deleteDiary } = useDiaryStore();
  const [isDownloading, setIsDownloading] = useState(false);
  const collageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      loadDiary(id);
    }
  }, [id, loadDiary]);

  if (!currentDiary) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">日记不存在或加载中...</p>
          <button
            onClick={() => navigate('/')}
            className="btn-bounce px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const emotionConfig = EMOTION_CONFIG[currentDiary.emotion];
  const templateConfig = COLLAGE_TEMPLATES.find(t => t.key === currentDiary.template);

  const handleDownload = async () => {
    if (!collageRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(collageRef.current, {
        width: 1920,
        height: 1080,
        pixelRatio: 1,
      });
      const link = document.createElement('a');
      link.download = `灵感画布_${currentDiary.createdAt.slice(0, 10)}_${emotionConfig.label}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // fallback: open collage URL directly
      if (currentDiary.collageUrl) {
        const link = document.createElement('a');
        link.download = `灵感画布_${currentDiary.createdAt.slice(0, 10)}_${emotionConfig.label}.png`;
        link.href = currentDiary.collageUrl;
        link.click();
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    await deleteDiary(id);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-30 bg-cream/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="btn-bounce flex items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">返回画廊</span>
          </button>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDelete}
              className="btn-bounce p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={18} />
            </motion.button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl overflow-hidden shadow-card-hover"
              ref={collageRef}
              style={{
                background: emotionConfig.gradient,
                aspectRatio: '16/9',
              }}
            >
              {currentDiary.collageUrl ? (
                <img
                  src={currentDiary.collageUrl}
                  alt="拼贴画"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute rounded-full"
                        style={{
                          width: `${60 + Math.random() * 100}px`,
                          height: `${60 + Math.random() * 100}px`,
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                          background: 'rgba(255,255,255,0.3)',
                          filter: 'blur(30px)',
                        }}
                      />
                    ))}
                  </div>
                  <div className="relative text-center text-white p-8">
                    <div className="text-6xl mb-4">{emotionConfig.emoji}</div>
                    <h2 className="font-display text-3xl mb-2">{emotionConfig.label}</h2>
                    <p className="text-white/80 text-sm max-w-xs mx-auto">{currentDiary.text}</p>
                    <div className="flex gap-3 justify-center mt-4">
                      {currentDiary.emojis.map((e, i) => (
                        <span key={i} className="text-3xl">{e.emoji}</span>
                      ))}
                    </div>
                  </div>
                  {templateConfig && (
                    <div className="absolute bottom-3 right-3 text-white/40 text-xs">
                      {templateConfig.label}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>

          <div className="md:w-[280px] space-y-4">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/70 rounded-2xl p-4 shadow-card space-y-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{emotionConfig.emoji}</span>
                <span className="font-display text-lg" style={{ color: emotionConfig.color }}>
                  {emotionConfig.label}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                {new Date(currentDiary.createdAt).toLocaleDateString('zh-CN', {
                  year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
                })}
              </div>
              <p className="text-gray-700 text-sm leading-relaxed">{currentDiary.text}</p>
              {currentDiary.emojis.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {currentDiary.emojis.map((e, i) => (
                    <span key={i} className="text-2xl">{e.emoji}</span>
                  ))}
                </div>
              )}
              {templateConfig && (
                <div className="text-xs text-gray-400 pt-1">
                  模板：{templateConfig.label}
                </div>
              )}
            </motion.div>

            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDownload}
              disabled={isDownloading}
              className="btn-bounce w-full py-3 rounded-2xl text-white font-medium flex items-center justify-center gap-2 shadow-card hover:shadow-card-hover disabled:opacity-50"
              style={{ background: emotionConfig.gradient }}
            >
              <Download size={18} />
              {isDownloading ? '下载中...' : '下载 PNG'}
            </motion.button>

            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/diary/new')}
              className="btn-bounce w-full py-3 rounded-2xl text-gray-600 font-medium flex items-center justify-center gap-2 bg-white/60 shadow-card hover:shadow-card-hover"
            >
              再写一篇
            </motion.button>
          </div>
        </div>
      </main>
    </div>
  );
}
