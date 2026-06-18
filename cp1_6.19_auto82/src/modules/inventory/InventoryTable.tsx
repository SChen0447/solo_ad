import { useEffect, useState } from 'react'
import { useInventoryStore } from '../../store'
import './inventoryTable.css'

export default function InventoryTable() {
  const { inventory, restockRecords, loading, fetchInventory, fetchRestockRecords } =
    useInventoryStore()
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  const handleOpenModal = () => {
    fetchRestockRecords()
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
  }

  return (
    <div className="inventory-container">
      <div className="inventory-header">
        <h2>库存管理</h2>
        <button className="btn btn-primary" onClick={handleOpenModal}>
          补货记录
        </button>
      </div>

      <div className="card inventory-card">
        {loading && inventory.length === 0 ? (
          <div className="loading">加载中...</div>
        ) : (
          <table className="inventory-table">
            <thead>
              <tr>
                <th>原料名称</th>
                <th>当前库存量</th>
                <th>安全库存阈值</th>
                <th>最近补货日期</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => {
                const isLow = item.quantity < item.safeThreshold
                return (
                  <tr key={item.id} className={isLow ? 'low-stock-row' : ''}>
                    <td className="item-name">{item.name}</td>
                    <td className={isLow ? 'low-stock' : ''}>
                      {item.quantity} {item.unit}
                    </td>
                    <td>
                      {item.safeThreshold} {item.unit}
                    </td>
                    <td>{item.lastRestockDate}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div
            className="restock-modal modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>补货记录</h3>
              <button className="modal-close" onClick={handleCloseModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              {restockRecords.length === 0 ? (
                <div className="empty-records">暂无补货记录</div>
              ) : (
                <table className="restock-table">
                  <thead>
                    <tr>
                      <th>补货日期</th>
                      <th>原料</th>
                      <th>数量</th>
                      <th>供应商</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restockRecords.map((record) => (
                      <tr key={record.id}>
                        <td>{record.date}</td>
                        <td>{record.itemName}</td>
                        <td>{record.quantity}</td>
                        <td>{record.supplier}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
