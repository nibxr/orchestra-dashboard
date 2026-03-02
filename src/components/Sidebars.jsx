import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { DASHBOARD_VIEWS, SETTINGS_VIEWS, APP_MODES } from '../utils/constants';
import { Avatar } from './Shared';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useConfirm } from './ConfirmModal';
import { supabase } from '../supabaseClient';
import logoIcon from '../assets/Logo icon.png';

const NavItem = ({ iconName, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-2 px-3 py-2 rounded-md transition-all text-[12px] tracking-[-0.24px] leading-[1.3] ${active ? 'bg-gray-100 dark:bg-white/5 text-gray-800 dark:text-white' : 'text-gray-700 dark:text-neutral-400 hover:bg-gray-100/50 dark:hover:bg-white/5'}`}>
    <Icon name={iconName} size={16} className={active ? 'text-gray-800 dark:text-white' : 'text-gray-500 dark:text-neutral-500'} />
    {label}
  </button>
);

// Client avatar initials (matches Figma: 20px circle, grey-200 bg, 10px text)
const ClientAvatar = ({ name }) => {
  const initials = name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'C';
  return (
    <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-neutral-800 border-[1.667px] border-gray-200 dark:border-neutral-700 flex items-center justify-center shrink-0">
      <span className="text-[10px] font-medium text-gray-500 dark:text-neutral-400 leading-none">{initials}</span>
    </div>
  );
};

// Notification count badge (red pill, matches Figma)
const NotificationBadge = ({ count }) => {
  if (!count) return null;
  return (
    <div className="bg-red-500/[0.08] dark:bg-red-500/20 px-2 py-0.5 rounded-full shrink-0">
      <span className="text-[10px] text-red-600 dark:text-red-400 leading-[1.3] tracking-[-0.2px]">{count > 9 ? '9+' : count}</span>
    </div>
  );
};

// "New" status tag (green pill, matches Figma)
const NewTag = () => (
  <div className="bg-green-500/[0.08] dark:bg-green-500/20 px-2 py-0.5 rounded-full shrink-0">
    <span className="text-[10px] text-green-700 dark:text-green-400 leading-[1.3] tracking-[-0.2px]">New</span>
  </div>
);

export const DashboardSidebar = ({ currentView, setView, setMode, clients, activeClientId, onOpenSearch, onOpenNotifications, onClientClick, onClearFilters, width, isAdmin, tasks = [] }) => {
  const { userRole } = useAuth();
  const isCustomer = userRole === 'customer';
  const [activeExpanded, setActiveExpanded] = useState(true);
  const [pausedExpanded, setPausedExpanded] = useState(false);
  const activeListRef = useRef(null);
  const pausedListRef = useRef(null);

  const activeClients = clients.filter(c => c.status === 'Active');
  const pausedClients = clients.filter(c => c.status === 'Paused');

  const ClientItem = ({ client }) => {
    const isActive = activeClientId === client.id;
    const activeTaskCount = tasks.filter(t => t.membership_id === client.id && t.status === 'Active Task' && !t.archived_at).length;
    return (
      <button
        key={client.id}
        onClick={() => onClientClick && onClientClick(client.id)}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-all ${isActive ? 'bg-gray-100 dark:bg-white/5' : 'hover:bg-gray-100/50 dark:hover:bg-white/5'}`}
      >
        <ClientAvatar name={client.client_name} />
        <span className="text-[12px] leading-[1.3] tracking-[-0.24px] text-gray-600 dark:text-neutral-400 truncate flex-1 text-left">{client.client_name}</span>
        {client.isNew && <NewTag />}
        {activeTaskCount > 0 && (
          <div className="h-4 min-w-[16px] px-1 rounded-full bg-gray-200 dark:bg-neutral-800 flex items-center justify-center shrink-0">
            <span className="text-[9px] leading-none text-gray-500 dark:text-neutral-500">{activeTaskCount}</span>
          </div>
        )}
      </button>
    );
  };

  return (
  <div className="bg-white dark:bg-black flex flex-col h-full shrink-0" style={{ width: width || 251 }}>
    {/* Header: Logo + Actions */}
    <div className="px-4 py-6 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <img src={logoIcon} alt="Dafolle" className="w-8 h-8 rounded-full object-cover shrink-0" />
        <span className="font-inter-tight text-[14px] font-semibold leading-[1.3] text-gray-800 dark:text-white">Dafolle</span>
      </div>
      <div className="flex items-center">
        <button onClick={onOpenSearch} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <Icon name="search-01" size={12} className="text-gray-600 dark:text-neutral-400" />
        </button>
        <button onClick={onOpenNotifications} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
          <Icon name="bell-01" size={12} className="text-gray-600 dark:text-neutral-400" />
        </button>
      </div>
    </div>

    {/* Client List */}
    <div className="flex-1 overflow-y-auto custom-scrollbar px-4 space-y-2">
      {!isCustomer && activeClients.length > 0 && (
        <div>
          <button
            onClick={() => setActiveExpanded(!activeExpanded)}
            className="flex items-center gap-1 w-full mb-1"
          >
            <div className="p-2 rounded">
              {activeExpanded ? <Icon name="chevron-up" size={16} className="text-gray-700 dark:text-neutral-400" /> : <Icon name="chevron-down" size={16} className="text-gray-700 dark:text-neutral-400" />}
            </div>
            <span className="text-[12px] leading-[1.3] tracking-[-0.24px] text-gray-700 dark:text-neutral-300">Active clients</span>
          </button>
          <div
            ref={activeListRef}
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{
              maxHeight: activeExpanded ? `${activeListRef.current?.scrollHeight || 1000}px` : '0px',
              opacity: activeExpanded ? 1 : 0,
            }}
          >
            <div className="pl-6 space-y-0.5">
              {activeClients.map(client => (
                <ClientItem key={client.id} client={client} />
              ))}
            </div>
          </div>
        </div>
      )}

      {!isCustomer && activeClients.length > 0 && pausedClients.length > 0 && (
        <div className="border-t border-gray-200 dark:border-neutral-800" />
      )}

      {!isCustomer && pausedClients.length > 0 && (
        <div>
          <button
            onClick={() => setPausedExpanded(!pausedExpanded)}
            className="flex items-center gap-1 w-full mb-1"
          >
            <div className="p-2 rounded">
              {pausedExpanded ? <Icon name="chevron-up" size={16} className="text-gray-700 dark:text-neutral-400" /> : <Icon name="chevron-down" size={16} className="text-gray-700 dark:text-neutral-400" />}
            </div>
            <span className="text-[12px] leading-[1.3] tracking-[-0.24px] text-gray-700 dark:text-neutral-300">Paused clients</span>
          </button>
          <div
            ref={pausedListRef}
            className="overflow-hidden transition-all duration-300 ease-in-out"
            style={{
              maxHeight: pausedExpanded ? `${pausedListRef.current?.scrollHeight || 1000}px` : '0px',
              opacity: pausedExpanded ? 1 : 0,
            }}
          >
            <div className="pl-6 space-y-0.5">
              {pausedClients.map(client => (
                <ClientItem key={client.id} client={client} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Customer nav items */}
      {isCustomer && (
        <nav className="space-y-0.5">
          <NavItem iconName="layout-grid-01" label="Tasks" active={currentView === DASHBOARD_VIEWS.BOARD && !activeClientId} onClick={() => { setView(DASHBOARD_VIEWS.BOARD); onClearFilters && onClearFilters(); }} />
          <NavItem iconName="card-01" label="Plans" active={currentView === DASHBOARD_VIEWS.PLANS} onClick={() => setView(DASHBOARD_VIEWS.PLANS)} />
          <NavItem iconName="file-01" label="Documents" active={currentView === DASHBOARD_VIEWS.DOCUMENTS} onClick={() => setView(DASHBOARD_VIEWS.DOCUMENTS)} />
          <NavItem iconName="package-01" label="Deliverables" active={currentView === DASHBOARD_VIEWS.DELIVERABLES} onClick={() => setView(DASHBOARD_VIEWS.DELIVERABLES)} />
        </nav>
      )}

      {/* Team additional nav */}
      {!isCustomer && (
        <nav className="space-y-0.5 pt-2">
          {isAdmin && <NavItem iconName="bar-chart-01" label="Analytics" active={currentView === DASHBOARD_VIEWS.ANALYTICS} onClick={() => setView(DASHBOARD_VIEWS.ANALYTICS)} />}
          <NavItem iconName="card-01" label="Payments" active={currentView === DASHBOARD_VIEWS.PAYMENTS} onClick={() => setView(DASHBOARD_VIEWS.PAYMENTS)} />
          <NavItem iconName="users-profiles-01" label="Customers" active={currentView === DASHBOARD_VIEWS.CUSTOMERS} onClick={() => setView(DASHBOARD_VIEWS.CUSTOMERS)} />
          <NavItem iconName="refresh-01" label="Cycles" active={currentView === DASHBOARD_VIEWS.CYCLES} onClick={() => setView(DASHBOARD_VIEWS.CYCLES)} />
        </nav>
      )}
    </div>

    {/* Bottom Section: Support, Settings, Featured Card, Account */}
    <div className="mt-auto">
      {/* Support & Settings nav */}
      <div className="px-4 py-4 space-y-0">
        <NavItem iconName="help-circle-contained" label="Support" onClick={() => {}} />
        <NavItem iconName="settings" label="Settings" onClick={() => setMode(APP_MODES.SETTINGS)} />
      </div>

      <UserFooter setMode={setMode} />
    </div>
  </div>
  );
};

export const SettingsSidebar = ({ currentView, setView, setMode, width }) => {
  const { userRole } = useAuth();
  const isCustomer = userRole === 'customer';

  return (
  <div className="bg-white dark:bg-black flex flex-col h-full shrink-0" style={{ width: width || 251 }}>
    <div className="px-4 py-6">
      <button onClick={() => setMode(APP_MODES.DASHBOARD)} className="text-gray-500 dark:text-neutral-400 hover:text-gray-800 dark:hover:text-white flex items-center gap-2 text-[12px] tracking-[-0.24px] transition-colors">
          <Icon name="chevron-left" size={14} /> Back to dashboard <span className="bg-gray-200 dark:bg-neutral-800 px-1 rounded text-[10px]">ESC</span>
      </button>
    </div>

    <div className="flex-1 overflow-y-auto custom-scrollbar px-4 space-y-6">
      <div>
          <div className="px-3 mb-2 text-gray-500 text-[10px] leading-[1.3] tracking-[-0.2px] font-semibold uppercase">Personal</div>
          <nav className="space-y-0.5">
              <NavItem iconName="user-profile-01" label="Profile" active={currentView === SETTINGS_VIEWS.PROFILE} onClick={() => setView(SETTINGS_VIEWS.PROFILE)} />
              <NavItem iconName="bell-01" label="Notifications" />
          </nav>
      </div>

      {!isCustomer && (
        <div>
            <div className="px-3 mb-2 text-gray-500 text-[10px] leading-[1.3] tracking-[-0.2px] font-semibold uppercase">Dafolle</div>
            <nav className="space-y-0.5">
                <NavItem iconName="bag-01" label="Agency account" active={currentView === SETTINGS_VIEWS.AGENCY} onClick={() => setView(SETTINGS_VIEWS.AGENCY)} />
                <NavItem iconName="users-profiles-01" label="Team" active={currentView === SETTINGS_VIEWS.TEAM} onClick={() => setView(SETTINGS_VIEWS.TEAM)} />
                <NavItem iconName="globe" label="Client portal & branding" active={currentView === SETTINGS_VIEWS.PORTAL} onClick={() => setView(SETTINGS_VIEWS.PORTAL)} />
                <NavItem iconName="card-01" label="Plans and add-ons" active={currentView === SETTINGS_VIEWS.PLANS} onClick={() => setView(SETTINGS_VIEWS.PLANS)} />
                <NavItem iconName="git-branch-01" label="Workflow" active={currentView === SETTINGS_VIEWS.WORKFLOW} onClick={() => setView(SETTINGS_VIEWS.WORKFLOW)} />
            </nav>
        </div>
      )}

      {isCustomer && (
        <div>
            <div className="px-3 mb-2 text-gray-500 text-[10px] leading-[1.3] tracking-[-0.2px] font-semibold uppercase">Manage</div>
            <nav className="space-y-0.5">
                <NavItem iconName="users-profiles-01" label="Team" active={currentView === SETTINGS_VIEWS.CLIENT_TEAM} onClick={() => setView(SETTINGS_VIEWS.CLIENT_TEAM)} />
            </nav>
        </div>
      )}
    </div>
    <UserFooter setMode={setMode} />
  </div>
  );
};

const UserFooter = ({ setMode }) => {
  const { user, signOut, userRole } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const { confirm } = useConfirm();
  const [menuOpen, setMenuOpen] = useState(false);
  const [teamMember, setTeamMember] = useState(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user?.email) return;

      if (userRole === 'customer') {
        // Fetch from client_contacts for customers
        const { data } = await supabase
          .from('client_contacts')
          .select('full_name, email')
          .eq('email', user.email)
          .maybeSingle();
        if (data) setTeamMember({ full_name: data.full_name, avatar_url: null, profil_pic: null });
      } else {
        // Fetch from team table for team members
        const { data } = await supabase
          .from('team')
          .select('full_name, avatar_url, profil_pic')
          .eq('email', user.email)
          .maybeSingle();
        if (data) setTeamMember(data);
      }
    };
    fetchUserInfo();
  }, [user?.email, userRole]);

  const displayName = teamMember?.full_name || user?.user_metadata?.full_name || 'User';
  const displayAvatar = teamMember?.avatar_url || teamMember?.profil_pic || user?.user_metadata?.avatar_url;

  const handleSignOut = async () => {
    setMenuOpen(false);
    const confirmed = await confirm({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      variant: 'info'
    });

    if (confirmed) {
      await signOut();
    }
  };

  const handleOpenSettings = () => {
    setMode(APP_MODES.SETTINGS);
    setMenuOpen(false);
  };

  const handleToggleTheme = () => {
    toggleTheme();
  };

  return (
    <div className="px-4 py-4 border-t border-gray-200 dark:border-neutral-800 relative">
      <div
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-3 cursor-pointer"
      >
        <Avatar
          name={displayName}
          url={displayAvatar}
        />
        <div className="flex flex-col flex-1 min-w-0 gap-0.5">
          <span className="font-lastik text-[14px] leading-[1.3] text-gray-800 dark:text-white truncate">
            {displayName}
          </span>
          <span className="text-[10px] leading-[1.3] tracking-[-0.2px] text-gray-600 dark:text-neutral-500 truncate">{user?.email}</span>
        </div>
        <Icon name="sort-vertical-01" size={12} className="text-gray-500 dark:text-neutral-500 shrink-0" />
      </div>

      {/* Dropdown Menu */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-white dark:bg-[#161616] border border-gray-200 dark:border-neutral-800/80 rounded-xl shadow-2xl dark:shadow-black/40 z-50 overflow-hidden animate-scale-in">
            {/* Theme Toggle */}
            <button
              onClick={handleToggleTheme}
              className="w-full flex items-center justify-between px-4 py-2.5 text-[12px] text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                {isDark ? <Icon name="sun-01" size={14} /> : <Icon name="moon-01" size={14} />}
                <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
              </div>
              <div className={`w-8 h-[18px] rounded-full relative transition-colors ${isDark ? 'bg-white/20' : 'bg-gray-800'}`}>
                <div className={`absolute top-[3px] w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${isDark ? 'left-[3px]' : 'left-[15px]'}`} />
              </div>
            </button>
            <div className="h-px bg-gray-100 dark:bg-neutral-800/60 mx-2" />
            <button
              onClick={handleOpenSettings}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] text-gray-600 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <Icon name="settings" size={14} />
              <span>Settings</span>
            </button>
            <div className="h-px bg-gray-100 dark:bg-neutral-800/60 mx-2" />
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] text-gray-500 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              <Icon name="logout-01" size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
