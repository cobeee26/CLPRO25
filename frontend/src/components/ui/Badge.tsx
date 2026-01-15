import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  rounded = 'full',
  className = ''
}) => {
  // Base styles
  const baseStyles = 'inline-flex items-center font-medium transition-colors duration-200';
  
  // Variant styles
  const variantStyles = {
    default: 'bg-slate-600 text-slate-200',
    primary: 'bg-blue-600 text-blue-100',
    secondary: 'bg-slate-500 text-slate-100',
    success: 'bg-green-600 text-green-100',
    danger: 'bg-red-600 text-red-100',
    warning: 'bg-yellow-600 text-yellow-100',
    info: 'bg-cyan-600 text-cyan-100',
    outline: 'bg-transparent border border-slate-600 text-slate-300'
  };
  
  // Size styles
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  };
  
  // Rounded styles
  const roundedStyles = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full'
  };
  
  // Combine all styles
  const combinedStyles = [
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    roundedStyles[rounded],
    className
  ].filter(Boolean).join(' ');
  
  return (
    <span className={combinedStyles}>
      {children}
    </span>
  );
};

export default Badge;
