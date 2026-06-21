import React from 'react';
import { ComponentType, ComponentInfo } from '../types';

interface ComponentListProps {
  selectedComponent: ComponentType;
  onSelect: (component: ComponentType) => void;
}

const components: ComponentInfo[] = [
  { id: ComponentType.BUTTON, name: '按钮', icon: '🔘' },
  { id: ComponentType.CARD, name: '卡片', icon: '🃏' },
  { id: ComponentType.FORM_INPUT, name: '表单输入框', icon: '📝' },
  { id: ComponentType.NAVBAR, name: '导航栏', icon: '🧭' },
  { id: ComponentType.ALERT, name: '警告提示', icon: '⚠️' },
  { id: ComponentType.PAGINATION, name: '分页器', icon: '📄' }
];

const ComponentList: React.FC<ComponentListProps> = ({ selectedComponent, onSelect }) => {
  return (
    <aside className="component-list">
      <div className="component-list__header">
        <h2>组件列表</h2>
      </div>
      <ul className="component-list__items">
        {components.map((component) => (
          <li
            key={component.id}
            className={`component-list__item ${
              selectedComponent === component.id ? 'is-active' : ''
            }`}
            onClick={() => onSelect(component.id)}
          >
            <span className="component-list__icon">{component.icon}</span>
            <span className="component-list__name">{component.name}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export default ComponentList;
