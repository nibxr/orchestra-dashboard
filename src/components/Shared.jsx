import React from 'react';

export const Avatar = ({ name, url, size = 'sm', className = '' }) => {
  const initials = name ? name.substring(0, 2).toUpperCase() : '??';
  const sizeClasses = size === 'lg' ? 'w-10 h-10 text-sm' : (size === 'xl' ? 'w-12 h-12 text-base' : (size === '2xl' ? 'w-16 h-16 text-lg' : 'w-6 h-6 text-[10px]'));

  return (
    <div className={`${sizeClasses} rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700 font-medium shrink-0 ${className}`}>
      {url ? <img src={url} alt={name} className="w-full h-full rounded-full object-cover" /> : initials}
    </div>
  );
};

export const Badge = ({ children, color = 'gray' }) => {
  const colors = {
    green: 'bg-green-500/10 text-green-500 border-green-500/20',
    gray: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700',
    orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${colors[color] || colors.gray} flex items-center gap-1`}>
      {children}
    </span>
  );
};