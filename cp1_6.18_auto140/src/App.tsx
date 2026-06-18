import React, { useState } from 'react'
import Workspace from './components/Workspace'
import './App.css'

type AppView = 'menu' | 'single' | 'collaborative'

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('menu')

  if (view === 'single') {
    return <Workspace mode="single" />
  }

  if (view === 'collaborative') {
    return <Workspace mode="collaborative" />
  }

  return (
    <div className="app-menu">
      <div className="menu-container">
        <div className="menu-header">
          <div className="logo">🧩</div>
          <h1>拼图工坊</h1>
          <p className="subtitle">Puzzle Workshop</p>
        </div>
        
        <div className="menu-content">
          <div className="menu-card" onClick={() => setView('single')}>
            <div className="card-icon">👤</div>
            <h2>单人模式</h2>
            <p>上传图片，切割成拼图，独自挑战完成</p>
          </div>
          
          <div className="menu-card" onClick={() => setView('collaborative')}>
            <div className="card-icon">👥</div>
            <h2>协作模式</h2>
            <p>创建房间，邀请好友一起实时协作拼拼图</p>
          </div>
        </div>
        
        <div className="menu-footer">
          <p>支持 JPG / PNG / WebP 格式，最大 10MB</p>
          <p>难度可选 3×3 到 5×5</p>
        </div>
      </div>
    </div>
  )
}

export default App
