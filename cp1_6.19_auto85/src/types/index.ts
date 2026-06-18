export interface Hotspot {
  id: string;
  position: [number, number, number];
  title: string;
  description: string;
}

export interface Artifact {
  id: string;
  name: string;
  dynasty: string;
  material: string;
  description: string;
  modelType: 'bronze-ding' | 'blue-porcelain' | 'jade-disc' | 'sancai-horse';
  hotspots: Hotspot[];
}

export interface ArtifactStoreState {
  artifacts: Artifact[];
  currentArtifactId: string | null;
  activeHotspotId: string | null;
  isLoading: boolean;
  loadArtifacts: () => void;
  selectArtifact: (id: string) => void;
  setActiveHotspot: (id: string | null) => void;
}
