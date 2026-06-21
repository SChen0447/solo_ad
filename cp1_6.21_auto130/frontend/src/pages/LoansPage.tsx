import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, BookOpen, CheckCircle, AlertTriangle } from 'lucide-react';
import type { Loan } from '../types';
import { loansApi } from '../api';
import './LoansPage.css';

export default function LoansPage() {
  const navigate = useNavigate();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'borrowed' | 'returned'>('all');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const response = await loansApi.getLoans();
      setLoans(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const handleReturn = async (loanId: string) => {
    if (processingId) return;
    
    if (!confirm('确认归还这本书吗？')) return;

    try {
      setProcessingId(loanId);
      const response = await loansApi.returnBook(loanId);
      setLoans((prev) => 
        prev.map((loan) => 
          loan.id === loanId ? response.data : loan
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : '归还失败');
    } finally {
      setProcessingId(null);
    }
  };

  const handleBorrowMore = () => {
    navigate('/');
  };

  const filteredLoans = loans.filter((loan) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'borrowed') return loan.status === 'borrowed' || loan.status === 'overdue';
    if (activeTab === 'returned') return loan.status === 'returned';
    return true;
  });

  const getStatusBadge = (status: Loan['status']) => {
    switch (status) {
      case 'borrowed':
        return (
          <span className="status-badge borrowed">
            <Clock size={12} />
            借阅中
          </span>
        );
      case 'returned':
        return (
          <span className="status-badge returned">
            <CheckCircle size={12} />
            已归还
          </span>
        );
      case 'overdue':
        return (
          <span className="status-badge overdue">
            <AlertTriangle size={12} />
            已超期
          </span>
        );
      default:
        return null;
    }
  };

  const getDaysRemaining = (dueDate: string, status: Loan['status']) => {
    if (status === 'returned') return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const borrowedCount = loans.filter(l => l.status === 'borrowed' || l.status === 'overdue').length;
  const returnedCount = loans.filter(l => l.status === 'returned').length;

  return (
    <div className="loans-page">
      <div className="page-header">
        <h1 className="page-title">📖 我的借阅</h1>
        <p className="page-subtitle">管理你的借阅记录</p>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon total">
            <BookOpen size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{loans.length}</span>
            <span className="stat-label">全部借阅</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon borrowed">
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{borrowedCount}</span>
            <span className="stat-label">借阅中</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon returned">
            <CheckCircle size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{returnedCount}</span>
            <span className="stat-label">已归还</span>
          </div>
        </div>
      </div>

      <div className="tab-buttons">
        {[
          { key: 'all', label: '全部' },
          { key: 'borrowed', label: '借阅中' },
          { key: 'returned', label: '已归还' },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="loading-container">
          <div className="spinner" />
        </div>
      )}

      {error && (
        <div className="error-message">
          <p>加载失败: {error}</p>
        </div>
      )}

      {!loading && !error && filteredLoans.length === 0 && (
        <div className="empty-state">
          <BookOpen size={48} />
          <p>暂无借阅记录</p>
          <button className="primary-button" onClick={handleBorrowMore}>
            去借书
          </button>
        </div>
      )}

      {!loading && !error && filteredLoans.length > 0 && (
        <div className="loans-list">
          {filteredLoans.map((loan) => {
            const daysRemaining = getDaysRemaining(loan.due_date, loan.status);
            const isOverdue = loan.status === 'overdue';

            return (
              <div
                key={loan.id}
                className={`loan-card ${isOverdue ? 'overdue' : ''}`}
              >
                <div 
                  className="loan-book-cover"
                  style={{ background: loan.cover_gradient }}
                  onClick={() => navigate(`/book/${loan.book_id}`)}
                >
                  <span>{loan.title.charAt(0)}</span>
                </div>

                <div className="loan-info">
                  <div className="loan-header">
                    <h3 
                      className="loan-title"
                      onClick={() => navigate(`/book/${loan.book_id}`)}
                    >
                      {loan.title}
                    </h3>
                    {getStatusBadge(loan.status)}
                  </div>
                  <p className="loan-author">{loan.author}</p>

                  <div className="loan-dates">
                    <div className="date-item">
                      <Calendar size={14} />
                      <span>借阅：{formatDate(loan.borrow_date)}</span>
                    </div>
                    <div className="date-item">
                      <Clock size={14} />
                      <span>应还：{formatDate(loan.due_date)}</span>
                    </div>
                    {loan.return_date && (
                      <div className="date-item">
                        <CheckCircle size={14} />
                        <span>归还：{formatDate(loan.return_date)}</span>
                      </div>
                    )}
                  </div>

                  {daysRemaining !== null && (
                    <div className={`days-remaining ${isOverdue ? 'warning' : ''}`}>
                      {isOverdue ? (
                        <span className="warning-text">
                          <AlertTriangle size={14} />
                          已超期 {Math.abs(daysRemaining)} 天
                        </span>
                      ) : (
                        <span>还剩 {daysRemaining} 天</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="loan-actions">
                  {(loan.status === 'borrowed' || loan.status === 'overdue') && (
                    <button
                      className="return-button"
                      onClick={() => handleReturn(loan.id)}
                      disabled={processingId === loan.id}
                    >
                      {processingId === loan.id ? (
                        <>
                          <div className="small-spinner" />
                          <span>归还中...</span>
                        </>
                      ) : (
                        '归还'
                      )}
                    </button>
                  )}
                  {loan.status === 'returned' && (
                    <button
                      className="primary-button small"
                      onClick={() => navigate(`/book/${loan.book_id}`)}
                    >
                      再次借阅
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
