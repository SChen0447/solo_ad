import React from 'react';
import type { ComponentProps, ComponentType, ComponentDiff } from '@/types/componentTypes';
import { SandboxButton } from '@/components/SandboxButton';
import { SandboxInput } from '@/components/SandboxInput';
import { SandboxCard } from '@/components/SandboxCard';
import { SandboxModal } from '@/components/SandboxModal';
import { SandboxTabs } from '@/components/SandboxTabs';

const componentMap: Record<ComponentType, React.FC<any>> = {
  button: SandboxButton,
  input: SandboxInput,
  card: SandboxCard,
  modal: SandboxModal,
  tabs: SandboxTabs,
};

interface RenderComponentProps {
  component: ComponentProps;
  diffs?: ComponentDiff[];
  diffSide?: 'A' | 'B';
}

const RenderComponent: React.FC<RenderComponentProps> = ({ component, diffs, diffSide }) => {
  const Component = componentMap[component.type];
  if (!Component) return null;

  const hasDiff = diffs?.some((d) => d.componentId === component.id);
  const componentDiffs = diffs?.filter((d) => d.componentId === component.id) || [];

  const diffBorderColor = diffSide === 'A' ? 'rgba(255, 0, 0, 0.6)' : 'rgba(0, 255, 0, 0.6)';

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        border: hasDiff ? `2px dashed ${diffBorderColor}` : 'none',
        borderRadius: '2px',
      }}
    >
      <Component {...component} />
      {hasDiff && (
        <div
          style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            backgroundColor: diffSide === 'A' ? 'rgba(255, 0, 0, 0.9)' : 'rgba(0, 200, 0, 0.9)',
            color: '#fff',
            fontSize: '11px',
            padding: '2px 6px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            maxWidth: '150px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            zIndex: 10,
            fontFamily: 'system-ui, sans-serif',
          }}
          title={componentDiffs.map((d) => `${d.propName}不同`).join(', ')}
        >
          {componentDiffs.map((d) => `${d.propName}不同`).join(', ')}
        </div>
      )}
    </div>
  );
};

export interface ComponentRendererProps {
  components: ComponentProps[];
  diffs?: ComponentDiff[];
  diffSide?: 'A' | 'B';
  containerWidth?: number;
  containerHeight?: number;
  backgroundColor?: string;
  showGrid?: boolean;
}

export const ComponentRenderer: React.FC<ComponentRendererProps> = ({
  components,
  diffs,
  diffSide,
  containerWidth = 960,
  containerHeight = 540,
  backgroundColor = '#2d2d2d',
  showGrid = false,
}) => {
  return (
    <div
      style={{
        position: 'relative',
        width: `${containerWidth}px`,
        height: `${containerHeight}px`,
        backgroundColor,
        overflow: 'hidden',
        backgroundImage: showGrid
          ? `linear-gradient(#3a3a3a 1px, transparent 1px),
             linear-gradient(90deg, #3a3a3a 1px, transparent 1px)`
          : 'none',
        backgroundSize: showGrid ? '20px 20px' : undefined,
      }}
    >
      {components.map((component) => (
        <div
          key={component.id}
          style={{
            position: 'absolute',
            left: `${component.x}px`,
            top: `${component.y}px`,
            animation: 'fadeIn 0.15s ease',
          }}
        >
          <RenderComponent component={component} diffs={diffs} diffSide={diffSide} />
        </div>
      ))}
    </div>
  );
};
