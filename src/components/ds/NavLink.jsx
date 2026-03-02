import React from 'react';
import { Icon } from '../Icon';

/**
 * Dafolle Design System — NavLink / Breadcrumb row
 *
 * A text link with an arrow, matching the Figma "Buttons" component.
 * Three states: default (muted), hover (dark), focused/active (black).
 */
export function NavLink({
  children,
  active = false,
  showArrow = true,
  className = '',
  ...props
}) {
  return (
    <button
      className={`group flex items-center gap-10 w-full text-left text-body-md tracking-[-0.02em] transition-colors duration-150 ${
        active
          ? 'text-gray-800'
          : 'text-gray-500 hover:text-gray-700'
      } ${className}`}
      {...props}
    >
      <span className="flex-1 truncate">{children}</span>
      {showArrow && (
        <Icon
          name="arrow-right"
          size={16}
          className={`shrink-0 transition-transform duration-150 ${
            active ? 'text-gray-800' : 'text-gray-400 group-hover:text-gray-600'
          } group-hover:translate-x-0.5`}
        />
      )}
    </button>
  );
}
