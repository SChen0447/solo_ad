import React, { memo } from 'react';
import type { InputValues } from '@/types';
import { Mic, Radio, User } from 'lucide-react';

interface InputSectionProps {
  values: InputValues;
  onChange: (key: keyof InputValues, value: string) => void;
}

interface FieldProps {
  label: string;
  value: string;
  maxLength: number;
  placeholder: string;
  accentColor: string;
  icon: React.ReactNode;
  onChange: (v: string) => void;
  ariaLabel: string;
}

const InputField: React.FC<FieldProps> = memo(function InputField({
  label,
  value,
  maxLength,
  placeholder,
  accentColor,
  icon,
  onChange,
  ariaLabel,
}) {
  return (
    <div className="input-field-wrapper">
      <div className="input-label-row">
        <label className="input-label">{label}</label>
        <span className="char-count" style={{ color: accentColor }}>
          {value.length}/{maxLength}
        </span>
      </div>
      <div
        className="input-container"
        style={{
          '--accent-color': accentColor,
        } as React.CSSProperties}
      >
        <div className="input-accent-bar" />
        <div className="input-icon" style={{ color: accentColor }}>
          {icon}
        </div>
        <input
          type="text"
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-label={ariaLabel}
          onChange={(e) => onChange(e.target.value)}
          className="input-element"
        />
      </div>
    </div>
  );
});

const InputSection: React.FC<InputSectionProps> = ({ values, onChange }) => {
  return (
    <div className="input-section">
      <InputField
        label="节目名称"
        value={values.showName}
        maxLength={30}
        placeholder="例如：深夜电台"
        accentColor="#3B82F6"
        icon={<Radio size={18} />}
        ariaLabel="节目名称输入框（最多30字）"
        onChange={(v) => onChange('showName', v)}
      />
      <InputField
        label="单集标题"
        value={values.episodeTitle}
        maxLength={50}
        placeholder="例如：第12期 聊聊AI与未来"
        accentColor="#F59E0B"
        icon={<Mic size={18} />}
        ariaLabel="单集标题输入框（最多50字）"
        onChange={(v) => onChange('episodeTitle', v)}
      />
      <InputField
        label="嘉宾名字"
        value={values.guestName}
        maxLength={20}
        placeholder="例如：李明"
        accentColor="#10B981"
        icon={<User size={18} />}
        ariaLabel="嘉宾名字输入框（最多20字）"
        onChange={(v) => onChange('guestName', v)}
      />
    </div>
  );
};

export default InputSection;
