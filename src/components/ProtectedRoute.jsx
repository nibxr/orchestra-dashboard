import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AuthPage } from './Auth';

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-lime-400 to-green-500 rounded-full mb-4 animate-pulse shadow-lg shadow-lime-500/50">
            <span className="text-black text-2xl font-bold">D</span>
          </div>
          <p className="text-neutral-500">Loading Dafolle...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return children;
};
