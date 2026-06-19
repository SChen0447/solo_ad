import { GameEngine } from './GameEngine';

function App() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <h1 style={{
        color: '#ffd700',
        fontFamily: 'monospace',
        marginBottom: '20px',
        fontSize: '28px',
        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
      }}>
        ⚔ 地牢冒险者 ⚔
      </h1>
      <GameEngine />
    </div>
  );
}

export default App;
