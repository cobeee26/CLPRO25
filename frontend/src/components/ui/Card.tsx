import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  hover?: boolean;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  rounded = 'xl',
  hover = false,
  onClick
}) => {
  // Base styles
  const baseStyles = 'transition-all duration-200';
  
  // Variant styles
  const variantStyles = {
    default: 'bg-slate-800/50 backdrop-blur-sm border border-slate-700/50',
    elevated: 'bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 shadow-xl',
    outlined: 'bg-transparent border-2 border-slate-600/50',
    glass: 'bg-white/5 backdrop-blur-xl border border-white/10'
  };
  
  // Padding styles
  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10'
  };
  
  // Rounded styles
  const roundedStyles = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl'
  };
  
  // Hover styles
  const hoverStyles = hover ? 'hover:shadow-2xl hover:scale-[1.02] cursor-pointer' : '';
  
  // Click styles
  const clickStyles = onClick ? 'cursor-pointer' : '';
  
  // Combine all styles
  const combinedStyles = [
    baseStyles,
    variantStyles[variant],
    paddingStyles[padding],
    roundedStyles[rounded],
    hoverStyles,
    clickStyles,
    className
  ].filter(Boolean).join(' ');
  
  return (
    <div
      className={combinedStyles}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;
