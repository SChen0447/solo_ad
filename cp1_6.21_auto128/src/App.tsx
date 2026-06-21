import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Photo, Filter, AppContextType, AppState } from '@/types';
import { mockPhotos } from '@/data/mockPhotos';
import Timeline from '@/components/Timeline';
import PhotoModal from '@/components/PhotoModal';
import './index.css';

const AppContext = createContext<AppContextType | null>(null);

export function useAppContext(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppContext.Provider');
  return ctx;
}

const initialState: AppState = {
  photos: mockPhotos,
  selectedPhoto: null,
  selectedPhotoRect: null,
  filter: { year: null, tag: null },
  currentYear: null,
};

export default function App() {
  const [photos] = useState<Photo[]>(initialState.photos);
  const [selectedPhoto, setSelectedPhotoState] = useState<Photo | null>(null);
  const [selectedPhotoRect, setSelectedPhotoRect] = useState<DOMRect | null>(null);
  const [filter, setFilter] = useState<Filter>(initialState.filter);
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  const setSelectedPhoto = useCallback((photo: Photo | null, rect?: DOMRect | null) => {
    setSelectedPhotoState(photo);
    setSelectedPhotoRect(rect ?? null);
  }, []);

  const contextValue = useMemo<AppContextType>(
    () => ({
      photos,
      selectedPhoto,
      selectedPhotoRect,
      filter,
      currentYear,
      setPhotos: () => {},
      setSelectedPhoto,
      setFilter,
      setCurrentYear,
    }),
    [photos, selectedPhoto, selectedPhotoRect, filter, currentYear, setSelectedPhoto]
  );

  const filteredPhotos = useMemo(() => {
    return photos.filter((photo) => {
      if (filter.year && new Date(photo.date).getFullYear() !== filter.year) return false;
      if (filter.tag && !photo.tags.includes(filter.tag)) return false;
      return true;
    });
  }, [photos, filter]);

  return (
    <AppContext.Provider value={contextValue}>
      <div className="app-root">
        <Timeline photos={filteredPhotos} allPhotos={photos} />
        {selectedPhoto && (
          <PhotoModal
            photo={selectedPhoto}
            originRect={selectedPhotoRect}
            onClose={() => setSelectedPhoto(null)}
          />
        )}
      </div>
    </AppContext.Provider>
  );
}
