import React, { useState, useCallback } from 'react';
import { IdeaCanvas } from './components/IdeaCanvas';
import { AnalysisPanel } from './components/AnalysisPanel';
import { useCardManager } from './hooks/useCardManager';
import { useClusterEngine } from './hooks/useClusterEngine';

const App: React.FC = () => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const {
    cards,
    connections,
    addCard,
    removeCard,
    toggleStar,
    updateCardPosition,
    updateAllPositions,
    addConnection,
    updateCardGroups,
    resetGroups
  } = useCardManager();

  const {
    isLoading,
    groups,
    getClusters,
    clearClusters,
    getGroupColor
  } = useClusterEngine();

  const handleClusterByTags = useCallback(async () => {
    const texts = cards.map(c => c.text);
    const result = await getClusters(texts, 'tags');
    if (result) {
      updateCardGroups(result.clusters);
    }
  }, [cards, getClusters, updateCardGroups]);

  const handleClusterBySimilarity = useCallback(async () => {
    const texts = cards.map(c => c.text);
    const result = await getClusters(texts, 'similarity');
    if (result) {
      updateCardGroups(result.clusters);
    }
  }, [cards, getClusters, updateCardGroups]);

  const handleResetLayout = useCallback(() => {
    clearClusters();
    resetGroups();
  }, [clearClusters, resetGroups]);

  return (
    <div className="app-container">
      <div className="app-header">
        <h1>💡 团队创意生成与可视化分类</h1>
        <p className="subtitle">收集想法，发现关联，激发创意</p>
      </div>

      <IdeaCanvas
        cards={cards}
        connections={connections}
        groups={groups}
        onAddCard={addCard}
        onRemoveCard={removeCard}
        onToggleStar={toggleStar}
        onUpdateCardPosition={updateCardPosition}
        onUpdateAllPositions={updateAllPositions}
        onAddConnection={addConnection}
        onClusterByTags={handleClusterByTags}
        onClusterBySimilarity={handleClusterBySimilarity}
        onResetLayout={handleResetLayout}
        isClustering={isLoading}
        getGroupColor={getGroupColor}
      />

      <button
        className={`analysis-toggle ${isPanelOpen ? 'active' : ''}`}
        onClick={() => setIsPanelOpen(true)}
        title="打开分析面板"
      >
        📊
      </button>

      <AnalysisPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        cards={cards}
        groups={groups}
      />
    </div>
  );
};

export default App;
