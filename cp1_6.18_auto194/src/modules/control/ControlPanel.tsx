import React from 'react';
import { HexColorPicker } from 'react-colorful';
import { useAppStore } from '@/store/useAppStore';
import { componentRegistries } from '@/store/componentRegistry';
import type { ComponentProps, PropFieldConfig } from '@/types/componentTypes';

const ColorPickerField: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
}> = ({ label, value, onChange }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={fieldLabelStyle}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          onClick={() => setOpen(!open)}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            backgroundColor: value,
            border: '1px solid #555',
            cursor: 'pointer',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)',
          }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
        />
      </div>
      {open && (
        <div
          style={{
            marginTop: '10px',
            position: 'relative',
            zIndex: 100,
          }}
        >
          <HexColorPicker color={value} onChange={onChange} />
        </div>
      )}
    </div>
  );
};

const TextField: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
}> = ({ label, value, onChange }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={fieldLabelStyle}>{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={inputStyle}
    />
  </div>
);

const TextareaField: React.FC<{
  label: string;
  value: string;
  onChange: (val: string) => void;
}> = ({ label, value, onChange }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={fieldLabelStyle}>{label}</label>
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      style={{
        ...inputStyle,
        resize: 'vertical',
        minHeight: '72px',
        fontFamily: 'inherit',
        paddingTop: '8px',
      }}
    />
  </div>
);

const NumberField: React.FC<{
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
}> = ({ label, value, onChange, min, max }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={fieldLabelStyle}>{label}</label>
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      style={inputStyle}
    />
  </div>
);

const RangeField: React.FC<{
  label: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step: number;
}> = ({ label, value, onChange, min, max, step }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={{ ...fieldLabelStyle, display: 'flex', justifyContent: 'space-between' }}>
      <span>{label}</span>
      <span style={{ color: '#ffd700', fontWeight: 600 }}>{value}</span>
    </label>
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        width: '100%',
        height: '6px',
        accentColor: '#ffd700',
        cursor: 'pointer',
      }}
    />
  </div>
);

const BooleanField: React.FC<{
  label: string;
  value: boolean;
  onChange: (val: boolean) => void;
}> = ({ label, value, onChange }) => (
  <div style={{ marginBottom: '16px' }}>
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        cursor: 'pointer',
        fontSize: '13px',
        color: '#e0e0e0',
      }}
    >
      <div
        onClick={() => onChange(!value)}
        style={{
          width: '40px',
          height: '22px',
          borderRadius: '11px',
          backgroundColor: value ? '#ffd700' : '#3a3a3a',
          position: 'relative',
          transition: 'background-color 0.2s ease',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: value ? '20px' : '2px',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            backgroundColor: '#fff',
            transition: 'left 0.2s ease',
          }}
        />
      </div>
      <span style={fieldLabelStyle}>{label}</span>
    </label>
  </div>
);

const SelectField: React.FC<{
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
}> = ({ label, value, options, onChange }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={fieldLabelStyle}>{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        ...inputStyle,
        cursor: 'pointer',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        paddingRight: '36px',
      }}
    >
      {options.map((opt) => (
        <option key={opt} value={opt} style={{ backgroundColor: '#2a2a2a', color: '#fff' }}>
          {opt}
        </option>
      ))}
    </select>
  </div>
);

const ArrayField: React.FC<{
  label: string;
  value: string[];
  onChange: (val: string[]) => void;
}> = ({ label, value, onChange }) => (
  <div style={{ marginBottom: '16px' }}>
    <label style={fieldLabelStyle}>{label}</label>
    <input
      type="text"
      value={value.join(',')}
      onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
      style={inputStyle}
      placeholder="用逗号分隔"
    />
  </div>
);

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  color: '#909090',
  marginBottom: '6px',
  fontWeight: 500,
  letterSpacing: '0.3px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  backgroundColor: '#2a2a2a',
  color: '#ffffff',
  border: '1px solid #555',
  borderRadius: '6px',
  padding: '8px 12px',
  fontSize: '13px',
  outline: 'none',
  transition: 'border-color 0.3s ease',
  fontFamily: 'system-ui, sans-serif',
};

export const ControlPanel: React.FC = () => {
  const selectedComponentId = useAppStore((s) => s.selectedComponentId);
  const components = useAppStore((s) => s.components);
  const updateComponentProps = useAppStore((s) => s.updateComponentProps);

  const selectedComponent = React.useMemo(
    () => components.find((c) => c.id === selectedComponentId) || null,
    [components, selectedComponentId]
  );

  if (!selectedComponent) {
    return (
      <div
        style={{
          width: '320px',
          height: '100%',
          backgroundColor: '#252525',
          borderLeft: '1px solid #3a3a3a',
          padding: '20px',
          boxSizing: 'border-box',
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p
          style={{
            color: '#666',
            fontSize: '14px',
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          请在画布中选择一个组件
          <br />
          以编辑其属性
        </p>
      </div>
    );
  }

  const registry = componentRegistries[selectedComponent.type];

  const handleChange = (key: string, value: unknown) => {
    updateComponentProps(selectedComponent.id, { [key]: value } as Partial<ComponentProps>);
  };

  const renderField = (field: PropFieldConfig) => {
    const value = (selectedComponent as Record<string, unknown>)[field.key];

    switch (field.type) {
      case 'text':
        return (
          <TextField
            key={field.key}
            label={field.label}
            value={String(value ?? '')}
            onChange={(v) => handleChange(field.key, v)}
          />
        );
      case 'textarea':
        return (
          <TextareaField
            key={field.key}
            label={field.label}
            value={String(value ?? '')}
            onChange={(v) => handleChange(field.key, v)}
          />
        );
      case 'number':
        return (
          <NumberField
            key={field.key}
            label={field.label}
            value={Number(value ?? 0)}
            onChange={(v) => handleChange(field.key, v)}
            min={field.min}
            max={field.max}
          />
        );
      case 'range':
        return (
          <RangeField
            key={field.key}
            label={field.label}
            value={Number(value ?? 0)}
            onChange={(v) => handleChange(field.key, v)}
            min={field.min ?? 0}
            max={field.max ?? 100}
            step={field.step ?? 1}
          />
        );
      case 'boolean':
        return (
          <BooleanField
            key={field.key}
            label={field.label}
            value={Boolean(value)}
            onChange={(v) => handleChange(field.key, v)}
          />
        );
      case 'select':
        return (
          <SelectField
            key={field.key}
            label={field.label}
            value={String(value ?? '')}
            options={field.options ?? []}
            onChange={(v) => handleChange(field.key, v)}
          />
        );
      case 'color':
        return (
          <ColorPickerField
            key={field.key}
            label={field.label}
            value={String(value ?? '#ffffff')}
            onChange={(v) => handleChange(field.key, v)}
          />
        );
      case 'array':
        return (
          <ArrayField
            key={field.key}
            label={field.label}
            value={Array.isArray(value) ? value : []}
            onChange={(v) => handleChange(field.key, v)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        width: '320px',
        height: '100%',
        backgroundColor: '#252525',
        borderLeft: '1px solid #3a3a3a',
        padding: '20px',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, sans-serif',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid #3a3a3a',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 700,
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '20px' }}>{registry.icon}</span>
          {registry.name}
        </h3>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: '11px',
            color: '#666',
            fontFamily: 'monospace',
          }}
        >
          ID: {selectedComponent.id.slice(0, 8)}
        </p>
      </div>
      {registry.fieldConfigs.map(renderField)}
    </div>
  );
};
