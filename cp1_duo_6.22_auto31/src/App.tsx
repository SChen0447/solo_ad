import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Generator from './components/Generator'
import Postcard from './components/Postcard'

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/" element={<Generator />} />
          <Route path="/postcard/:id" element={<Postcard />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  )
}

export default App
