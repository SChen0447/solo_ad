import { Routes, Route, Link } from 'react-router-dom'
import Gallery from './pages/Gallery'
import PoemDetail from './pages/PoemDetail'
import CreatePoem from './pages/CreatePoem'

function App() {
  return (
    <div className="app">
      <nav className="app-nav">
        <Link to="/" className="nav-link">诗歌墙</Link>
        <Link to="/create" className="nav-link">+ 新建诗歌</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Gallery />} />
        <Route path="/poem/:id" element={<PoemDetail />} />
        <Route path="/create" element={<CreatePoem />} />
      </Routes>
    </div>
  )
}

export default App
