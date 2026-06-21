import React, { useState } from 'react';

export interface InputProps {
  placeholder: string;
  value: string;
  size: 'small' | 'medium' | 'large';
  borderRadius: number;
  borderColor: string;
}

export const Input: React.FC<InputProps> = ({ placeholder, value: initialValue, size, borderRadius, borderColor }) => {
  const [value, setValue] = useState(initialValue);

  const sizeStyles: Record<string, React.CSSProperties> = {
    small: { padding: '6px 10px', fontSize: '12px', height: '32px' },
    medium: { padding: '8px 12px', fontSize: '14px', height: '40px' },
    large: { padding: '10px 16px', fontSize: '16px', height: '48px' },
  };

  const inputStyle: React.CSSProperties = {
    ...sizeStyles[size],
    borderRadius: `${borderRadius}px`,
    border: `2px solid ${borderColor}`,
    backgroundColor: '#ffffff',
    color: '#333333',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color 200ms ease',
  };

  return (
    <input
      type="text"
      style={inputStyle}
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      className="playground-input"
    />
  );
};

export const generateInputCode = (props: InputProps): string => {
  return `<Input
  placeholder="${props.placeholder}"
  value="${props.value}"
  size="${props.size}"
  borderRadius={${props.borderRadius}}
  borderColor="${props.borderColor}"
/>`;
};

export const defaultInputProps: InputProps = {
  placeholder: '请输入内容...',
  value: 'Hello World',
  size: 'medium',
  borderRadius: 8,
  borderColor: '#6c63ff',
};
