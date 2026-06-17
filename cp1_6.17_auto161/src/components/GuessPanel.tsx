import React, { useState, useCallback } from 'react';
import { submitGuess, GuessRecord } from '../socket';

interface GuessPanelProps {
  roundNumber: number;
  drawerNickname: string;
  guesses: GuessRecord[];
  disabled: boolean;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 16px',
  borderRadius: '12px',
  border: '2px solid #8E44AD',
  background: 'rgba(255,255,255,0.08)',
  color: '#FFFFFF',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  boxSizing: 'border-box',
};

const submitBtnStyle: React.CSSProperties = {
  width: '120px',
  height: '40px',
  borderRadius: '8px',
  border: 'none',
  background: 'linear-gradient(135deg, #8E44AD, #6C3483)',
  color: '#FFFFFF',
  fontSize: '15px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'transform 0.1s, filter 0.2s, box-shadow 0.2s',
};

function formatTime(date: Date): string {
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${m}:${s}`;
}

function isWithin5Min(time: string): boolean {
  const parts = time.split(':');
  if (parts.length !== 2) return true;
  return true;
}

export default function GuessPanel({ roundNumber, drawerNickname, guesses, disabled }: GuessPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [focused, setFocused] = useState(false);

  const handleSubmit = useCallback(() => {
    const val = inputValue.trim();
    if (!val || disabled) return;
    submitGuess(val);
    setInputValue('');
  }, [inputValue, disabled]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', minWidth: '280px', maxWidth: '360px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#BDC3C7', fontSize: '14px' }}>第 {roundNumber} 回合</span>
        <span style={{ color: '#2ECC71', fontSize: '14px', fontWeight: 700 }}>
          ⭐ {drawerNickname}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="在此输入你的猜测"
          disabled={disabled}
          style={{
            ...inputStyle,
            borderColor: focused ? '#6C3483' : '#8E44AD',
            boxShadow: focused ? '0 0 12px rgba(142,68,173,0.5)' : 'none',
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !inputValue.trim()}
          style={{
            ...submitBtnStyle,
            opacity: disabled || !inputValue.trim() ? 0.5 : 1,
            cursor: disabled || !inputValue.trim() ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={e => {
            if (!disabled && inputValue.trim()) {
              e.currentTarget.style.filter = 'brightness(1.1)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(142,68,173,0.4)';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.filter = '';
            e.currentTarget.style.transform = '';
            e.currentTarget.style.boxShadow = '';
          }}
          onMouseDown={e => {
            e.currentTarget.style.transform = 'scale(0.95)';
          }}
          onMouseUp={e => {
            e.currentTarget.style.transform = '';
          }}
        >
          提交
        </button>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '8px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '10px',
        border: '1px solid #FFFFFF15',
        maxHeight: '360px',
      }}>
        {guesses.length === 0 && (
          <div style={{ color: '#7F8C8D', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
            暂无猜测记录
          </div>
        )}
        {guesses.map((g, i) => (
          <GuessItem key={`${g.playerId}-${i}`} record={g} />
        ))}
      </div>
    </div>
  );
}

function GuessItem({ record }: { record: GuessRecord }) {
  const [animClass, setAnimClass] = React.useState(record.isCorrect ? 'guess-correct-anim' : '');

  React.useEffect(() => {
    if (record.isCorrect) {
      const t = setTimeout(() => setAnimClass(''), 1000);
      return () => clearTimeout(t);
    }
  }, [record.isCorrect]);

  return (
    <div
      className={animClass}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 8px',
        borderRadius: '8px',
        background: 'rgba(255,255,255,0.04)',
        animation: animClass ? 'correctFlash 1s ease' : undefined,
      }}
    >
      <span style={{ color: '#2E4053', fontSize: '13px', fontWeight: 600, minWidth: '60px' }}>
        {record.nickname}
      </span>
      <span style={{
        color: record.isCorrect ? '#27AE60' : '#7F8C8D',
        fontSize: '14px',
        fontWeight: record.isCorrect ? 700 : 400,
        flex: 1,
      }}>
        {record.content}
      </span>
      {isWithin5Min(record.time) && (
        <span style={{ color: '#7F8C8D', fontSize: '11px' }}>
          {record.time}
        </span>
      )}
    </div>
  );
}
