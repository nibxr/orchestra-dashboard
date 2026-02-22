import { Circle, Clock, AlertCircle, XCircle, CheckCircle2 } from 'lucide-react';

export const APP_ID = 'orchestra-app';

export const APP_MODES = {
    DASHBOARD: 'dashboard',
    SETTINGS: 'settings',
    PORTAL: 'portal' // NEW MODE
};

export const DASHBOARD_VIEWS = {
    BOARD: 'board',
    CUSTOMERS: 'customers',
    CYCLES: 'cycles',
    ANALYTICS: 'analytics',
    PAYMENTS: 'payments',
    PLANS: 'plans',
    DOCUMENTS: 'documents',
    DELIVERABLES: 'deliverables'
};

export const SETTINGS_VIEWS = {
    PROFILE: 'profile',
    AGENCY: 'agency',
    TEAM: 'team',
    WORKFLOW: 'workflow',
    PLANS: 'plans',
    PORTAL: 'portal',
    TEMPLATES: 'templates',
    CLIENT_TEAM: 'client_team'
};

// STRICT 4 STATUSES AS REQUESTED
export const STATUS_CONFIG = {
    'Backlog': { color: 'text-neutral-500', icon: Circle },
    'Active Task': { color: 'text-blue-500', icon: Clock },     
    'To Review': { color: 'text-amber-500', icon: AlertCircle }, 
    'Done': { color: 'text-emerald-500', icon: CheckCircle2 },
    'Cancelled': { color: 'text-red-500', icon: XCircle }        
};