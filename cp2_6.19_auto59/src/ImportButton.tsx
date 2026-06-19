import { useRef } from 'react';
import { Sample, TypographyConfig } from './types';
import './buttons.css';

interface ImportButtonProps {
  onImport: (samples: Sample[]) => void;
}

function ImportButton({ onImport }: ImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          const samples: Sample[] = data.map((item: TypographyConfig, index: number) => ({
            id: `imported-${Date.now()}-${index}`,
            config: {
              text: item.text || '',
              fontFamily: item.fontFamily || 'Roboto',
              fontSize: item.fontSize || 16,
              lineHeight: item.lineHeight || 1.5,
              fontWeight: item.fontWeight || 400,
              color: item.color || '#333333',
            },
          }));
          onImport(samples);
        }
      } catch (err) {
        console.error('Failed to parse config file:', err);
        alert('配置文件格式错误，请导入有效的 JSON 文件');
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <label className="toolbar-btn toolbar-btn--secondary import-btn">
      导入配置
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
      />
    </label>
  );
}

export default ImportButton;
