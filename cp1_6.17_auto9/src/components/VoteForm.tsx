import { useState } from 'react';
import { Plus, Minus, Vote } from 'lucide-react';
import type { CreateVoteData } from '@/types';

interface VoteFormProps {
  onSubmit: (data: CreateVoteData) => void;
}

export function VoteForm({ onSubmit }: VoteFormProps) {
  const [title, setTitle] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [type, setType] = useState<'single' | 'multiple'>('single');
  const [error, setError] = useState<string | null>(null);

  const handleOptionChange = (index: number, value: string) => {
    setOptions((prev) => {
      const newOptions = [...prev];
      newOptions[index] = value;
      return newOptions;
    });
  };

  const addOption = () => {
    if (options.length < 10) {
      setOptions((prev) => [...prev, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('请输入投票标题');
      return;
    }

    const validOptions = options.filter((opt) => opt.trim() !== '');
    if (validOptions.length < 2) {
      setError('至少需要2个有效选项');
      return;
    }

    onSubmit({
      title: trimmedTitle,
      options: validOptions,
      type,
    });

    setTitle('');
    setOptions(['', '']);
    setType('single');
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-8 border border-gray-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
          <Vote className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">创建新投票</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            投票标题
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="请输入投票问题..."
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 bg-gray-50 hover:bg-white"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            投票选项 ({options.length}/10)
          </label>
          <div className="space-y-3">
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2 group">
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-50 text-blue-600 text-sm font-medium shrink-0">
                  {index + 1}
                </span>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`选项 ${index + 1}`}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 bg-gray-50 hover:bg-white"
                />
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  disabled={options.length <= 2}
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 shrink-0"
                >
                  <Minus className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {options.length < 10 && (
            <button
              type="button"
              onClick={addOption}
              className="mt-3 w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              添加选项
            </button>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            投票类型
          </label>
          <div className="flex gap-3">
            <label className="flex-1 cursor-pointer">
              <input
                type="radio"
                name="voteType"
                value="single"
                checked={type === 'single'}
                onChange={() => setType('single')}
                className="sr-only"
              />
              <div
                className={`py-3 px-4 rounded-xl border-2 text-center font-medium transition-all duration-200 ${
                  type === 'single'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                单选
              </div>
            </label>
            <label className="flex-1 cursor-pointer">
              <input
                type="radio"
                name="voteType"
                value="multiple"
                checked={type === 'multiple'}
                onChange={() => setType('multiple')}
                className="sr-only"
              />
              <div
                className={`py-3 px-4 rounded-xl border-2 text-center font-medium transition-all duration-200 ${
                  type === 'multiple'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                多选
              </div>
            </label>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
        >
          创建投票
        </button>
      </form>
    </div>
  );
}
