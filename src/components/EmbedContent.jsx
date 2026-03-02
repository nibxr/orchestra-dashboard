import React from 'react';
import { Icon } from './Icon';

/**
 * Detects and renders embedded content from URLs
 * Supports: YouTube, Vimeo, Loom, Figma, Google Drive, Miro, Fillout, Typeform, and generic links
 */

const detectEmbedType = (url) => {
  if (!url) return null;

  // YouTube
  if (url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    return { type: 'youtube', id: match[1] };
  }

  // Vimeo
  if (url.match(/vimeo\.com\/(\d+)/)) {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return { type: 'vimeo', id: match[1] };
  }

  // Loom
  if (url.match(/loom\.com\/(share|embed)\/([a-zA-Z0-9]+)/)) {
    const match = url.match(/loom\.com\/(share|embed)\/([a-zA-Z0-9]+)/);
    return { type: 'loom', id: match[2] };
  }

  // Fillout forms (e.g., https://dafolle.fillout.com/t/jMLbSqduG9us or https://forms.dafolle.io/t/xyz)
  if (url.match(/fillout\.com\/t\/([a-zA-Z0-9]+)/)) {
    const match = url.match(/fillout\.com\/t\/([a-zA-Z0-9]+)/);
    return { type: 'fillout', id: match[1], url };
  }

  // Typeform
  if (url.match(/typeform\.com\/to\/([a-zA-Z0-9]+)/)) {
    const match = url.match(/typeform\.com\/to\/([a-zA-Z0-9]+)/);
    return { type: 'typeform', id: match[1] };
  }

  // Figma
  if (url.match(/figma\.com\/(file|proto)\/([^/]+)/)) {
    return { type: 'figma', url };
  }

  // Google Drive (docs, sheets, slides, etc.)
  if (url.match(/drive\.google\.com|docs\.google\.com|sheets\.google\.com|slides\.google\.com/)) {
    return { type: 'google-drive', url };
  }

  // Miro
  if (url.match(/miro\.com\/app\/board\/([^/]+)/)) {
    return { type: 'miro', url };
  }

  // Generic link
  if (url.match(/^https?:\/\//)) {
    return { type: 'link', url };
  }

  return null;
};

export const EmbedRenderer = ({ url, className = '' }) => {
  const embed = detectEmbedType(url);

  if (!embed) return null;

  const containerClass = `rounded-lg overflow-hidden border border-neutral-800 ${className}`;

  switch (embed.type) {
    case 'youtube':
      return (
        <div className={containerClass}>
          <iframe
            className="w-full aspect-video"
            src={`https://www.youtube.com/embed/${embed.id}`}
            title="YouTube video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );

    case 'vimeo':
      return (
        <div className={containerClass}>
          <iframe
            className="w-full aspect-video"
            src={`https://player.vimeo.com/video/${embed.id}`}
            title="Vimeo video"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>
      );

    case 'loom':
      return (
        <div className={containerClass}>
          <iframe
            className="w-full aspect-video"
            src={`https://www.loom.com/embed/${embed.id}`}
            title="Loom video"
            frameBorder="0"
            allowFullScreen
          />
        </div>
      );

    case 'figma':
      return (
        <div className={containerClass}>
          <iframe
            className="w-full h-[600px]"
            src={`https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(embed.url)}`}
            title="Figma design"
            allowFullScreen
          />
        </div>
      );

    case 'google-drive':
      return (
        <div className={containerClass}>
          <iframe
            className="w-full h-[600px]"
            src={embed.url.replace('/view', '/preview')}
            title="Google Drive file"
            allowFullScreen
          />
        </div>
      );

    case 'miro':
      return (
        <div className={containerClass}>
          <iframe
            className="w-full h-[600px]"
            src={embed.url}
            title="Miro board"
            allowFullScreen
          />
        </div>
      );

    case 'fillout':
      return (
        <div className={containerClass}>
          <iframe
            className="w-full h-[600px]"
            src={`https://dafolle.fillout.com/t/${embed.id}?embed=true`}
            title="Fillout form"
            frameBorder="0"
            allowFullScreen
          />
        </div>
      );

    case 'typeform':
      return (
        <div className={containerClass}>
          <iframe
            className="w-full h-[600px]"
            src={`https://form.typeform.com/to/${embed.id}`}
            title="Typeform"
            frameBorder="0"
            allowFullScreen
          />
        </div>
      );

    case 'link':
      return (
        <a
          href={embed.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm underline"
        >
          {embed.url}
          <Icon name="link-external" size={14} />
        </a>
      );

    default:
      return null;
  }
};

/**
 * Parses text content and extracts embeddable URLs
 * Returns array of { type: 'text' | 'embed', content: string }
 */
export const parseContentWithEmbeds = (text) => {
  if (!text) return [{ type: 'text', content: '' }];

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = [];
  let lastIndex = 0;

  text.replace(urlRegex, (match, url, offset) => {
    // Add text before URL
    if (offset > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, offset) });
    }

    // Add URL (will be rendered as embed if supported)
    const embed = detectEmbedType(url);
    if (embed && embed.type !== 'link') {
      parts.push({ type: 'embed', content: url });
    } else {
      parts.push({ type: 'text', content: url });
    }

    lastIndex = offset + match.length;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }];
};

/**
 * Component that renders text with embedded content
 */
export const ContentWithEmbeds = ({ content, className = '' }) => {
  const parts = parseContentWithEmbeds(content);

  return (
    <div className={`space-y-4 ${className}`}>
      {parts.map((part, index) => (
        part.type === 'embed' ? (
          <EmbedRenderer key={index} url={part.content} />
        ) : (
          <div key={index} className="whitespace-pre-wrap text-neutral-300">
            {part.content}
          </div>
        )
      ))}
    </div>
  );
};

/**
 * Input component with embed link button
 */
export const EmbedLinkButton = ({ onInsert }) => {
  const [showInput, setShowInput] = React.useState(false);
  const [url, setUrl] = React.useState('');

  const handleInsert = () => {
    if (url.trim()) {
      onInsert(url.trim());
      setUrl('');
      setShowInput(false);
    }
  };

  if (!showInput) {
    return (
      <button
        onClick={() => setShowInput(true)}
        className="text-neutral-500 hover:text-white transition-colors"
        title="Add link or embed"
      >
        <Icon name="link-external" size={16} />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-[#0f0f0f] border border-neutral-700 rounded-lg px-3 py-2">
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleInsert();
          }
          if (e.key === 'Escape') {
            setUrl('');
            setShowInput(false);
          }
        }}
        placeholder="Paste link (Figma, Fillout, YouTube, etc.)"
        className="bg-transparent text-white text-sm focus:outline-none flex-1 min-w-[300px]"
        autoFocus
      />
      <button
        onClick={handleInsert}
        className="px-3 py-1 bg-white text-black text-xs font-bold rounded hover:bg-neutral-200"
      >
        Insert
      </button>
      <button
        onClick={() => {
          setUrl('');
          setShowInput(false);
        }}
        className="px-3 py-1 bg-neutral-800 text-neutral-300 text-xs font-bold rounded hover:bg-neutral-700"
      >
        Cancel
      </button>
    </div>
  );
};
