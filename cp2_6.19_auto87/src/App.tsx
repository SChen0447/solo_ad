import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PollListPage from './pages/PollListPage'
import CreatePollPage from './pages/CreatePollPage'
import PollDetailPage from './pages/PollDetailPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PollListPage />} />
        <Route path="/create" element={<CreatePollPage />} />
        <Route path="/poll/:id" element={<PollDetailPage />} />
      </Routes>
    </BrowserRouter>
  )
}
