import React from 'react'
import ReactDOM from 'react-dom/client'
import TeacherApp from './TeacherApp'
import StudentApp from './StudentApp'

const path = window.location.pathname

const App = () => {
  if (path.startsWith('/student')) {
    return <StudentApp />
  }
  return <TeacherApp />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
