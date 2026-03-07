import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MobileButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  className?: string;
}

export const MobileButton: React.FC<MobileButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'large',
  fullWidth = true,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
}) => {
  const baseClasses = 'font-semibold rounded-lg transition-all duration-200 flex items-center justify-center touch-manipulation';
  
  const sizeClasses = {
    small: 'py-2 px-4 text-sm min-h-[40px]',
    medium: 'py-3 px-6 text-base min-h-[44px]',
    large: 'py-4 px-8 text-lg min-h-[48px]'
  };

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-md',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800 shadow-md',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 active:bg-blue-100'
  };

  const widthClass = fullWidth ? 'w-full' : '';
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';

  const classes = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${disabledClass} ${className}`;

  const iconElement = Icon ? <Icon className="w-5 h-5" /> : null;
  const content = (
    <>
      {iconPosition === 'left' && iconElement && <span className="mr-2">{iconElement}</span>}
      {children}
      {iconPosition === 'right' && iconElement && <span className="ml-2">{iconElement}</span>}
    </>
  );

  return (
    <button
      className={classes}
      onClick={onClick}
      disabled={disabled}
    >
      {content}
    </button>
  );
};
