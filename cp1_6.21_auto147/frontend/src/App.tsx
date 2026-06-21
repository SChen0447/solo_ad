import { Routes, Route, Link } from 'react-router-dom'
import CourseList from './pages/CourseList'
import CourseDetail from './pages/CourseDetail'
import Quiz from './pages/Quiz'
import Admin from './pages/Admin'

function Navbar() {
  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <span className="logo-icon">📚</span>
          <span>学习平台</span>
        </Link>
        <div className="nav-links">
          <Link to="/" className="nav-link">课程中心</Link>
          <Link to="/app" className="nav-link">管理后台</Link>
        </div>
      </div>
    </nav>
  )
}

function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<CourseList />} />
          <Route path="/course/:id" element={<CourseDetail />} />
          <Route path="/quiz/:courseId/:chapterId" element={<Quiz />} />
          <Route path="/app" element={<Admin />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
