import { useState, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { ShoppingCart, BookOpen, ClipboardList, Plus, X } from 'lucide-react';
import BookCard from './components/BookCard';
import CartSidebar from './components/CartSidebar';
import OrderTable from './components/OrderTable';
import { useBookStore, useCartStore, useOrderStore } from './store';
import type { Book } from './types';

function Navbar() {
  const { cartItems, openCart } = useCartStore();
  const totalItems = cartItems.reduce((s, i) => s + i.quantity, 0);

  return (
    <nav className="sticky top-0 z-30 border-b border-[#d1ccc0] bg-[#faf7f0]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <NavLink to="/" className="flex items-center gap-2">
          <BookOpen size={24} className="text-[#2d6a4f]" />
          <span className="text-xl font-bold text-[#2d6a4f]" style={{ fontFamily: 'Playfair Display, serif' }}>
            小鹿书屋
          </span>
        </NavLink>

        <div className="flex items-center gap-4">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
                isActive
                  ? 'bg-[#2d6a4f] text-white'
                  : 'text-[#3a3a3a] hover:bg-[#ece7dd]'
              }`
            }
          >
            图书列表
          </NavLink>
          <NavLink
            to="/manage"
            className={({ isActive }) =>
              `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
                isActive
                  ? 'bg-[#2d6a4f] text-white'
                  : 'text-[#3a3a3a] hover:bg-[#ece7dd]'
              }`
            }
          >
            库存管理
          </NavLink>
          <NavLink
            to="/orders"
            className={({ isActive }) =>
              `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-200 ${
                isActive
                  ? 'bg-[#2d6a4f] text-white'
                  : 'text-[#3a3a3a] hover:bg-[#ece7dd]'
              }`
            }
          >
            <span className="flex items-center gap-1">
              <ClipboardList size={14} />
              订单管理
            </span>
          </NavLink>

          <button
            onClick={openCart}
            className="relative rounded-lg p-2 text-[#3a3a3a] transition-colors duration-200 hover:bg-[#ece7dd]"
          >
            <ShoppingCart size={20} />
            {totalItems > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#c1121f] text-[10px] font-bold text-white">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}

function SearchBar({
  search,
  onSearchChange,
  sort,
  onSortChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  sort: 'none' | 'asc' | 'desc';
  onSortChange: (v: 'none' | 'asc' | 'desc') => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <input
        type="text"
        placeholder="搜索书名或作者..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1 rounded-lg border border-[#c4b998] bg-white px-4 py-2.5 text-sm text-[#3a3a3a] outline-none transition-all duration-200 placeholder:text-[#b8b0a0] focus:border-[#2d6a4f] focus:shadow-[0_0_0_3px_rgba(45,106,79,0.1)]"
        style={{ maxWidth: '80%' }}
      />
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as 'none' | 'asc' | 'desc')}
        className="rounded-lg border border-[#c4b998] bg-white px-4 py-2.5 text-sm text-[#3a3a3a] outline-none transition-colors duration-200 focus:border-[#2d6a4f]"
      >
        <option value="none">默认排序</option>
        <option value="asc">价格低到高</option>
        <option value="desc">价格高到低</option>
      </select>
    </div>
  );
}

function BookListPage() {
  const { books } = useBookStore();
  const { addToCart, cartItems, clearCart } = useCartStore();
  const { addOrder } = useOrderStore();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'none' | 'asc' | 'desc'>('none');

  const filtered = useMemo(() => {
    let result = books.filter(
      (b) =>
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.author.toLowerCase().includes(search.toLowerCase())
    );
    if (sort === 'asc') result = [...result].sort((a, b) => a.price - b.price);
    if (sort === 'desc') result = [...result].sort((a, b) => b.price - a.price);
    return result;
  }, [books, search, sort]);

  const handleCheckout = () => {
    if (cartItems.length > 0) {
      addOrder(cartItems);
      clearCart();
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8">
        <h1 className="mb-1 text-3xl font-bold text-[#3a3a3a]" style={{ fontFamily: 'Playfair Display, serif' }}>
          探索好书
        </h1>
        <p className="text-sm text-[#8a8578]">在书海中找到属于你的那一本</p>
      </div>

      <SearchBar search={search} onSearchChange={setSearch} sort={sort} onSortChange={setSort} />

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-[#8a8578]">没有找到匹配的图书</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 justify-items-center">
          {filtered.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onEdit={() => {}}
              onDelete={() => {}}
              onAddToCart={addToCart}
              mode="customer"
            />
          ))}
        </div>
      )}

      <CartSidebar
        cartItems={cartItems}
        onCheckout={handleCheckout}
      />
    </div>
  );
}

function ManagePage() {
  const { books, addBook, updateBook, deleteBook } = useBookStore();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'none' | 'asc' | 'desc'>('none');
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [form, setForm] = useState({
    title: '',
    author: '',
    isbn: '',
    price: '',
    stock: '',
    coverUrl: '',
  });

  const filtered = useMemo(() => {
    let result = books.filter(
      (b) =>
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.author.toLowerCase().includes(search.toLowerCase())
    );
    if (sort === 'asc') result = [...result].sort((a, b) => a.price - b.price);
    if (sort === 'desc') result = [...result].sort((a, b) => b.price - a.price);
    return result;
  }, [books, search, sort]);

  const openAddForm = () => {
    setEditingBook(null);
    setForm({ title: '', author: '', isbn: '', price: '', stock: '', coverUrl: '' });
    setShowForm(true);
  };

  const openEditForm = (book: Book) => {
    setEditingBook(book);
    setForm({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      price: book.price.toString(),
      stock: book.stock.toString(),
      coverUrl: book.coverUrl,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      title: form.title,
      author: form.author,
      isbn: form.isbn,
      price: parseFloat(form.price) || 0,
      stock: parseInt(form.stock) || 0,
      coverUrl: form.coverUrl,
    };
    if (editingBook) {
      updateBook(editingBook.id, data);
    } else {
      addBook(data);
    }
    setShowForm(false);
    setEditingBook(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这本书吗？')) {
      deleteBook(id);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-3xl font-bold text-[#3a3a3a]" style={{ fontFamily: 'Playfair Display, serif' }}>
            库存管理
          </h1>
          <p className="text-sm text-[#8a8578]">管理你的图书库存信息</p>
        </div>
        <button
          onClick={openAddForm}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:scale-95 hover:shadow-lg"
          style={{ background: '#2d6a4f' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#245a42';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#2d6a4f';
          }}
        >
          <Plus size={16} />
          添加图书
        </button>
      </div>

      <SearchBar search={search} onSearchChange={setSearch} sort={sort} onSortChange={setSort} />

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-[#8a8578]">没有找到匹配的图书</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 justify-items-center">
          {filtered.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onEdit={openEditForm}
              onDelete={handleDelete}
              onAddToCart={() => {}}
              mode="admin"
            />
          ))}
        </div>
      )}

      {showForm && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setShowForm(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <form
              onSubmit={handleSubmit}
              className="relative w-full max-w-md rounded-2xl border border-[#d1ccc0] bg-[#faf7f0] p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="absolute right-4 top-4 rounded-full p-1 text-[#8a8578] transition-colors duration-200 hover:bg-[#ece7dd] hover:text-[#3a3a3a]"
              >
                <X size={18} />
              </button>

              <h2 className="mb-5 text-lg font-bold text-[#3a3a3a]">
                {editingBook ? '编辑图书' : '添加图书'}
              </h2>

              <div className="space-y-3">
                {[
                  { label: '书名', key: 'title' as const, type: 'text' },
                  { label: '作者', key: 'author' as const, type: 'text' },
                  { label: 'ISBN', key: 'isbn' as const, type: 'text' },
                  { label: '定价', key: 'price' as const, type: 'number' },
                  { label: '库存数量', key: 'stock' as const, type: 'number' },
                  { label: '封面URL', key: 'coverUrl' as const, type: 'text' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="mb-1 block text-xs font-medium text-[#8a8578]">
                      {field.label}
                    </label>
                    <input
                      type={field.type}
                      value={form[field.key]}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      required
                      className="w-full rounded-lg border border-[#c4b998] bg-white px-3 py-2 text-sm text-[#3a3a3a] outline-none transition-colors duration-200 focus:border-[#2d6a4f] focus:shadow-[0_0_0_3px_rgba(45,106,79,0.1)]"
                      step={field.type === 'number' ? '0.01' : undefined}
                    />
                  </div>
                ))}
              </div>

              <button
                type="submit"
                className="mt-5 w-full rounded-xl py-2.5 text-sm font-bold text-white transition-all duration-200 hover:scale-[0.97]"
                style={{ background: '#2d6a4f' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#245a42';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#2d6a4f';
                }}
              >
                {editingBook ? '保存修改' : '添加图书'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

function OrdersPage() {
  const { orders, updateOrderStatus, addOrder } = useOrderStore();
  const { cartItems, clearCart } = useCartStore();

  const handleCheckout = () => {
    if (cartItems.length > 0) {
      addOrder(cartItems);
      clearCart();
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8">
        <h1 className="mb-1 text-3xl font-bold text-[#3a3a3a]" style={{ fontFamily: 'Playfair Display, serif' }}>
          订单管理
        </h1>
        <p className="text-sm text-[#8a8578]">查看和处理所有顾客订单</p>
      </div>

      <OrderTable orders={orders} onUpdateStatus={updateOrderStatus} />

      <CartSidebar cartItems={cartItems} onCheckout={handleCheckout} />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#faf7f0]">
        <Navbar />
        <Routes>
          <Route path="/" element={<BookListPage />} />
          <Route path="/manage" element={<ManagePage />} />
          <Route path="/orders" element={<OrdersPage />} />
        </Routes>
      </div>
    </Router>
  );
}
