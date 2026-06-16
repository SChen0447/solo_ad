import React, { useEffect, useState, useMemo } from 'react';
import UploadZone from './components/UploadZone';
import InvoiceCard from './components/InvoiceCard';
import EditableTable from './components/EditableTable';
import { useInvoiceStore } from './store/useInvoiceStore';
import { exportInvoicesToExcel, formatCurrency, formatDate } from './utils/exportHelper';
import { Invoice } from './types/invoice';

const App: React.FC = () => {
  const {
    invoices,
    selectedInvoiceId,
    selectedIds,
    filters,
    addInvoice,
    removeInvoice,
    clearAllInvoices,
    updateInvoice,
    selectInvoice,
    toggleSelected,
    selectAll,
    setFilters,
    getFilteredInvoices,
    loadFromStorage,
  } = useInvoiceStore();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteAll, setDeleteAll] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showUploadPanel, setShowUploadPanel] = useState(false);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const filteredInvoices = useMemo(() => getFilteredInvoices(), [
    invoices,
    filters,
    getFilteredInvoices,
  ]);

  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId) || null;

  const selectedInvoices = invoices.filter((inv) => selectedIds.includes(inv.id));

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTargetId(id);
    setDeleteAll(false);
    setShowDeleteDialog(true);
  };

  const handleClearAll = () => {
    setDeleteTargetId(null);
    setDeleteAll(true);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (deleteAll) {
      clearAllInvoices();
    } else if (deleteTargetId) {
      removeInvoice(deleteTargetId);
    }
    setShowDeleteDialog(false);
    setDeleteTargetId(null);
    setDeleteAll(false);
  };

  const handleExport = async () => {
    if (selectedInvoices.length === 0) {
      alert('请先选择要导出的发票');
      return;
    }
    setIsExporting(true);
    try {
      await exportInvoicesToExcel(selectedInvoices);
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请检查后端服务是否启动');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredInvoices.length && filteredInvoices.length > 0) {
      selectAll([]);
    } else {
      selectAll(filteredInvoices.map((inv) => inv.id));
    }
  };

  const handleImageClick = (imageSrc: string) => {
    setPreviewImageSrc(imageSrc);
    setShowImagePreview(true);
  };

  const handleInvoiceUpdate = (updates: Partial<Invoice>) => {
    if (selectedInvoiceId) {
      updateInvoice(selectedInvoiceId, updates);
    }
  };

  const allSelected =
    filteredInvoices.length > 0 && selectedIds.length === filteredInvoices.length;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f6fa' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: '#fff',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          padding: '16px 24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span style={{ fontSize: '28px' }}>📋</span>
            <h1
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#2c3e50',
              }}
            >
              发票 OCR 识别管理系统
            </h1>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flex: 1,
              maxWidth: '500px',
              flexWrap: 'wrap',
            }}
          >
            <input
              type="text"
              placeholder="搜索发票号码、购买方、销售方..."
              value={filters.keyword}
              onChange={(e) => setFilters({ keyword: e.target.value })}
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '10px 14px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'border-color 200ms',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#1abc9c';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#ddd';
              }}
            />
            <input
              type="date"
              title="开始日期"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ dateFrom: e.target.value })}
              style={{
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '13px',
              }}
            />
            <input
              type="date"
              title="结束日期"
              value={filters.dateTo}
              onChange={(e) => setFilters({ dateTo: e.target.value })}
              style={{
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '13px',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowUploadPanel(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: '#1abc9c',
                color: '#fff',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#16a085';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#1abc9c';
              }}
            >
              📤 上传发票
            </button>
            <button
              onClick={handleExport}
              disabled={selectedIds.length === 0 || isExporting}
              style={{
                padding: '10px 20px',
                backgroundColor: selectedIds.length === 0 ? '#bdc3c7' : '#2c3e50',
                color: '#fff',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (selectedIds.length > 0) {
                  e.currentTarget.style.backgroundColor = '#1a252f';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedIds.length > 0) {
                  e.currentTarget.style.backgroundColor = '#2c3e50';
                }
              }}
            >
              {isExporting ? '导出中...' : `导出 Excel (${selectedIds.length})`}
            </button>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          padding: '20px 24px',
          gap: '20px',
          minHeight: 'calc(100vh - 80px)',
        }}
        className="main-container"
      >
        <div
          style={{
            width: '320px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
          className="sidebar"
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={handleSelectAll}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer',
                  accentColor: '#1abc9c',
                }}
              />
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#2c3e50' }}>
                发票列表 ({filteredInvoices.length})
              </span>
            </div>
            {invoices.length > 0 && (
              <button
                onClick={handleClearAll}
                style={{
                  fontSize: '12px',
                  color: '#e74c3c',
                  background: 'none',
                  padding: '4px 8px',
                  borderRadius: '4px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fdf0f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                清空全部
              </button>
            )}
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              paddingRight: '4px',
            }}
          >
            {filteredInvoices.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: '#95a5a6',
                }}
              >
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>📭</div>
                <p style={{ fontSize: '14px', marginBottom: '8px' }}>
                  {invoices.length === 0 ? '暂无发票记录' : '没有匹配的发票'}
                </p>
                <p style={{ fontSize: '12px', color: '#bdc3c7' }}>
                  {invoices.length === 0 ? '点击右上角上传按钮开始识别' : '试试调整筛选条件'}
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {filteredInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    style={{
                      animation: 'fadeSlideIn 300ms ease',
                    }}
                  >
                    <InvoiceCard
                      invoice={invoice}
                      isSelected={selectedInvoiceId === invoice.id}
                      isChecked={selectedIds.includes(invoice.id)}
                      onClick={() => selectInvoice(invoice.id)}
                      onCheck={(e) => {
                        e.stopPropagation();
                        toggleSelected(invoice.id);
                      }}
                      onDelete={(e) => handleDeleteClick(invoice.id, e)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }} className="content-area">
          {selectedInvoice ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  backgroundColor: '#fff',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  padding: '20px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '20px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px',
                      }}
                    >
                      <h2
                        style={{
                          fontSize: '20px',
                          fontWeight: 700,
                          color: '#2c3e50',
                        }}
                      >
                        发票号码：{selectedInvoice.invoice_number}
                      </h2>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '12px',
                        marginTop: '16px',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#95a5a6',
                            marginBottom: '4px',
                          }}
                        >
                          开票日期
                        </div>
                        <div style={{ fontSize: '14px', color: '#2c3e50', fontWeight: 500 }}>
                          {formatDate(selectedInvoice.invoice_date)}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#95a5a6',
                            marginBottom: '4px',
                          }}
                        >
                          购买方
                        </div>
                        <div style={{ fontSize: '14px', color: '#2c3e50', fontWeight: 500 }}>
                          {selectedInvoice.buyer_name}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#95a5a6',
                            marginBottom: '4px',
                          }}
                        >
                          销售方
                        </div>
                        <div style={{ fontSize: '14px', color: '#2c3e50', fontWeight: 500 }}>
                          {selectedInvoice.seller_name}
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedInvoice.thumbnail && (
                    <div
                      style={{
                        width: '120px',
                        height: '160px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: '1px solid #ecf0f1',
                        flexShrink: 0,
                        transition: 'transform 200ms',
                      }}
                      onClick={() =>
                        selectedInvoice.original_image &&
                        handleImageClick(selectedInvoice.original_image)
                      }
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <img
                        src={selectedInvoice.thumbnail}
                        alt="发票"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <EditableTable invoice={selectedInvoice} onUpdate={handleInvoiceUpdate} />
            </div>
          ) : (
            <div
              style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                padding: '60px 40px',
                textAlign: 'center',
                color: '#95a5a6',
              }}
            >
              <div style={{ fontSize: '80px', marginBottom: '20px' }}>📄</div>
              <h3 style={{ fontSize: '18px', color: '#7f8c8d', marginBottom: '8px' }}>
                {invoices.length === 0 ? '开始使用发票管理系统' : '请选择一张发票查看详情'}
              </h3>
              <p style={{ fontSize: '14px' }}>
                {invoices.length === 0
                  ? '点击右上角「上传发票」按钮开始识别您的第一张发票'
                  : '从左侧列表中选择一张发票以查看和编辑其详细信息'}
              </p>
              {invoices.length === 0 && (
                <button
                  onClick={() => setShowUploadPanel(true)}
                  style={{
                    marginTop: '24px',
                    padding: '12px 28px',
                    backgroundColor: '#1abc9c',
                    color: '#fff',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#16a085';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#1abc9c';
                  }}
                >
                  立即上传
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showUploadPanel && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(44, 62, 80, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 200ms ease',
          }}
          onClick={() => setShowUploadPanel(false)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '16px',
              padding: '32px',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              animation: 'scaleIn 200ms ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#2c3e50' }}>
                上传发票
              </h3>
              <button
                onClick={() => setShowUploadPanel(false)}
                style={{
                  background: 'none',
                  fontSize: '24px',
                  color: '#95a5a6',
                  lineHeight: 1,
                  padding: '4px',
                }}
              >
                ×
              </button>
            </div>
            <UploadZone
              onUploadEnd={() => setShowUploadPanel(false)}
            />
          </div>
        </div>
      )}

      {showDeleteDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(44, 62, 80, 0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 200ms ease',
          }}
          onClick={() => setShowDeleteDialog(false)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '28px',
              width: '90%',
              maxWidth: '400px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              animation: 'scaleIn 200ms ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚠️</div>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: 600,
                  color: '#2c3e50',
                  marginBottom: '8px',
                }}
              >
                {deleteAll ? '确认清空所有发票？' : '确认删除这张发票？'}
              </h3>
              <p style={{ fontSize: '14px', color: '#7f8c8d' }}>
                {deleteAll
                  ? '此操作将删除所有发票记录，且无法恢复。'
                  : '删除后将无法恢复，请谨慎操作。'}
              </p>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
              }}
            >
              <button
                onClick={() => setShowDeleteDialog(false)}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#ecf0f1',
                  color: '#2c3e50',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#d5dbdb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ecf0f1';
                }}
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#e74c3c',
                  color: '#fff',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#c0392b';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#e74c3c';
                }}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {showImagePreview && previewImageSrc && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
            animation: 'fadeIn 200ms ease',
          }}
          onClick={() => setShowImagePreview(false)}
        >
          <button
            onClick={() => setShowImagePreview(false)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'none',
              color: '#fff',
              fontSize: '32px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
          <img
            src={previewImageSrc}
            alt="发票原图"
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              borderRadius: '8px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @media (max-width: 768px) {
          .main-container {
            flex-direction: column !important;
            padding: 16px !important;
          }
          .sidebar {
            width: 100% !important;
            max-height: 300px;
          }
          .content-area {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
