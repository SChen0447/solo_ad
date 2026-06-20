import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { PixelProvider } from './store/pixelStore'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PixelProvider>
      <App />
    </PixelProvider>
  </React.StrictMode>,
)
