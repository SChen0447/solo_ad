import { useState, useCallback } from 'react';
import { useFormatStore } from '../store/formatStore';
import { autoCompleteDate, autoCompleteTime } from '../modules/inputParser';
import type { ParseResult } from '../types';

interface FloatingInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  validation: ParseResult;
  placeholder?: string;
  autoComplete?: (value: string) => string;
}

function FloatingInput({
  label,
  value,
  onChange,
  validation,
  placeholder,
  autoComplete,
}: FloatingInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let newValue = e.target.value;
      if (autoComplete) {
        newValue = autoComplete(newValue);
      }
      onChange(newValue);
    },
    [onChange, autoComplete]
  );

  const isLabelFloating = isFocused || value.length > 0;
  const hasValue = value.trim().length > 0;
  const showSuccess = hasValue && validation.isValid;
  const showError = hasValue && !validation.isValid && validation.error !== null;

  let borderColor = '#e0e0e0';
  if (isFocused) {
    borderColor = '#4a90d9';
  } else if (showSuccess) {
    borderColor = '#27ae60';
  } else if (showError) {
    borderColor = '#e74c3c';
  }

  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ position: 'relative' }}>
        <label
          style={{
            position: 'absolute',
            left: '12px',
            top: isLabelFloating ? '6px' : '50%',
            transform: isLabelFloating ? 'translateY(0)' : 'translateY(-50%)',
            fontSize: isLabelFloating ? '12px' : '14px',
            color: isFocused ? '#4a90d9' : '#999',
            backgroundColor: 'transparent',
            padding: isLabelFloating ? '0 4px' : '0',
            pointerEvents: 'none',
            transition: 'all 0.2s ease',
            zIndex: 1,
          }}
        >
          {label}
        </label>
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: isLabelFloating ? '24px 12px 10px' : '14px 12px',
            fontSize: '14px',
            border: `2px solid ${borderColor}`,
            borderRadius: '6px',
            backgroundColor: '#fff',
            outline: 'none',
            transition: 'all 0.2s ease',
            boxSizing: 'border-box',
          }}
        />
        {hasValue && (
          <div
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '18px',
            }}
          >
            {showSuccess && <span style={{ color: '#27ae60' }}>✓</span>}
            {showError && <span style={{ color: '#e74c3c' }}>✕</span>}
          </div>
        )}
      </div>
      {showError && (
        <div
          style={{
            color: '#e74c3c',
            fontSize: '12px',
            marginTop: '4px',
            paddingLeft: '4px',
          }}
        >
          {validation.error}
        </div>
      )}
    </div>
  );
}

export function InputPanel() {
  const { inputs, validation, setDate, setTime, setNumber, setCurrency } =
    useFormatStore();

  return (
    <div
      className="input-panel-inner"
      style={{
        backgroundColor: '#f9f9f9',
        borderRadius: '10px',
        padding: '24px',
        width: '380px',
        boxSizing: 'border-box',
        transition: 'all 0.2s ease',
      }}
    >
      <h2
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#2c3e50',
          marginBottom: '20px',
        }}
      >
        输入面板
      </h2>

      <FloatingInput
        label="日期 (YYYY-MM-DD)"
        value={inputs.date}
        onChange={setDate}
        validation={validation.date}
        placeholder="例如：2024-01-15"
        autoComplete={autoCompleteDate}
      />

      <FloatingInput
        label="时间 (HH:mm:ss)"
        value={inputs.time}
        onChange={setTime}
        validation={validation.time}
        placeholder="例如：14:30:00"
        autoComplete={autoCompleteTime}
      />

      <FloatingInput
        label="数字"
        value={inputs.number}
        onChange={setNumber}
        validation={validation.number}
        placeholder="例如：1234.56"
      />

      <FloatingInput
        label="货币 (金额 代码)"
        value={inputs.currency}
        onChange={setCurrency}
        validation={validation.currency}
        placeholder="例如：123.45 USD"
      />

      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#eaf2fd',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#2c3e50',
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: '6px' }}>支持的货币代码：</div>
        <div style={{ color: '#666' }}>USD、EUR、JPY、CNY、GBP</div>
      </div>
    </div>
  );
}
