import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AuthPage } from './Auth';

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          {/* Minimalist spinner */}
          <div className="relative">
            <div className="w-12 h-12 border-2 border-neutral-800 rounded-full"></div>
            <div className="w-12 h-12 border-2 border-white border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>

          {/* Loading text and branding */}
          <div className="text-center space-y-3">
            <p className="text-sm font-medium text-white">Loading</p>
            <p
              className="text-neutral-700 tracking-[0.3em] uppercase"
              style={{
                fontWeight: 100,
                fontSize: '11px',
                letterSpacing: '0.3em'
              }}
            >
              Dafolle
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return children;
};
