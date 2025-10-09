import React from 'react';

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  className?: string;
  fullWidth?: boolean;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  as?: React.ElementType;
  to?: string;
  [key: string]: any; // For additional props like 'to' for Link
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  className = '',
  fullWidth = false,
  rounded = 'lg',
  as: Component = 'button',
  ...rest
}) => {
  // Base styles
  const baseStyles = 'font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';
  
  // Variant styles
  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 border border-blue-600 hover:border-blue-700',
    secondary: 'bg-slate-600 hover:bg-slate-700 text-white focus:ring-slate-500 border border-slate-600 hover:border-slate-700',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500 border border-green-600 hover:border-green-700',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 border border-red-600 hover:border-red-700',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-yellow-500 border border-yellow-600 hover:border-yellow-700',
    info: 'bg-cyan-600 hover:bg-cyan-700 text-white focus:ring-cyan-500 border border-cyan-600 hover:border-cyan-700',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-900 focus:ring-slate-500 border border-slate-300 hover:border-slate-400'
  };
  
  // Size styles
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg'
  };
  
  // Rounded styles
  const roundedStyles = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full'
  };
  
  // Width styles
  const widthStyles = fullWidth ? 'w-full' : '';
  
  // Combine all styles
  const combinedStyles = [
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    roundedStyles[rounded],
    widthStyles,
    className
  ].filter(Boolean).join(' ');
  
  // Loading spinner component
  const LoadingSpinner = () => (
    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
  );
  
  return (
    <Component
      type={Component === 'button' ? type : undefined}
      onClick={onClick}
      disabled={disabled || loading}
      className={combinedStyles}
      {...rest}
    >
      {loading ? (
        <>
          <LoadingSpinner />
          Loading...
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          {children}
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </Component>
  );
};

export default Button;
