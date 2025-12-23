import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AuthPage } from './Auth';

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-lime-400 rounded-full mb-4 animate-pulse">
            <span className="text-black text-2xl font-bold">O</span>
          </div>
          <p className="text-neutral-500">Loading Orchestra...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return children;
};
