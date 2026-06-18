import React from 'react';
import type { ButtonProps } from '@/types/componentTypes';

export const SandboxButton: React.FC<ButtonProps> = ({
  label,
  variant,
  disabled,
  primaryColor,
  backgroundColor,
  fontSize,
  borderRadius,
  paddingX,
  paddingY,
  width,
  height,
}) => {
  const getStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: `${fontSize}px`,
      borderRadius: `${borderRadius}px`,
      padding: `${paddingY}px ${paddingX}px`,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.15s ease',
      fontFamily: 'system-ui, sans-serif',
      fontWeight: 500,
      outline: 'none',
      border: 'none',
      width: width ? `${width}px` : undefined,
      height: height ? `${height}px` : undefined,
      boxSizing: 'border-box',
      opacity: disabled ? 0.5 : 1,
    };

    switch (variant) {
      case 'primary':
        return {
          ...base,
          backgroundColor: primaryColor,
          color: '#1e1e1e',
        };
      case 'secondary':
        return {
          ...base,
          backgroundColor: backgroundColor,
          color: primaryColor,
        };
      case 'outline':
        return {
          ...base,
          backgroundColor: 'transparent',
          color: primaryColor,
          border: `2px solid ${primaryColor}`,
        };
      case 'ghost':
        return {
          ...base,
          backgroundColor: 'transparent',
          color: primaryColor,
        };
      default:
        return base;
    }
  };

  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      style={getStyle()}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span
        style={{
          opacity: hovered && !disabled ? 0.85 : 1,
          transition: 'opacity 0.15s ease',
        }}
      >
        {label}
      </span>
    </button>
  );
};
