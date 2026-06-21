import type { CartItem } from '../types';

interface OrderSummaryProps {
  cart: CartItem[];
  totalPrice: number;
  onRemove: (index: number) => void;
  onCheckout: () => void;
}

function OrderSummary({ cart, totalPrice, onRemove, onCheckout }: OrderSummaryProps) {
  return (
    <div className="order-summary">
      <h3 className="summary-title">🛒 订单摘要</h3>
      <div className="cart-items">
        {cart.length === 0 ? (
          <div className="empty-cart">购物车是空的~</div>
        ) : (
          cart.map((item, index) => (
            <div key={`${item.drinkId}-${index}`} className="cart-item">
              <div className="cart-item-info">
                <span className="cart-item-name">
                  {item.drinkName}
                  {item.quantity > 1 && (
                    <span className="cart-item-quantity"> × {item.quantity}</span>
                  )}
                </span>
                {item.toppingNames.length > 0 && (
                  <div className="cart-item-toppings">
                    {item.toppingNames.join('、')}
                  </div>
                )}
              </div>
              <div className="cart-item-right">
                <span className="cart-item-price">¥{item.price * item.quantity}</span>
                <button
                  className="remove-btn"
                  onClick={() => onRemove(index)}
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="cart-total">
        <span className="total-label">合计</span>
        <span className="total-price">¥{totalPrice}</span>
      </div>
      <button
        className={`checkout-btn ${cart.length === 0 ? 'disabled' : ''}`}
        onClick={onCheckout}
        disabled={cart.length === 0}
      >
        结算下单
      </button>
    </div>
  );
}

export default OrderSummary;
