import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  ActionType,
  LogEntry,
  Pet,
  PetAnimationState,
  PetColorVariant,
  PetStats,
  PetType,
  StatPopup,
} from './types';
import { PET_COLORS, PET_NAMES, getPetSprite } from './petSprites';
import PetDisplay from './PetDisplay';
import ActionPanel from './ActionPanel';
import TimelineLog from './TimelineLog';

const PET_TYPES: PetType[] = ['cat', 'dog', 'dragon', 'rabbit', 'fox', 'bird'];

const ACTION_EFFECTS: Record<ActionType, Partial<PetStats> & { animation: PetAnimationState; log: string }> = {
  feed: { hunger: 10, happiness: -5, animation: 'eating', log: '宠物吃了小饼干' },
  play: { happiness: 15, cleanliness: -8, animation: 'playing', log: '宠物在草地上打滚' },
  clean: { cleanliness: 20, hunger: -3, animation: 'idle', log: '宠物被洗得干干净净' },
};

const DECAY_INTERVAL = 60000;
const DECAY_VALUES: Partial<PetStats> = {
  hunger: -2,
  happiness: -3,
  cleanliness: -1,
};

const ANIMATION_DURATION = 2500;

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function getAnimationFromStats(stats: PetStats, current: PetAnimationState): PetAnimationState {
  if (
    current === 'eating' ||
    current === 'playing'
  ) {
    return current;
  }
  if (stats.cleanliness < 20) return 'dirty';
  if (stats.hunger < 20) return 'sad';
  if (stats.happiness < 30) return 'sad';
  return 'idle';
}

function MiniPetPreview({ type, colorVariant }: { type: PetType; colorVariant: PetColorVariant }) {
  const sprite = getPetSprite(type, colorVariant);
  const rows = sprite.length;
  const cols = sprite[0]?.length ?? 0;
  return (
    <div
      className="pixel-pet idle"
      style={{
        gridTemplateColumns: `repeat(${cols}, 10px)`,
        gridTemplateRows: `repeat(${rows}, 10px)`,
      }}
    >
      {sprite.flatMap((row, rIdx) =>
        row.map((cell, cIdx) => (
          <div
            key={`${rIdx}-${cIdx}`}
            style={{
              width: 10,
              height: 10,
              backgroundColor: cell ?? 'transparent',
            }}
          />
        ))
      )}
    </div>
  );
}

