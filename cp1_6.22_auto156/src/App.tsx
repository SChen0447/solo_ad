import { useEffect, useState } from 'react';
import { GameProvider, useGame } from './store/store';
import { Background } from './ui/Background';
import { DialoguePanel } from './ui/DialoguePanel';
import { SettingsPanel } from './ui/SettingsPanel';
import { EndingStats } from './ui/EndingStats';
import { loadScene, Choice, SceneData } from './engine/engine';

function Game() {
  const { state, dispatch } = useGame();
  const [scene, setScene] = useState<SceneData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchScene = async () => {
      setIsLoading(true);
      try {
        const sceneData = await loadScene(state.currentSceneId);
        setScene(sceneData);
        if (sceneData.isEnding) {
          dispatch({
            type: 'SET_SCENE',
            sceneId: sceneData.id,
            isEnding: true,
            endingType: sceneData.endingType
          });
        }
      } catch (error) {
        console.error('Failed to load scene:', error);
      }
      setIsLoading(false);
    };

    fetchScene();
  }, [state.currentSceneId, dispatch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dispatch({ type: 'TOGGLE_SETTINGS' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch]);

  const handleNextDialogue = () => {
    dispatch({ type: 'NEXT_DIALOGUE' });
  };

  const handleChoiceSelect = (choice: Choice) => {
    const choiceRecord = {
      sceneId: state.currentSceneId,
      choiceId: choice.id,
      choiceText: choice.text,
      timestamp: Date.now()
    };
    dispatch({ type: 'ADD_CHOICE', choice: choiceRecord });
    
    if (scene?.isEnding) {
      dispatch({ type: 'SHOW_ENDING_STATS' });
    } else {
      dispatch({ type: 'SET_SCENE', sceneId: choice.nextScene });
    }
  };

  const handleRestart = () => {
    dispatch({ type: 'RESET_GAME' });
  };

  const handleSettingsClick = () => {
    dispatch({ type: 'TOGGLE_SETTINGS', open: true });
  };

  const checkHesitantAchievement = () => {
    if (state.choiceStartTime) {
      const elapsed = Date.now() - state.choiceStartTime;
      if (elapsed > 10000) {
        const saved = localStorage.getItem('achievements');
        const achievements: string[] = saved ? JSON.parse(saved) : [];
        if (!achievements.includes('hesitant')) {
          achievements.push('hesitant');
          localStorage.setItem('achievements', JSON.stringify(achievements));
        }
      }
    }
  };

  const showEndingStats = state.isEnding && state.showEndingStats;

  if (isLoading || !scene) {
    return (
      <div className="game-container loading">
        <div className="loading-text">加载中...</div>
      </div>
    );
  }

  return (
    <div className="game-container" onClick={checkHesitantAchievement}>
      <Background backgroundId={scene.background} />
      
      <div className="game-header">
        <div className="scene-title">{scene.title}</div>
        <button className="settings-btn" onClick={handleSettingsClick}>
          ⚙️
        </button>
      </div>

      <div className="game-main">
        <DialoguePanel
          scene={scene}
          dialogueIndex={state.dialogueIndex}
          onNextDialogue={handleNextDialogue}
          onChoiceSelect={handleChoiceSelect}
        />
      </div>

      <SettingsPanel sceneTitle={scene.title} />

      {showEndingStats && (
        <EndingStats
          choiceHistory={state.choiceHistory}
          endingType={state.endingType}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <GameProvider>
      <Game />
    </GameProvider>
  );
}

export default App;
