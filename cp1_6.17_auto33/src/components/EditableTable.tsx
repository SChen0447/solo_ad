import React, { useState, useRef, useEffect } from 'react';
import { InvoiceItem, Invoice } from '../types/invoice';
import { formatCurrency } from '../utils/exportHelper';

interface EditableTableProps {
  invoice: Invoice;
  onUpdate: (updates: Partial<Invoice>) => void;
}

type EditableField = keyof InvoiceItem;

const EditableTable: React.FC<EditableTableProps> = ({ invoice, onUpdate }) => {
  const [editingCell, setEditingCell] = useState<{
    rowIndex: number;
    field: EditableField;
  } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const items = invoice.items;

  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  const handleDoubleClick = (rowIndex: number, field: EditableField, value: any) => {
    setEditingCell({ rowIndex, field });
    setEditValue(String(value ?? ''));
  };

  const handleBlur = () => {
    if (!editingCell) return;

    const { rowIndex, field } = editingCell;
    const newItems = [...items];
    let newItem = { ...newItems[rowIndex] };

    if (field === 'quantity' || field === 'unit_price' || field === 'amount') {
      const numValue = parseFloat(editValue) || 0;
      (newItem as any)[field] = numValue;

      if (field === 'quantity' || field === 'unit_price') {
        newItem.amount = Number((newItem.quantity * newItem.unit_price).toFixed(2));
      }
    } else {
      (newItem as any)[field] = editValue;
    }

    newItems[rowIndex] = newItem;

    const newTotalAmount = newItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    
    onUpdate({
      items: newItems,
      total_amount_no_tax: Number(newTotalAmount.toFixed(2)),
      total_amount_tax: Number((newTotalAmount * 1.13).toFixed(2)),
      tax_amount: Number((newTotalAmount * 0.13).toFixed(2)),
    });

    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };

  const addRow = () => {
    const newItem: InvoiceItem = {
      name: '',
      spec: '',
      quantity: 0,
      unit_price: 0,
      amount: 0,
    };
    onUpdate({
      items: [...items, newItem],
    });
  };

  const deleteRow = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (items.length <= 1) {
      alert('至少保留一行商品明细');
      return;
    }
    const newItems = items.filter((_, i) => i !== index);
    const newTotalAmount = newItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    
    onUpdate({
      items: newItems,
      total_amount_no_tax: Number(newTotalAmount.toFixed(2)),
      total_amount_tax: Number((newTotalAmount * 1.13).toFixed(2)),
      tax_amount: Number((newTotalAmount * 0.13).toFixed(2)),
    });
  };

  const renderCell = (rowIndex: number, field: EditableField, value: any) => {
    const isEditing =
      editingCell?.rowIndex === rowIndex && editingCell?.field === field;

    if (isEditing) {
      return (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            padding: '4px 8px',
            border: '2px solid #1abc9c',
            borderRadius: '4px',
            fontSize: '13px',
            outline: 'none',
            backgroundColor: '#fff',
          }}
          onClick={(e) => e.stopPropagation()}
        />
      );
    }

    let displayValue: React.ReactNode = value;
    if (field === 'amount' || field === 'unit_price') {
      displayValue = formatCurrency(value || 0);
    } else if (field === 'quantity') {
      displayValue = value || 0;
    }

    return (
      <div
        style={{
          cursor: 'text',
          minHeight: '20px',
          padding: '2px 4px',
          borderRadius: '4px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(26, 188, 156, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        onDoubleClick={() => handleDoubleClick(rowIndex, field, value)}
      >
        {displayValue}
      </div>
    );
  };

  const headers = [
    { key: 'name', label: '商品名称', width: '25%' },
    { key: 'spec', label: '规格型号', width: '20%' },
    { key: 'quantity', label: '数量', width: '10%' },
    { key: 'unit_price', label: '单价', width: '15%' },
    { key: 'amount', label: '金额', width: '15%' },
    { key: 'actions', label: '操作', width: '10%' },
  ];

  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        padding: '20px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#2c3e50' }}>
          商品明细
        </h3>
        <button
          onClick={addRow}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1abc9c',
            color: '#fff',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#16a085';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#1abc9c';
          }}
        >
          + 新增行
        </button>
      </div>

      <div
        style={{
          overflowX: 'auto',
          borderRadius: '8px',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'separate',
            borderSpacing: 0,
          }}
        >
          <thead>
            <tr>
              {headers.map((header) => (
                <th
                  key={header.key}
                  style={{
                    backgroundColor: '#2c3e50',
                    color: '#fff',
                    padding: '12px 14px',
                    textAlign: 'left',
                    fontWeight: 500,
                    fontSize: '13px',
                    width: header.width,
                  }}
                >
                  {header.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr
                key={index}
                style={{
                  backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                }}
              >
                <td
                  style={{
                    padding: '10px 14px',
                    fontSize: '13px',
                    color: '#2c3e50',
                    borderBottom: '1px solid #ecf0f1',
                  }}
                >
                  {renderCell(index, 'name', item.name)}
                </td>
                <td
                  style={{
                    padding: '10px 14px',
                    fontSize: '13px',
                    color: '#7f8c8d',
                    borderBottom: '1px solid #ecf0f1',
                  }}
                >
                  {renderCell(index, 'spec', item.spec)}
                </td>
                <td
                  style={{
                    padding: '10px 14px',
                    fontSize: '13px',
                    color: '#2c3e50',
                    textAlign: 'center',
                    borderBottom: '1px solid #ecf0f1',
                  }}
                >
                  {renderCell(index, 'quantity', item.quantity)}
                </td>
                <td
                  style={{
                    padding: '10px 14px',
                    fontSize: '13px',
                    color: '#2c3e50',
                    textAlign: 'right',
                    borderBottom: '1px solid #ecf0f1',
                  }}
                >
                  {renderCell(index, 'unit_price', item.unit_price)}
                </td>
                <td
                  style={{
                    padding: '10px 14px',
                    fontSize: '13px',
                    color: '#1abc9c',
                    fontWeight: 500,
                    textAlign: 'right',
                    borderBottom: '1px solid #ecf0f1',
                  }}
                >
                  {renderCell(index, 'amount', item.amount)}
                </td>
                <td
                  style={{
                    padding: '10px 14px',
                    textAlign: 'center',
                    borderBottom: '1px solid #ecf0f1',
                  }}
                >
                  <button
                    onClick={(e) => deleteRow(index, e)}
                    style={{
                      background: 'transparent',
                      color: '#e74c3c',
                      fontSize: '12px',
                      padding: '4px 10px',
                      borderRadius: '4px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#fdf0f0';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr
              style={{
                backgroundColor: '#f5f6fa',
                fontWeight: 600,
              }}
            >
              <td
                colSpan={2}
                style={{
                  padding: '14px',
                  fontSize: '14px',
                  color: '#2c3e50',
                  borderBottomLeftRadius: '8px',
                }}
              >
                合计
              </td>
              <td
                style={{
                  padding: '14px',
                  fontSize: '14px',
                  color: '#2c3e50',
                  textAlign: 'center',
                }}
              >
                {totalQuantity}
              </td>
              <td
                style={{
                  padding: '14px',
                  fontSize: '14px',
                  color: '#2c3e50',
                  textAlign: 'right',
                }}
              >
                -
              </td>
              <td
                style={{
                  padding: '14px',
                  fontSize: '14px',
                  color: '#1abc9c',
                  textAlign: 'right',
                }}
              >
                {formatCurrency(totalAmount)}
              </td>
              <td
                style={{
                  padding: '14px',
                  borderBottomRightRadius: '8px',
                }}
              />
            </tr>
          </tfoot>
        </table>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '30px',
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid #ecf0f1',
        }}
      >
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>
            不含税金额
          </div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#2c3e50' }}>
            {formatCurrency(invoice.total_amount_no_tax)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>
            税额
          </div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#e67e22' }}>
            {formatCurrency(invoice.tax_amount)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: '#7f8c8d', marginBottom: '4px' }}>
            价税合计
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#1abc9c' }}>
            {formatCurrency(invoice.total_amount_tax)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditableTable;
