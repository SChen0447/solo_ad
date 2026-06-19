import React, { memo } from 'react';
import { ComponentNode } from '../interfaces';
import './ComponentRenderer.css';

interface ComponentRendererProps {
  node: ComponentNode;
  selectedId: string | null;
  deletingIds: Set<string>;
  onSelect: (id: string) => void;
  onDeleteAnimationEnd: (id: string) => void;
}

const ComponentRenderer: React.FC<ComponentRendererProps> = memo(function ComponentRenderer({
  node,
  selectedId,
  deletingIds,
  onSelect,
  onDeleteAnimationEnd,
}) {
  const isSelected = selectedId === node.id;
  const isDeleting = deletingIds.has(node.id);

  const wrapperClasses = [
    'cr-wrapper',
    isSelected ? 'cr-selected' : '',
    isDeleting ? 'cr-deleting' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node.id);
  };

  const handleTransitionEnd = (e: React.TransitionEvent) => {
    if (e.propertyName === 'transform' && isDeleting) {
      onDeleteAnimationEnd(node.id);
    }
  };

  const renderChildren = () => {
    if (typeof node.children === 'string') {
      return node.children;
    }
    if (Array.isArray(node.children)) {
      return node.children.map((child) => (
        <ComponentRenderer
          key={child.id}
          node={child}
          selectedId={selectedId}
          deletingIds={deletingIds}
          onSelect={onSelect}
          onDeleteAnimationEnd={onDeleteAnimationEnd}
        />
      ));
    }
    return null;
  };

  const wrapperProps: React.HTMLAttributes<HTMLElement> = {
    className: wrapperClasses,
    onClick: handleClick,
    onTransitionEnd: handleTransitionEnd,
    'data-id': node.id,
  };

  switch (node.type) {
    case 'Button':
      return (
        <div {...wrapperProps} style={{ display: 'inline-block' }}>
          <button
            className="cr-button"
            style={node.style}
            disabled={node.props.disabled}
          >
            {renderChildren() || node.props.children || 'Button'}
          </button>
        </div>
      );

    case 'Card':
      return (
        <div
          {...wrapperProps}
          className={`${wrapperClasses} cr-card`}
          style={node.style}
        >
          {renderChildren()}
        </div>
      );

    case 'Input':
      return (
        <div {...wrapperProps} style={{ display: 'inline-block' }}>
          <input
            className="cr-input"
            style={node.style}
            placeholder={node.props.placeholder}
            defaultValue={node.props.value}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      );

    case 'Image':
      return (
        <div {...wrapperProps} style={{ display: 'inline-block' }}>
          <img
            className="cr-image"
            style={node.style}
            src={node.props.src}
            alt={node.props.alt || 'image'}
          />
        </div>
      );

    case 'Badge':
      return (
        <div {...wrapperProps} style={{ display: 'inline-block' }}>
          <span className="cr-badge" style={node.style}>
            {renderChildren() || node.props.children || 'Badge'}
          </span>
        </div>
      );

    case 'Container':
      return (
        <div
          {...wrapperProps}
          className={`${wrapperClasses} cr-container`}
          style={node.style}
        >
          {renderChildren()}
        </div>
      );

    case 'Text':
      return (
        <p
          {...wrapperProps}
          className={`${wrapperClasses} cr-text`}
          style={node.style}
        >
          {renderChildren() || node.props.children || ''}
        </p>
      );

    default:
      return (
        <div
          {...wrapperProps}
          style={{ padding: '8px', border: '1px dashed #999', ...node.style }}
        >
          <span style={{ color: '#999', fontSize: '12px' }}>
            未知组件: {(node as ComponentNode).type}
          </span>
          {renderChildren()}
        </div>
      );
  }
});

export default ComponentRenderer;
