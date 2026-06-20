import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, ChevronDown, Upload, X, ArrowLeft } from 'lucide-react';
import type { Item, User, CategoryKey } from '@/types';
import { CATEGORY_CONFIG, CONDITION_LABELS } from '@/types';
import ApiService from '../common/ApiService';
import ItemCard from '@/components/ItemCard';
import CategoryBadge from '@/components/CategoryBadge';
import ConditionBar from '@/components/ConditionBar';
import CreditBadge from '@/components/CreditBadge';
import LazyImage from '@/components/LazyImage';
import Timeline from '@/components/Timeline';
import StarRating from '@/components/StarRating';
import ExchangeModal from '../exchange';
import useAppStore from '@/store/useAppStore';

const FilterBar: React.FC<{
  category: string;
  setCategory: (v: string) => void;
  condition: number;
  setCondition: (v: number) => void;
  keyword: string;
  setKeyword: (v: string) => void;
}> = ({ category, setCategory, condition, setCondition, keyword, setKeyword }) => {
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  return (
    <div
      className="sticky top-16 z-30 bg-white flex items-center gap-4 px-6"
      style={{ height: '48px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
    >
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="搜索物品名称或描述..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      <div className="relative">
        <button
          onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
        >
          <span>{category === 'all' ? '全品类' : CATEGORY_CONFIG[category as CategoryKey]?.label}</span>
          <ChevronDown size={16} />
        </button>
        {showCategoryDropdown && (
          <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border py-1 min-w-[120px] z-50">
            <button
              onClick={() => { setCategory('all'); setShowCategoryDropdown(false); }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
            >
              全品类
            </button>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <button
                key={key}
                onClick={() => { setCategory(key); setShowCategoryDropdown(false); }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
              >
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
                {config.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <SlidersHorizontal size={18} className="text-gray-500" />
        <input
          type="range"
          min="0"
          max="5"
          value={condition}
          onChange={(e) => setCondition(Number(e.target.value))}
          className="w-32 accent-blue-500"
        />
        <span className="text-sm text-gray-600">
          {condition === 0 ? '全部' : CONDITION_LABELS[condition - 1] + '及以上'}
        </span>
      </div>
    </div>
  );
};

export const ItemList: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [category