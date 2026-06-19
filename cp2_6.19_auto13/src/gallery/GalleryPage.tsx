import { useState } from 'react';
import { X, Heart } from 'lucide-react';
import GalleryCard from './GalleryCard';
import { useGalleryStore } from '@/store/galleryStore';
import CollectionPanel from '@/collection/CollectionPanel';
import RankingBar from '@/ranking/RankingBar';
import CommentSection from '@/comments/CommentSection';

export default function GalleryPage() {
  const paintings = useGalleryStore((s) => s.paintings);
  const selectedPaintingId = useGalleryStore((s) => s.selectedPaintingId);
  const selectPainting = useGalleryStore((s) => s.selectPainting);
  const toggleCollection = useGalleryStore((s) => s.toggleCollection);
  const isCollected = useGalleryStore((s) => s.isCollected);
  const [heartAnimating, setHeartAnimating] = useState(false);

  const selectedPainting = paintings.find((p) => p.id === selectedPaintingId) ?? null;
  const panelOpen = selectedPaintingId !== null;

  const handleToggleCollect = (paintingId: string) => {
    setHeartAnimating(true);
    window.setTimeout(() => setHeartAnimating(false), 200);
    toggleCollection(paintingId);
  };

  return (
    <div className="min-h-screen bg-gallery-bg font-body">
      <header className="sticky top-0 z-30 bg-gallery-bg/90 backdrop-blur-md border-b border-gallery-deep/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-display text-3xl font-bold text-gallery-text tracking-wide">
                Virtual Gallery
              </h1>
              <p className="text-sm text-gallery-muted mt-0.5">沉浸式在线画展</p>
            </div>
          </div>
          <RankingBar />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paintings.map((painting) => (
                <GalleryCard
                  key={painting.id}
                  painting={painting}
                  onClick={() => selectPainting(painting.id)}
                />
              ))}
            </div>
          </div>

          <aside className="hidden lg:block w-72 flex-shrink-0">
            <CollectionPanel />
          </aside>
        </div>
      </main>

      {panelOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 animate-overlay-in"
            onClick={() => selectPainting(null)}
          />
          <div className="fixed top-0 right-0 z-50 h-full w-[400px] max-w-full bg-gallery-bg border-l border-gallery-deep/30 animate-slide-in overflow-y-auto">
            {selectedPainting && (
              <div className="p-6">
                <button
                  onClick={() => selectPainting(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-gallery-card text-gallery-muted hover:text-gallery-text transition-colors z-10"
                >
                  <X size={20} />
                </button>

                <img
                  src={selectedPainting.imageUrl}
                  alt={selectedPainting.title}
                  className="w-full rounded-card object-cover mb-5"
                />

                <h2 className="font-display text-2xl font-bold text-gallery-text">
                  {selectedPainting.title}
                </h2>
                <p className="text-gallery-muted mt-1">{selectedPainting.author}</p>

                <div className="flex items-center gap-4 mt-4">
                  <span className="flex items-center gap-1.5 text-sm text-gallery-muted">
                    <Heart size={16} />
                    {selectedPainting.likes} 点赞
                  </span>
                  <span className="flex items-center gap-1.5 text-sm text-gallery-muted">
                    · {selectedPainting.commentCount} 评论
                  </span>
                </div>

                <button
                  onClick={() => handleToggleCollect(selectedPainting.id)}
                  className={`mt-4 w-full py-2.5 rounded-card font-medium text-sm transition-all duration-200 ease-out flex items-center justify-center gap-2 scale-100
                    ${heartAnimating ? 'animate-heart-pop' : ''}
                    ${
                      isCollected(selectedPainting.id)
                        ? 'bg-[#e94560]/20 text-[#e94560] border border-[#e94560]/40'
                        : 'bg-gallery-card text-gallery-muted border border-gallery-deep/40 hover:border-[#e94560]/40 hover:text-[#e94560]'
                    }`}
                >
                  <Heart
                    size={16}
                    className={
                      isCollected(selectedPainting.id)
                        ? 'fill-[#e94560] text-[#e94560]'
                        : ''
                    }
                  />
                  {isCollected(selectedPainting.id) ? '已收藏' : '收藏此画作'}
                </button>

                <div className="mt-6 border-t border-gallery-deep/30 pt-6">
                  <CommentSection paintingId={selectedPainting.id} />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <div className="lg:hidden fixed bottom-4 right-4 z-30">
        <CollectionPanel isMobile />
      </div>
    </div>
  );
}
