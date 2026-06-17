import React, { useState, useEffect } from 'react'
import AccountPanel from './components/AccountPanel'
import CalendarGantt from './components/CalendarGantt'
import {
  Account, Task,
  getAccounts, createAccount as apiCreateAccount,
  getTasks, createTask as apiCreateTask,
  checkDuplicate as apiCheckDuplicate,
  deleteTask as apiDeleteTask,
  exportCSV as apiExportCSV,
  getHistoryData
} from './api'

const App: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      const [acc, tsk] = await Promise.all([getAccounts(), getTasks()])
      setAccounts(acc)
      setTasks(tsk)
      setLoading(false)
    }
    init()
  }, [])

  const handleCreateAccount = async (acc: Omit<Account, 'id'>) => {
    const newAcc = await apiCreateAccount(acc)
    setAccounts(prev => [...prev, newAcc])
  }

  const handleCreateTask = async (task: Omit<Task, 'id'>): Promise<Task> => {
    const newTask = await apiCreateTask(task)
    setTasks(prev => [...prev, newTask])
    return newTask
  }

  const handleDeleteTask = async (id: string): Promise<void> => {
    await apiDeleteTask(id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const handleCheckDuplicate = async (taskIds: string[]) => {
    return await apiCheckDuplicate(taskIds)
  }

  const handleExportCSV = async (): Promise<string> => {
    return await apiExportCSV()
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', backgroundColor: '#1e1e2e', color: '#e0e0f0'
      }}>
        <div style={{ fontSize: 16 }}>加载中...</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <AccountPanel
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        onSelectAccount={setSelectedAccountId}
        onCreateAccount={handleCreateAccount}
      />
      <CalendarGantt
        accounts={accounts}
        tasks={tasks}
        selectedAccountId={selectedAccountId}
        onCreateTask={handleCreateTask}
        onCheckDuplicate={handleCheckDuplicate}
        onDeleteTask={handleDeleteTask}
        onGetHistoryData={getHistoryData}
        onExportCSV={handleExportCSV}
      />
    </div>
  )
}

export default App
