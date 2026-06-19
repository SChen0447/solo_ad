import { useCallback, useRef, useState } from 'react';
import { TypographySample } from '@/types';
import { useTypographyStore } from '@/store/typographyStore';

export default function ImportButton() {
  const importSamples = useTypographyStore((s) => s.importSamples);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setImporting(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (Array.isArray(data)) {
            const validSamples: TypographySample[] = data.map(
              (item: Partial<TypographySample>) => ({
                id: item.id || crypto.randomUUID(),
                text: item.text || '',
                fontFamily: item.fontFamily || 'Roboto',
                fontSize: item.fontSize || 16,
                lineHeight: item.lineHeight || 1.5,
                fontWeight: item.fontWeight || 400,
                color: item.color || '#333333',
              })
            );
            importSamples(validSamples);
          }
        } catch {
          console.error('Invalid JSON file');
        } finally {
          setImporting(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };
      reader.readAsText(file);
    },
    [importSamples]
  );

  return (
    <>
      <button
        onClick={handleImport}
        className={`toolbar-btn ${importing ? 'opacity-60' : ''}`}
        disabled={importing}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <span>Import</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  );
}
