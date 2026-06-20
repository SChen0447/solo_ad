interface TabItem {
  key: string;
  label: string;
}

interface TabBarProps {
  tabs: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}

export default function TabBar({ tabs, activeKey, onChange }: TabBarProps) {
  return (
    <div className="profile-tabs">
      {tabs.map(tab => (
        <button
          key={tab.key}
          className={`profile-tab ${activeKey === tab.key ? 'active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
