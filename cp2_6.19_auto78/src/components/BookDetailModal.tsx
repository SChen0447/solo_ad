import { useState } from 'react';
import type { Book } from '../types';

interface BookDetailModalProps {
  book: Book;
  currentReader: string;
  onClose: () => void;
  onBorrow: (bookId: string) => void;
  onReturn: (bookId: string) => void;
  onReserve: (bookId: string) => void;
}

function BookDetailModal({
  book,
  currentReader,
  onClose,
  onBorrow,
  onReturn,
  onReserve,
}: BookDetailModalProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'borrow' | 'return' | 'reserve'>('borrow');

  const isBorrower = book.borrower === currentReader;
  const isInReserveQueue = book.reserveQueue.includes(currentReader);
  const isOverdue = book.borrowDate
    ? (Date.now() - new Date(book.borrowDate).getTime()) / (1000 * 60 * 60 * 24) > 14
    : false;

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const handleActionClick = (action: 'borrow' | 'return' | 'reserve') => {
    setConfirmAction(action);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    if (confirmAction === 'borrow') {
      onBorrow(book.id);
    } else if (confirmAction === 'return') {
      onReturn(book.id);
    } else if (confirmAction === 'reserve') {
      onReserve(book.id);
    }
  };

  const getConfirmText = () => {
    switch (confirmAction) {
      case 'borrow':
        return `确认要借阅《${book.title}》吗？`;
      case 'return':
        return `确认要归还《${book.title}》吗？`;
      case 'reserve':
        return `确认要预约《${book.title}》吗？`;
      default:
        return '';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">图书详情</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="book-detail-header">
            <img
              src={book.coverUrl}
              alt={book.title}
              className="book-detail-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://picsum.photos/seed/placeholder/200/280';
              }}
            />
            <div className="book-detail-info">
              <h3 className="book-detail-title">{book.title}</h3>
              <div className="book-detail-meta">
                <p><span>作者：</span>{book.author}</p>
                <p><span>ISBN：</span>{book.isbn}</p>
                <p><span>分类：</span>{book.category}</p>
              </div>
              <span className={`detail-status ${book.status}`}>
                {book.status === 'available' ? '✓ 可借阅' : '📖 已借出'}
              </span>
              {book.status === 'borrowed' && isOverdue && (
                <div style={{ color: '#D9822B', fontSize: '13px', marginTop: '8px' }}>
                  ⚠️ 已逾期，请尽快归还
                </div>
              )}
            </div>
          </div>

          {book.status === 'borrowed' && (
            <div className="book-detail-meta" style={{ marginTop: '16px' }}>
              <p><span>借阅人：</span>{book.borrower}</p>
              <p><span>借阅日期：</span>{formatDate(book.borrowDate)}</p>
            </div>
          )}

          {book.reserveQueue.length > 0 && (
            <div className="reserve-list">
              <div className="reserve-list-title">
                预约队列（{book.reserveQueue.length}人）
              </div>
              {book.reserveQueue.map((reader, index) => (
                <div key={index} className="reserve-list-item">
                  {index + 1}. {reader}
                  {reader === currentReader && ' （您）'}
                </div>
              ))}
            </div>
          )}

          <div className="action-buttons">
            {book.status === 'available' && (
              <button
                className="btn btn-primary"
                onClick={() => handleActionClick('borrow')}
              >
                立即借阅
              </button>
            )}

            {book.status === 'borrowed' && isBorrower && (
              <button
                className="btn btn-accent"
                onClick={() => handleActionClick('return')}
              >
                归还图书
              </button>
            )}

            {book.status === 'borrowed' && !isBorrower && !isInReserveQueue && (
              <button
                className="btn btn-outline"
                onClick={() => handleActionClick('reserve')}
              >
                预约借书
              </button>
            )}

            {isInReserveQueue && (
              <button className="btn btn-ghost" disabled>
                已预约（第{book.reserveQueue.indexOf(currentReader) + 1}位）
              </button>
            )}
          </div>
        </div>
      </div>

      {showConfirm && (
        <div
          className="modal-overlay"
          style={{ zIndex: 300 }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="modal-content"
            style={{ maxWidth: '400px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">确认操作</h3>
              <button className="modal-close" onClick={() => setShowConfirm(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="confirm-dialog-text">
                <span className="confirm-dialog-highlight">{getConfirmText()}</span>
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                onClick={() => setShowConfirm(false)}
              >
                取消
              </button>
              <button className="btn btn-primary" onClick={handleConfirm}>
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookDetailModal;
