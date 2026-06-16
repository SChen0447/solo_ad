import React from 'react';
import { Invoice } from '../types/invoice';
import { formatCurrency, formatDate } from '../utils/exportHelper';

interface InvoiceCardProps {
  invoice: Invoice;
  isSelected: boolean;
  isChecked: boolean;
  onClick: () => void;
  onCheck: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

const InvoiceCard: React.FC<InvoiceCardProps> = ({
  invoice,
  isSelected,
  isChecked,
  onClick,
  onCheck,
  onDelete,
}) => {
  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        padding: '12px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: isSelected
          ? '0 4px 16px rgba(0, 0, 0, 0.15)'
          : '0 2px 8px rgba(0, 0, 0, 0.1)',
        cursor: 'pointer',
        transition: 'all 200ms ease',
        borderLeft: isSelected ? '4px solid #1abc9c' : '4px solid transparent',
        marginBottom: '10px',
      }}
      className="invoice-card"
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.15)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
        }
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={onCheck as any}
          onClick={onCheck}
          style={{
            width: '16px',
            height: '16px',
            cursor: 'pointer',
            accentColor: '#1abc9c',
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onDelete}
          style={{
            background: 'transparent',
            color: '#95a5a6',
            fontSize: '16px',
            padding: '2px 6px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#fdf0f0';
            e.currentTarget.style.color = '#e74c3c';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#95a5a6';
          }}
        >
          🗑️
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px', paddingLeft: '24px' }}>
        <div
          style={{
            width: '60px',
            height: '80px',
            borderRadius: '6px',
            backgroundColor: '#f5f6fa',
            overflow: 'hidden',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {invoice.thumbnail ? (
            <img
              src={invoice.thumbnail}
              alt="发票缩略图"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <span style={{ fontSize: '24px' }}>📄</span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#2c3e50',
              marginBottom: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            发票号：{invoice.invoice_number}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: '#7f8c8d',
              marginBottom: '4px',
            }}
          >
            {formatDate(invoice.invoice_date)}
          </div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: '#1abc9c',
            }}
          >
            {formatCurrency(invoice.total_amount_tax)}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: '#95a5a6',
              marginTop: '2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {invoice.buyer_name}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginTop: '8px',
          paddingLeft: '24px',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            backgroundColor: '#ecf0f1',
            color: '#7f8c8d',
            borderRadius: '10px',
          }}
        >
          {invoice.items.length} 项商品
        </span>
      </div>
    </div>
  );
};

export default InvoiceCard;
