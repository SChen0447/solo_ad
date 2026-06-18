import React, { useState, useCallback } from 'react';
import { useCharacterStore } from '../character/characterStore';
import { SKILLS, calcSkillBonus, JudgeResult, useJudgeStore } from './judgeStore';
import { roll } from '../dice/DiceRoller';
import { useDiceStore } from '../dice/diceStore';

type FlashState = { result: JudgeResult; active: boolean } | null;

export default function JudgePanel() {
  const character = useCharacterStore((s) => s.character);
  const getEffectiveAttributes = useCharacterStore((s) => s.getEffectiveAttributes);
  const addExperience = useCharacterStore((s) => s.addExperience);
  const addLog = useJudgeStore((s) => s.addLog);
  const addRecord = useDiceStore((s) => s.addRecord);

  const [selectedSkill, setSelectedSkill] = useState(SKILLS[0]);
  const [dc, setDc] = useState(10);
  const [rolling, setRolling] = useState(false);
  const [diceAngle, setDiceAngle] = useState(0);
  const [rollResult, setRollResult] = useState<number | null>(null);
  const [bonus, setBonus] = useState(0);
  const [total, setTotal] = useState(0);
  const [judgeResult, setJudgeResult] = useState<JudgeResult | null>(null);
  const [flash, setFlash] = useState<FlashState>(null);
  const [diceVisible, setDiceVisible] = useState(false);
  const [hoveringBtn, setHoveringBtn] = useState(false);

  const effective = getEffectiveAttributes();

  const currentBonus = effective ? calcSkillBonus(selectedSkill, effective) : 0;

  const handleJudge = useCallback(() => {
    if (!effective || rolling) return;

    setRolling(true);
    setDiceVisible(true);
    setRollResult(null);
    setJudgeResult(null);
    setFlash(null);

    const angle = Math.random() * 360;
    setDiceAngle(angle);

    setTimeout(() => {
      const result = roll({ diceCount: 1, sides: 20 });
      const rollVal = result.rolls[0];
      const skillBonus = calcSkillBonus(selectedSkill, effective);
      const totalVal = rollVal + skillBonus;

      addRecord({
        config: { diceCount: 1, sides: 20 },
        result,
        isJudge: true,
      });

      let jr: JudgeResult;
      if (rollVal === 1) {
        jr = '大失败';
      } else if (rollVal === 20 && skillBonus > dc / 2) {
        jr = '大成功';
      } else if (totalVal >= dc) {
        jr = '成功';
      } else {
        jr = '失败';
      }

      setRollResult(rollVal);
      setBonus(skillBonus);
      setTotal(totalVal);
      setJudgeResult(jr);
      setFlash({ result: jr, active: true });

      addLog({
        skillName: selectedSkill.name,
        dc,
        rollResult: rollVal,
        bonus: skillBonus,
        total: totalVal,
        result: jr,
      });

      if (jr === '成功' || jr === '大成功') {
        const levelUps = addExperience(10);
      }

      setTimeout(() => {
        setFlash(null);
        setDiceVisible(false);
        setRolling(false);
      }, 1500);
    }, 300);
  }, [effective, selectedSkill, dc, rolling, addRecord, addLog, addExperience]);

  const flashColor = flash
    ? flash.result === '大成功'
      ? '#FFD700'
      : flash.result === '成功'
      ? '#22C55E'
      : flash.result === '大失败'
      ? '#4A0000'
      : '#EF4444'
    : 'transparent';

  if (!character) {
    return (
      <div style={styles.emptyContainer}>
        <p style={styles.emptyText}>请先创建角色</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {flash && flash.active && (
        <div
          style={{
            ...styles.flashOverlay,
            backgroundColor: flashColor,
          }}
        />
      )}
      <div style={styles.panelContent}>
        <h3 style={styles.sectionTitle}>技能判定</h3>
        <div style={styles.formRow}>
          <label style={styles.label}>选择技能</label>
          <select
            style={styles.select}
            value={selectedSkill.name}
            onChange={(e) => {
              const sk = SKILLS.find((s) => s.name === e.target.value);
              if (sk) setSelectedSkill(sk);
            }}
          >
            {SKILLS.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} ({s.attrs[0]}/{s.attrs[1]})
              </option>
            ))}
          </select>
        </div>
        <div style={styles.skillInfo}>
          关联属性: {selectedSkill.attrs[0]} & {selectedSkill.attrs[1]} | 加成: {currentBonus >= 0 ? '+' : ''}{currentBonus}
        </div>
        <div style={styles.formRow}>
          <label style={styles.label}>
            难度 DC: <span style={styles.dcValue}>{dc}</span>
          </label>
          <input
            type="range"
            min={5}
            max={30}
            value={dc}
            onChange={(e) => setDc(Number(e.target.value))}
            style={styles.slider}
          />
          <div style={styles.sliderLabels}>
            <span>5</span>
            <span>30</span>
          </div>
        </div>
        <div style={styles.diceArea}>
          <button
            style={{
              ...styles.judgeBtn,
              ...(hoveringBtn ? styles.judgeBtnHover : {}),
            }}
            onClick={handleJudge}
            disabled={rolling}
            onMouseEnter={() => setHoveringBtn(true)}
            onMouseLeave={() => setHoveringBtn(false)}
            className="btn-press"
          >
            {rolling ? '⏳' : '🎲'}
          </button>
          {diceVisible && (
            <div
              style={{
                ...styles.diceDisplay,
                transform: `rotate(${diceAngle}deg)`,
              }}
            >
              {rollResult ?? '?'}
            </div>
          )}
        </div>
        {judgeResult && rollResult !== null && (
          <div style={styles.resultArea}>
            <div style={styles.resultRow}>
              <span style={styles.resultLabel}>骰子:</span>
              <span style={styles.resultValue}>{rollResult}</span>
            </div>
            <div style={styles.resultRow}>
              <span style={styles.resultLabel}>加成:</span>
              <span style={styles.resultValue}>{bonus >= 0 ? '+' : ''}{bonus}</span>
            </div>
            <div style={styles.resultRow}>
              <span style={styles.resultLabel}>总计:</span>
              <span style={styles.resultValue}>{total}</span>
            </div>
            <div style={styles.resultRow}>
              <span style={styles.resultLabel}>DC:</span>
              <span style={styles.resultValue}>{dc}</span>
            </div>
            <div
              style={{
                ...styles.resultBadge,
                color:
                  judgeResult === '大成功'
                    ? '#FFD700'
                    : judgeResult === '成功'
                    ? '#22C55E'
                    : judgeResult === '大失败'
                    ? '#8B0000'
                    : '#EF4444',
                borderColor:
                  judgeResult === '大成功'
                    ? '#FFD700'
                    : judgeResult === '成功'
                    ? '#22C55E'
                    : judgeResult === '大失败'
                    ? '#8B0000'
                    : '#EF4444',
              }}
            >
              {judgeResult}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  emptyContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  emptyText: {
    color: '#8B7355',
    fontSize: 18,
  },
  container: {
    padding: 24,
    position: 'relative' as const,
    overflow: 'hidden',
    minHeight: '100%',
  },
  flashOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.15,
    pointerEvents: 'none' as const,
    transition: 'background-color 0.3s',
    zIndex: 1,
  },
  panelContent: {
    position: 'relative' as const,
    zIndex: 2,
    background: 'rgba(43,29,14,0.85)',
    borderRadius: 12,
    border: '1px solid #5C4033',
    padding: 24,
    maxWidth: 500,
    margin: '0 auto',
  },
  sectionTitle: {
    color: '#D4A843',
    fontSize: 20,
    fontWeight: 700,
    margin: '0 0 20px 0',
    textAlign: 'center' as const,
    textShadow: '0 0 10px rgba(212,168,67,0.3)',
  },
  formRow: {
    marginBottom: 18,
  },
  label: {
    display: 'block',
    color: '#D4A843',
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 6,
  },
  dcValue: {
    color: '#E8D5B7',
    fontWeight: 700,
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #5C4033',
    background: 'rgba(20,14,8,0.8)',
    color: '#E8D5B7',
    fontSize: 15,
    outline: 'none',
    cursor: 'pointer',
  },
  skillInfo: {
    color: '#8B7355',
    fontSize: 13,
    marginBottom: 14,
    textAlign: 'center' as const,
  },
  slider: {
    width: '100%',
    accentColor: '#D4A843',
    cursor: 'pointer',
  },
  sliderLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    color: '#8B7355',
    fontSize: 12,
    marginTop: 4,
  },
  diceArea: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    margin: '24px 0',
    position: 'relative' as const,
  },
  judgeBtn: {
    width: 80,
    height: 80,
    borderRadius: '50%',
    border: '3px solid #D4A843',
    background: 'linear-gradient(135deg, rgba(139,105,20,0.4), rgba(212,168,67,0.2))',
    color: '#D4A843',
    fontSize: 32,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    position: 'relative' as const,
    zIndex: 3,
  },
  judgeBtnHover: {
    boxShadow: '0 0 30px rgba(212,168,67,0.6)',
    borderColor: '#FFD700',
  },
  diceDisplay: {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    marginLeft: -40,
    marginTop: -40,
    width: 80,
    height: 80,
    borderRadius: 12,
    background: '#D4A843',
    color: '#2B1D0E',
    fontSize: 36,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 20px rgba(212,168,67,0.6)',
    animation: 'diceAppear 0.3s ease-out',
    zIndex: 5,
  },
  resultArea: {
    background: 'rgba(20,14,8,0.6)',
    borderRadius: 8,
    padding: 16,
    border: '1px solid #5C4033',
  },
  resultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  resultLabel: {
    color: '#8B7355',
    fontSize: 14,
  },
  resultValue: {
    color: '#E8D5B7',
    fontSize: 14,
    fontWeight: 600,
  },
  resultBadge: {
    textAlign: 'center' as const,
    fontSize: 22,
    fontWeight: 800,
    marginTop: 10,
    padding: '8px 0',
    borderRadius: 8,
    border: '2px solid',
    background: 'rgba(0,0,0,0.3)',
    textShadow: '0 0 10px currentColor',
  },
};
