import React, { useState } from 'react';
import {
  LayoutDashboard, BarChart3, CreditCard, Users, Briefcase,
  Globe, Workflow, LayoutTemplate, Terminal, User, Bell,
  Search, ArrowUpRight, ChevronLeft, RefreshCw, LogOut, Settings as SettingsIcon
} from 'lucide-react';
import { DASHBOARD_VIEWS, SETTINGS_VIEWS, APP_MODES } from '../utils/constants';
import { Avatar } from './Shared';
import { useAuth } from '../contexts/AuthContext';

const NavItem = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm ${active ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-800/30'}`}>
    <Icon size={16} className={active ? 'text-white' : 'text-neutral-500'} />
    {label}
  </button>
);

export const DashboardSidebar = ({ currentView, setView, setMode, clients, onOpenSearch, onOpenNotifications }) => {
  const { userRole } = useAuth();
  const isCustomer = userRole === 'customer';

  return (
  <div className="w-64 bg-[#0f0f0f] border-r border-neutral-800 flex flex-col h-full text-sm shrink-0">
    <div className="p-4 mb-2 flex items-center justify-between">
      <div className="font-bold text-xl text-white tracking-tight">d:afolle</div>
      <div className="flex gap-2">
          <button onClick={onOpenSearch} className="text-neutral-500 hover:text-white transition-colors"><Search size={16}/></button>
          <button onClick={onOpenNotifications} className="text-neutral-500 hover:text-white transition-colors"><Bell size={16}/></button>
          {!isCustomer && (
            <button onClick={() => setMode(APP_MODES.SETTINGS)} className="text-neutral-500 hover:text-white transition-colors"><ArrowUpRight size={16}/></button>
          )}
      </div>
    </div>

    <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-6">
      <nav className="space-y-0.5">
        <NavItem icon={LayoutDashboard} label="Tasks" active={currentView === DASHBOARD_VIEWS.BOARD} onClick={() => setView(DASHBOARD_VIEWS.BOARD)} />
        {!isCustomer && (
          <>
            <NavItem icon={BarChart3} label="Analytics" active={currentView === DASHBOARD_VIEWS.ANALYTICS} onClick={() => setView(DASHBOARD_VIEWS.ANALYTICS)} />
            <NavItem icon={CreditCard} label="Payments" active={currentView === DASHBOARD_VIEWS.PAYMENTS} onClick={() => setView(DASHBOARD_VIEWS.PAYMENTS)} />
            <NavItem icon={Users} label="Customers" active={currentView === DASHBOARD_VIEWS.CUSTOMERS} onClick={() => setView(DASHBOARD_VIEWS.CUSTOMERS)} />
            <NavItem icon={RefreshCw} label="Cycles" active={currentView === DASHBOARD_VIEWS.CYCLES} onClick={() => setView(DASHBOARD_VIEWS.CYCLES)} />
          </>
        )}
      </nav>

      {!isCustomer && (
        <div>
          <div className="px-3 mb-2 flex items-center justify-between text-neutral-500 text-xs font-semibold uppercase tracking-wider">
            <span>Active</span>
          </div>
          <div className="space-y-0.5">
            {/* Filter only active clients ('En cours' or 'Start' based on CSV) */}
            {clients.filter(c => c.status === 'En cours' || c.status === 'Start').map(client => (
              <button key={client.id} className="w-full text-left px-3 py-2 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800/50 flex items-center gap-2 transition-colors text-xs">
                <div className="w-5 h-5 rounded bg-neutral-800 flex items-center justify-center text-[10px] text-white font-bold">
                    {client.client_name ? client.client_name[0] : 'C'}
                </div>
                <span className="truncate">{client.client_name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
    <UserFooter setMode={setMode} />
  </div>
  );
};

export const SettingsSidebar = ({ currentView, setView, setMode }) => {
  return (
  <div className="w-64 bg-[#0f0f0f] border-r border-neutral-800 flex flex-col h-full text-sm shrink-0">
    <div className="p-4 mb-6">
      <button onClick={() => setMode(APP_MODES.DASHBOARD)} className="text-neutral-400 hover:text-white flex items-center gap-2 text-xs font-medium transition-colors">
          <ChevronLeft size={14} /> Back to dashboard <span className="bg-neutral-800 px-1 rounded text-[10px]">ESC</span>
      </button>
    </div>

    <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-8">
      <div>
          <div className="px-3 mb-2 text-neutral-500 text-[10px] font-bold uppercase tracking-wider">Personal</div>
          <nav className="space-y-0.5">
              <NavItem icon={User} label="Profile" active={currentView === SETTINGS_VIEWS.PROFILE} onClick={() => setView(SETTINGS_VIEWS.PROFILE)} />
              <NavItem icon={Bell} label="Notifications" />
          </nav>
      </div>

      <div>
          <div className="px-3 mb-2 text-neutral-500 text-[10px] font-bold uppercase tracking-wider">Dafolle</div>
          <nav className="space-y-0.5">
              <NavItem icon={Briefcase} label="Agency account" active={currentView === SETTINGS_VIEWS.AGENCY} onClick={() => setView(SETTINGS_VIEWS.AGENCY)} />
              <NavItem icon={Users} label="Team" active={currentView === SETTINGS_VIEWS.TEAM} onClick={() => setView(SETTINGS_VIEWS.TEAM)} />
              <NavItem icon={Globe} label="Client portal & branding" active={currentView === SETTINGS_VIEWS.PORTAL} onClick={() => setView(SETTINGS_VIEWS.PORTAL)} />
              <NavItem icon={CreditCard} label="Plans and add-ons" active={currentView === SETTINGS_VIEWS.PLANS} onClick={() => setView(SETTINGS_VIEWS.PLANS)} />
              <NavItem icon={Workflow} label="Workflow" active={currentView === SETTINGS_VIEWS.WORKFLOW} onClick={() => setView(SETTINGS_VIEWS.WORKFLOW)} />
              <NavItem icon={LayoutTemplate} label="Templates" active={currentView === SETTINGS_VIEWS.TEMPLATES} onClick={() => setView(SETTINGS_VIEWS.TEMPLATES)} />
              <NavItem icon={Terminal} label="API" />
          </nav>
      </div>
    </div>
    <UserFooter setMode={setMode} />
  </div>
  );
};

const UserFooter = ({ setMode }) => {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut();
    }
  };

  const handleOpenSettings = () => {
    setMode(APP_MODES.SETTINGS);
    setMenuOpen(false);
  };

  return (
    <div className="p-3 border-t border-neutral-800 mt-auto relative">
      <div
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-3 px-2 py-2 hover:bg-neutral-800 rounded-md cursor-pointer transition-colors"
      >
        <Avatar
          name={user?.user_metadata?.full_name || user?.email}
          url={user?.user_metadata?.avatar_url}
        />
        <div className="flex flex-col flex-1">
          <span className="text-white text-xs font-medium">
            {user?.user_metadata?.full_name || 'User'}
          </span>
          <span className="text-neutral-500 text-[10px]">{user?.email}</span>
        </div>
      </div>

      {/* Dropdown Menu */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-[#1a1a1a] border border-neutral-800 rounded-lg shadow-xl z-50 overflow-hidden">
            <button
              onClick={handleOpenSettings}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-neutral-300 hover:bg-neutral-800 transition-colors"
            >
              <SettingsIcon size={16} />
              <span>Settings</span>
            </button>
            <div className="h-px bg-neutral-800" />
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-neutral-800 transition-colors"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};