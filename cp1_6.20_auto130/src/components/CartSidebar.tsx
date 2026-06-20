import { AnimatePresence, motion } from 'framer-motion';
import { X, Minus, Plus } from 'lucide-react';
import type { CartItem } from '../types';
import { useCartStore } from '../store';

interface CartSidebarProps {
  cartItems: CartItem[];
  onCheckout: () => void;
}

export default function CartSidebar({ cartItems, onCheckout }: CartSidebarProps) {
  const { isCartOpen, closeCart, removeFromCart, updateQuantity, getTotalPrice } =
    useCartStore();

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-black"
            onClick={closeCart}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="fixed right-0 top-0 z-50 flex h-full flex-col shadow-xl max-md:w-full"
            style={{
              width: '320px',
              background: '#f8f5f0',
            }}
          >
            <div className="flex items-center justify-between border-b border-[#d1ccc0] px-5 py-4">
              <h2 className="text-lg font-bold text-[#3a3a3a]">购物车</h2>
              <button
                onClick={closeCart}
                className="rounded-full p-1 text-[#8a8578] transition-colors duration-200 hover:bg-[#ece7dd] hover:text-[#3a3a3a]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3">
              {cartItems.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-[#8a8578]">购物车是空的</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div
                      key={item.bookId}
                      className="flex gap-3 rounded-xl border border-[#d1ccc0] bg-white p-3"
                    >
                      <img
                        src={item.coverUrl}
                        alt={item.title}
                        className="h-16 w-12 rounded-md object-cover"
                      />
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-[#3a3a3a] truncate">
                            {item.title}
                          </h4>
                          <p className="text-xs text-[#2d6a4f] font-medium">
                            ¥{item.price.toFixed(1)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                updateQuantity(item.bookId, item.quantity - 1)
                              }
                              className="flex h-6 w-6 items-center justify-center rounded-md border border-[#d1ccc0] text-[#8a8578] transition-colors duration-200 hover:border-[#2d6a4f] hover:text-[#2d6a4f]"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="min-w-[20px] text-center text-sm font-medium text-[#3a3a3a]">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(item.bookId, item.quantity + 1)
                              }
                              className="flex h-6 w-6 items-center justify-center rounded-md border border-[#d1ccc0] text-[#8a8578] transition-colors duration-200 hover:border-[#2d6a4f] hover:text-[#2d6a4f]"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.bookId)}
                            className="text-xs text-[#c1121f] transition-all duration-200 hover:underline hover:scale-95"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="border-t border-[#d1ccc0] px-5 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm text-[#8a8578]">合计</span>
                  <span className="text-xl font-bold text-[#2d6a4f]">
                    ¥{getTotalPrice().toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={onCheckout}
                  className="w-full rounded-xl py-3 text-sm font-bold text-white transition-all duration-200 hover:scale-[0.97] hover:shadow-lg"
                  style={{ background: '#2d6a4f' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#245a42';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#2d6a4f';
                  }}
                >
                  结算下单
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
