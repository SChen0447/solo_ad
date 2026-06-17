import './MainMenu.css';

interface MainMenuProps {
  onNewGame: () => void;
  onLoadGame: () => void;
}

const MainMenu = ({ onNewGame, onLoadGame }: MainMenuProps) => {
  return (
    <div className="main-menu">
      <div className="menu-content">
        <div className="game-title animate-float">
          <h1>神秘图腾</h1>
          <p className="subtitle">古代遗迹探索</p>
        </div>

        <div className="totem-decoration">
          <div className="deco-totem fire">🔥</div>
          <div className="deco-totem water">💧</div>
          <div className="deco-totem earth">🌍</div>
          <div className="deco-totem wind">🌪️</div>
        </div>

        <div className="menu-buttons">
          <button className="btn-primary menu-btn" onClick={onNewGame}>
            开始新游戏
          </button>
          <button className="btn-secondary menu-btn" onClick={onLoadGame}>
            读取存档
          </button>
        </div>

        <div className="menu-info">
          <p>探索九宫格遗迹 · 收集神秘图腾 · 解锁古老机关</p>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;
