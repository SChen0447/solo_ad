import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import './styles/global.css'
import { BrandProject, ViewType } from './types'
import BrandManager from './modules/brand/BrandManager'
import BrandDetail from './modules/brand/BrandDetail'
import ColorPaletteGenerator from './modules/color/ColorPaletteGenerator'

function App() {
  const [view, setView] = useState<ViewType>('home')
  const [selectedProject, setSelectedProject] = useState<BrandProject | null>(null)

  const handleSelectProject = (project: BrandProject) => {
    setSelectedProject(project)
    setView('detail')
  }

  const handleUpdateProject = (project: BrandProject) => {
    setSelectedProject(project)
  }

  const handleBackToHome = () => {
    setView('home')
    setSelectedProject(null)
  }

  const handleOpenGenerator = () => {
    setView('generator')
  }

  return (
    <React.StrictMode>
      {view === 'home' && (
        <BrandManager
          onSelectProject={handleSelectProject}
          onOpenGenerator={handleOpenGenerator}
        />
      )}
      {view === 'detail' && selectedProject && (
        <BrandDetail
          project={selectedProject}
          onBack={handleBackToHome}
          onUpdate={handleUpdateProject}
        />
      )}
      {view === 'generator' && (
        <ColorPaletteGenerator onBack={handleBackToHome} />
      )}
    </React.StrictMode>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
