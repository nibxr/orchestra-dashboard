import React from 'react';

/**
 * Dafolle Design System — Card
 *
 * Container component with the design system's rounded corners, border and shadow.
 *
 * Elevation sizes match the Figma shadow scale:
 *   sm | md | lg | xl | 2xl
 */
const elevations = {
  none: '',
  sm:  'shadow-ds-sm',
  md:  'shadow-ds-md',
  lg:  'shadow-ds-lg',
  xl:  'shadow-ds-xl',
  '2xl': 'shadow-ds-2xl',
};

export function Card({
  children,
  elevation = 'sm',
  className = '',
  ...props
}) {
  return (
    <div
      className={`bg-white border border-brand-pink-2 rounded-[32px] p-6 overflow-hidden ${elevations[elevation] || ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
