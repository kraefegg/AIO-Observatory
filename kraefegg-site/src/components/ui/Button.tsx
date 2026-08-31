import type { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function Button({ children, variant = 'primary', size = 'md', href, onClick, className = '' }: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-semibold tracking-wide transition-all duration-300 cursor-pointer';

  const variants = {
    primary: 'bg-k-blue text-white hover:bg-k-deep-blue',
    secondary: 'border border-k-steel text-k-silver hover:border-k-blue hover:text-k-blue bg-k-surface/50',
    ghost: 'text-k-text-muted hover:text-k-blue',
    gradient: 'kraefegg-gradient text-white hover:opacity-90',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm rounded-md',
    md: 'px-6 py-3 text-sm rounded-lg',
    lg: 'px-8 py-4 text-base rounded-lg',
  };

  const classes = `${base} ${variants[variant]} ${sizes[size]} ${className}`;

  if (href) {
    return (
      <a href={href} className={classes} onClick={onClick}>
        {children}
      </a>
    );
  }

  return (
    <button className={classes} onClick={onClick}>
      {children}
    </button>
  );
}
