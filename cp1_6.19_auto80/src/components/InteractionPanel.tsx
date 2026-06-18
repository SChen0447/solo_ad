import { useState, useCallback } from 'react';
import { usePetStore } from '../store/petStore';

interface InteractionPanelProps {
  petId: string;
}

interface ButtonState {
  label: string;
  field: 'hunger' | 'hygiene' | 'happiness';
  color: string;
  emoji: string;
}

const BUTTONS: ButtonState[] = [
  { label: '喂食', field: 'hunger', color: '#e67e22', emoji: '🍖' },
  { label: '清洁', field: 'hygiene', color: '#3498db', emoji: '🧹' },
  { label: '玩耍', field: 'happiness', color: '#e74c3c', emoji: '🎾' },
];

const COOLDOWN_MS = 5000;

export default function InteractionPanel({ petId }: InteractionPanelProps) {
  const updatePetStatus = usePetStore((s) => s.updatePetStatus);
  const pet = usePetStore((s) => s.pets.find((p) => p.id === petId));
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});

  const handleInteraction = useCallback(
    (btn: ButtonState) => {
      if (!pet) return;
      if (cooldowns[btn.field] > 0) return;

      const increment = Math.floor(Math.random() * 6) + 5;
      const newValue = Math.min(100, pet[btn.field] + increment);

      updatePetStatus(petId, { [btn.field]: newValue });

      setCooldowns((prev) => ({ ...prev, [btn.field]: 5 }));

      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
        if (remaining <= 0) {
          clearInterval(interval);
          setCooldowns((prev) => ({ ...prev, [btn.field]: 0 }));
        } else {
          setCooldowns((prev) => ({ ...prev, [btn.field]: remaining }));
        }
      }, 100);
    },
    [pet, petId, updatePetStatus, cooldowns]
  );

  if (!pet) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      alignItems: 'center',
    }}>
      {BUTTONS.map((btn) => {
        const isCooling = cooldowns[btn.field] > 0;
        return (
          <button
            key={btn.field}
            className="btn-interaction"
            disabled={isCooling}
            onClick={() => handleInteraction(btn)}
            style={{
              background: isCooling ? '#bdc3c7' : btn.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <span>{btn.emoji}</span>
            <span>{isCooling ? `${cooldowns[btn.field]}s` : btn.label}</span>
          </button>
        );
      })}
    </div>
  );
}
