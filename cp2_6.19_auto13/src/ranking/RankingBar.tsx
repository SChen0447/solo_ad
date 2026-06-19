import { useGalleryStore } from '@/store/galleryStore';
import { useMemo } from 'react';

export default function RankingBar() {
  const paintings = useGalleryStore((s) => s.paintings);
  const selectPainting = useGalleryStore((s) => s.selectPainting);

  const ranked = useMemo(() => {
    return [...paintings].sort((a, b) => b.likes - a.likes);
  }, [paintings]);

  const maxLikes = ranked.length > 0 ? ranked[0].likes : 1;

  return (
    <div className="w-full">
      <h2 className="text-sm font-medium text-gallery-muted mb-3 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-gallery-accent" />
        热度排行
      </h2>
      <div className="flex items-end gap-2 h-28 overflow-x-auto pb-1">
        {ranked.map((painting, index) => {
          const heightPercent = (painting.likes / maxLikes) * 100;
          const minHeight = 16;
          const barHeight = Math.max(minHeight, heightPercent);

          return (
            <div
              key={painting.id}
              className="flex flex-col items-center flex-shrink-0 group cursor-pointer"
              style={{ width: `${100 / ranked.length}%`, maxWidth: '64px', minWidth: '32px' }}
              onClick={() => selectPainting(painting.id)}
            >
              <span className="text-[10px] text-gallery-muted group-hover:text-gallery-accent transition-colors mb-1 whitespace-nowrap">
                {painting.likes}
              </span>
              <div
                className="w-full rounded-t-md animate-bar-bounce-in origin-bottom group-hover:opacity-90 transition-opacity"
                style={{
                  height: `${barHeight}%`,
                  background: `linear-gradient(to top, #0f3460, #e94560)`,
                  animationDelay: `${index * 0.1}s`,
                  opacity: 0,
                  borderRadius: '6px 6px 0 0',
                  minHeight: `${minHeight}px`,
                }}
              />
              <span
                className="text-[10px] text-gallery-muted group-hover:text-gallery-text mt-1.5 truncate w-full text-center transition-colors"
                title={painting.title}
              >
                {painting.title.length > 3 ? painting.title.slice(0, 3) + '…' : painting.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
