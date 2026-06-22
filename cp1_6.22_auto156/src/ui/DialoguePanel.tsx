import { useState, useEffect, useCallback } from 'react';
import { SceneData, DialogueLine, Choice } from '../engine/engine';
import { CharacterAvatar } from './CharacterAvatar';
import { TypewriterText } from './TypewriterText';
import { ChoiceButton } from './ChoiceButton';
import { useGame } from '../store/store';

interface DialoguePanelProps {
  scene: SceneData;
  dialogueIndex: number;
  onNextDialogue: () => void;
  onChoiceSelect: (choice: Choice) => void;
}

export function DialoguePanel({ scene, dialogueIndex, onNextDialogue, onChoiceSelect }: DialoguePanelProps) {
  const { dispatch } = useGame();
  const [isTyping, setIsTyping] = useState(true);
  const [showChoices, setShowChoices] = useState(false);
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<number | null>(null);

  const currentDialogue: DialogueLine | null = dialogueIndex < scene.dialogues.length
    ? scene.dialogues[dialogueIndex]
    : null;

  const isLastDialogue = dialogueIndex >= scene.dialogues.length - 1;
  const hasChoices = scene.choices.length > 0;

  const handleTypingComplete = useCallback(() => {
    setIsTyping(false);
    
    if (!isLastDialogue) {
      const timer = window.setTimeout(() => {
        onNextDialogue();
      }, 500);
      setAutoAdvanceTimer(timer);
    } else if (hasChoices) {
      setTimeout(() => {
        setShowChoices(true);
        dispatch({ type: 'START_CHOICE_TIMER' });
      }, 500);
    }
  }, [isLastDialogue, hasChoices, onNextDialogue, dispatch]);

  useEffect(() => {
    setIsTyping(true);
    setShowChoices(false);
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }
  }, [dialogueIndex, scene.id]);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer);
      }
    };
  }, [autoAdvanceTimer]);

  const handlePanelClick = () => {
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      setAutoAdvanceTimer(null);
    }

    if (isTyping) {
      return;
    }

    if (!isLastDialogue) {
      onNextDialogue();
    }
  };

  const handleChoiceClick = (choice: Choice) => {
    setShowChoices(false);
    onChoiceSelect(choice);
  };

  if (!currentDialogue) return null;

  return (
    <div className="dialogue-panel" onClick={handlePanelClick}>
      <div className="dialogue-content">
        <div className="avatar-section">
          <CharacterAvatar
            characterId={currentDialogue.characterId}
            expression={currentDialogue.expression}
          />
        </div>
        
        <div className="text-section">
          <div className="dialogue-text">
            <TypewriterText
              text={currentDialogue.text}
              speed={80}
              onComplete={handleTypingComplete}
              isActive={true}
            />
          </div>
          
          {!isTyping && !isLastDialogue && (
            <div className="continue-indicator">▼ 点击继续</div>
          )}
        </div>
      </div>

      {showChoices && hasChoices && (
        <div className="choices-section">
          {scene.choices.map((choice, index) => (
            <ChoiceButton
              key={choice.id}
              choice={choice}
              index={index}
              onClick={handleChoiceClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
