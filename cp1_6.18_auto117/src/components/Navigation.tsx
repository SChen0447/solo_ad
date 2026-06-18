import { useAppStore } from '../store/useAppStore';

const navItems = [
  { key: 'editor', icon: '🎬', label: '创作' },
  { key: 'export', icon: '📤', label: '导出' },
];

export default function Navigation() {
  const page = useAppStore(s => s.page);
  const setPage = useAppStore(s => s.setPage);
  const isMobileMenuOpen = useAppStore(s => s.isMobileMenuOpen);
  const setMobileMenuOpen = useAppStore(s => s.setMobileMenuOpen);
  const readOnlyMode = useAppStore(s => s.readOnlyMode);

  return (
    <>
      <button
        className="hamburger-btn"
        onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="菜单"
      >
        {isMobileMenuOpen ? '✕' : '☰'}
      </button>
      {isMobileMenuOpen && (
        <div
          className="mobile-backdrop open"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <nav className={`nav-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="nav-logo">🎬</div>
        <div className="nav-items">
          {navItems.map(item => {
            const disabled = readOnlyMode && item.key === 'export';
            return (
              <div
                key={item.key}
                className={`nav-item ${page === item.key ? 'active' : ''}`}
                onClick={() => {
                  if (disabled) return;
                  setPage(item.key as 'editor' | 'export');
                  setMobileMenuOpen(false);
                }}
                style={{ opacity: disabled ? 0.4 : 1 }}
              >
                <span className="nav-item-icon">{item.icon}</span>
                <span className="nav-item-label">{item.label}</span>
              </div>
            );
          })}
        </div>
      </nav>
    </>
  );
}
