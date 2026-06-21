export interface GridConfig {
  templateColumns: string;
  templateRows: string;
  gap: number;
  justifyItems: 'start' | 'end' | 'center' | 'stretch';
  alignItems: 'start' | 'end' | 'center' | 'stretch';
}

export interface GridItemConfig {
  gridColumn: string;
  gridRow: string;
  justifySelf: 'start' | 'end' | 'center' | 'stretch';
  alignSelf: 'start' | 'end' | 'center' | 'stretch';
}

export const defaultGridConfig: GridConfig = {
  templateColumns: '1fr 1fr 1fr',
  templateRows: 'auto',
  gap: 10,
  justifyItems: 'stretch',
  alignItems: 'stretch'
};

export const defaultItemConfig: GridItemConfig = {
  gridColumn: 'auto',
  gridRow: 'auto',
  justifySelf: 'stretch',
  alignSelf: 'stretch'
};

export const MORANDI_COLORS = [
  '#c9b6a0',
  '#a3c4b5',
  '#b5a8d5',
  '#e8c4a8'
];

export function getGridContainerStyle(config: GridConfig): React.CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: config.templateColumns,
    gridTemplateRows: config.templateRows,
    gap: `${config.gap}px`,
    justifyItems: config.justifyItems,
    alignItems: config.alignItems,
    width: '100%',
    height: '100%',
    padding: '20px',
    boxSizing: 'border-box'
  };
}

export function getGridItemStyle(
  itemConfig: GridItemConfig,
  index: number
): React.CSSProperties {
  const colorIndex = index % MORANDI_COLORS.length;
  return {
    gridColumn: itemConfig.gridColumn,
    gridRow: itemConfig.gridRow,
    justifySelf: itemConfig.justifySelf,
    alignSelf: itemConfig.alignSelf,
    backgroundColor: MORANDI_COLORS[colorIndex],
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 600,
    color: '#374151',
    cursor: 'pointer',
    minWidth: '60px',
    minHeight: '60px',
    transition: 'box-shadow 0.2s, transform 0.2s, border 0.2s',
    position: 'relative',
    overflow: 'hidden'
  };
}

export function generateCSSCode(config: GridConfig): string {
  return `.grid-container {
  display: grid;
  grid-template-columns: ${config.templateColumns};
  grid-template-rows: ${config.templateRows};
  gap: ${config.gap}px;
  justify-items: ${config.justifyItems};
  align-items: ${config.alignItems};
}`;
}

export function createDefaultItems(count: number): GridItemConfig[] {
  return Array.from({ length: count }, () => ({ ...defaultItemConfig }));
}
