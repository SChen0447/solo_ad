import { useState } from 'react';
import { Sample } from './types';
import './buttons.css';

interface ExportButtonProps {
  samples: Sample[];
}

function ExportButton({ samples }: ExportButtonProps) {
  const [isFlashing, setIsFlashing] = useState(false);
  const [isScaling, setIsScaling] = useState(false);

  const handleExport = () => {
    setIsScaling(true);
    setTimeout(() => setIsScaling(false), 300);

    const configData = samples.map((s) => ({
      text: s.config.text,
      fontFamily: s.config.fontFamily,
      fontSize: s.config.fontSize,
      lineHeight: s.config.lineHeight,
      fontWeight: s.config.fontWeight,
      color: s.config.color,
    }));

    const jsonStr = JSON.stringify(configData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'typography-config.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 500);
  };

  const btnClasses = [
    'toolbar-btn',
    'toolbar-btn--primary',
    isFlashing ? 'export-btn--flash' : '',
    isScaling ? 'export-btn--scale' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={btnClasses} onClick={handleExport}>
      导出配置
    </button>
  );
}

export default ExportButton;
