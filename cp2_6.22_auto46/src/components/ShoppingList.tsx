import type { ShoppingItem } from '../types'

interface ShoppingListProps {
  items: ShoppingItem[]
  onTogglePurchase: (id: string, purchased: boolean) => void
  onExport: () => void
}

function ShoppingList({ items, onTogglePurchase, onExport }: ShoppingListProps) {
  const purchasedCount = items.filter(i => i.purchased).length
  const totalCount = items.length

  return (
    <div className="card">
      <h2 className="section-title">
        🛒 购物清单
        <span style={{
          fontSize: '13px',
          fontWeight: 'normal',
          color: '#9CA3AF',
          marginLeft: '8px'
        }}>
          已购 {purchasedCount}/{totalCount}
        </span>
      </h2>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '40px 0' }}>
          暂无食材，请先添加食谱
        </div>
      ) : (
        <>
          <table className="shopping-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>食材名称</th>
                <th style={{ width: '100px' }}>数量</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr
                  key={item.id}
                  className={`shopping-item ${item.purchased ? 'purchased' : ''}`}
                >
                  <td>
                    <div
                      className={`shopping-item-checkbox ${item.purchased ? 'checked' : ''}`}
                      onClick={() => onTogglePurchase(item.id, !item.purchased)}
                    />
                  </td>
                  <td>{item.name}</td>
                  <td>{item.quantity} {item.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="shopping-footer">
            <button className="export-btn" onClick={onExport}>
              📋 导出清单
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default ShoppingList
