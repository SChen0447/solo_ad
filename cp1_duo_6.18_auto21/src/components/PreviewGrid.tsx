import { useState } from 'react';
import { useFormatStore, LOCALE_CONFIG } from '../store/formatStore';
import type { LocaleCode } from '../types';

interface LocalePanelProps {
  locale: LocaleCode;
  isDateValid: boolean;
  isTimeValid: boolean;
  isNumberValid: boolean;
  isCurrencyValid: boolean;
}

function LocalePanel({
  locale,
  isDateValid,
  isTimeValid,
  isNumberValid,
  isCurrencyValid,
}: LocalePanelProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { convertedResults } = useFormatStore();
  const config = LOCALE_CONFIG[locale];
  const results = convertedResults[locale];

  const getResultColor = (isValid: boolean, hasValue: boolean) => {
    if (!hasValue) return '#999';
    return isValid ? '#333' : '#999';
  };

  const hasDateValue = results.date !== '—';
  const hasTimeValue = results.time !== '—';
  const hasNumberValue = results.number !== '—';
  const hasCurrencyValue = results.currency !== '—';

  return (
    <div
      className="locale-panel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: `2px solid ${isHovered ? '#a0c4ff' : '#e0e0e0'}`,
        boxShadow: isHovered
          ? '0 4px 12px rgba(0, 0, 0, 0.1)'
          : 'inset 0 2px 4px rgba(0, 0, 0, 0.05)',
        padding: '20px',
        width: '300px',
        height: '100%',
        boxSizing: 'border-box',
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#2c3e50',
          marginBottom: '16px',
          paddingBottom: '8px',
          borderBottom: '1px solid #e0e0e0',
        }}
      >
        {config.name}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
        <div>
          <div
            style={{
              fontSize: '12px',
              color: '#999',
              marginBottom: '4px',
            }}
          >
            日期
          </div>
          <div
            style={{
              fontSize: '16px',
              color: getResultColor(isDateValid, hasDateValue),
              transition: 'color 0.2s ease',
            }}
          >
            {results.date}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: '12px',
              color: '#999',
              marginBottom: '4px',
            }}
          >
            时间
          </div>
          <div
            style={{
              fontSize: '16px',
              color: getResultColor(isTimeValid, hasTimeValue),
              transition: 'color 0.2s ease',
            }}
          >
            {results.time}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: '12px',
              color: '#999',
              marginBottom: '4px',
            }}
          >
            数字
          </div>
          <div
            style={{
              fontSize: '16px',
              color: getResultColor(isNumberValid, hasNumberValue),
              transition: 'color 0.2s ease',
            }}
          >
            {results.number}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: '12px',
              color: '#999',
              marginBottom: '4px',
            }}
          >
            货币
          </div>
          <div
            style={{
              fontSize: '16px',
              color: getResultColor(isCurrencyValid, hasCurrencyValue),
              transition: 'color 0.2s ease',
            }}
          >
            {results.currency}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PreviewGrid() {
  const { validation } = useFormatStore();
  const locales: LocaleCode[] = ['zh-CN', 'en-US', 'ja-JP', 'ar-SA'];

  const isDateValid = validation.date.isValid;
  const isTimeValid = validation.time.isValid;
  const isNumberValid = validation.number.isValid;
  const isCurrencyValid = validation.currency.isValid;

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <h2
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#2c3e50',
          marginBottom: '20px',
        }}
      >
        多区域预览
      </h2>

      <div
        className="preview-grid-inner"
        style={{
          display: 'grid',
          gridTemplateColumns: '300px 300px',
          gap: '20px',
          width: '620px',
          margin: '0 auto',
          justifyContent: 'center',
        }}
      >
        {locales.map((locale) => (
          <LocalePanel
            key={locale}
            locale={locale}
            isDateValid={isDateValid}
            isTimeValid={isTimeValid}
            isNumberValid={isNumberValid}
            isCurrencyValid={isCurrencyValid}
          />
        ))}
      </div>
    </div>
  );
}
