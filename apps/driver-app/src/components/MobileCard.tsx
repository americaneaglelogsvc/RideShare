import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MobileCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'small' | 'medium' | 'large';
  shadow?: 'none' | 'small' | 'medium' | 'large';
  rounded?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  hover?: boolean;
}

export const MobileCard: React.FC<MobileCardProps> = ({
  children,
  className = '',
  padding = 'medium',
  shadow = 'medium',
  rounded = 'medium',
  onClick,
  hover = false,
}) => {
  const baseClasses = 'bg-white transition-all duration-200';
  
  const paddingClasses = {
    small: 'p-3',
    medium: 'p-4',
    large: 'p-6'
  };

  const shadowClasses = {
    none: '',
    small: 'shadow-sm',
    medium: 'shadow-md',
    large: 'shadow-lg'
  };

  const roundedClasses = {
    small: 'rounded-md',
    medium: 'rounded-lg',
    large: 'rounded-xl'
  };

  const hoverClass = hover ? 'hover:shadow-lg active:shadow-md' : '';
  const clickClass = onClick ? 'cursor-pointer touch-manipulation' : '';

  const classes = `${baseClasses} ${paddingClasses[padding]} ${shadowClasses[shadow]} ${roundedClasses[rounded]} ${hoverClass} ${clickClass} ${className}`;

  return (
    <div className={classes} onClick={onClick}>
      {children}
    </div>
  );
};

interface MobileCardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileCardHeader: React.FC<MobileCardHeaderProps> = ({ children, className = '' }) => {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  );
};

interface MobileCardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileCardBody: React.FC<MobileCardBodyProps> = ({ children, className = '' }) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
};

interface MobileCardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileCardFooter: React.FC<MobileCardFooterProps> = ({ children, className = '' }) => {
  return (
    <div className={`mt-4 pt-4 border-t border-gray-100 ${className}`}>
      {children}
    </div>
  );
};
