import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, User, Building2, Calendar, Hash, ShoppingCart } from 'lucide-react';
import { useBookStore } from '@/stores/bookStore';
import { getStockStatusText } from '@/utils/dateUtils';
import BookingForm from './BookingForm';

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getBookById } = useBookStore();
  const [showBookingForm, setShowBookingForm] = useState(false);

  const book = getBookById(id || '');

  if (!book) {
    return (
      <div className="min-h-screen pt-20 pb-12 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">📖</div>
          <p className="text-gray-500 text-lg">图书不存在</p>
          <Link to="/" className="btn-primary inline-block mt-4">
            返回图书列表
          </Link>
        </div>
      </div>
    );
  }

  const isOutOfStock = book.status === 'out-of-stock';

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="max-w-4xl mx-auto px-4 container-transition">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          返回图书列表
        </Link>

        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-shrink-0 flex justify-center md:justify-start">
                <div className="relative">
                  <img
                    src={book.coverImage}
                    alt={book.title}
                    className="w-48 h-66 object-cover rounded-xl shadow-lg"
                    style={{ width: '160px', height: '220px' }}
                  />
                  <span className={`stock-tag absolute -top-2 -right-2 ${book.status}`}>
                    {getStockStatusText(book.status)}
                  </span>
                </div>
              </div>

              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
                  {book.title}
                </h1>
                
                <div className="flex items-center gap-2 text-gray-600 mb-4">
                  <User className="w-4 h-4" />
                  <span>{book.author}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Hash className="w-4 h-4" />
                    <span className="text-sm">ISBN: {book.isbn}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Building2 className="w-4 h-4" />
                    <span className="text-sm">{book.publisher}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">{book.publishYear}年出版</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-sm">库存: {book.stock}本</span>
                  </div>
                </div>

                <div className="text-3xl font-bold text-primary mb-6">
                  ¥{book.price.toFixed(2)}
                </div>

                <button
                  onClick={() => setShowBookingForm(true)}
                  disabled={isOutOfStock}
                  className={`btn-primary flex items-center justify-center gap-2 w-full md:w-auto ${
                    isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <ShoppingCart className="w-5 h-5" />
                  {isOutOfStock ? '暂无库存' : '预约取书'}
                </button>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">图书简介</h2>
              <p className="text-gray-600 leading-relaxed mb-6">{book.description}</p>

              <h2 className="text-xl font-semibold text-gray-800 mb-4">目录摘要</h2>
              <ul className="space-y-2">
                {book.contents.map((content, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-600">
                    <span className="text-primary font-medium">{index + 1}.</span>
                    {content}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {showBookingForm && (
        <BookingForm
          book={book}
          onClose={() => setShowBookingForm(false)}
          onSuccess={(bookingId) => {
            setShowBookingForm(false);
            navigate(`/booking/success/${bookingId}`);
          }}
        />
      )}
    </div>
  );
}
