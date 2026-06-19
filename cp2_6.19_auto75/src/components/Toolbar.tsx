import { useTypographyStore } from '@/store/typographyStore';
import ExportButton from './ExportButton';
import ImportButton from './ImportButton';

export default function Toolbar() {
  const unifiedMode = useTypographyStore((s) => s.unifiedMode);
  const setUnifiedMode = useTypographyStore((s) => s.setUnifiedMode);
  const addSample = useTypographyStore((s) => s.addSample);

  return (
    <div className="toolbar">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setUnifiedMode(!unifiedMode)}
          className={`unified-toggle ${unifiedMode ? 'unified-toggle-active' : ''}`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
          <span>Unified Edit</span>
        </button>

        <button onClick={addSample} className="toolbar-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Add Sample</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <ImportButton />
        <ExportButton />
      </div>
    </div>
  );
}
