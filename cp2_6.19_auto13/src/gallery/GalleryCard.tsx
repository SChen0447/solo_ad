import { Heart, MessageCircle, Eye } from 'lucide-react';
import type { Painting } from '@/data/mockData';
import { useGalleryStore } from '@/store/galleryStore';

interface GalleryCardProps {
  painting: Painting;
  onClick: () => void;
}

export default function GalleryCard({ painting, onClick }: GalleryCardProps) {
  const toggleCollection = useGalleryStore((s) => s.toggleCollection);
  const isCollected = useGalleryStore((s) => s.isCollected(painting.id));

  const collected = isCollected;

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleCollection(painting.id);
  };

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer rounded-card bg-gallery-card overflow-hidden
        transition-all duration-300 ease-out
        hover:-translate-y-[5px] hover:shadow-[0_8px_25px_rgba(0,0,0,0.5)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={painting.imageUrl}
          alt={painting.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gallery-card/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Eye size={16} className="text-gallery-text/70" />
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-display text-lg font-semibold text-gallery-text leading-tight truncate">
          {painting.title}
        </h3>
        <p className="mt-1 text-sm text-gallery-muted font-body">{painting.author}</p>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-sm text-gallery-muted">
              <Heart size={14} />
              {painting.likes}
            </span>
            <span className="flex items-center gap-1 text-sm text-gallery-muted">
              <MessageCircle size={14} />
              {painting.commentCount}
            </span>
          </div>

          <button
            onClick={handleHeartClick}
            className="p-1.5 rounded-full transition-colors duration-200
              hover:bg-gallery-accent/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-gallery-accent"
            aria-label={collected ? '取消收藏' : '收藏'}
          >
            <Heart
              size={20}
              className={`transition-colors duration-200 ${
                collected
                  ? 'fill-gallery-accent text-gallery-accent'
                  : 'text-gallery-muted hover:text-gallery-accent'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
