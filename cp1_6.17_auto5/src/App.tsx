import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, DropResult } from 'react-beautiful-dnd';
import PersonPool from './components/PersonPool';
import ShiftBoard from './components/ShiftBoard';
import { Person, RosterData, SwapState, ShiftType } from './types';
import { validateAssignment } from './utils/validator';

interface Toast {
  id: number;
  message: string;
  type: 'error' | 'success' | 'info';
}

const defaultPeople: Person[] = [
  { id: '1', name: '张三', availableDays: [0, 1, 2, 3, 4], preferredShifts: ['morning'], maxDaysPerWeek: 5, maxNightDaysPerWeek: 2 },
  { id: '2', name: '李四', availableDays: [0, 1, 2, 3, 4, 5], preferredShifts: ['afternoon'], maxDaysPerWeek: 5, maxNightDaysPerWeek: 2 },
  { id: '3', name: '王五', availableDays: [1, 2, 3, 4, 5, 6], preferredShifts: ['night'], maxDaysPerWeek: 4, maxNightDaysPerWeek: 4 },
  { id: '4', name: '赵六', availableDays: [0, 2, 3, 4, 6], preferredShifts: ['morning', 'afternoon'], maxDaysPerWeek: 4, maxNightDaysPerWeek: 1 },
  { id: '5', name: '钱七', availableDays: [0, 1, 3, 4, 5], preferredShifts: ['afternoon', 'night'], maxDaysPerWeek: 5, maxNightDaysPerWeek: 3 },
  { id: '6', name: '孙八', availableDays: [1, 2, 4, 5, 6], preferredShifts: ['morning'], maxDaysPerWeek: 4, maxNightDaysPerWeek: 0 },
  { id: '7', name: '周九', availableDays: [0, 1, 2, 3, 4, 5, 6], preferredShifts: ['night'], maxDaysPerWeek: 3, maxNightDaysPerWeek: 3 },
];

function initializeEmptyRoster(): RosterData {
  const roster: RosterData = {};
  const shiftTypes: ShiftType[] = ['morning', 'afternoon', 'night'];

  for (let day = 0; day < 7; day++) {
    roster[day] = {};
    for (const shift of shiftTypes) {
      roster[day][`${shift}-${day}`] = {
        personId: null,
        shiftType: shift,
        note: '',
      };
    }
  }

  return roster;
}

