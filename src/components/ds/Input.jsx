import React, { forwardRef } from 'react';

/**
 * Dafolle Design System — Input
 *
 * Pill-shaped input field matching the Figma design.
 *
 * Variants:
 *   dark  – semi-transparent dark backdrop (for use on colored/image backgrounds)
 *   light – standard light input with border (for use on white backgrounds)
 */
export const Input = forwardRef(function Input(
  { variant = 'light', className = '', ...props },
  ref
) {
  const base =
    'w-full h-12 px-6 rounded-full text-body-sm tracking-[-0.02em] transition-all duration-200 outline-none';

  const variants = {
    dark: 'bg-black/12 text-white placeholder:text-white/80 backdrop-blur-[12px] focus:bg-black/24 focus:ring-[0.5px] focus:ring-white',
    light:
      'bg-gray-100 text-gray-800 placeholder:text-gray-500 border border-gray-200 focus:bg-white focus:border-gray-400 focus:shadow-ds-sm',
  };

  return (
    <input
      ref={ref}
      className={`${base} ${variants[variant] || variants.light} ${className}`}
      {...props}
    />
  );
});

/**
 * Textarea variant with the same styling.
 */
export const TextArea = forwardRef(function TextArea(
  { variant = 'light', className = '', ...props },
  ref
) {
  const base =
    'w-full px-6 py-3 rounded-3xl text-body-sm tracking-[-0.02em] transition-all duration-200 outline-none resize-none';

  const variants = {
    dark: 'bg-black/12 text-white placeholder:text-white/80 backdrop-blur-[12px] focus:bg-black/24 focus:ring-[0.5px] focus:ring-white',
    light:
      'bg-gray-100 text-gray-800 placeholder:text-gray-500 border border-gray-200 focus:bg-white focus:border-gray-400 focus:shadow-ds-sm',
  };

  return (
    <textarea
      ref={ref}
      className={`${base} ${variants[variant] || variants.light} ${className}`}
      {...props}
    />
  );
});
