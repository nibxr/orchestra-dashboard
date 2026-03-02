import React from 'react';

/**
 * Dafolle Design System — Tag / Badge
 *
 * Variants:
 *   green   – green tinted background (default, for active/success states)
 *   neutral – white background with dark text
 *   blue    – brand blue tint
 *   pink    – brand pink tint
 *   yellow  – brand yellow tint
 *   violet  – brand violet tint
 */
const variantStyles = {
  green:   'bg-brand-green-2/40 text-brand-green-1',
  neutral: 'bg-white text-gray-800 border border-gray-200',
  blue:    'bg-brand-blue-2/40 text-brand-blue-1',
  pink:    'bg-brand-pink-2/40 text-brand-pink-1',
  yellow:  'bg-brand-yellow-2/60 text-brand-yellow-1',
  violet:  'bg-brand-violet-2/40 text-brand-violet-1',
};

export function Tag({ children, variant = 'green', className = '', ...props }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-4 py-1.5 text-body-xs backdrop-blur-[12px] whitespace-nowrap ${variantStyles[variant] || variantStyles.green} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
