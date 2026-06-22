import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import CreateIdeaPage from './pages/CreateIdeaPage'
import VotingPage from './pages/VotingPage'
import PrioritizationBoard from './pages/PrioritizationBoard'
import { Idea, getUsers, User } from './api/ideas'

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('voting')
  const [newestIdea, setNewestIdea] = useState<Idea | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const users = await getUsers()
        const defaultUser = users.find(u => u.id === 'default-user') || users[0]
        setCurrentUser(defaultUser)
      } catch (error) {
        setCurrentUser({ id: 'default-user', name: '访客用户' })
      }
    }
    fetchUser()
  }, [])

  const handleIdeaCreated = (idea: Idea) => {
    setNewestIdea(idea)
  }

  const handleNavigate = (page: string) => {
    setCurrentPage(page)
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'create':
        return <CreateIdeaPage onIdeaCreated={handleIdeaCreated} />
      case 'voting':
        return <VotingPage newIdea={newestIdea} />
      case 'board':
        return <PrioritizationBoard />
      default:
        return <VotingPage newIdea={newestIdea} />
    }
  }

  return (
    <div className="app">
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        userName={currentUser?.name || '访客用户'}
      />
      <main className="main-content">
        {renderPage()}
      </main>

      <style>{`
        * {
          box-sizing: border-box;
        }
        
        .app {
          min-height: 100vh;
          background: #F9FAFB;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
            'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
            sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        .main-content {
          padding-top: 88px;
          padding-bottom: 40px;
          min-height: 100vh;
        }
        
        body {
          margin: 0;
          padding: 0;
        }
      `}</style>
    </div>
  )
}

export default App
