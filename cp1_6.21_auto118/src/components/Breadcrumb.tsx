import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbProps {
  items: string[];
  separatorColor: string;
  itemColor: string;
  activeColor: string;
  fontSize: number;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, separatorColor, itemColor, activeColor, fontSize }) => {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: `${fontSize}px`,
  };

  return (
    <nav style={containerStyle} className="playground-breadcrumb">
      <Home size={fontSize} color={itemColor} />
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight size={fontSize} color={separatorColor} />
          <span
            style={{
              color: index === items.length - 1 ? activeColor : itemColor,
              fontWeight: index === items.length - 1 ? 600 : 400,
              cursor: index === items.length - 1 ? 'default' : 'pointer',
              transition: 'color 200ms ease',
            }}
          >
            {item}
          </span>
        </React.Fragment>
      ))}
    </nav>
  );
};

export const generateBreadcrumbCode = (props: BreadcrumbProps): string => {
  const itemsStr = JSON.stringify(props.items);
  return `<Breadcrumb
  items={${itemsStr}}
  separatorColor="${props.separatorColor}"
  itemColor="${props.itemColor}"
  activeColor="${props.activeColor}"
  fontSize={${props.fontSize}}
/>`;
};

export const defaultBreadcrumbProps: BreadcrumbProps = {
  items: ['首页', '产品列表', '详情页'],
  separatorColor: '#666666',
  itemColor: '#b0b0b0',
  activeColor: '#6c63ff',
  fontSize: 14,
};