function AdoptModal({
  onAdopt,
}: {
  onAdopt: (type: PetType, colorVariant: PetColorVariant, name: string) => void;
}) {
  const [selectedType, setSelectedType] = useState<PetType | null>(null);
  const [selectedColor, setSelectedColor] = useState<PetColorVariant>(0);
  const [name, setName] = useState('');

  const handleSubmit = () => {
    if (selectedType && name.trim()) {
      onAdopt(selectedType, selectedColor, name.trim());
    }
  };

  const canSubmit = selectedType !== null && name.trim().length > 0;

  return (
    <div className="adopt-modal-overlay">
      <div className="adopt-modal">
        <h2>🐾 领养你的像素宠物</h2>
        <p className="adopt-modal-subtitle">选择一只独一无二的小伙伴陪伴你吧！</p>

        <div className="pet-grid">
          {PET_TYPES.map((type) => (
            <div
              key={type}
              className={`pet-option ${selectedType === type ? 'selected' : ''}`}
              onClick={() => {
                setSelectedType(type);
                setSelectedColor(0);
              }}
            >
              <div className="pet-option-preview">
                <MiniPetPreview type={type} colorVariant={selectedType === type ? selectedColor : 0} />
              </div>
              <div className="pet-option-name">{PET_NAMES[type]}</div>
              <div className="color-variants">
                {PET_COLORS[type].map((colors, idx) => (
                  <div
                    key={idx}
                    className={`color-dot ${selectedType === type && selectedColor === idx ? 'selected' : ''}`}
                    style={{ background: colors.body }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedType(type);
                      setSelectedColor(idx as PetColorVariant);
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="adopt-name-input">
          <label htmlFor="petName">给你的宠物起个名字</label>
          <input
            id="petName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入一个可爱的名字..."
            maxLength={12}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
          />
        </div>

        <button
          className="adopt-submit-btn"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {canSubmit ? '🎉 领养TA！' : '请选择宠物并输入名字'}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [pet, setPet] = useState<Pet | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [statPopups, setStatPopups] = useState<StatPopup[]>([]);
  const [flashingStats, setFlashingStats] = useState<
    { stat: keyof PetStats; isPositive: boolean; id: string }[]
  >([]);
  const [isActionLocked, setIsActionLocked] = useState(false);
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addLog = useCallback((eventType: LogEntry['eventType'], message: string) => {
    const entry: LogEntry = {
      id: uuidv4(),
      timestamp: Date.now(),
      eventType,
      message,
    };
    setLogs((prev) => [entry, ...prev].slice(0, 100));
  }, []);

  const triggerStatFeedback = useCallback(
    (changes: Partial<PetStats>) => {
      const entries = Object.entries(changes) as [keyof PetStats, number][];
      const now = Date.now();

      const newPopups: StatPopup[] = entries
        .filter(([, v]) => v !== 0)
        .map(([stat, value]) => ({
          id: `${now}-${stat}-${uuidv4()}`,
          stat,
          value: Math.abs(value),
          isPositive: value > 0,
        }));

      setStatPopups((prev) => [...prev, ...newPopups]);

      const newFlashes = entries
        .filter(([, v]) => v !== 0)
        .map(([stat, value]) => ({
          id: `${now}-flash-${stat}`,
          stat,
          isPositive: value > 0,
        }));

      setFlashingStats((prev) => [...prev, ...newFlashes]);

      setTimeout(() => {
        setStatPopups((prev) => prev.filter((p) => !newPopups.find((n) => n.id === p.id)));
      }, 1000);

      setTimeout(() => {
        setFlashingStats((prev) => prev.filter((f) => !newFlashes.find((n) => n.id === f.id)));
      }, 600);
    },
    []
  );

  const applyStatsChanges = useCallback(
    (current: Pet, changes: Partial<PetStats>): PetStats => {
      const next: PetStats = { ...current.stats };
      (Object.keys(changes) as (keyof PetStats)[]).forEach((key) => {
        next[key] = clamp(next[key] + (changes[key] ?? 0));
      });
      return next;
    },
    []
  );

  const handleAction = useCallback(
    (action: ActionType) => {
      if (!pet || isActionLocked) return;

      const effect = ACTION_EFFECTS[action];
      const newStats = applyStatsChanges(pet, {
        hunger: effect.hunger,
        happiness: effect.happiness,
        cleanliness: effect.cleanliness,
      });

      const changes: Partial<PetStats> = {};
      (['hunger', 'happiness', 'cleanliness'] as const).forEach((k) => {
        const diff = newStats[k] - pet.stats[k];
        if (diff !== 0) changes[k] = diff;
      });

      triggerStatFeedback(changes);

      setIsActionLocked(true);

      setPet((prev) =>
        prev
          ? {
              ...prev,
              stats: newStats,
              animationState: effect.animation,
            }
          : prev
      );

      addLog(action, effect.log);

      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      animationTimeoutRef.current = setTimeout(() => {
        setPet((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            animationState: getAnimationFromStats(prev.stats, prev.animationState),
          };
        });
        setIsActionLocked(false);
      }, ANIMATION_DURATION);
    },
    [pet, isActionLocked, applyStatsChanges, triggerStatFeedback, addLog]
  );

  useEffect(() => {
    if (!pet) return;

    const interval = setInterval(() => {
      setPet((prev) => {
        if (!prev) return prev;
        const newStats = applyStatsChanges(prev, DECAY_VALUES);
        return {
          ...prev,
          stats: newStats,
          animationState: getAnimationFromStats(newStats, prev.animationState),
        };
      });

      const changes: Partial<PetStats> = {};
      (Object.entries(DECAY_VALUES) as [keyof PetStats, number][]).forEach(([key, value]) => {
        changes[key] = value;
      });
      triggerStatFeedback(changes);

      const messages = [
        '时间悄悄流逝，宠物感觉有点变化了',
        '过了一会儿，宠物需要更多关注',
      ];
      addLog('decay', messages[Math.floor(Math.random() * messages.length)]);
    }, DECAY_INTERVAL);

    return () => clearInterval(interval);
  }, [pet?.id, applyStatsChanges, triggerStatFeedback, addLog]);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const handleAdopt = useCallback(
    (type: PetType, colorVariant: PetColorVariant, name: string) => {
      const newPet: Pet = {
        id: uuidv4(),
        type,
        colorVariant,
        name,
        stats: {
          hunger: 80,
          happiness: 100,
          cleanliness: 90,
        },
        animationState: 'idle',
        createdAt: Date.now(),
      };
      setPet(newPet);
      addLog('adopt', `🎉 ${name}加入了你的大家庭！`);
      addLog('status', `领养了一只${PET_NAMES[type]}，编号：#${newPet.id.slice(0, 8).toUpperCase()}`);
    },
    [addLog]
  );

  return (
    <>
      {!pet && <AdoptModal onAdopt={handleAdopt} />}

      <div className="app-container">
        <header className="app-header">
          <h1>🐾 像素宠物乐园</h1>
          <p>照顾你的专属小伙伴，陪伴TA一起成长</p>
        </header>

        {pet && (
          <>
            <PetDisplay
              pet={pet}
              statPopups={statPopups}
              flashingStats={flashingStats}
            />

            <div className="tablet-row">
              <ActionPanel
                pet={pet}
                onAction={handleAction}
                disabled={isActionLocked}
              />

              <TimelineLog logs={logs} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
