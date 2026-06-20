import React from 'react';
import { SensorStoreProvider } from './sensorDataModule/store.tsx';
import Dashboard from './visualizationModule/Dashboard';
import SensorCard from './visualizationModule/SensorCard';
import AlertRuleEditor from './alertsModule/AlertRuleEditor';
import AlertNotification from './alertsModule/AlertNotification';
import { SensorType } from './sensorDataModule/types';

const App: React.FC = () => {
  const sensors: SensorType[] = ['temperature', 'humidity', 'pressure'];

  return (
    <SensorStoreProvider>
      <div style={styles.appRoot}>
        <div style={styles.mainWrapper} data-app-wrapper="true">
          <div style={styles.leftColumn} data-left-col="true">
            <Dashboard />
          </div>

          <div style={styles.rightColumn} data-right-col="true">
            <div style={styles.rightSection}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>传感器状态</h3>
              </div>
              <div style={styles.sensorCards}>
                {sensors.map((s) => (
                  <SensorCard key={s} sensorType={s} />
                ))}
              </div>
            </div>

            <div style={styles.rightSection}>
              <AlertRuleEditor />
            </div>

            <div style={styles.rightSection}>
              <AlertNotification />
            </div>
          </div>
        </div>
      </div>
    </SensorStoreProvider>
  );
};

const styles: Record<string, React.CSSProperties> = {
  appRoot: {
    minHeight: '100vh',
    width: '100%',
    background: '#1a1a2e',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
    color: '#fff',
    padding: '20px',
    boxSizing: 'border-box',
  },
  mainWrapper: {
    display: 'flex',
    gap: '20px',
    maxWidth: '1600px',
    margin: '0 auto',
    height: 'calc(100vh - 40px)',
    boxSizing: 'border-box',
  },
  leftColumn: {
    width: '70%',
    minHeight: '600px',
    display: 'flex',
    flexDirection: 'column',
  },
  rightColumn: {
    width: '30%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    overflowY: 'auto',
  },
  rightSection: {
    width: '100%',
  },
  sectionHeader: {
    marginBottom: '12px',
  },
  sectionTitle: {
    color: '#fff',
    margin: 0,
    fontSize: '15px',
    fontWeight: 600,
  },
  sensorCards: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
};

export default App;

export const GlobalStyles: React.FC = () => (
  <style>{`
    * {
      box-sizing: border-box;
    }
    html, body, #root {
      margin: 0;
      padding: 0;
      height: 100%;
      background: #1a1a2e;
    }
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: rgba(255,255,255,0.03);
      border-radius: 3px;
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.1);
      border-radius: 3px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(255,255,255,0.2);
    }
    button:hover {
      filter: brightness(1.1);
    }
    button:active {
      transform: scale(0.97);
    }
    @media (max-width: 768px) {
      div[data-app-wrapper="true"] {
        flex-direction: column !important;
        height: auto !important;
      }
      div[data-left-col="true"] {
        width: 100% !important;
        min-height: 450px !important;
      }
      div[data-right-col="true"] {
        width: 100% !important;
        overflow: visible !important;
      }
    }
  `}</style>
);
