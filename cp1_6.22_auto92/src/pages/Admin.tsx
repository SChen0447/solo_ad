import { useState, useEffect, useCallback } from 'react'
import type { Book } from '@/models/types'
import { fetchBooks, updateBookStatus, addBook, login } from '@/api/bookApi'
import { borrowBook, returnBook } from '@/api/borrowApi'
import { Library, ArrowLeft, LogIn, Plus, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [books, setBooks] = useState<Book[]>([])
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newBook, setNewBook] = useState({ title: '', author: '', isbn: '', category: '文学' as const, description: '' })
  const [borrowDialog, setBorrowDialog] = useState<{ bookId: string; action: 'borrow' | 'return' } | null>(null)
  const [borrowerName, setBorrowerName] = useState('')
  const navigate = useNavigate()

  const loadBooks = useCallback(async () => {
    const data = await fetchBooks()
    setBooks(data)
  }, [])

  useEffect(() => {
    if (isAuthenticated) loadBooks()
  }, [isAuthenticated, loadBooks])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleLogin = async () => {
    const result = await login(password)
    if (result.success) {
      setIsAuthenticated(true)
      setLoginError('')
      localStorage.setItem('admin_token', result.token || '')
    } else {
      setLoginError('密码错误')
    }
  }

  const handleAction = async (bookId: string, action: 'borrow' | 'return') => {
    if (action === 'borrow') {
      setBorrowDialog({ bookId, action })
    } else {
      try {
        await returnBook(bookId)
        await loadBooks()
        setToast({ message: '归还成功', type: 'success' })
      } catch {
        setToast({ message: '操作失败', type: 'error' })
      }
    }
  }

  const confirmBorrow = async () => {
    if (!borrowDialog || !borrowerName.trim()) return
    try {
      await borrowBook(borrowDialog.bookId, borrowerName.trim())
      await loadBooks()
      setToast({ message: '借出成功', type: 'success' })
    } catch {
      setToast({ message: '操作失败', type: 'error' })
    }
    setBorrowDialog(null)
    setBorrowerName('')
  }

  const handleAddBook = async () => {
    if (!newBook.title || !newBook.author || !newBook.isbn) return
    try {
      await addBook(newBook)
      await loadBooks()
      setShowAddForm(false)
      setNewBook({ title: '', author: '', isbn: '', category: '文学', description: '' })
      setToast({ message: '添加成功', type: 'success' })
    } catch {
      setToast({ message: '添加失败', type: 'error' })
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f5e6d3' }}>
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm mx-4">
          <div className="text-center mb-6">
            <Library size={40} className="mx-auto text-[#5c3a21] mb-3" />
            <h2 className="text-xl font-bold text-[#5c3a21]">管理员登录</h2>
            <div className="h-0.5 w-12 bg-[#d69e2e] mx-auto mt-1 rounded-full" />
          </div>
          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setLoginError('') }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="请输入管理员密码"
              className="w-full px-4 py-2.5 rounded-lg border border-[#d4c4b0] text-sm text-[#5c3a21] placeholder-[#b8a898] outline-none focus:border-[#7a4e30] focus:ring-2 focus:ring-[#7a4e30]/20"
              style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(6px)' }}
            />
            {loginError && <p className="text-xs text-red-500">{loginError}</p>}
            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-[#5c3a21] hover:bg-[#7a4e30] transition-all duration-300"
            >
              <LogIn size={16} />
              登录
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-[#5c3a21] bg-[#f5e6d3] hover:bg-[#e8d5c1] transition-all duration-300"
            >
              <ArrowLeft size={16} />
              返回首页
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#f5e6d3' }}>
      {toast && (
        <div className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center py-3 text-white text-sm font-medium ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          <CheckCircle size={16} className="mr-2" />
          {toast.message}
        </div>
      )}

      <header className="bg-[#5c3a21] text-white shadow-lg">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Library size={28} className="text-[#d69e2e]" />
            <div>
              <h1 className="text-xl font-bold">管理后台</h1>
              <div className="h-0.5 w-16 bg-[#d69e2e] mt-0.5 rounded-full" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#7a4e30] hover:bg-[#8b6040] transition-all duration-300"
            >
              <Plus size={14} />
              添加新书
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-[#5c3a21] bg-white hover:bg-[#f5e6d3] transition-all duration-300"
            >
              <ArrowLeft size={14} />
              返回首页
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto px-6 py-6">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: '#2d3748' }}>
                  <th className="text-left px-4 py-3 text-sm font-medium text-white">书名</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-white">作者</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-white">状态</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-white">借出次数</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-white">最后借阅人</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-white">操作</th>
                </tr>
              </thead>
              <tbody>
                {books.map((book, i) => (
                  <tr
                    key={book.id}
                    className={`border-b border-[#e2e8f0] hover:bg-[#f7fafc] transition-colors ${i % 2 === 1 ? 'bg-[#fafafa]' : ''}`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-[#2d3748]">{book.title}</td>
                    <td className="px-4 py-3 text-sm text-[#4a5568]">{book.author}</td>
                    <td className="px-4 py-3">
                      {book.status === 'available' ? (
                        <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1" />在馆
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1" />借出
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#4a5568]">{book.borrowCount}</td>
                    <td className="px-4 py-3 text-sm text-[#4a5568]">{book.lastBorrower || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      {book.status === 'available' ? (
                        <button
                          onClick={() => handleAction(book.id, 'borrow')}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-[#5c3a21] hover:bg-[#7a4e30] transition-all duration-300"
                          style={{ borderRadius: '8px' }}
                        >
                          借出
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction(book.id, 'return')}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#5c3a21] bg-[#f5e6d3] hover:bg-[#e8d5c1] transition-all duration-300"
                          style={{ borderRadius: '8px' }}
                        >
                          归还
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowAddForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#5c3a21] mb-4">添加新书</h3>
            <div className="space-y-3">
              <input placeholder="书名" value={newBook.title} onChange={e => setNewBook({ ...newBook, title: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#d4c4b0] text-sm outline-none focus:border-[#7a4e30]" />
              <input placeholder="作者" value={newBook.author} onChange={e => setNewBook({ ...newBook, author: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#d4c4b0] text-sm outline-none focus:border-[#7a4e30]" />
              <input placeholder="ISBN" value={newBook.isbn} onChange={e => setNewBook({ ...newBook, isbn: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#d4c4b0] text-sm outline-none focus:border-[#7a4e30]" />
              <select value={newBook.category} onChange={e => setNewBook({ ...newBook, category: e.target.value as any })} className="w-full px-3 py-2 rounded-lg border border-[#d4c4b0] text-sm outline-none focus:border-[#7a4e30]">
                <option value="文学">文学</option>
                <option value="科技">科技</option>
                <option value="历史">历史</option>
                <option value="艺术">艺术</option>
                <option value="生活">生活</option>
              </select>
              <textarea placeholder="内容简介" value={newBook.description} onChange={e => setNewBook({ ...newBook, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#d4c4b0] text-sm outline-none focus:border-[#7a4e30] h-20 resize-none" />
              <div className="flex gap-3 pt-2">
                <button onClick={handleAddBook} className="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-[#5c3a21] hover:bg-[#7a4e30] transition-all duration-300" style={{ borderRadius: '8px' }}>确认添加</button>
                <button onClick={() => setShowAddForm(false)} className="flex-1 py-2 rounded-lg text-sm font-medium text-[#5c3a21] bg-[#f5e6d3] hover:bg-[#e8d5c1] transition-all duration-300" style={{ borderRadius: '8px' }}>取消</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {borrowDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => { setBorrowDialog(null); setBorrowerName('') }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#5c3a21] mb-4">借出书籍</h3>
            <input
              placeholder="请输入借阅人姓名"
              value={borrowerName}
              onChange={e => setBorrowerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmBorrow()}
              className="w-full px-3 py-2 rounded-lg border border-[#d4c4b0] text-sm outline-none focus:border-[#7a4e30] mb-4"
            />
            <div className="flex gap-3">
              <button onClick={confirmBorrow} className="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-[#5c3a21] hover:bg-[#7a4e30] transition-all duration-300" style={{ borderRadius: '8px' }}>确认借出</button>
              <button onClick={() => { setBorrowDialog(null); setBorrowerName('') }} className="flex-1 py-2 rounded-lg text-sm font-medium text-[#5c3a21] bg-[#f5e6d3] hover:bg-[#e8d5c1] transition-all duration-300" style={{ borderRadius: '8px' }}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
