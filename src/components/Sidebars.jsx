import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, BarChart3, CreditCard, Users, Briefcase,
  Globe, Workflow, LayoutTemplate, Terminal, User, Bell,
  Search, ArrowUpRight, ChevronLeft, RefreshCw, LogOut, Settings as SettingsIcon,
  Sun, Moon, FileText, Package
} from 'lucide-react';
import { DASHBOARD_VIEWS, SETTINGS_VIEWS, APP_MODES } from '../utils/constants';
import { Avatar } from './Shared';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useConfirm } from './ConfirmModal';
import { supabase } from '../supabaseClient';

const NavItem = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 py-2 transition-all text-sm ${active ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white px-4' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-800/30 rounded-md px-4'}`}>
    <Icon size={16} className={active ? 'text-neutral-900 dark:text-white' : 'text-neutral-400 dark:text-neutral-500'} />
    {label}
  </button>
);

export const DashboardSidebar = ({ currentView, setView, setMode, clients, activeClientId, onOpenSearch, onOpenNotifications, onClientClick, onClearFilters, width }) => {
  const { userRole } = useAuth();
  const isCustomer = userRole === 'customer';

  const activeClients = clients.filter(c => c.status === 'Active');
  const pausedClients = clients.filter(c => c.status === 'Paused');
  const comingClients = clients.filter(c => c.status === 'Planifiés - 📅 Coming Subscription');

  const ClientItem = ({ client }) => {
    const isActive = activeClientId === client.id;
    return (
      <button
        key={client.id}
        onClick={() => onClientClick && onClientClick(client.id)}
        className={`w-full text-left py-2 flex items-center gap-2 transition-all text-xs ${isActive ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white px-4' : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-800/30 rounded-md px-4'}`}
      >
        <div className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${isActive ? 'bg-neutral-300 dark:bg-neutral-700 text-neutral-900 dark:text-white' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-white'}`}>
            {client.client_name ? client.client_name[0] : 'C'}
        </div>
        <span className="truncate">{client.client_name}</span>
      </button>
    );
  };

  return (
  <div className="bg-white dark:bg-[#0f0f0f] flex flex-col h-full text-sm shrink-0" style={{ width: width || 256 }}>
    <div className="p-4 mb-1 flex items-center justify-between">
      <div className="text-neutral-900 dark:text-white uppercase" style={{ fontWeight: 200, fontSize: '18px', letterSpacing: '0.2em' }}>Dafolle</div>
      <div className="flex gap-2">
          <button onClick={onOpenSearch} className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"><Search size={16}/></button>
          <button onClick={onOpenNotifications} className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"><Bell size={16}/></button>
          <button onClick={() => setMode(APP_MODES.SETTINGS)} className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"><ArrowUpRight size={16}/></button>
      </div>
    </div>

    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6">
      <nav className="space-y-0.5">
        <NavItem icon={LayoutDashboard} label="Tasks" active={currentView === DASHBOARD_VIEWS.BOARD && !activeClientId} onClick={() => { setView(DASHBOARD_VIEWS.BOARD); onClearFilters && onClearFilters(); }} />
        {isCustomer && (
          <>
            <NavItem icon={CreditCard} label="Plans" active={currentView === DASHBOARD_VIEWS.PLANS} onClick={() => setView(DASHBOARD_VIEWS.PLANS)} />
            <NavItem icon={FileText} label="Documents" active={currentView === DASHBOARD_VIEWS.DOCUMENTS} onClick={() => setView(DASHBOARD_VIEWS.DOCUMENTS)} />
            <NavItem icon={Package} label="Deliverables" active={currentView === DASHBOARD_VIEWS.DELIVERABLES} onClick={() => setView(DASHBOARD_VIEWS.DELIVERABLES)} />
          </>
        )}
        {!isCustomer && (
          <>
            <NavItem icon={BarChart3} label="Analytics" active={currentView === DASHBOARD_VIEWS.ANALYTICS} onClick={() => setView(DASHBOARD_VIEWS.ANALYTICS)} />
            <NavItem icon={CreditCard} label="Payments" active={currentView === DASHBOARD_VIEWS.PAYMENTS} onClick={() => setView(DASHBOARD_VIEWS.PAYMENTS)} />
            <NavItem icon={Users} label="Customers" active={currentView === DASHBOARD_VIEWS.CUSTOMERS} onClick={() => setView(DASHBOARD_VIEWS.CUSTOMERS)} />
            <NavItem icon={RefreshCw} label="Cycles" active={currentView === DASHBOARD_VIEWS.CYCLES} onClick={() => setView(DASHBOARD_VIEWS.CYCLES)} />
          </>
        )}
      </nav>

      {!isCustomer && activeClients.length > 0 && (
        <div className="flex flex-col min-h-0">
          <div className="px-4 mb-2 flex items-center justify-between text-neutral-500 text-xs font-semibold uppercase tracking-wider">
            <span>Active</span>
          </div>
          <div className="space-y-0.5">
            {activeClients.map(client => (
              <ClientItem key={client.id} client={client} />
            ))}
          </div>
        </div>
      )}

      {!isCustomer && pausedClients.length > 0 && (
        <div className="flex flex-col min-h-0">
          <div className="px-4 mb-2 flex items-center justify-between text-neutral-500 text-xs font-semibold uppercase tracking-wider">
            <span>Paused</span>
          </div>
          <div className="space-y-0.5">
            {pausedClients.map(client => (
              <ClientItem key={client.id} client={client} />
            ))}
          </div>
        </div>
      )}

      {!isCustomer && comingClients.length > 0 && (
        <div className="flex flex-col min-h-0">
          <div className="px-4 mb-2 flex items-center justify-between text-neutral-500 text-xs font-semibold uppercase tracking-wider">
            <span>Coming</span>
          </div>
          <div className="space-y-0.5">
            {comingClients.map(client => (
              <ClientItem key={client.id} client={client} />
            ))}
          </div>
        </div>
      )}
    </div>
    <UserFooter setMode={setMode} />
  </div>
  );
};

