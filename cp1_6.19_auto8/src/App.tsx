import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import PollList from '@/pages/PollList'
import VotePage from '@/pages/VotePage'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PollList />} />
        <Route path="/vote/:id" element={<VotePage />} />
      </Routes>
    </Router>
  )
}
