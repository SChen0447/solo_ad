import { useState, useEffect, useCallback, useRef } from 'react';
import TimerPanel from './components/TimerPanel';
import IdeaInput from './components/IdeaInput';
import IdeaBoard from './components/IdeaBoard';
import { getTimerState, startTimer, resetTimer } from './services/timeService';
import { getIdeas, submitIdea, groupIdeas, getAllIdeasWithNames } from './services/ideaService';
import { playEndSound } from './utils/audio';
import type { TimerState, Idea, Group, IdeaWithName } from './types';

function App() {
  const [timerState, setTimerState] = useState<TimerState>({
    remaining: 0,
    duration: 0,
    isRunning: false,
    isLocked: false,
  });
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [participantName, setParticipantName] = useState('');
  const hasPlayedSoundRef = useRef(false);
  const prevIsLockedRef = useRef(false);

  const fetchTimerState = useCallback(async () => {
    try {
      const state = await getTimerState();
      setTimerState(state);
      
      if (state.isLocked && !prevIsLockedRef.current && !hasPlayedSoundRef.current) {
        playEndSound();
        hasPlayedSoundRef.current = true;
      }
      prevIsLockedRef.current = state.isLocked;
      
      if (!state.isLocked) {
        hasPlayedSoundRef.current = false;
      }
    } catch (error) {
      console.error('Failed to fetch timer:', error);
    }
  }, []);

  const fetchIdeas = useCallback(async () => {
    try {
      const ideasList = await getIdeas();
      setIdeas(ideasList);
    } catch (error) {
      console.error('Failed to fetch ideas:', error);
    }
  }, []);

  useEffect(() => {
    fetchTimerState();
    fetchIdeas();
  }, [fetchTimerState, fetchIdeas]);

  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchTimerState();
      fetchIdeas();
    }, 1000);
    
    return () => clearInterval(pollInterval);
  }, [fetchTimerState, fetchIdeas]);

  const handleStartTimer = async (duration: number) => {
    try {
      setIsLoading(true);
      const newState = await startTimer(duration);
      setTimerState(newState);
      setGroups([]);
      hasPlayedSoundRef.current = false;
      prevIsLockedRef.current = false;
    } catch (error) {
      console.error('Failed to start timer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetTimer = async () => {
    try {
      setIsLoading(true);
      const newState = await resetTimer();
      setTimerState(newState);
      setIdeas([]);
      setGroups([]);
      hasPlayedSoundRef.current = false;
      prevIsLockedRef.current = false;
    } catch (error) {
      console.error('Failed to reset timer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitIdea = async (content: string, name: string) => {
    try {
      setIsLoading(true);
      const newIdea = await submitIdea(content, name);
      setIdeas(prev => [...prev, newIdea]);
      return true;
    } catch (error) {
      console.error('Failed to submit idea:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleRandomGroup = async (groupSize: number) => {
    try {
      setIsLoading(true);
      const newGroups = await groupIdeas(groupSize);
      setGroups(newGroups);
    } catch (error) {
      console.error('Failed to group ideas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportMarkdown = async () => {
    try {
      setIsLoading(true);
      const allIdeas: IdeaWithName[] = await getAllIdeasWithNames();
      
      let markdown = '# Brainstorm Ideas\n\n';
      markdown += `**Date**: ${new Date().toLocaleString()}\n\n`;
      markdown += `**Total Ideas**: ${allIdeas.length}\n\n`;
      markdown += '---\n\n';
      
      allIdeas.forEach((idea) => {
        markdown += `## #${idea.number}\n\n`;
        markdown += `${idea.content}\n\n`;
        markdown += `*Submitted by: ${idea.participantName} at ${new Date(idea.createdAt).toLocaleTimeString()}*\n\n`;
      });
      
      if (groups.length > 0) {
        markdown += '---\n\n';
        markdown += '# Groups\n\n';
        groups.forEach((group, index) => {
          markdown += `## Group ${index + 1}\n\n`;
          group.forEach(idea => {
            markdown += `- #${idea.number}: ${idea.content}\n`;
          });
          markdown += '\n';
        });
      }
      
      await navigator.clipboard.writeText(markdown);
      return true;
    } catch (error) {
      console.error('Failed to export markdown:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearGroups = () => {
    setGroups([]);
  };

  return (
    <div className="app-container">
      <div className="content-wrapper">
        <header className="app-header">
          <h1 className="app-title">Brainstorm Timer</h1>
        </header>
        
        <TimerPanel
          timerState={timerState}
          onStartTimer={handleStartTimer}
          onResetTimer={handleResetTimer}
          isLoading={isLoading}
        />
        
        <IdeaInput
          isLocked={timerState.isLocked}
          onSubmit={handleSubmitIdea}
          participantName={participantName}
          onNameChange={setParticipantName}
          isLoading={isLoading}
        />
        
        <IdeaBoard
          ideas={ideas}
          groups={groups}
          onRandomGroup={handleRandomGroup}
          onExportMarkdown={handleExportMarkdown}
          onClearGroups={handleClearGroups}
          isLoading={isLoading}
        />
      </div>
      
      <style>{`
        .app-container {
          min-height: 100vh;
          padding: 20px;
          position: relative;
        }
        
        .content-wrapper {
          max-width: 1100px;
          margin: 0 auto;
        }
        
        .app-header {
          text-align: center;
          margin-bottom: 30px;
        }
        
        .app-title {
          color: #263238;
          font-size: 24px;
          font-weight: 600;
        }
        
        @media (max-width: 768px) {
          .app-container {
            padding: 15px;
          }
          
          .app-title {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
