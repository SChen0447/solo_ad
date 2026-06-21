export interface Photo {
  id: string;
  url: string;
  date: string;
  title: string;
  tags: string[];
  description: string;
}

export interface Filter {
  year: number | null;
  tag: string | null;
}

export interface AppState {
  photos: Photo[];
  selectedPhoto: Photo | null;
  selectedPhotoRect: DOMRect | null;
  filter: Filter;
  currentYear: number | null;
}

export interface AppContextType extends AppState {
  setPhotos: (photos: Photo[]) => void;
  setSelectedPhoto: (photo: Photo | null, rect?: DOMRect | null) => void;
  setFilter: (filter: Filter) => void;
  setCurrentYear: (year: number | null) => void;
}
