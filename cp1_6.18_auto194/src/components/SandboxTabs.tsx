import React from 'react';
import type { TabsProps } from '@/types/componentTypes';

export const SandboxTabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  primaryColor,
  backgroundColor,
  borderRadius,
  width,
  height,
}) => {
  const [internalActive, setInternalActive] = React.useState(activeTab);

  React.useEffect(() => {
    setInternalActive(activeTab);
  }, [activeTab]);

  const displayTabs = tabs.length > 0 ? tabs : ['标签一', '标签二', '标签三'];

  return (
    <div
      style={{
        width: width ? `${width}px` : '360px',
        height: height ? `${height}px` : '200px',
        backgroundColor,
        borderRadius: `${borderRadius}px`,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, sans-serif',
        overflow: 'hidden',
        transition: 'all 0.15s ease',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #3a3a3a',
          flexShrink: 0,
        }}
      >
        {displayTabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => setInternalActive(index)}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: internalActive === index ? `2px solid ${primaryColor}` : '2px solid transparent',
              color: internalActive === index ? primaryColor : '#b0b0b0',
              fontSize: '14px',
              fontWeight: internalActive === index ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              fontFamily: 'inherit',
            }}
          >
            {tab}
          </button>
        ))}
      </div>
      <div
        style={{
          flex: 1,
          padding: '20px',
          color: '#e0e0e0',
          fontSize: '14px',
          lineHeight: 1.6,
        }}
      >
        内容区域 - {displayTabs[internalActive] || '暂无内容'}
      </div>
    </div>
  );
};
