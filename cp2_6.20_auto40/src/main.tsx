/* ============================================
 * React应用入口文件
 * 调用关系：此文件被 index.html 引用
 * 数据流向：BrowserRouter → App → 各页面组件
 * ============================================ */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
