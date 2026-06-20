import React from 'react';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<string, string> = {
  sm: 'width: 24px; height: 24px; font-size: 10px;',
  md: 'width: 32px; height: 32px; font-size: 12px;',
  lg: 'width: 40px; height: 40px; font-size: 14px;',
};

export const Avatar: React.FC<AvatarProps> = ({ name, size = 'md' }) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="avatar"
      style={{
        ...sizeClasses[size],
        backgroundColor: '#6c63ff',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontWeight: 600,
        fontFamily: 'Inter, sans-serif',
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
};
