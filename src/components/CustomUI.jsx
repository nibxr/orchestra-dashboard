import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

// --- Custom Dropdown (Replaces native select) ---
export const CustomSelect = ({ label, icon: Icon, value, options, onChange, placeholder = "Empty", type = "text" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative" ref={containerRef}>
      <div 
        className="flex items-center justify-between group py-1.5 cursor-pointer hover:bg-neutral-800/50 px-2 rounded transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 text-neutral-500 w-32">
           {Icon && <Icon size={14} />}
           <span className="text-sm">{label}</span>
        </div>
        <div className="flex-1 flex items-center justify-end gap-2 truncate text-right">
            {selectedOption ? (
                 type === 'user' ? (
                   <div className="flex items-center gap-2">
                     <div className="w-5 h-5 rounded-full bg-neutral-700 flex items-center justify-center text-[10px] text-white">
                        {selectedOption.label[0]}
                     </div>
                     <span className="text-sm text-neutral-200">{selectedOption.label}</span>
                   </div>
                 ) : (
                   <span className="text-sm text-neutral-200">{selectedOption.label}</span>
                 )
            ) : (
                <span className="text-sm text-neutral-600">{placeholder}</span>
            )}
        </div>
      </div>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-[#1a1a1a] border border-neutral-800 rounded-lg shadow-xl z-50 overflow-hidden animate-scale-in">
           <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
              {options.map((opt) => (
                <div 
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  className="flex items-center justify-between px-3 py-2 hover:bg-neutral-800 rounded-md cursor-pointer text-sm text-neutral-300"
                >
                   <div className="flex items-center gap-2">
                      {type === 'user' && (
                          <div className="w-5 h-5 rounded-full bg-neutral-700 flex items-center justify-center text-[10px] text-white">
                            {opt.label[0]}
                          </div>
                      )}
                      {opt.label}
                   </div>
                   {value === opt.value && <Check size={14} className="text-blue-500" />}
                </div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
};

// --- Context Menu ---
export const ContextMenu = ({ x, y, onClose, onAction }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const actions = [
    { label: 'Open task', action: 'open' },
    { label: 'Copy task ID', action: 'copy_id' },
    { label: 'Copy link', action: 'copy_link' },
    { type: 'divider' },
    { label: 'Delete', action: 'delete', danger: true },
  ];

  return (
    <div 
      ref={menuRef}
      className="fixed z-50 bg-[#1a1a1a] border border-neutral-800 rounded-lg shadow-2xl w-48 py-1 animate-scale-in origin-top-left"
      style={{ top: y, left: x }}
    >
       {actions.map((item, i) => (
         item.type === 'divider' ? (
           <div key={i} className="h-px bg-neutral-800 my-1" />
         ) : (
           <button
             key={i}
             onClick={() => { onAction(item.action); onClose(); }}
             className={`w-full text-left px-3 py-2 text-xs hover:bg-neutral-800 transition-colors ${item.danger ? 'text-red-500' : 'text-neutral-300'}`}
           >
             {item.label}
           </button>
         )
       ))}
    </div>
  );
};