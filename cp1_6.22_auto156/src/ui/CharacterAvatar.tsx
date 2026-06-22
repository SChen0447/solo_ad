import { useEffect, useState } from 'react';
import { getCharacterExpression, characterEmojis, characters } from '../characters/data';

interface CharacterAvatarProps {
  characterId: string;
  expression: string;
  size?: 'small' | 'normal';
}

export function CharacterAvatar({ characterId, expression, size = 'normal' }: CharacterAvatarProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [currentExpr, setCurrentExpr] = useState(expression);
  const bgGradient = getCharacterExpression(characterId, currentExpr);
  const emoji = characterEmojis[characterId] || '👤';
  const name = characters[characterId]?.name || '';

  useEffect(() => {
    if (expression !== currentExpr) {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setCurrentExpr(expression);
        setIsVisible(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [expression, currentExpr]);

  const avatarSize = size === 'normal' ? 80 : 50;
  const fontSize = size === 'normal' ? 32 : 20;

  return (
    <div className="character-avatar-wrapper">
      <div
        className={`character-avatar ${size} ${isVisible ? 'visible' : 'hidden'}`}
        style={{
          width: avatarSize,
          height: avatarSize,
          background: bgGradient,
          fontSize
        }}
      >
        <span className="avatar-emoji">{emoji}</span>
      </div>
      {size === 'normal' && name && (
        <div className="character-name">{name}</div>
      )}
    </div>
  );
}
