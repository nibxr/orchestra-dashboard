import { Circle, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export const APP_ID = 'dafolle-prod'; 
export const TASKS_COLLECTION = 'tasks'; 
export const CLIENTS_COLLECTION = 'client_memberships'; 

// EXACT MATCHING STRINGS from your DB
export const STATUS_CONFIG = {
  'Backlog': { color: 'text-gray-400', icon: Circle, bg: 'bg-gray-800/50' },
  'Active Task': { color: 'text-orange-500', icon: Clock, bg: 'bg-orange-500/10' }, 
  'To Review': { color: 'text-yellow-500', icon:  AlertCircle, bg: 'bg-yellow-500/10' },
  'Done': { color: 'text-green-500', icon: CheckCircle2, bg: 'bg-green-500/10' },
  'Cancelled': { color: 'text-red-500', icon: XCircle, bg: 'bg-red-500/10' },
};

export const APP_MODES = {
  DASHBOARD: 'dashboard',
  SETTINGS: 'settings'
};

export const DASHBOARD_VIEWS = {
  BOARD: 'board',
  ANALYTICS: 'analytics',
  PAYMENTS: 'payments',
  CUSTOMERS: 'customers',
};

export const SETTINGS_VIEWS = {
  AGENCY: 'agency',
  TEAM: 'team',
  PORTAL: 'portal',
  PLANS: 'plans',
  WORKFLOW: 'workflow',
  TEMPLATES: 'templates',
};