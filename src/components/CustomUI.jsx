import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

// --- Custom Dropdown (Replaces native select) ---
export const CustomSelect = ({ label, icon: Icon, value, options, onChange, placeholder = "Empty", type = "text", displayName = null, searchable = false, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchable && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen, searchable]);

  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = displayName || selectedOption?.label;

  // Filter options by search query
  const filteredOptions = searchable && searchQuery
    ? options.filter(opt => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  // Group options by their group property if present
  const hasGroups = filteredOptions.some(opt => opt.group);
  let groupedEntries = null;
  if (hasGroups) {
    const groups = {};
    filteredOptions.forEach(opt => {
      const group = opt.group || 'Other';
      if (!groups[group]) groups[group] = [];
      groups[group].push(opt);
    });
    groupedEntries = Object.entries(groups);
  }

  return (
    <div className="relative" ref={containerRef}>
      <div
        className={`flex items-center justify-between group py-1.5 px-2 rounded transition-colors ${disabled ? 'cursor-default opacity-75' : 'cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/50'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 text-neutral-500 w-32">
           {Icon && <Icon size={14} />}
           <span className="text-sm">{label}</span>
        </div>
        <div className="flex-1 flex items-center justify-end gap-2 truncate text-right">
            {displayLabel ? (
                 type === 'user' ? (
                   <div className="flex items-center gap-2">
                     <div className="w-5 h-5 rounded-full bg-neutral-300 dark:bg-neutral-700 flex items-center justify-center text-[10px] text-neutral-900 dark:text-white">
                        {displayLabel[0]}
                     </div>
                     <span className="text-sm text-neutral-700 dark:text-neutral-200">{displayLabel}</span>
                   </div>
                 ) : (
                   <span className="text-sm text-neutral-700 dark:text-neutral-200">{displayLabel}</span>
                 )
            ) : (
                <span className="text-sm text-neutral-600">{placeholder}</span>
            )}
        </div>
      </div>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl z-50 overflow-hidden animate-scale-in">
           {searchable && (
             <div className="px-2 pt-2 pb-1">
               <div className="flex items-center gap-2 px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/50 rounded-md">
                 <Search size={13} className="text-neutral-400 shrink-0" />
                 <input
                   ref={searchRef}
                   type="text"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   placeholder="Search..."
                   className="bg-transparent text-xs text-neutral-700 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none w-full"
                 />
               </div>
             </div>
           )}
           <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
              {hasGroups ? (
                groupedEntries.map(([group, groupOptions]) => (
                  <div key={group}>
                    <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-600">
                      {group}
                    </div>
                    {groupOptions.map((opt) => (
                      <div
                        key={opt.value}
                        onClick={() => { onChange(opt.value); setIsOpen(false); setSearchQuery(''); }}
                        className="flex items-center justify-between px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md cursor-pointer text-sm text-neutral-600 dark:text-neutral-300"
                      >
                         <div className="flex items-center gap-2 truncate">
                            {type === 'user' && (
                                <div className="w-5 h-5 rounded-full bg-neutral-300 dark:bg-neutral-700 flex items-center justify-center text-[10px] text-neutral-900 dark:text-white shrink-0">
                                  {opt.label[0]}
                                </div>
                            )}
                            <span className="truncate">{opt.label}</span>
                         </div>
                         {value === opt.value && <Check size={14} className="text-neutral-900 dark:text-white shrink-0" />}
                      </div>
                    ))}
                  </div>
                ))
              ) : (
                filteredOptions.map((opt) => (
                  <div
                    key={opt.value}
                    onClick={() => { onChange(opt.value); setIsOpen(false); setSearchQuery(''); }}
                    className="flex items-center justify-between px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md cursor-pointer text-sm text-neutral-600 dark:text-neutral-300"
                  >
                     <div className="flex items-center gap-2 truncate">
                        {type === 'user' && (
                            <div className="w-5 h-5 rounded-full bg-neutral-300 dark:bg-neutral-700 flex items-center justify-center text-[10px] text-neutral-900 dark:text-white shrink-0">
                              {opt.label[0]}
                            </div>
                        )}
                        <span className="truncate">{opt.label}</span>
                     </div>
                     {value === opt.value && <Check size={14} className="text-neutral-900 dark:text-white shrink-0" />}
                  </div>
                ))
              )}
              {filteredOptions.length === 0 && (
                <div className="px-3 py-4 text-center text-xs text-neutral-400 dark:text-neutral-600">
                  No results found
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

// --- Multi-Select Users Dropdown ---
export const MultiSelectUsers = ({ label, icon: Icon, values = [], options, onChange, placeholder = "Select...", maxSelections = 2, searchable = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchable && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen, searchable]);

  const selectedOptions = values.map(v => options.find(opt => opt.value === v)).filter(Boolean);
  const isMaxed = values.length >= maxSelections;

  const filteredOptions = searchable && searchQuery
    ? options.filter(opt => opt.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : options;

  const handleToggle = (optValue) => {
    if (values.includes(optValue)) {
      onChange(values.filter(v => v !== optValue));
    } else if (!isMaxed) {
      onChange([...values, optValue]);
    }
  };

  const handleRemove = (e, optValue) => {
    e.stopPropagation();
    onChange(values.filter(v => v !== optValue));
  };

  return (
    <div className="relative" ref={containerRef}>
      <div
        className="flex items-center justify-between group py-1.5 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800/50 px-2 rounded transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 text-neutral-500 w-32 shrink-0">
          {Icon && <Icon size={14} />}
          <span className="text-sm">{label}</span>
        </div>
        <div className="flex-1 flex items-center justify-end gap-1.5 min-w-0">
          {selectedOptions.length > 0 ? (
            selectedOptions.map(opt => (
              <div key={opt.value} className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full max-w-[120px]">
                <div className="w-4 h-4 rounded-full bg-neutral-300 dark:bg-neutral-700 flex items-center justify-center text-[8px] text-neutral-900 dark:text-white shrink-0">
                  {opt.label[0]}
                </div>
                <span className="text-xs text-neutral-700 dark:text-neutral-200 truncate">{opt.label}</span>
                <button
                  onClick={(e) => handleRemove(e, opt.value)}
                  className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white shrink-0 ml-0.5"
                >
                  <X size={10} />
                </button>
              </div>
            ))
          ) : (
            <span className="text-sm text-neutral-600">{placeholder}</span>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl z-50 overflow-hidden animate-scale-in">
          {searchable && (
            <div className="px-2 pt-2 pb-1">
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/50 rounded-md">
                <Search size={13} className="text-neutral-400 shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="bg-transparent text-xs text-neutral-700 dark:text-neutral-200 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none w-full"
                />
              </div>
            </div>
          )}
          <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
            {filteredOptions.map((opt) => {
              const isSelected = values.includes(opt.value);
              const isDisabled = !isSelected && isMaxed;
              return (
                <div
                  key={opt.value}
                  onClick={() => !isDisabled && handleToggle(opt.value)}
                  className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                    isDisabled
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer'
                  } ${isSelected ? 'text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-300'}`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-5 h-5 rounded-full bg-neutral-300 dark:bg-neutral-700 flex items-center justify-center text-[10px] text-neutral-900 dark:text-white shrink-0">
                      {opt.label[0]}
                    </div>
                    <span className="truncate">{opt.label}</span>
                  </div>
                  {isSelected && <Check size={14} className="text-neutral-900 dark:text-white shrink-0" />}
                </div>
              );
            })}
            {filteredOptions.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-neutral-400 dark:text-neutral-600">
                No results found
              </div>
            )}
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
      className="fixed z-50 bg-white dark:bg-[#1a1a1a] border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-2xl w-48 py-1 animate-scale-in origin-top-left"
      style={{ top: y, left: x }}
    >
       {actions.map((item, i) => (
         item.type === 'divider' ? (
           <div key={i} className="h-px bg-neutral-200 dark:bg-neutral-800 my-1" />
         ) : (
           <button
             key={i}
             onClick={() => { onAction(item.action); onClose(); }}
             className={`w-full text-left px-3 py-2 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${item.danger ? 'text-red-500' : 'text-neutral-600 dark:text-neutral-300'}`}
           >
             {item.label}
           </button>
         )
       ))}
    </div>
  );
};