export const SettingsSidebar = ({ currentView, setView, setMode, width }) => {
  const { userRole } = useAuth();
  const isCustomer = userRole === 'customer';

  return (
  <div className="bg-white dark:bg-[#0f0f0f] flex flex-col h-full text-sm shrink-0" style={{ width: width || 256 }}>
    <div className="p-4 mb-6">
      <button onClick={() => setMode(APP_MODES.DASHBOARD)} className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white flex items-center gap-2 text-xs font-medium transition-colors">
          <ChevronLeft size={14} /> Back to dashboard <span className="bg-neutral-200 dark:bg-neutral-800 px-1 rounded text-[10px]">ESC</span>
      </button>
    </div>

    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8">
      <div>
          <div className="px-5 mb-2 text-neutral-500 text-[10px] font-bold uppercase tracking-wider">Personal</div>
          <nav className="space-y-0.5">
              <NavItem icon={User} label="Profile" active={currentView === SETTINGS_VIEWS.PROFILE} onClick={() => setView(SETTINGS_VIEWS.PROFILE)} />
              <NavItem icon={Bell} label="Notifications" />
          </nav>
      </div>

      {!isCustomer && (
        <div>
            <div className="px-5 mb-2 text-neutral-500 text-[10px] font-bold uppercase tracking-wider">Dafolle</div>
            <nav className="space-y-0.5">
                <NavItem icon={Briefcase} label="Agency account" active={currentView === SETTINGS_VIEWS.AGENCY} onClick={() => setView(SETTINGS_VIEWS.AGENCY)} />
                <NavItem icon={Users} label="Team" active={currentView === SETTINGS_VIEWS.TEAM} onClick={() => setView(SETTINGS_VIEWS.TEAM)} />
                <NavItem icon={Globe} label="Client portal & branding" active={currentView === SETTINGS_VIEWS.PORTAL} onClick={() => setView(SETTINGS_VIEWS.PORTAL)} />
                <NavItem icon={CreditCard} label="Plans and add-ons" active={currentView === SETTINGS_VIEWS.PLANS} onClick={() => setView(SETTINGS_VIEWS.PLANS)} />
                <NavItem icon={Workflow} label="Workflow" active={currentView === SETTINGS_VIEWS.WORKFLOW} onClick={() => setView(SETTINGS_VIEWS.WORKFLOW)} />
            </nav>
        </div>
      )}

      {isCustomer && (
        <div>
            <div className="px-5 mb-2 text-neutral-500 text-[10px] font-bold uppercase tracking-wider">Manage</div>
            <nav className="space-y-0.5">
                <NavItem icon={Users} label="Team" active={currentView === SETTINGS_VIEWS.CLIENT_TEAM} onClick={() => setView(SETTINGS_VIEWS.CLIENT_TEAM)} />
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
    <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 mt-auto relative">
      <div
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-3 px-2 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 rounded-lg cursor-pointer transition-colors"
      >
        <Avatar
          name={displayName}
          url={displayAvatar}
        />
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-neutral-900 dark:text-white text-xs font-medium truncate">
            {displayName}
          </span>
          <span className="text-neutral-500 text-[10px] truncate">{user?.email}</span>
        </div>
      </div>

      {/* Dropdown Menu */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-white dark:bg-[#161616] border border-neutral-200 dark:border-neutral-800/80 rounded-xl shadow-2xl dark:shadow-black/40 z-50 overflow-hidden animate-scale-in">
            {/* Theme Toggle */}
            <button
              onClick={handleToggleTheme}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                {isDark ? <Sun size={14} /> : <Moon size={14} />}
                <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
              </div>
              <div className={`w-8 h-[18px] rounded-full relative transition-colors ${isDark ? 'bg-white/20' : 'bg-neutral-900'}`}>
                <div className={`absolute top-[3px] w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${isDark ? 'left-[3px]' : 'left-[15px]'}`} />
              </div>
            </button>
            <div className="h-px bg-neutral-100 dark:bg-neutral-800/60 mx-2" />
            <button
              onClick={handleOpenSettings}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
            >
              <SettingsIcon size={14} />
              <span>Settings</span>
            </button>
            <div className="h-px bg-neutral-100 dark:bg-neutral-800/60 mx-2" />
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-neutral-500 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
