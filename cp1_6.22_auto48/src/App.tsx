import React, { useState, useEffect } from 'react';
import { StoryProvider, useStoryStore } from '@/store';
import Timeline from '@/components/Timeline';
import ToolPanel from '@/components/ToolPanel';
import Preview, { ShareView } from '@/components/Preview';
import { injectKeyframes } from '@/utils/animation';
import { parseShareUrl } from '@/utils/storage';
import { StoryNode, Story } from '@/types';

const AppContent: React.FC<{ isShareMode: boolean; sharedStory?: Story }> = ({
  isShareMode,
  sharedStory,
}) => {
  const { mode, setMode } = useStoryStore();
  const [nodePositions, setNodePositions] = useState<StoryNode[]>([]);

  useEffect(() => {
    injectKeyframes();
  }, []);

  useEffect(() => {
    if (isShareMode) {
      setMode('share');
    }
  }, [isShareMode, setMode]);

  if (mode === 'preview' || mode === 'share') {
    if (isShareMode && sharedStory) {
      return <ShareView />;
    }
    return <Preview />;
  }

  return (
    <div className="app">
      <ToolPanel nodePositions={nodePositions} />
      <div className="main-content">
        <Timeline onNodePositionsChange={setNodePositions} />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isShareMode, setIsShareMode] = useState(false);
  const [sharedStory, setSharedStory] = useState<Story | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const story = parseShareUrl();
    if (story) {
      setIsShareMode(true);
      setSharedStory(story);
    }
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="app-loading">加载中...</div>;
  }

  return (
    <StoryProvider initialStory={sharedStory}>
      <AppContent isShareMode={isShareMode} sharedStory={sharedStory} />
    </StoryProvider>
  );
};

export default App;
