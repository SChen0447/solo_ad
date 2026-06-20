import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import Home from '@/pages/Home'
import AdminPage from '@/pages/AdminPage'
import Navbar from '@/components/Navbar'

function PageWrapper() {
  const location = useLocation()
  return (
    <div key={location.pathname} className="page-fade-enter">
      <Routes location={location}>
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <Navbar />
      <PageWrapper />
    </Router>
  )
}
