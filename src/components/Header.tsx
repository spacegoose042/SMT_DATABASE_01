import React from 'react';
import { Bars3Icon, UserIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useSocket } from '../contexts/SocketContext.tsx';

interface HeaderProps {
  onMenuClick: () => void;
}

function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const { connected, socketConnected, userCount } = useSocket();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side */}
          <div className="flex items-center space-x-4">
            <button
              onClick={onMenuClick}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-semibold text-gray-900">
                SMT Production Database
              </h1>
              
              {/* Connection Status */}
              <div className="flex items-center space-x-2">
                {/* SSE Status */}
                <div className="flex items-center space-x-1">
                  {connected ? (
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircleIcon className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-xs text-gray-600">SSE</span>
                </div>
                
                {/* Socket.IO Status */}
                <div className="flex items-center space-x-1">
                  {socketConnected ? (
                    <CheckCircleIcon className="h-4 w-4 text-blue-500" />
                  ) : (
                    <XCircleIcon className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-xs text-gray-600">Socket</span>
                </div>

                {/* User Count */}
                {socketConnected && userCount > 0 && (
                  <div className="flex items-center space-x-1 bg-blue-50 px-2 py-1 rounded-md">
                    <UserIcon className="h-4 w-4 text-blue-600" />
                    <span className="text-xs text-blue-600 font-medium">{userCount}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right side */}
          <div className="flex items-center space-x-4">
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
    </header>
  );
}

export default Header; 