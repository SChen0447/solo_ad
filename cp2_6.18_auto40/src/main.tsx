import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import QuoteList from './pages/QuoteList'
import QuoteDetail from './pages/QuoteDetail'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <div className="app">
        <header className="app-header">
          <div className="container">
            <h1 className="app-title">报价管理系统</h1>
          </div>
        </header>
        <main className="app-main">
          <div className="container">
            <Routes>
              <Route path="/" element={<QuoteList />} />
              <Route path="/quotes/:id" element={<QuoteDetail />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  </React.StrictMode>
)
