import { useState } from 'react';
import { Choice } from '../engine/engine';

interface ChoiceButtonProps {
  choice: Choice;
  index: number;
  onClick: (choice: Choice) => void;
  disabled?: boolean;
}

export function ChoiceButton({ choice, index, onClick, disabled = false }: ChoiceButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = () => {
    if (disabled || isClicked) return;
    setIsClicked(true);
    setIsPressed(true);
    setTimeout(() => {
      setIsPressed(false);
      onClick(choice);
    }, 150);
  };

  return (
    <button
      className={`choice-button ${isPressed ? 'pressed' : ''} ${isClicked ? 'clicked' : ''}`}
      onClick={handleClick}
      disabled={disabled || isClicked}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {choice.text}
    </button>
  );
}
