import React, { useState } from 'react';
import { 
  Columns, AlignJustify, ArrowUpDown, Trash2, EyeOff, Layers, 
  Calendar, Flag, Type, Maximize2, Clock, User, Check, Search,
  ChevronRight, ChevronDown
} from 'lucide-react';

// --- Display Menu (Image 1) ---
export const DisplayMenu = ({ settings, onUpdate, onClose }) => {
  const toggleSetting = (key) => onUpdate({ ...settings, [key]: !settings[key] });

  return (
    <div className="absolute top-full right-0 mt-2 w-72 bg-[#1a1a1a] border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-scale-in">
      {/* View Switcher */}
      <div className="p-2 border-b border-neutral-800">
        <div className="flex bg-neutral-900 p-1 rounded-lg">
          <button 
            onClick={() => onUpdate({ ...settings, view: 'kanban' })}
            className={`flex-1 flex flex-col items-center gap-1 text-xs py-2 rounded-md transition-all ${settings.view === 'kanban' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-white'}`}
          >
            <Columns size={16} />
            Kanban
          </button>
          <button 
            onClick={() => onUpdate({ ...settings, view: 'list' })}
            className={`flex-1 flex flex-col items-center gap-1 text-xs py-2 rounded-md transition-all ${settings.view === 'list' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-white'}`}
          >
            <AlignJustify size={16} />
            List
          </button>
        </div>
      </div>

      {/* Ordering */}
      <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-neutral-300 text-sm">
          <ArrowUpDown size={14} />
          Ordering
        </div>
        <select 
            value={settings.orderBy}
            onChange={(e) => onUpdate({ ...settings, orderBy: e.target.value })}
            className="bg-neutral-900 border border-neutral-800 text-white text-xs px-2 py-1 rounded focus:outline-none cursor-pointer"
        >
            <option value="oldest">Oldest</option>
            <option value="newest">Newest</option>
            <option value="updated">Last Updated</option>
        </select>
      </div>

      {/* Toggles */}
      <div className="px-4 py-3 border-b border-neutral-800 space-y-3">
        <ToggleRow label="Show archived" icon={Trash2} active={settings.showArchived} onToggle={() => toggleSetting('showArchived')} />
        <ToggleRow label="Show inactive customers' tasks" icon={EyeOff} active={settings.showInactive} onToggle={() => toggleSetting('showInactive')} />
        <ToggleRow label="Show subtasks" icon={Layers} active={settings.showSubtasks} onToggle={() => toggleSetting('showSubtasks')} />
      </div>

      {/* Properties Visibility */}
      <div className="p-4">
        <div className="flex items-center gap-2 text-neutral-500 text-xs font-medium mb-3">
            <div className="w-3 h-3 rounded-full border border-neutral-600 flex items-center justify-center"><div className="w-1 h-1 bg-neutral-600 rounded-full"></div></div>
            Properties
        </div>
        <div className="grid grid-cols-2 gap-y-2 gap-x-4">
           {['Due Date', 'Priority', 'Type', 'Sizing', 'Project due date', 'Helper', 'Version', 'Heure d\'envoi', 'Heure', 'Max task A/R'].map(prop => (
               <button 
                key={prop} 
                onClick={() => {
                    const newProps = settings.visibleProperties.includes(prop) 
                        ? settings.visibleProperties.filter(p => p !== prop)
                        : [...settings.visibleProperties, prop];
                    onUpdate({ ...settings, visibleProperties: newProps });
                }}
                className={`text-xs text-left transition-colors ${settings.visibleProperties.includes(prop) ? 'text-white font-medium' : 'text-neutral-500 hover:text-neutral-300'}`}
               >
                   {prop}
               </button>
           ))}
        </div>
      </div>
    </div>
  );
};

const ToggleRow = ({ label, icon: Icon, active, onToggle }) => (
    <div className="flex items-center justify-between cursor-pointer group" onClick={onToggle}>
        <div className="flex items-center gap-2 text-neutral-300 text-sm group-hover:text-white transition-colors">
            <Icon size={14} className="text-neutral-500" />
            {label}
        </div>
        <div className={`w-8 h-4 rounded-full relative transition-colors ${active ? 'bg-green-900' : 'bg-neutral-800'}`}>
            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${active ? 'left-4.5' : 'left-0.5'}`}></div>
        </div>
    </div>
);


// --- Filters Menu (Image 2) ---
export const FilterMenu = ({ activeFilters, onUpdate, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filterOptions = [
      { id: 'assignee', label: 'Assigned to', icon: User },
      { id: 'status', label: 'Status', icon: Layers }, // Using Layers as placeholder for Status icon
      { id: 'dueDate', label: 'Due Date', icon: Calendar },
      { id: 'priority', label: 'Priority', icon: ArrowUpDown },
      { id: 'type', label: 'Type', icon: Type },
      { id: 'sizing', label: 'Sizing', icon: Maximize2 },
      { id: 'projectDueDate', label: 'Project due date', icon: Calendar },
      { id: 'helper', label: 'Helper', icon: User },
      { id: 'version', label: 'Version', icon: Type },
  ];

  return (
    <div className="absolute top-full left-0 mt-2 w-64 bg-[#1a1a1a] border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-scale-in">
        <div className="p-2 border-b border-neutral-800">
            <div className="flex items-center gap-2 px-2 py-1 bg-neutral-900 rounded-md">
                <Search size={14} className="text-neutral-500" />
                <input 
                    className="bg-transparent border-none text-xs text-white focus:outline-none w-full placeholder-neutral-600"
                    placeholder="Search filters..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    autoFocus
                />
            </div>
        </div>
        <div className="max-h-80 overflow-y-auto custom-scrollbar py-1">
            {filterOptions.filter(f => f.label.toLowerCase().includes(searchTerm.toLowerCase())).map((filter, i) => (
                <button 
                    key={filter.id}
                    onClick={() => onUpdate(filter.id)} // In a real app this would open a sub-menu
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-neutral-800 text-left group"
                >
                    <div className="flex items-center gap-2 text-neutral-300 group-hover:text-white text-sm">
                        <filter.icon size={14} className="text-neutral-500" />
                        {filter.label}
                    </div>
                    <span className="text-[10px] text-neutral-600 font-mono">{i + 1}</span>
                </button>
            ))}
        </div>
    </div>
  );
};