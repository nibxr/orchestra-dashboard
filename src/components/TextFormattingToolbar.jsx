import React, { useState } from 'react';
import { Icon } from './Icon';

/**
 * Text formatting toolbar for adding markdown/HTML formatting to text
 */
export const TextFormattingToolbar = ({ onFormat }) => {
  const [showToolbar, setShowToolbar] = useState(false);

  const formatText = (type) => {
    onFormat(type);
    setShowToolbar(false);
  };

  if (!showToolbar) {
    return (
      <button
        onClick={() => setShowToolbar(true)}
        className="text-neutral-500 hover:text-white transition-colors"
        title="Text formatting"
      >
        <Icon name="bold-01" size={16} />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-[#0f0f0f] border border-neutral-700 rounded-lg p-1">
      <button
        onClick={() => formatText('bold')}
        className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
        title="Bold"
      >
        <Icon name="bold-01" size={16} />
      </button>
      <button
        onClick={() => formatText('italic')}
        className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
        title="Italic"
      >
        <Icon name="italics-01" size={16} />
      </button>
      <button
        onClick={() => formatText('underline')}
        className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
        title="Underline"
      >
        <Icon name="underline-01" size={16} />
      </button>
      <button
        onClick={() => formatText('code')}
        className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
        title="Code"
      >
        <Icon name="code-01" size={16} />
      </button>
      <div className="w-px h-6 bg-neutral-700 mx-1" />
      <button
        onClick={() => setShowToolbar(false)}
        className="px-2 py-1 text-xs text-neutral-400 hover:text-white"
      >
        Close
      </button>
    </div>
  );
};

/**
 * Helper function to wrap selected text or insert formatting markers
 */
export const applyFormatting = (text, cursorPosition, formatType) => {
  const formats = {
    bold: { start: '<strong>', end: '</strong>' },
    italic: { start: '<em>', end: '</em>' },
    underline: { start: '<u>', end: '</u>' },
    code: { start: '<code>', end: '</code>' }
  };

  const format = formats[formatType];
  if (!format) return { newText: text, newCursor: cursorPosition };

  // If there's no selection, just insert the markers
  const before = text.slice(0, cursorPosition);
  const after = text.slice(cursorPosition);
  const newText = before + format.start + format.end + after;
  const newCursor = cursorPosition + format.start.length;

  return { newText, newCursor };
};
