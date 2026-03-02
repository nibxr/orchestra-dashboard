import React from 'react';
import { Icon } from '../Icon';

/**
 * Dafolle Design System — Button
 *
 * Variants:
 *   primary   – solid black pill with white text (CTA)
 *   secondary – light gray pill with dark text
 *   ghost     – transparent with border, hover fills
 *
 * Sizes: sm (32px) | md (40px) | lg (48px)
 */
export function Button({
  children,
  variant = 'primary',
  size = 'sm',
  icon,
  iconPosition = 'left',
  className = '',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-full font-normal transition-all duration-200 tracking-[-0.02em] whitespace-nowrap';

  const sizes = {
    sm: 'h-8 px-3 text-body-sm',
    md: 'h-10 px-4 text-body-md',
    lg: 'h-12 px-6 text-body-md',
  };

  const variants = {
    primary:
      'bg-gray-800 text-white hover:bg-black active:scale-[0.98]',
    secondary:
      'bg-gray-100 border border-gray-100 text-gray-800 hover:bg-white hover:border-gray-200 backdrop-blur-[12px] active:scale-[0.98]',
    ghost:
      'bg-transparent text-gray-700 hover:bg-gray-100 active:scale-[0.98]',
  };

  const iconEl = icon || null;

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {iconPosition === 'left' && iconEl}
      {children}
      {iconPosition === 'right' && iconEl}
    </button>
  );
}

/**
 * Primary CTA — the main call-to-action button from the design system.
 * Black pill with white text and a plus icon.
 */
export function PrimaryCTA({ children, className = '', ...props }) {
  return (
    <Button
      variant="primary"
      size="sm"
      icon={<Icon name="plus-01" size={12} />}
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
}

/**
 * Secondary CTA — lighter pill button for secondary actions.
 */
export function SecondaryCTA({ children, className = '', ...props }) {
  return (
    <Button
      variant="secondary"
      size="sm"
      icon={<Icon name="plus-01" size={12} />}
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
}

/**
 * Icon-only button variant — circular, used for menu toggles etc.
 */
export function IconButton({
  children,
  variant = 'secondary',
  size = 'lg',
  className = '',
  ...props
}) {
  const base =
    'inline-flex items-center justify-center rounded-full transition-all duration-200 active:scale-[0.98]';

  const sizes = {
    sm: 'size-8',
    md: 'size-10',
    lg: 'size-12',
  };

  const variants = {
    primary: 'bg-gray-800 text-white hover:bg-black',
    secondary:
      'bg-gray-200 text-gray-800 hover:bg-gray-300 backdrop-blur-[12px]',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
