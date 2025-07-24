import React, { useState } from 'react';
import { Bars3Icon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext.tsx';
import { ChevronDownIcon, UserIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/20/solid';

interface HeaderProps {
  onMenuClick: () => void;
}

function Header({ onMenuClick }: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const { user, logout, hasRole } = useAuth();

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'scheduler': return 'bg-blue-100 text-blue-800';
      case 'supervisor': return 'bg-green-100 text-green-800';
      case 'floor_view': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUserInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  return (
    <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-sy-black-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile menu button */}
      <button
        type="button"
        className="-m-2.5 p-2.5 text-sy-black-700 lg:hidden"
        onClick={onMenuClick}
      >
        <span className="sr-only">Open sidebar</span>
        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Separator */}
      <div className="h-6 w-px bg-sy-black-200 lg:hidden" aria-hidden="true" />

      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* Search */}
        <form className="relative flex flex-1" action="#" method="GET">
          <label htmlFor="search-field" className="sr-only">
            Search
          </label>
          <MagnifyingGlassIcon
            className="pointer-events-none absolute inset-y-0 left-0 h-full w-5 text-sy-black-400"
            aria-hidden="true"
          />
          <input
            id="search-field"
            className="block h-full w-full border-0 py-0 pl-8 pr-0 text-sy-black-900 placeholder:text-sy-black-400 focus:ring-0 sm:text-sm"
            placeholder="Search work orders, customers..."
            type="search"
            name="search"
          />
        </form>

        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* Notifications */}
          <button
            type="button"
            className="-m-2.5 p-2.5 text-sy-black-400 hover:text-sy-black-500"
          >
            <span className="sr-only">View notifications</span>
            <div className="relative">
              <div className="h-6 w-6" aria-hidden="true">
                {/* Bell icon placeholder */}
                <div className="h-6 w-6 rounded-full border-2 border-sy-black-300"></div>
              </div>
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-sy-gold-500"></div>
            </div>
          </button>

          {/* Separator */}
          <div
            className="hidden lg:block lg:h-6 lg:w-px lg:bg-sy-black-200"
            aria-hidden="true"
          />

          {/* Profile dropdown */}
          <div className="relative">
            <button
              type="button"
              className="-m-1.5 flex items-center p-1.5 hover:bg-sy-black-50 rounded-md transition-colors"
              onClick={() => setShowDropdown(!showDropdown)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            >
              <span className="sr-only">Open user menu</span>
              <div className="h-8 w-8 rounded-full bg-sy-green-600 flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user ? getUserInitials(user.username) : 'U'}
                </span>
              </div>
              <span className="hidden lg:flex lg:items-center">
                <span className="ml-4 text-sm font-semibold leading-6 text-sy-black-900">
                  {user?.username || 'User'}
                </span>
                <ChevronDownIcon className="ml-2 h-4 w-4 text-sy-black-500" />
              </span>
            </button>

            {/* Dropdown menu */}
            {showDropdown && (
              <div className="absolute right-0 z-10 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="px-4 py-3">
                  <p className="text-sm">Signed in as</p>
                  <p className="text-sm font-medium text-sy-black-900 truncate">
                    {user?.email}
                  </p>
                  {user?.role && (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${getRoleColor(user.role)}`}>
                      {user.role.replace('_', ' ')}
                    </span>
                  )}
                </div>
                
                <div className="py-1">
                  <button
                    onClick={() => setShowDropdown(false)}
                    className="flex w-full items-center px-4 py-2 text-sm text-sy-black-700 hover:bg-sy-black-50"
                  >
                    <UserIcon className="mr-3 h-4 w-4" />
                    Profile Settings
                  </button>
                </div>
                
                <div className="py-1">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center px-4 py-2 text-sm text-sy-black-700 hover:bg-sy-black-50"
                  >
                    <ArrowRightOnRectangleIcon className="mr-3 h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Header; 