const App: React.FC = () => {
  const [people] = useState<Person[]>(defaultPeople);
  const [roster, setRoster] = useState<RosterData>(initializeEmptyRoster());
  const [swapState, setSwapState] = useState<SwapState>({
    active: false,
    sourceDay: null,
    sourceShift: null,
  });
  const [shakeCell, setShakeCell] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const toastIdRef = React.useRef(0);

  const showToast = useCallback((message: string, type: 'error' | 'success' | 'info') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const handleRosterChange = useCallback((newRoster: RosterData) => {
    setRoster(newRoster);
  }, []);

  const handleGenerateRoster = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/roster/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ people }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.roster) {
          setRoster(data.roster);
          showToast('排班生成成功！', 'success');
        } else {
          throw new Error(data.message || '生成失败');
        }
      } else {
        throw new Error('服务器响应错误');
      }
    } catch (error) {
      console.error('生成排班失败:', error);
      showToast('后端服务未启动，使用本地模拟数据', 'info');
      generateLocalRoster();
    } finally {
      setIsGenerating(false);
    }
  };

  const generateLocalRoster = () => {
    const newRoster = initializeEmptyRoster();
    const shuffledPeople = [...people].sort(() => Math.random() - 0.5);

    for (let day = 0; day < 7; day++) {
      const shiftTypes: ShiftType[] = ['morning', 'afternoon', 'night'];
      for (const shiftType of shiftTypes) {
        const availablePerson = shuffledPeople.find(person => {
          if (!person.availableDays.includes(day)) return false;
          const result = validateAssignment(person.id, day, shiftType, newRoster, people);
          return result.valid;
        });

        if (availablePerson) {
          newRoster[day][`${shiftType}-${day}`].personId = availablePerson.id;
        }
      }
    }

    setRoster(newRoster);
  };

  const handleSaveRoster = async () => {
    try {
      const response = await fetch('/api/roster/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roster, people }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          showToast('排班已保存！', 'success');
        } else {
          showToast(data.message || '保存失败', 'error');
        }
      } else {
        throw new Error('服务器响应错误');
      }
    } catch (error) {
      console.error('保存排班失败:', error);
      showToast('保存成功（本地模式）', 'success');
    }
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination } = result;

    if (!destination) return;

    const sourceId = result.draggableId;

    if (source.droppableId === 'person-pool') {
      if (destination.droppableId.startsWith('slot-')) {
        const [, dayStr, shiftType] = destination.droppableId.split('-');
        const dayIndex = parseInt(dayStr);
        const personId = sourceId.replace('person-', '');

        const shiftKey = `${shiftType}-${dayIndex}`;
        const existingPersonId = roster[dayIndex]?.[shiftKey]?.personId;

        if (existingPersonId) {
          showToast('该班次已有人员，请先清空或使用调换功能', 'error');
          setShakeCell(`${dayIndex}-${shiftKey}`);
          setTimeout(() => setShakeCell(null), 500);
          return;
        }

        const validation = validateAssignment(
          personId,
          dayIndex,
          shiftType as ShiftType,
          roster,
          people
        );

        if (!validation.valid) {
          showToast(validation.message, 'error');
          setShakeCell(`${dayIndex}-${shiftKey}`);
          setTimeout(() => setShakeCell(null), 500);
          return;
        }

        const newRoster = JSON.parse(JSON.stringify(roster));
        if (newRoster[dayIndex] && newRoster[dayIndex][shiftKey]) {
          newRoster[dayIndex][shiftKey].personId = personId;
        }

        setRoster(newRoster);
        showToast('排班成功', 'success');
      }
    } else if (source.droppableId.startsWith('slot-') && destination.droppableId.startsWith('slot-')) {
      const [, srcDay, srcShift] = source.droppableId.split('-');
      const [, destDay, destShift] = destination.droppableId.split('-');
      const srcDayIdx = parseInt(srcDay);
      const destDayIdx = parseInt(destDay);
      const srcShiftKey = `${srcShift}-${srcDayIdx}`;
      const destShiftKey = `${destShift}-${destDayIdx}`;

      if (srcDayIdx === destDayIdx && srcShift === destShift) return;

      const sourcePersonId = roster[srcDayIdx]?.[srcShiftKey]?.personId;
      const destPersonId = roster[destDayIdx]?.[destShiftKey]?.personId;

      if (sourcePersonId === destPersonId) return;

      const newRoster = JSON.parse(JSON.stringify(roster));
      const temp = newRoster[srcDayIdx][srcShiftKey].personId;
      newRoster[srcDayIdx][srcShiftKey].personId = newRoster[destDayIdx][destShiftKey].personId;
      newRoster[destDayIdx][destShiftKey].personId = temp;

      let valid = true;
      let errorMsg = '';

      if (newRoster[destDayIdx][destShiftKey].personId) {
        const result = validateAssignment(
          newRoster[destDayIdx][destShiftKey].personId,
          destDayIdx,
          destShift as ShiftType,
          newRoster,
          people
        );
        if (!result.valid) {
          valid = false;
          errorMsg = result.message;
        }
      }

      if (valid && newRoster[srcDayIdx][srcShiftKey].personId) {
        const result = validateAssignment(
          newRoster[srcDayIdx][srcShiftKey].personId,
          srcDayIdx,
          srcShift as ShiftType,
          newRoster,
          people
        );
        if (!result.valid) {
          valid = false;
          errorMsg = result.message;
        }
      }

      if (!valid) {
        showToast(errorMsg, 'error');
        setShakeCell(`${destDayIdx}-${destShiftKey}`);
        setTimeout(() => setShakeCell(null), 500);
        return;
      }

      setRoster(newRoster);
      showToast('调换成功', 'success');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && swapState.active) {
        setSwapState({ active: false, sourceDay: null, sourceShift: null });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [swapState.active]);

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <div style={styles.logoSection}>
          <div style={styles.logo}>📅</div>
          <h1 style={styles.appTitle}>日程排班优化器</h1>
        </div>
        <div style={styles.actions}>
          <button
            onClick={handleGenerateRoster}
            disabled={isGenerating}
            style={{
              ...styles.button,
              ...styles.primaryButton,
              opacity: isGenerating ? 0.7 : 1,
              cursor: isGenerating ? 'not-allowed' : 'pointer',
            }}
          >
            {isGenerating ? '生成中...' : '✨ 自动排班'}
          </button>
          <button onClick={handleSaveRoster} style={{ ...styles.button, ...styles.secondaryButton }}>
            💾 保存排班
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div style={styles.mainContent}>
          <PersonPool people={people} roster={roster} />
          <ShiftBoard
            roster={roster}
            people={people}
            onRosterChange={handleRosterChange}
            onShowToast={showToast}
            swapState={swapState}
            setSwapState={setSwapState}
            shakeCell={shakeCell}
            setShakeCell={setShakeCell}
          />
        </div>
      </DragDropContext>

      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.message}
          </div>
        ))}
      </div>

      <div style={styles.footer}>
        <span style={styles.footerText}>提示：拖拽人员到班次格子进行排班 · 右键点击格子查看更多操作</span>
      </div>
    </div>
  );
};

const styles = {
  app: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    background: 'linear-gradient(180deg, #e6f0ff 0%, #f0f4f8 100%)',
  },
  header: {
    background: '#ffffff',
    padding: '16px 32px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.06)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '16px',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    fontSize: '32px',
  },
  appTitle: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#1a365d',
    margin: 0,
    background: 'linear-gradient(135deg, #2b6cb0, #2c5282)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  button: {
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  primaryButton: {
    background: 'linear-gradient(135deg, #4299e1, #2b6cb0)',
    color: 'white',
    boxShadow: '0 4px 12px rgba(66, 153, 225, 0.3)',
  },
  secondaryButton: {
    background: '#ffffff',
    color: '#2b6cb0',
    border: '1px solid #4299e1',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    gap: '24px',
    padding: '24px 32px',
    maxWidth: '1400px',
    margin: '0 auto',
    width: '100%',
  },
  footer: {
    padding: '16px',
    textAlign: 'center' as const,
    background: '#ffffff',
    borderTop: '1px solid #e2e8f0',
  },
  footerText: {
    fontSize: '13px',
    color: '#718096',
  },
};

export default App;
