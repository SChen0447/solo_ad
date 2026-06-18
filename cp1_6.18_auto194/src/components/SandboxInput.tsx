import React from 'react';
import type { InputProps } from '@/types/componentTypes';

export const SandboxInput: React.FC<InputProps> = ({
  placeholder,
  value,
  disabled,
  focused,
  primaryColor,
  backgroundColor,
  borderRadius,
  fontSize,
  paddingX,
  paddingY,
  width,
  height,
}) => {
  const [internalValue, setInternalValue] = React.useState(value);
  const [internalFocused, setInternalFocused] = React.useState(focused);

  React.useEffect(() => {
    setInternalValue(value);
  }, [value]);

  React.useEffect(() => {
    setInternalFocused(focused);
  }, [focused]);

  const isFocused = internalFocused || focused;

  return (
    <input
      type="text"
      value={internalValue}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => setInternalValue(e.target.value)}
      onFocus={() => setInternalFocused(true)}
      onBlur={() => setInternalFocused(false)}
      style={{
        width: width ? `${width}px` : '240px',
        height: height ? `${height}px` : '40px',
        backgroundColor,
        color: '#ffffff',
        fontSize: `${fontSize}px`,
        borderRadius: `${borderRadius}px`,
        padding: `${paddingY}px ${paddingX}px`,
        border: `1px solid ${isFocused ? primaryColor : '#555'}`,
        outline: 'none',
        transition: 'border-color 0.3s ease',
        fontFamily: 'system-ui, sans-serif',
        boxSizing: 'border-box',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'text',
      }}
    />
  );
};
