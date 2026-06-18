import { useEffect, useMemo } from 'react';
import { useArtifactStore } from './store/artifactStore';
import SceneViewer from './components/SceneViewer';
import ArtifactUI from './components/ArtifactUI';

export default function App() {
  const {
    artifacts,
    currentArtifactId,
    activeHotspotId,
    isLoading,
    loadArtifacts,
    selectArtifact,
    setActiveHotspot
  } = useArtifactStore();

  useEffect(() => {
    loadArtifacts();
  }, [loadArtifacts]);

  const currentArtifact = useMemo(
    () => artifacts.find(a => a.id === currentArtifactId) ?? null,
    [artifacts, currentArtifactId]
  );

  const activeHotspot = useMemo(() => {
    if (!currentArtifact || !activeHotspotId) return null;
    return currentArtifact.hotspots.find(h => h.id === activeHotspotId) ?? null;
  }, [currentArtifact, activeHotspotId]);

  return (
    <div className="app-container">
      <SceneViewer
        artifact={currentArtifact}
        activeHotspotId={activeHotspotId}
        onHotspotClick={setActiveHotspot}
      />
      <ArtifactUI
        artifacts={artifacts}
        currentArtifact={currentArtifact}
        activeHotspot={activeHotspot}
        isLoading={isLoading}
        onSelectArtifact={selectArtifact}
        onCloseHotspot={() => setActiveHotspot(null)}
      />
    </div>
  );
}
