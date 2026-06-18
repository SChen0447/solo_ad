import { useDesignStore } from '../store/designStore';
import { darkenColor } from '../utils/colorUtils';

interface ExportButtonProps {
  onClick: () => void;
}

const ExportButton = ({ onClick }: ExportButtonProps) => {
  const { primaryColor, isExporting } = useDesignStore();
  const darkerColor = darkenColor(primaryColor, 10);

  return (
    <button
      className="export-btn"
      onClick={onClick}
      disabled={isExporting}
      style={{
        backgroundColor: primaryColor,
        '--hover-color': darkerColor
      } as React.CSSProperties}
    >
      {isExporting ? (
        <>
          <span className="btn-spinner" />
          导出中...
        </>
      ) : (
        <>
          <span className="btn-icon">📄</span>
          导出 PDF
        </>
      )}
    </button>
  );
};

export default ExportButton;
