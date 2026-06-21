import React from 'react';

export interface ButtonProps {
  text: string;
  size: 'small' | 'medium' | 'large';
  color: string;
  borderRadius: number;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ text, size, color, borderRadius, disabled = false }) => {
  const sizeStyles: Record<string, React.CSSProperties> = {
    small: { padding: '6px 12px', fontSize: '12px' },
    medium: { padding: '10px 20px', fontSize: '14px' },
    large: { padding: '14px 28px', fontSize: '16px' },
  };

  const buttonStyle: React.CSSProperties = {
    ...sizeStyles[size],
    backgroundColor: color,
    borderRadius: `${borderRadius}px`,
    color: '#ffffff',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 200ms ease',
    fontWeight: 500,
  };

  return (
    <button style={buttonStyle} disabled={disabled} className="playground-button">
      {text}
    </button>
  );
};

export const generateButtonCode = (props: ButtonProps): string => {
  return `<Button
  text="${props.text}"
  size="${props.size}"
  color="${props.color}"
  borderRadius={${props.borderRadius}}
  disabled={${props.disabled}}
/>`;
};

export const defaultButtonProps: ButtonProps = {
  text: '点击按钮',
  size: 'medium',
  color: '#6c63ff',
  borderRadius: 8,
  disabled: false,
};
