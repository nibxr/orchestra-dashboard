import React, { useMemo } from 'react';

// Eagerly import all SVGs as raw strings using Vite's ?raw suffix
// These are static build-time assets from our own icon library — safe to inline
const svgModules = import.meta.glob('../assets/fonts/Icons/*.svg', { eager: true, query: '?raw', import: 'default' });

// Build a lookup map: icon name -> raw SVG string
const iconMap = {};
for (const [path, raw] of Object.entries(svgModules)) {
  const name = path.split('/').pop().replace('.svg', '');
  iconMap[name] = raw;
}

/**
 * Icon component that renders SVGs from src/assets/fonts/Icons/
 *
 * @param {string} name - Icon filename without .svg (e.g. "plus-01", "check-01", "arrow-left")
 * @param {number} size - Width and height in px (default 24)
 * @param {string} className - Additional CSS classes (use text-* for color via currentColor)
 * @param {object} style - Additional inline styles
 * @param {object} rest - Any other props passed to the wrapper span
 */
export const Icon = ({ name, size = 24, className = '', style = {}, ...rest }) => {
  const svgMarkup = useMemo(() => {
    const raw = iconMap[name];
    if (!raw) return null;

    // Replace hardcoded colors with currentColor so CSS text-* classes work
    let processed = raw
      .replace(/stroke="black"/g, 'stroke="currentColor"')
      .replace(/fill="black"/g, 'fill="currentColor"')
      .replace(/stroke="#000000"/g, 'stroke="currentColor"')
      .replace(/fill="#000000"/g, 'fill="currentColor"')
      .replace(/stroke="#000"/g, 'stroke="currentColor"')
      .replace(/fill="#000"/g, 'fill="currentColor"');

    // Set width/height on the SVG element
    processed = processed
      .replace(/width="24"/, `width="${size}"`)
      .replace(/height="24"/, `height="${size}"`);

    return processed;
  }, [name, size]);

  if (!svgMarkup) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[Icon] Unknown icon name: "${name}"`);
    }
    return null;
  }

  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size, ...style }}
      // Safe: content comes from our own static SVG assets bundled at build time
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
      role="img"
      aria-hidden="true"
      {...rest}
    />
  );
};

export default Icon;
