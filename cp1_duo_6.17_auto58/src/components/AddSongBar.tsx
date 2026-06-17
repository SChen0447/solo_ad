import React, { useState, useRef, useEffect } from 'react';
import { Check, Plus, Music } from 'lucide-react';
import { validateMusicUrl, addSong } from '@/utils/api';

interface AddSongBarProps {
  onSongAdded?: () => void;
}

const AddSongBar: React.FC<AddSongBarProps> = ({ onSongAdded }) => {
  const [url, setUrl] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [isShaking, setIsShaking] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const shakeTimeoutRef = useRef<number | null>(null);
  const checkmarkTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
      if (checkmarkTimeoutRef.current) clearTimeout(checkmarkTimeoutRef.current);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    if (value.trim() === '') {
      setIsValid(true);
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
    shakeTimeoutRef.current = window.setTimeout(() => {
      setIsShaking(false);
    }, 500);
  };

  const triggerSuccess = () => {
    setShowCheckmark(true);
    if (checkmarkTimeoutRef.current) clearTimeout(checkmarkTimeoutRef.current);
    checkmarkTimeoutRef.current = window.setTimeout(() => {
      setShowCheckmark(false);
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setIsValid(false);
      triggerShake();
      return;
    }

    if (!validateMusicUrl(url.trim())) {
      setIsValid(false);
      triggerShake();
      return;
    }

    setIsLoading(true);
    setIsValid(true);

    try {
      await addSong(url.trim());
      setUrl('');
      triggerSuccess();
      onSongAdded?.();
    } catch (err) {
      setIsValid(false);
      triggerShake();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 px-4 md:px-8 pb-6 pt-4 z-50"
      style={{
        background: 'linear-gradient(transparent, rgba(18, 18, 18, 0.95) 30%)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="max-w-2xl mx-auto flex items-center gap-3 p-2 rounded-2xl shadow-2xl"
        style={{
          backgroundColor: 'rgba(30, 30, 30, 0.85)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="pl-3 flex items-center">
          <Music size={20} style={{ color: '#b3b3b3' }} />
        </div>

        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={handleChange}
            placeholder="粘贴 Spotify 或网易云音乐链接..."
            className={`w-full bg-transparent outline-none text-white placeholder-gray-500 py-3 px-2 rounded-xl transition-colors duration-200 ${
              isShaking ? 'animate-shake' : ''
            }`}
            style={{
              border: isValid ? '2px solid transparent' : '2px solid #e74c3c',
              borderRadius: '12px',
            }}
          />
          {showCheckmark && (
            <div
              className="absolute right-3 top-1/2 -translate-y-1/2 animate-checkmark"
              style={{ color: '#1db954' }}
            >
              <Check size={22} strokeWidth={3} />
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: '#1db954',
            color: '#ffffff',
          }}
        >
          <Plus size={18} />
          <span>添加</span>
        </button>
      </form>

      {!isValid && url.trim() !== '' && (
        <p
          className="text-center text-sm mt-2"
          style={{ color: '#e74c3c' }}
        >
          请输入有效的 Spotify 或网易云音乐链接
        </p>
      )}
    </div>
  );
};

export default AddSongBar;
