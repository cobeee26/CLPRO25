import React, { forwardRef } from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  showPasswordToggle?: boolean;
  onPasswordToggle?: () => void;
  showPassword?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  showPasswordToggle = false,
  onPasswordToggle,
  showPassword = false,
  className = '',
  type = 'text',
  id,
  name,
  ...props
}, ref) => {
  // Generate unique ID if not provided
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const inputName = name || inputId;
  // Base styles
  const baseStyles = 'transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';
  
  // Variant styles
  const variantStyles = {
    default: 'bg-slate-800 border border-slate-600 text-white placeholder-slate-400 focus:ring-blue-500 focus:border-transparent',
    filled: 'bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:ring-blue-500 focus:border-transparent',
    outlined: 'bg-transparent border-2 border-slate-600 text-white placeholder-slate-400 focus:ring-blue-500 focus:border-blue-500'
  };
  
  // Size styles
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };
  
  // Width styles
  const widthStyles = fullWidth ? 'w-full' : '';
  
  // Error styles
  const errorStyles = error ? 'border-red-500 focus:ring-red-500' : '';
  
  // Combine all styles
  const inputStyles = [
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    widthStyles,
    errorStyles,
    className
  ].filter(Boolean).join(' ');
  
  // Password toggle icon
  const PasswordToggleIcon = () => (
    <button
      type="button"
      onClick={onPasswordToggle}
      className="text-slate-400 hover:text-slate-300 transition-colors duration-200"
    >
      {showPassword ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
    </button>
  );
  
  // Determine input type
  const inputType = showPasswordToggle && type === 'password' ? (showPassword ? 'text' : 'password') : type;
  
  // Padding adjustments for icons
  const paddingLeft = leftIcon ? 'pl-10' : '';
  const paddingRight = (rightIcon || showPasswordToggle) ? 'pr-10' : '';
  
  const finalInputStyles = `${inputStyles} ${paddingLeft} ${paddingRight}`;
  
  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-300 mb-2">
          {label}
          {props.required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
            {leftIcon}
          </div>
        )}
        
        <input
          ref={ref}
          id={inputId}
          name={inputName}
          type={inputType}
          className={finalInputStyles}
          {...props}
        />
        
        {(rightIcon || showPasswordToggle) && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            {showPasswordToggle ? <PasswordToggleIcon /> : rightIcon}
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="mt-1 text-sm text-slate-400">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
