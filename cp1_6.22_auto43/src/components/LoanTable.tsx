import { useState, useEffect, useCallback } from 'react';
import { loanApi } from '../api';
import type { Loan } from '../types';

interface Props {
  onDataChange: () => void;
  refreshTrigger: number;
}

function LoanTable({ onDataChange, refreshTrigger }: Props) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loanApi.getLoans();
      setLoans(data);
    } catch (err) {
      console.error('获取借阅记录失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans, refreshTrigger]);

  const isOverdue = (loan: Loan): boolean => {
    if (loan.returned) return false;
    const today = new Date().toISOString().split('T')[0];
    return loan.expected_return_date < today;
  };

  const handleReturn = async (loan: Loan) => {
    if (loan.returned) return;
    setProcessingId(loan.id);
    try {
      const today = new Date().toISOString().split('T')[0];
      await loanApi.updateLoan(loan.id, {
        actual_return_date: today,
        returned: true,
      });
      onDataChange();
    } catch (err: any) {
      alert(err.response?.data?.error || '归还失败');
    } finally {
      setProcessingId(null);
    }
  };

  const handleStartEditDate = (loan: Loan) => {
    setEditingId(loan.id);
    setEditDate(loan.actual_return_date || '');
  };

  const handleSaveDate = async (loan: Loan) => {
    setProcessingId(loan.id);
    try {
      await loanApi.updateLoan(loan.id, {
        actual_return_date: editDate || undefined,
      });
      onDataChange();
    } catch (err: any) {
      alert(err.response?.data?.error || '保存失败');
    } finally {
      setProcessingId(null);
      setEditingId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditDate('');
  };

  const formatDate = (date: string | null) => {
    if (!date) return '—';
    return date;
  };

  return (
    <section style={styles.section}>
      <div style={styles.sectionHeader}>
        <div>
          <h2 style={styles.sectionTitle}>📋 借阅记录</h2>
          <p style={styles.sectionSubtitle}>
            共 <strong style={styles.totalNum}>{loans.length}</strong> 条记录
            {loans.filter((l) => !l.returned).length > 0 && (
              <>
                <span style={styles.sep}>·</span>
                <span style={styles.unreturnedCount}>
                  <strong>{loans.filter((l) => !l.returned).length}</strong> 本未归还
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {loading ? (
        <div style={styles.loading}>
          <div style={styles.spinner} />
          <span>加载中...</span>
        </div>
      ) : loans.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>📋</div>
          <div style={styles.emptyText}>暂无借阅记录</div>
          <div style={styles.emptyHint}>点击图书卡片的「借出」按钮开始登记借阅</div>
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, ...styles.thBook }}>书名</th>
                <th style={{ ...styles.th, ...styles.thName }}>借阅者</th>
                <th style={styles.th}>借出日期</th>
                <th style={styles.th}>预计归还</th>
                <th style={styles.th}>实际归还</th>
                <th style={{ ...styles.th, ...styles.thStatus }}>状态</th>
                <th style={{ ...styles.th, ...styles.thAction }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan, idx) => {
                const overdue = isOverdue(loan);
                const isEditing = editingId === loan.id;
                const isProcessing = processingId === loan.id;

                return (
                  <tr
                    key={loan.id}
                    style={{
                      ...styles.tr,
                      animation: `fadeIn 0.3s ease ${idx * 0.02}s both`,
                    }}
                  >
                    <td style={{ ...styles.td, ...styles.tdBook }}>
                      <span style={styles.bookName}>{loan.book_title}</span>
                    </td>
                    <td style={{ ...styles.td, ...styles.tdName }}>
                      {loan.borrower_name}
                    </td>
                    <td style={styles.td}>{formatDate(loan.borrow_date)}</td>
                    <td style={styles.td}>
                      <span
                        style={{
                          color: overdue ? '#c53030' : '#4a5568',
                          fontWeight: overdue ? 600 : 400,
                        }}
                      >
                        {formatDate(loan.expected_return_date)}
                        {overdue && <span style={styles.overdueTag}> 逾期</span>}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {isEditing ? (
                        <div style={styles.editWrap}>
                          <input
                            type="date"
                            style={styles.dateInput}
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                          />
                          <div style={styles.editBtns}>
                            <button
                              style={styles.saveBtn}
                              onClick={() => handleSaveDate(loan)}
                              disabled={isProcessing}
                            >
                              ✓
                            </button>
                            <button
                              style={styles.cancelBtnInline}
                              onClick={handleCancelEdit}
                              disabled={isProcessing}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span
                          style={styles.editableDate}
                          onClick={() => handleStartEditDate(loan)}
                        >
                          {formatDate(loan.actual_return_date)}
                          <span style={styles.editHint}> ✏️</span>
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {loan.returned ? (
                        <span style={{ ...styles.statusBadge, ...styles.statusReturned }}>
                          ✓ 已归还
                        </span>
                      ) : overdue ? (
                        <span style={{ ...styles.statusBadge, ...styles.statusOverdue }}>
                          ⚠ 已逾期
                        </span>
                      ) : (
                        <span style={{ ...styles.statusBadge, ...styles.statusBorrowed }}>
                          📤 借出中
                        </span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {!loan.returned ? (
                        <button
                          style={{
                            ...styles.returnBtn,
                            ...(isProcessing ? styles.btnDisabled : {}),
                          }}
                          onClick={() => handleReturn(loan)}
                          disabled={isProcessing}
                        >
                          {isProcessing ? '处理中...' : '✓ 归还'}
                        </button>
                      ) : (
                        <span style={styles.doneText}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 28,
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    animation: 'fadeIn 0.5s ease 0.3s both',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1a202c',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#718096',
  },
  totalNum: {
    color: '#2b6cb0',
    fontSize: 16,
  },
  sep: {
    margin: '0 8px',
    color: '#cbd5e0',
  },
  unreturnedCount: {
    color: '#c05621',
  },
  tableWrap: {
    width: '100%',
    overflowX: 'auto',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 14,
    minWidth: 800,
  },
  th: {
    backgroundColor: '#f7fafc',
    padding: '14px 16px',
    textAlign: 'left',
    fontWeight: 600,
    color: '#4a5568',
    fontSize: 13,
    borderBottom: '2px solid #e2e8f0',
    whiteSpace: 'nowrap',
  },
  thBook: { width: '22%' },
  thName: { width: '12%' },
  thStatus: { width: '12%' },
  thAction: { width: '10%' },
  tr: {
    transition: 'background-color 0.15s ease',
  },
  td: {
    padding: '14px 16px',
    borderBottom: '1px solid #f0f4f8',
    color: '#2d3748',
    verticalAlign: 'middle',
  },
  tdBook: {},
  tdName: {},
  bookName: {
    fontWeight: 500,
    color: '#1a202c',
  },
  editableDate: {
    cursor: 'pointer',
    color: '#4a5568',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    borderRadius: 6,
    transition: 'background-color 0.15s ease',
  },
  editHint: {
    fontSize: 12,
    opacity: 0.5,
  },
  editWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  dateInput: {
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid #cbd5e0',
    fontSize: 13,
  },
  editBtns: {
    display: 'flex',
    gap: 4,
  },
  saveBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#c6f6d5',
    color: '#22543d',
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnInline: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#fed7d7',
    color: '#742a2a',
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
  },
  statusReturned: {
    backgroundColor: '#c6f6d5',
    color: '#22543d',
  },
  statusBorrowed: {
    backgroundColor: '#bee3f8',
    color: '#2a4365',
  },
  statusOverdue: {
    backgroundColor: '#fed7d7',
    color: '#742a2a',
  },
  overdueTag: {
    fontSize: 11,
    marginLeft: 4,
  },
  returnBtn: {
    padding: '6px 14px',
    borderRadius: 6,
    backgroundColor: '#48bb78',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 500,
    transition: 'background-color 0.15s ease',
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  doneText: {
    color: '#cbd5e0',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '50px 20px',
    gap: 12,
    color: '#718096',
    fontSize: 14,
  },
  spinner: {
    width: 32,
    height: 32,
    border: '3px solid #e2e8f0',
    borderTopColor: '#3182ce',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  empty: {
    padding: '50px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    border: '1px dashed #e2e8f0',
    borderRadius: 12,
  },
  emptyIcon: {
    fontSize: 48,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 500,
    color: '#4a5568',
  },
  emptyHint: {
    fontSize: 13,
    color: '#a0aec0',
  },
};

export default LoanTable;
