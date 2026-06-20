import { ShoppingCart, Pencil, Trash2 } from 'lucide-react';
import type { Book } from '../types';

interface BookCardProps {
  book: Book;
  onEdit: (book: Book) => void;
  onDelete: (id: string) => void;
  onAddToCart: (book: Book) => void;
  mode: 'customer' | 'admin';
}

export default function BookCard({ book, onEdit, onDelete, onAddToCart, mode }: BookCardProps) {
  return (
    <div
      className="group relative flex flex-col overflow-hidden"
      style={{
        width: '200px',
        height: '280px',
        borderRadius: '12px',
        border: '1px solid #d1ccc0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        background: '#fff',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
      }}
    >
      <div className="relative h-[160px] overflow-hidden bg-[#f0ebe3]">
        <img
          src={book.coverUrl}
          alt={book.title}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        {book.stock <= 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded bg-white/90 px-3 py-1 text-sm font-medium text-[#3a3a3a]">
              已售罄
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between px-3 py-2">
        <div className="min-h-0">
          <h3
            className="truncate text-sm font-semibold text-[#3a3a3a]"
            title={book.title}
          >
            {book.title}
          </h3>
          <p className="truncate text-xs text-[#8a8578]" title={book.author}>
            {book.author}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-[#2d6a4f]">
            ¥{book.price.toFixed(1)}
          </span>
          {mode === 'customer' ? (
            <button
              onClick={() => onAddToCart(book)}
              disabled={book.stock <= 0}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white transition-all duration-200 hover:scale-95 disabled:opacity-40 disabled:hover:scale-100"
              style={{ background: '#2d6a4f' }}
              onMouseEnter={(e) => {
                if (book.stock > 0) e.currentTarget.style.background = '#245a42';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#2d6a4f';
              }}
            >
              <ShoppingCart size={12} />
              加入
            </button>
          ) : (
            <div className="flex gap-1">
              <button
                onClick={() => onEdit(book)}
                className="flex items-center justify-center rounded-lg px-2 py-1 text-xs text-white transition-all duration-200 hover:scale-95"
                style={{ background: '#2d6a4f' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#245a42';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#2d6a4f';
                }}
              >
                <Pencil size={12} />
              </button>
              <button
                onClick={() => onDelete(book.id)}
                className="flex items-center justify-center rounded-lg px-2 py-1 text-xs text-white transition-all duration-200 hover:scale-95"
                style={{ background: '#c1121f' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#a0101a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#c1121f';
                }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
