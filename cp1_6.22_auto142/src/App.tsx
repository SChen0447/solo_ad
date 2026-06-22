import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import HomePage from './pages/HomePage'
import VolunteerProfile from './pages/VolunteerProfile'
import CreateActivity from './pages/CreateActivity'

function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/profile" element={<VolunteerProfile />} />
        <Route path="/create" element={<CreateActivity />} />
      </Routes>
    </AppProvider>
  )
}

export default App
