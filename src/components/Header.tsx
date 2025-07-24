import React from 'react';
import { Bars3Icon, UserIcon, WifiIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useSocket } from '../contexts/SocketContext.tsx';

interface HeaderProps {
  onMenuClick: () => void;
}

function Header({ onMenuClick }: HeaderProps) {
  const { user, logout, hasRole } = useAuth();
  const { connected } = useSocket();

  return (
    <div className="bg-white shadow">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <button
              type="button"
              className="lg:hidden -ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-sy-black-500 hover:text-sy-black-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sy-green-500"
              onClick={onMenuClick}
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
            <div className="lg:flex lg:items-center lg:space-x-6">
              <h1 className="text-2xl font-semibold text-sy-black-900">SMT Production Database</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Real-time Status Indicator */}
            <div className="flex items-center space-x-2">
              {connected ? (
                <>
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-sy-black-600 hidden sm:inline">Live</span>
                </>
              ) : (
                <>
                  <XCircleIcon className="h-5 w-5 text-red-500" />
                  <span className="text-sm text-sy-black-600 hidden sm:inline">Offline</span>
                </>
              )}
            </div>
            
            {/* User Menu */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <UserIcon className="h-5 w-5 text-sy-black-400" />
                <span className="text-sm font-medium text-sy-black-700">{user?.username}</span>
                <span className="text-xs text-sy-black-500 bg-sy-black-100 px-2 py-1 rounded-full">
                  {user?.role}
                </span>
              </div>
              <button
                onClick={logout}
                className="text-sm text-sy-black-500 hover:text-sy-black-700 px-3 py-1 rounded-md hover:bg-sy-black-100 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Header; 