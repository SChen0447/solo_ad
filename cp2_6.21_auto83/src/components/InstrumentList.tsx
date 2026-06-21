import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import StarRating from './StarRating';
import './InstrumentList.css';

interface InstrumentSummary {
  id: string;
  name: string;
  brand: string;
  category: string;
  condition: '全新' | '9成新' | '8成新';
  price: number;
  images: string[];
  description: string;
  createdAt: string;
  avgRating: number;
  evaluationCount: number;
}

const categories = ['全部', '吉他', '架子鼓', '钢琴', '小提琴', '萨克斯', '电子琴', '贝斯', '尤克里里'];
const brands = ['全部', 'Fender', 'Gibson', 'Yamaha', 'Ibanez', 'Taylor', 'Pearl', 'Tama', 'Roland', 'Korg', 'Casio'];

function InstrumentCard({ instrument }: { instrument: InstrumentSummary }) {
  const imgRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="instrument-card"
      onClick={() => navigate(`/instrument/${instrument.id}`)}
    >
      <div className="card-image-wrapper" ref={imgRef}>
        {isVisible && (
          <img
            src={instrument.images[0]}
            alt={instrument.name}
            className="card-image"
            loading="lazy"
          />
        )}
      </div>
      <div className="card-content">
        <h3 className="card-title">{instrument.name}</h3>
        <p className="card-brand">{instrument.brand} · {instrument.category}</p>
        <div className="card-meta">
          <span className="condition-tag">{instrument.condition}</span>
          <div className="card-rating">
            <StarRating rating={instrument.avgRating} size={14} />
            <span className="rating-count">({instrument.evaluationCount})</span>
          </div>
        </div>
        <p className="card-price">¥{instrument.price.toLocaleString()}</p>
      </div>
    </div>
  );
}

function InstrumentList() {
  const [instruments, setInstruments] = useState<InstrumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('全部');
  const [brand, setBrand] = useState('全部');
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(10000);
  const [filterKey, setFilterKey] = useState(0);

  useEffect(() => {
    fetchInstruments();
  }, []);

  const fetchInstruments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== '全部') params.set('category', category);
      if (brand !== '全部') params.set('brand', brand);
      if (minPrice > 0) params.set('minPrice', minPrice.toString());
      if (maxPrice < 10000) params.set('maxPrice', maxPrice.toString());

      const res = await fetch(`/api/instruments?${params}`);
      const data = await res.json();
      setInstruments(data);
      setFilterKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to fetch instruments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInstruments();
    }, 100);
    return () => clearTimeout(timer);
  }, [category, brand, minPrice, maxPrice]);

  return (
    <div className="instrument-list">
      <div className="filter-section">
        <div className="filter-group">
          <label className="filter-label">类别</label>
          <select
            className="filter-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">品牌</label>
          <select
            className="filter-select"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          >
            {brands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div className="filter-group price-filter">
          <label className="filter-label">价格区间</label>
          <div className="price-range">
            <input
              type="range"
              min="0"
              max="10000"
              step="100"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="price-slider"
            />
            <span className="price-value">¥{minPrice} - ¥{maxPrice}</span>
          </div>
        </div>
      </div>

      <div className="results-info">
        共找到 <span className="results-count">{instruments.length}</span> 件乐器
      </div>

      {loading ? (
        <div className="loading-state">加载中...</div>
      ) : (
        <div className="instruments-grid" key={filterKey}>
          {instruments.map((instrument, index) => (
            <InstrumentCard key={instrument.id} instrument={instrument} />
          ))}
        </div>
      )}

      {!loading && instruments.length === 0 && (
        <div className="empty-state">暂无符合条件的乐器</div>
      )}
    </div>
  );
}

export default InstrumentList;
