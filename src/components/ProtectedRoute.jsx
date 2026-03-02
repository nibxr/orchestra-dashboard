import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AuthPage } from './Auth';

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-gray-200 dark:border-gray-800 rounded-full"></div>
            <div className="w-12 h-12 border-2 border-gray-800 dark:border-white border-t-transparent dark:border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <div className="text-center flex flex-col items-center" style={{ gap: '10px' }}>
            <p className="font-lastik text-[33px] font-normal text-gray-300 dark:text-white tracking-[0.3em] uppercase leading-none">
              Dafolle
            </p>
            <p className="font-inter-tight text-[16px] font-normal text-gray-300 dark:text-white tracking-[0.3em] uppercase leading-none">
              Studio
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
