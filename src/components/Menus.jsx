import React from 'react';
import { Check, ChevronDown, Search, LayoutGrid, List as ListIcon, User, Briefcase } from 'lucide-react';

// --- DISPLAY MENU ---
export const DisplayMenu = ({ settings, onUpdate, onClose }) => {
  
  const toggleProperty = (prop) => {
    const current = settings.visibleProperties || [];
    let newProps;
    if (current.includes(prop)) {
      newProps = current.filter(p => p !== prop);
    } else {
      newProps = [...current, prop];
    }
    onUpdate({ ...settings, visibleProperties: newProps });
  };

  const toggleSetting = (key) => {
    onUpdate({ ...settings, [key]: !settings[key] });
  };

  const setSort = (sortKey) => {
    onUpdate({ ...settings, orderBy: sortKey });
  };

  const setView = (viewKey) => {
    onUpdate({ ...settings, view: viewKey });
  };

  return (
    <div 
      className="absolute top-full right-0 mt-2 w-64 bg-[#0f0f0f] border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-scale-up"
      onClick={(e) => e.stopPropagation()} 
    >
      <div className="p-1 space-y-1">
        {/* Layout Section (Kanban / List) */}
        <div className="px-3 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">Layout</div>
        <div className="flex gap-1 px-2 mb-2">
            <button 
                onClick={() => setView('kanban')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium transition-all ${settings.view === 'kanban' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
                <LayoutGrid size={14} /> Board
            </button>
            <button 
                onClick={() => setView('list')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium transition-all ${settings.view === 'list' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
                <ListIcon size={14} /> List
            </button>
        </div>

        <div className="h-px bg-neutral-800 my-1 mx-2"></div>

        {/* Properties Section */}
        <div className="px-3 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">Properties</div>
        {[
          { id: 'client', label: 'Client' },
          { id: 'assignee', label: 'Assignee' },
          { id: 'dueDate', label: 'Due date' },
          { id: 'id', label: 'ID' }
        ].map((prop) => {
          const isActive = settings.visibleProperties?.includes(prop.id);
          return (
            <button 
              key={prop.id}
              onClick={() => toggleProperty(prop.id)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors group"
            >
              <span className="group-hover:text-white">{prop.label}</span>
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isActive ? 'bg-blue-600 border-blue-600' : 'border-neutral-600 bg-transparent'}`}>
                {isActive && <Check size={10} className="text-white" strokeWidth={3} />}
              </div>
            </button>
          );
        })}

        <div className="h-px bg-neutral-800 my-1 mx-2"></div>

        {/* Sort Section */}
        <div className="px-3 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">Sort by</div>
        {[
          { id: 'last_updated', label: 'Last updated' },
          { id: 'newest', label: 'Newest created' },
          { id: 'oldest', label: 'Oldest created' }
        ].map((sort) => (
          <button 
            key={sort.id}
            onClick={() => setSort(sort.id)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <span>{sort.label}</span>
            {settings.orderBy === sort.id && <Check size={14} className="text-blue-500" />}
          </button>
        ))}

        <div className="h-px bg-neutral-800 my-1 mx-2"></div>

        {/* View Options */}
        <div className="px-3 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">Options</div>
        <button 
          onClick={() => toggleSetting('showArchived')}
          className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors"
        >
          <span>Show archived</span>
          <div className={`w-8 h-4 rounded-full relative transition-colors ${settings.showArchived ? 'bg-blue-600' : 'bg-neutral-700'}`}>
            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${settings.showArchived ? 'left-4.5' : 'left-0.5'}`}></div>
          </div>
        </button>
        <button 
          onClick={() => toggleSetting('showInactive')}
          className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800 rounded-lg transition-colors"
        >
          <span>Show inactive</span>
          <div className={`w-8 h-4 rounded-full relative transition-colors ${settings.showInactive ? 'bg-blue-600' : 'bg-neutral-700'}`}>
            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${settings.showInactive ? 'left-4.5' : 'left-0.5'}`}></div>
          </div>
        </button>
      </div>
    </div>
  );
};

// --- FILTER MENU (REAL FILTERS) ---
export const FilterMenu = ({ filters, onUpdate, team, clients, onClose }) => {
    
    const toggleFilter = (type, value) => {
        const current = filters[type] || [];
        let newValues;
        if (current.includes(value)) {
            newValues = current.filter(v => v !== value);
        } else {
            newValues = [...current, value];
        }
        onUpdate({ ...filters, [type]: newValues });
    };

    return (
        <div 
            className="absolute top-full right-0 mt-2 w-72 max-h-[500px] bg-[#0f0f0f] border border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col animate-scale-up"
            onClick={(e) => e.stopPropagation()}
        >
             <div className="p-3 border-b border-neutral-800 flex items-center gap-2 shrink-0">
                <Search size={14} className="text-neutral-500" />
                <input type="text" placeholder="Filter properties..." className="bg-transparent w-full text-sm text-white focus:outline-none placeholder-neutral-600"/>
             </div>
             
             <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-4">
                 {/* Assignees Filter */}
                 <div>
                     <div className="px-2 py-1 text-xs font-medium text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                         <User size={12} /> Assignee
                     </div>
                     <div className="mt-1 space-y-0.5">
                         {team.map(member => {
                             const isSelected = filters.assignee?.includes(member.id);
                             return (
                                 <button 
                                     key={member.id}
                                     onClick={() => toggleFilter('assignee', member.id)}
                                     className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-neutral-800 transition-colors group"
                                 >
                                     <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-neutral-700'}`}>
                                         {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                                     </div>
                                     {member.avatar_url ? (
                                         <img src={member.avatar_url} className="w-5 h-5 rounded-full object-cover" alt=""/>
                                     ) : (
                                         <div className="w-5 h-5 rounded-full bg-neutral-800 flex items-center justify-center text-[10px]">{member.full_name[0]}</div>
                                     )}
                                     <span className={`text-sm ${isSelected ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-300'}`}>{member.full_name}</span>
                                 </button>
                             )
                         })}
                     </div>
                 </div>

                 <div className="h-px bg-neutral-800 mx-2"></div>

                 {/* Clients Filter */}
                 <div>
                     <div className="px-2 py-1 text-xs font-medium text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                         <Briefcase size={12} /> Client
                     </div>
                     <div className="mt-1 space-y-0.5">
                         {clients.map(client => {
                             const isSelected = filters.client?.includes(client.id);
                             return (
                                 <button 
                                     key={client.id}
                                     onClick={() => toggleFilter('client', client.id)}
                                     className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-neutral-800 transition-colors group"
                                 >
                                     <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-neutral-700'}`}>
                                         {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                                     </div>
                                     <span className={`text-sm truncate ${isSelected ? 'text-white' : 'text-neutral-400 group-hover:text-neutral-300'}`}>{client.client_name}</span>
                                 </button>
                             )
                         })}
                     </div>
                 </div>
             </div>
             
             {/* Footer with Clear */}
             <div className="p-2 border-t border-neutral-800 bg-[#141414] shrink-0 flex justify-between items-center">
                 <span className="text-xs text-neutral-500">
                     {(filters.assignee?.length || 0) + (filters.client?.length || 0)} active
                 </span>
                 <button 
                    onClick={() => onUpdate({ assignee: [], client: [] })}
                    className="text-xs font-medium text-neutral-400 hover:text-white px-2 py-1 rounded hover:bg-neutral-800 transition-colors"
                 >
                     Clear all
                 </button>
             </div>
        </div>
    );
};