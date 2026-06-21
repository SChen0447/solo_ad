import type { CartItem } from '../types';

interface ConfirmModalProps {
  cart: CartItem[];
  totalPrice: number;
  onClose: () => void;
  onConfirm: () => void;
}

function ConfirmModal({ cart, totalPrice, onClose, onConfirm }: ConfirmModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content confirm-modal"
        onClick={e => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <h2 className="modal-title">确认订单</h2>
        <div className="confirm-items">
          {cart.map((item, index) => (
            <div key={`${item.drinkId}-${index}`} className="confirm-item">
              <span className="confirm-item-name">
                {item.drinkName}
                {item.quantity > 1 && ` × ${item.quantity}`}
              </span>
              {item.toppingNames.length > 0 && (
                <span className="confirm-item-toppings">
                  （{item.toppingNames.join('、')}）
                </span>
              )}
              <span className="confirm-item-price">
                ¥{item.price * item.quantity}
              </span>
            </div>
          ))}
        </div>
        <div className="confirm-total">
          <span className="confirm-total-label">总计</span>
          <span className="confirm-total-price">¥{totalPrice}</span>
        </div>
        <div className="confirm-actions">
          <button className="cancel-btn" onClick={onClose}>
            取消
          </button>
          <button className="confirm-btn" onClick={onConfirm}>
            确认下单
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
