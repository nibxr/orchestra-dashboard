import React, { useState } from 'react';
import { Icon } from './Icon';

// --- RADIO CIRCLE INDICATOR (shared between both menus) ---
const RadioCircle = ({ active, className = '' }) => (
  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${active ? 'border-neutral-900 dark:border-white' : 'border-neutral-300 dark:border-neutral-600'} ${className}`}>
    {active && <div className="w-2 h-2 rounded-full bg-neutral-900 dark:bg-white"></div>}
  </div>
);

// --- DISPLAY MENU ---
export const DisplayMenu = ({ settings, onUpdate, onClose, isCustomer = false }) => {

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
      className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-scale-up"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-1 space-y-1">
        {/* Layout Section (Kanban / List) */}
        <div className="px-3 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">Layout</div>
        <div className="flex gap-1 px-2 mb-2">
            <button
                onClick={() => setView('kanban')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium transition-all ${settings.view === 'kanban' ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-600 dark:text-neutral-300'}`}
            >
                <Icon name="layout-grid-01" size={14} /> Board
            </button>
            <button
                onClick={() => setView('list')}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium transition-all ${settings.view === 'list' ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white' : 'text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-600 dark:text-neutral-300'}`}
            >
                <Icon name="list" size={14} /> List
            </button>
        </div>

        <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-1 mx-2"></div>

        {/* Properties Section */}
        <div className="px-3 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">Properties</div>
        {[
          { id: 'client', label: 'Client', teamOnly: true },
          { id: 'assignee', label: 'Assignee', teamOnly: true },
          { id: 'dueDate', label: 'Due date', teamOnly: false },
          { id: 'id', label: 'ID', teamOnly: false }
        ].filter(prop => !isCustomer || !prop.teamOnly).map((prop) => {
          const isActive = settings.visibleProperties?.includes(prop.id);
          return (
            <button
              key={prop.id}
              onClick={() => toggleProperty(prop.id)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors group"
            >
              <span className="group-hover:text-neutral-900 dark:group-hover:text-white">{prop.label}</span>
              <RadioCircle active={isActive} />
            </button>
          );
        })}

        <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-1 mx-2"></div>

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
            className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <span>{sort.label}</span>
            <RadioCircle active={settings.orderBy === sort.id} />
          </button>
        ))}

        <div className="h-px bg-neutral-200 dark:bg-neutral-800 my-1 mx-2"></div>

        {/* View Options */}
        {!isCustomer && (
          <>
            <div className="px-3 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">Options</div>
            <button
              onClick={() => toggleSetting('showArchived')}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <span>Show archived</span>
              <div className={`w-8 h-[18px] rounded-full relative transition-colors ${settings.showArchived ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-300 dark:bg-neutral-700'}`}>
                <div className={`absolute top-[3px] w-3 h-3 rounded-full shadow-sm transition-all duration-200 ${settings.showArchived ? 'left-[17px] bg-white dark:bg-neutral-900' : 'left-[3px] bg-white dark:bg-neutral-400'}`}></div>
              </div>
            </button>
            <button
              onClick={() => toggleSetting('showInactive')}
              className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <span>Show inactive</span>
              <div className={`w-8 h-[18px] rounded-full relative transition-colors ${settings.showInactive ? 'bg-neutral-900 dark:bg-white' : 'bg-neutral-300 dark:bg-neutral-700'}`}>
                <div className={`absolute top-[3px] w-3 h-3 rounded-full shadow-sm transition-all duration-200 ${settings.showInactive ? 'left-[17px] bg-white dark:bg-neutral-900' : 'left-[3px] bg-white dark:bg-neutral-400'}`}></div>
              </div>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// --- FILTER MENU (REAL FILTERS) ---
export const FilterMenu = ({ filters, onUpdate, team, clients, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [assigneeOpen, setAssigneeOpen] = useState(true);
    const [clientOpen, setClientOpen] = useState(true);

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

    const filteredTeam = team.filter(m => m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredClients = clients.filter(c => c.client_name?.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div
            className="absolute top-full right-0 mt-2 w-72 max-h-[500px] bg-white dark:bg-[#0f0f0f] border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col animate-scale-up"
            onClick={(e) => e.stopPropagation()}
        >
             <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2 shrink-0">
                <Icon name="search-01" size={14} className="text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent w-full text-sm text-neutral-900 dark:text-white focus:outline-none placeholder-neutral-400 dark:placeholder-neutral-600"
                />
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                 {/* Assignees Filter - Collapsible */}
                 <button
                   onClick={() => setAssigneeOpen(!assigneeOpen)}
                   className="w-full px-2 py-1.5 text-xs font-medium text-neutral-500 uppercase tracking-wider flex items-center gap-2 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors rounded-lg"
                 >
                     <Icon name="chevron-down" size={12} className={`transition-transform duration-200 ${assigneeOpen ? '' : '-rotate-90'}`} />
                     <Icon name="user-profile-01" size={12} /> Assignee
                 </button>
                 {assigneeOpen && (
                   <div className="space-y-0.5 pb-2">
                     {filteredTeam.map(member => {
                         const isSelected = filters.assignee?.includes(member.id);
                         return (
                             <button
                                 key={member.id}
                                 onClick={() => toggleFilter('assignee', member.id)}
                                 className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group"
                             >
                                 {member.avatar_url ? (
                                     <img src={member.avatar_url} className="w-5 h-5 rounded-full object-cover" alt=""/>
                                 ) : (
                                     <div className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-[10px]">{member.full_name[0]}</div>
                                 )}
                                 <span className={`text-sm flex-1 text-left ${isSelected ? 'text-neutral-900 dark:text-white' : 'text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300'}`}>{member.full_name}</span>
                                 <RadioCircle active={isSelected} />
                             </button>
                         )
                     })}
                   </div>
                 )}

                 <div className="h-px bg-neutral-200 dark:bg-neutral-800 mx-2"></div>

                 {/* Clients Filter - Collapsible */}
                 <button
                   onClick={() => setClientOpen(!clientOpen)}
                   className="w-full px-2 py-1.5 text-xs font-medium text-neutral-500 uppercase tracking-wider flex items-center gap-2 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors rounded-lg"
                 >
                     <Icon name="chevron-down" size={12} className={`transition-transform duration-200 ${clientOpen ? '' : '-rotate-90'}`} />
                     <Icon name="bag-01" size={12} /> Client
                 </button>
                 {clientOpen && (
                   <div className="space-y-0.5 pb-2">
                     {filteredClients.map(client => {
                         const isSelected = filters.client?.includes(client.id);
                         return (
                             <button
                                 key={client.id}
                                 onClick={() => toggleFilter('client', client.id)}
                                 className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group"
                             >
                                 <span className={`text-sm truncate flex-1 text-left ${isSelected ? 'text-neutral-900 dark:text-white' : 'text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300'}`}>{client.client_name}</span>
                                 <RadioCircle active={isSelected} />
                             </button>
                         )
                     })}
                   </div>
                 )}
             </div>

             {/* Footer with Clear */}
             <div className="p-2 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#141414] shrink-0 flex justify-between items-center">
                 <span className="text-xs text-neutral-500">
                     {(filters.assignee?.length || 0) + (filters.client?.length || 0)} active
                 </span>
                 <button
                    onClick={() => onUpdate({ assignee: [], client: [] })}
                    className="text-xs font-medium text-neutral-400 hover:text-neutral-900 dark:hover:text-white px-2 py-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                 >
                     Clear all
                 </button>
             </div>
        </div>
    );
};
