import { Heart, ChevronDown, ChevronUp } from 'lucide-react';
import { useGalleryStore } from '@/store/galleryStore';
import { useState } from 'react';

interface CollectionPanelProps {
  isMobile?: boolean;
}

export default function CollectionPanel({ isMobile = false }: CollectionPanelProps) {
  const collectedPaintings = useGalleryStore((s) => s.getCollectedPaintings());
  const toggleCollection = useGalleryStore((s) => s.toggleCollection);
  const selectPainting = useGalleryStore((s) => s.selectPainting);
  const [expanded, setExpanded] = useState(false);

  if (isMobile) {
    return (
      <div className="relative">
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-3 rounded-full bg-gallery-card border border-gallery-deep/40 shadow-lg
            text-gallery-text hover:bg-gallery-accent/10 transition-colors"
        >
          <Heart
            size={20}
            className={collectedPaintings.length > 0 ? 'fill-gallery-accent text-gallery-accent' : ''}
          />
          {collectedPaintings.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gallery-accent text-[10px] text-white flex items-center justify-center">
              {collectedPaintings.length}
            </span>
          )}
        </button>

        {expanded && (
          <div className="absolute bottom-14 right-0 w-72 max-h-80 overflow-y-auto bg-gallery-card rounded-card border border-gallery-deep/40 shadow-xl p-4">
            <h3 className="font-display text-base font-semibold text-gallery-text mb-3">
              我的收藏 ({collectedPaintings.length})
            </h3>
            {collectedPaintings.length === 0 ? (
              <p className="text-sm text-gallery-muted text-center py-4">还没有收藏画作</p>
            ) : (
              <ul className="space-y-2">
                {collectedPaintings.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gallery-bg/50 cursor-pointer transition-colors"
                  >
                    <img src={p.imageUrl} alt={p.title} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0" onClick={() => { selectPainting(p.id); setExpanded(false); }}>
                      <p className="text-sm text-gallery-text truncate">{p.title}</p>
                      <p className="text-xs text-gallery-muted">{p.author}</p>
                    </div>
                    <button
                      onClick={() => toggleCollection(p.id)}
                      className="p-1 text-gallery-accent hover:bg-gallery-accent/10 rounded"
                    >
                      <Heart size={14} className="fill-gallery-accent" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gallery-card rounded-card p-5 border border-gallery-deep/20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-semibold text-gallery-text flex items-center gap-2">
          <Heart size={18} className="text-gallery-accent" />
          我的收藏
        </h3>
        <span className="text-xs text-gallery-muted bg-gallery-bg/50 px-2 py-0.5 rounded-full">
          {collectedPaintings.length}
        </span>
      </div>

      {collectedPaintings.length === 0 ? (
        <div className="text-center py-8">
          <Heart size={32} className="mx-auto text-gallery-muted/30 mb-2" />
          <p className="text-sm text-gallery-muted">还没有收藏画作</p>
          <p className="text-xs text-gallery-muted/60 mt-1">点击卡片右下角的 ♥ 收藏</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {collectedPaintings.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gallery-bg/50 cursor-pointer transition-colors group"
            >
              <img
                src={p.imageUrl}
                alt={p.title}
                className="w-12 h-12 rounded-lg object-cover flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
              />
              <div
                className="flex-1 min-w-0"
                onClick={() => selectPainting(p.id)}
              >
                <p className="text-sm font-medium text-gallery-text truncate">{p.title}</p>
                <p className="text-xs text-gallery-muted">{p.author}</p>
              </div>
              <button
                onClick={() => toggleCollection(p.id)}
                className="p-1.5 text-gallery-accent hover:bg-gallery-accent/10 rounded transition-colors"
                aria-label="取消收藏"
              >
                <Heart size={14} className="fill-gallery-accent" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
