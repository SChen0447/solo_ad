import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LiveDashboard from '@/pages/LiveDashboard'
import AdminPanel from '@/pages/AdminPanel'

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LiveDashboard />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
