import { useState, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

interface Ripple {
  x: number;
  y: number;
  size: number;
  id: number;
}

const RippleButton = forwardRef<HTMLButtonElement, RippleButtonProps>(
  ({ children, className, variant = 'primary', size = 'md', onClick, disabled, ...props }, ref) => {
    const [ripples, setRipples] = useState<Ripple[]>([]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;

      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      const id = Date.now();

      setRipples((prev) => [...prev, { x, y, size, id }]);

      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 600);

      onClick?.(e);
    };

    const variantClasses = {
      primary: 'bg-cinema-primary text-white hover:bg-cinema-primary/90 shadow-md hover:shadow-lg',
      secondary: 'bg-cinema-secondary text-white hover:bg-cinema-secondary/90',
      outline: 'border border-cinema-border text-cinema-text hover:bg-cinema-card bg-transparent',
      ghost: 'text-cinema-muted hover:text-cinema-text hover:bg-cinema-card/50 bg-transparent',
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-base',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <button
        ref={ref}
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          'btn-ripple relative inline-flex items-center justify-center gap-2 rounded-lg font-medium',
          'transition-all duration-300 ease-out',
          'hover:-translate-y-0.5 active:translate-y-0',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0',
          'min-h-[32px]',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="ripple-effect"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
            }}
          />
        ))}
        {children}
      </button>
    );
  }
);

RippleButton.displayName = 'RippleButton';

export default RippleButton;
