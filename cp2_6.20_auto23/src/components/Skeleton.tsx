import React from 'react';

export const ArtistCardSkeleton: React.FC = () => (
  <div style={{ width: 180, display: 'flex', flexDirection: 'column', gap: 10 }}>
    <div className="skeleton skeleton-lg" style={{ width: 180, height: 180 }} />
    <div className="skeleton" style={{ height: 16, width: '80%' }} />
    <div className="skeleton skeleton-sm" style={{ height: 12, width: '50%' }} />
    <div className="skeleton skeleton-sm" style={{ height: 10, width: '60%' }} />
  </div>
);

export const ArtistsGridSkeleton: React.FC = () => (
  <div className="artists-grid">
    {Array.from({ length: 6 }).map((_, i) => (
      <ArtistCardSkeleton key={i} />
    ))}
  </div>
);

export const RowSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="skeleton" style={{ height: 48, width: '100%' }} />
    ))}
  </div>
);

export const SectionSkeleton: React.FC = () => (
  <div className="section-card">
    <div className="skeleton" style={{ height: 20, width: 120, marginBottom: 18 }} />
    <RowSkeleton count={4} />
  </div>
);

export const DetailHeaderSkeleton: React.FC = () => (
  <div className="detail-header">
    <div className="skeleton skeleton-lg" style={{ width: 140, height: 140, flexShrink: 0 }} />
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="skeleton" style={{ height: 32, width: 240 }} />
      <div style={{ display: 'flex', gap: 6 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton skeleton-sm" style={{ height: 22, width: 72 }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: 16, width: '100%' }} />
      <div className="skeleton" style={{ height: 16, width: '80%' }} />
    </div>
  </div>
);
