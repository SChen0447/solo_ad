import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import RecipeList from './pages/RecipeList'
import RecipeDetail from './pages/RecipeDetail'
import RecipeAdd from './pages/RecipeAdd'
import Recommendation from './pages/Recommendation'
import './styles/global.css'

function App() {
  return (
    <Router>
      <div className="navbar">
        <h1>🍜 美食探索</h1>
        <nav>
          <NavLink to="/recipes" className={({ isActive }) => (isActive ? 'active' : '')}>
            菜谱列表
          </NavLink>
          <NavLink to="/recipes/add" className={({ isActive }) => (isActive ? 'active' : '')}>
            发布菜谱
          </NavLink>
          <NavLink to="/feed" className={({ isActive }) => (isActive ? 'active' : '')}>
            智能推荐
          </NavLink>
        </nav>
      </div>

      <Routes>
        <Route path="/" element={<Navigate to="/recipes" replace />} />
        <Route path="/recipes" element={<RecipeList />} />
        <Route path="/recipes/add" element={<RecipeAdd />} />
        <Route path="/recipes/:id" element={<RecipeDetail />} />
        <Route path="/feed" element={<Recommendation />} />
      </Routes>

      <div className="footer">
        © 2024 美食探索平台 - 记录与分享美味
      </div>
    </Router>
  )
}

export default App
