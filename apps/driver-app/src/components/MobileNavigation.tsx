import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface MobileNavProps {
  items: {
    label: string;
    href: string;
    icon: LucideIcon;
    badge?: string | number;
  }[];
  className?: string;
}

export const MobileNav: React.FC<MobileNavProps> = ({ items, className = '' }) => {
  const location = useLocation();

  return (
    <nav className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50 md:hidden ${className}`}>
      <div className="flex justify-around items-center">
        {items.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`
                flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all duration-200
                touch-manipulation min-w-[60px]
                ${isActive 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {item.badge && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

interface MobileHeaderProps {
  title: string;
  leftAction?: {
    icon: LucideIcon;
    onClick: () => void;
    ariaLabel?: string;
  };
  rightAction?: {
    icon: LucideIcon;
    onClick: () => void;
    ariaLabel?: string;
    badge?: string | number;
  };
  className?: string;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  title,
  leftAction,
  rightAction,
  className = '',
}) => {
  return (
    <header className={`bg-white shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-40 ${className}`}>
      {leftAction && (
        <button
          onClick={leftAction.onClick}
          aria-label={leftAction.ariaLabel}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation"
        >
          <leftAction.icon className="w-6 h-6 text-gray-700" />
        </button>
      )}
      
      <h1 className="text-lg font-semibold text-gray-900 text-center flex-1 mx-2 truncate">
        {title}
      </h1>
      
      {rightAction && (
        <button
          onClick={rightAction.onClick}
          aria-label={rightAction.ariaLabel}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation relative"
        >
          <rightAction.icon className="w-6 h-6 text-gray-700" />
          {rightAction.badge && (
            <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {typeof rightAction.badge === 'number' && rightAction.badge > 99 ? '99+' : rightAction.badge}
            </span>
          )}
        </button>
      )}
    </header>
  );
};

interface MobileTabBarProps {
  tabs: {
    label: string;
    value: string;
    icon?: LucideIcon;
  }[];
  activeTab: string;
  onChange: (tab: string) => void;
  className?: string;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
}) => {
  return (
    <div className={`flex bg-gray-100 rounded-lg p-1 space-x-1 ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;
        const Icon = tab.icon;
        
        return (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`
              flex-1 flex items-center justify-center py-2 px-3 rounded-md transition-all duration-200
              touch-manipulation min-h-[40px]
              ${isActive 
                ? 'bg-white text-blue-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
          >
            {Icon && <Icon className="w-4 h-4 mr-2" />}
            <span className="text-sm font-medium">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
