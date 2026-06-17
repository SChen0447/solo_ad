import { useState, useEffect, useMemo } from 'react';
import { beansAPI } from '../utils/api';
import BeanCard from '../components/BeanCard';
import type { Bean, FilterOptions } from '../types';
import './Explore.scss';

const origins = ['埃塞俄比亚', '哥伦比亚', '巴西', '危地马拉', '肯尼亚', '印尼', '哥斯达黎加', '巴拿马'];
const processes = ['水洗', '日晒', '蜜处理', '厌氧'];
const flavorTags = ['花香', '果酸', '巧克力', '坚果', '焦糖', '柑橘', '浆果', '草本'];

function Explore() {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({
    origin: undefined,
    process: undefined,
    flavors: [],
    minPrice: undefined,
    maxPrice: undefined,
  });
  const [priceRange, setPriceRange] = useState<[number, number]>([50, 300]);

  useEffect(() => {
    loadBeans();
  }, [filters]);

  const loadBeans = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (filters.origin) params.origin = filters.origin;
      if (filters.process) params.process = filters.process;
      if (filters.flavors.length > 0) params.flavors = filters.flavors.join(',');
      if (filters.minPrice) params.min_price = filters.minPrice;
      if (filters.maxPrice) params.max_price = filters.maxPrice;
      
      const data = await beansAPI.getAll(params);
      setBeans(data.beans || []);
    } catch (error) {
      console.error('Failed to load beans:', error);
      setBeans(mockBeans);
    } finally {
      setLoading(false);
    }
  };

  const activeFilters = useMemo(() => {
    const active: { key: string; label: string; value: string | number }[] = [];
    if (filters.origin) active.push({ key: 'origin', label: '产地', value: filters.origin });
    if (filters.process) active.push({ key: 'process', label: '处理法', value: filters.process });
    filters.flavors.forEach((f) => {
      active.push({ key: 'flavor', label: '风味', value: f });
    });
    if (filters.minPrice) active.push({ key: 'minPrice', label: '最低价', value: filters.minPrice });
    if (filters.maxPrice) active.push({ key: 'maxPrice', label: '最高价', value: filters.maxPrice });
    return active;
  }, [filters]);

  const removeFilter = (key: string, value: string | number) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      if (key === 'origin') newFilters.origin = undefined;
      if (key === 'process') newFilters.process = undefined;
      if (key === 'flavor') {
        newFilters.flavors = prev.flavors.filter((f) => f !== value);
      }
      if (key === 'minPrice') newFilters.minPrice = undefined;
      if (key === 'maxPrice') newFilters.maxPrice = undefined;
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    setFilters({
      origin: undefined,
      process: undefined,
      flavors: [],
      minPrice: undefined,
      maxPrice: undefined,
    });
  };

  const toggleFlavor = (flavor: string) => {
    setFilters((prev) => ({
      ...prev,
      flavors: prev.flavors.includes(flavor)
        ? prev.flavors.filter((f) => f !== flavor)
        : [...prev.flavors, flavor],
    }));
  };

  const handlePriceChange = () => {
    setFilters((prev) => ({
      ...prev,
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
    }));
  };

  const masonryColumns = useMemo(() => {
    const columns: Bean[][] = [[], [], [], []];
    const columnHeights = [0, 0, 0, 0];
    
    beans.forEach((bean) => {
      const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights));
      columns[shortestColumn].push(bean);
      columnHeights[shortestColumn] += bean.flavor_tags.length * 20 + 280;
    });
    
    return columns;
  }, [beans]);

  return (
    <div className="explore-page">
      <div className="explore-page__header">
        <h1 className="explore-page__title">探索咖啡豆</h1>
        <p className="explore-page__subtitle">发现来自世界各地的精品咖啡豆</p>
      </div>

      <div className="filter-section">
        <div className="filter-section__header" onClick={() => setFilterOpen(!filterOpen)}>
          <span className="filter-section__title">高级筛选</span>
          <span className="filter-section__toggle">{filterOpen ? '收起 ▲' : '展开 ▼'}</span>
        </div>

        {filterOpen && (
          <div className="filter-section__body">
            <div className="filter-group">
              <label className="filter-group__label">产地</label>
              <div className="filter-group__options">
                {origins.map((origin) => (
                  <button
                    key={origin}
                    className={`filter-chip ${filters.origin === origin ? 'filter-chip--active' : ''}`}
                    onClick={() => setFilters((prev) => ({ ...prev, origin: prev.origin === origin ? undefined : origin }))}
                  >
                    {origin}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label className="filter-group__label">处理法</label>
              <div className="filter-group__options">
                {processes.map((process) => (
                  <button
                    key={process}
                    className={`filter-chip ${filters.process === process ? 'filter-chip--active' : ''}`}
                    onClick={() => setFilters((prev) => ({ ...prev, process: prev.process === process ? undefined : process }))}
                  >
                    {process}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label className="filter-group__label">风味标签</label>
              <div className="filter-group__options">
                {flavorTags.map((flavor) => (
                  <button
                    key={flavor}
                    className={`filter-chip flavor-chip ${filters.flavors.includes(flavor) ? 'filter-chip--active' : ''}`}
                    onClick={() => toggleFlavor(flavor)}
                  >
                    {flavor}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label className="filter-group__label">价格区间: ¥{priceRange[0]} - ¥{priceRange[1]}</label>
              <div className="filter-group__price">
                <input
                  type="range"
                  min="30"
                  max="500"
                  value={priceRange[0]}
                  onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                  onMouseUp={handlePriceChange}
                  onTouchEnd={handlePriceChange}
                  className="price-slider"
                />
                <input
                  type="range"
                  min="30"
                  max="500"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                  onMouseUp={handlePriceChange}
                  onTouchEnd={handlePriceChange}
                  className="price-slider"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {activeFilters.length > 0 && (
        <div className="active-filters">
          <span className="active-filters__label">已选筛选:</span>
          {activeFilters.map((filter, index) => (
            <span key={`${filter.key}-${filter.value}-${index}`} className="active-filter-tag">
              {filter.label}: {filter.value}
              <button onClick={() => removeFilter(filter.key, filter.value)} className="active-filter-tag__close">
                ×
              </button>
            </span>
          ))}
          <button className="active-filters__clear" onClick={clearAllFilters}>
            清除全部
          </button>
        </div>
      )}

      <div className="results-info">
        共找到 <span className="results-info__count">{beans.length}</span> 款咖啡豆
      </div>

      {loading ? (
        <div className="masonry-grid">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-card__image" />
              <div className="skeleton-card__lines">
                <div className="skeleton-line skeleton-line--title" />
                <div className="skeleton-line skeleton-line--short" />
                <div className="skeleton-line skeleton-line--tags" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="masonry-grid">
          {masonryColumns.map((column, colIndex) => (
            <div key={colIndex} className="masonry-column">
              {column.map((bean) => (
                <BeanCard key={bean.id} bean={bean} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const mockBeans: Bean[] = [
  {
    id: 1,
    name: '耶加雪菲 沃卡',
    origin: '埃塞俄比亚',
    process: '水洗',
    flavor_tags: ['花香', '柑橘', '果酸', '茉莉'],
    avg_rating: 4.7,
    price: 128,
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400',
    description: '来自埃塞俄比亚耶加雪菲产区的精品咖啡豆',
    roast_level: '浅烘',
  },
  {
    id: 2,
    name: '瑰夏 翡翠庄园',
    origin: '巴拿马',
    process: '水洗',
    flavor_tags: ['花香', '果酸', '焦糖', '热带水果'],
    avg_rating: 4.9,
    price: 298,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400',
    description: '巴拿马翡翠庄园的顶级瑰夏咖啡',
    roast_level: '浅烘',
  },
  {
    id: 3,
    name: '慧兰 粉波旁',
    origin: '哥伦比亚',
    process: '水洗',
    flavor_tags: ['巧克力', '坚果', '焦糖', '红糖'],
    avg_rating: 4.5,
    price: 98,
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
    description: '哥伦比亚慧兰产区的粉波旁品种',
    roast_level: '中烘',
  },
  {
    id: 4,
    name: '喜拉多 塞拉多',
    origin: '巴西',
    process: '日晒',
    flavor_tags: ['坚果', '巧克力', '焦糖', '坚果'],
    avg_rating: 4.3,
    price: 78,
    image: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=400',
    description: '巴西塞拉多产区的日晒咖啡豆',
    roast_level: '中深烘',
  },
  {
    id: 5,
    name: '薇薇特南果',
    origin: '危地马拉',
    process: '水洗',
    flavor_tags: ['巧克力', '果酸', '焦糖', '香料'],
    avg_rating: 4.4,
    price: 88,
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
    description: '危地马拉薇薇特南果产区的精品豆',
    roast_level: '中烘',
  },
  {
    id: 6,
    name: '雅加 GA1',
    origin: '肯尼亚',
    process: '水洗',
    flavor_tags: ['果酸', '浆果', '柑橘', '黑醋栗'],
    avg_rating: 4.6,
    price: 138,
    image: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=400',
    description: '肯尼亚雅加产区的顶级AA级咖啡豆',
    roast_level: '浅中烘',
  },
  {
    id: 7,
    name: '曼特宁 黄金',
    origin: '印尼',
    process: '湿刨',
    flavor_tags: ['草本', '巧克力', '坚果', '香料'],
    avg_rating: 4.2,
    price: 85,
    image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400',
    description: '印尼苏门答腊的黄金曼特宁',
    roast_level: '深烘',
  },
  {
    id: 8,
    name: '拉斯拉哈斯',
    origin: '哥斯达黎加',
    process: '蜜处理',
    flavor_tags: ['蜂蜜', '焦糖', '巧克力', '水果'],
    avg_rating: 4.5,
    price: 118,
    image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=400',
    description: '哥斯达黎加拉斯拉哈斯庄园蜜处理豆',
    roast_level: '中烘',
  },
  {
    id: 9,
    name: '西达摩 花魁',
    origin: '埃塞俄比亚',
    process: '日晒',
    flavor_tags: ['花香', '浆果', '果酸', '葡萄酒'],
    avg_rating: 4.6,
    price: 118,
    image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400',
    description: '埃塞俄比亚西达摩产区的日晒花魁',
    roast_level: '浅烘',
  },
  {
    id: 10,
    name: '娜玲珑 庄园',
    origin: '哥伦比亚',
    process: '水洗',
    flavor_tags: ['焦糖', '坚果', '巧克力', '柑橘'],
    avg_rating: 4.4,
    price: 92,
    image: 'https://images.unsplash.com/photo-1587734195503-904fca47e0e9?w=400',
    description: '哥伦比亚娜玲珑产区的庄园咖啡豆',
    roast_level: '中烘',
  },
  {
    id: 11,
    name: '翡翠 瑰夏',
    origin: '巴拿马',
    process: '日晒',
    flavor_tags: ['花香', '热带水果', '果酸', '蜂蜜'],
    avg_rating: 4.8,
    price: 358,
    image: 'https://images.unsplash.com/photo-1559056199-5a47f60c5053?w=400',
    description: '巴拿马翡翠庄园日晒瑰夏',
    roast_level: '浅烘',
  },
  {
    id: 12,
    name: '科班 庄园',
    origin: '危地马拉',
    process: '水洗',
    flavor_tags: ['巧克力', '焦糖', '坚果', '香料'],
    avg_rating: 4.3,
    price: 82,
    image: 'https://images.unsplash.com/photo-1497515114583-3e7c5c9cd4a4?w=400',
    description: '危地马拉科班产区的水洗咖啡豆',
    roast_level: '中深烘',
  },
];

export default Explore;
